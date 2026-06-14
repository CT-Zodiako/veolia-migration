import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CalculartarifasResponse } from '../../models/costos.models';
import { CostosService } from '../../services/costos.service';
import { NotificationService } from '../../services/notification.service';

export interface PipelineStepUi {
  step: number;
  label: string;
  estado: 'pendiente' | 'en-progreso' | 'completado' | 'omitido' | 'error';
  mensaje?: string;
}

@Component({
  selector: 'app-ejecucion-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ProgressSpinnerModule, MessageModule],
  template: `
    <p-card>
      <ng-template pTemplate="title">3. Ejecución</ng-template>

      <ng-container *ngIf="showSkeleton; else panelBody">
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton height="8rem"></p-skeleton>
      </ng-container>

      <ng-template #panelBody>
      <p-message *ngIf="isAps1031" severity="warn" text="APS=1031: el paso 5 se omitirá según regla de negocio."></p-message>

      <div class="mt-2 mb-3 flex align-items-center gap-2">
        <button pButton type="button" label="Calcular Tarifas" icon="pi pi-cog" [disabled]="!canExecute() || loading() || blocked" (click)="calcular()"></button>
        <p-progressSpinner *ngIf="loading()" strokeWidth="6" styleClass="w-2rem h-2rem"></p-progressSpinner>
        <button *ngIf="lastError()" pButton type="button" severity="secondary" label="Reintentar" icon="pi pi-refresh" [disabled]="loading() || blocked" (click)="calcular()"></button>
      </div>

      <div class="grid">
        <div class="col-12" *ngFor="let s of localSteps()">
          <div class="flex align-items-center justify-content-between border-1 border-round surface-border p-2">
            <span>Step {{ s.step }}: {{ s.label }}</span>
            <i [class]="iconByEstado(s.estado)"></i>
          </div>
          <small class="text-color-secondary" *ngIf="s.mensaje">{{ s.mensaje }}</small>
        </div>
      </div>

      <p-message *ngIf="result()" [severity]="result()?.exitoso ? 'success' : 'error'" [text]="result()?.exitoso ? 'Cálculo completado.' : 'Cálculo con errores.'"></p-message>
      </ng-template>
    </p-card>
  `
})
export class EjecucionPanelComponent {
  @Input() enabled = false;
  @Input() blocked = false;
  @Input() showSkeleton = false;
  @Input() aps: number | null = null;
  @Input() mes: number | null = null;
  @Input() anno: number | null = null;
  @Input() isAps1031 = false;
  @Input() pipelineSteps: PipelineStepUi[] = [];

  @Output() calculated = new EventEmitter<CalculartarifasResponse>();
  @Output() loadingChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly result = signal<CalculartarifasResponse | null>(null);
  readonly localSteps = signal<PipelineStepUi[]>([]);
  readonly lastError = signal<string | null>(null);

  constructor(
    private readonly costosService: CostosService,
    private readonly notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.localSteps.set(this.pipelineSteps.length ? this.pipelineSteps : this.defaultSteps());
  }

  ngOnChanges(): void {
    this.localSteps.set(this.pipelineSteps.length ? this.pipelineSteps : this.defaultSteps());
  }

  canExecute(): boolean {
    return this.enabled && this.aps !== null && this.mes !== null && this.anno !== null;
  }

  calcular(): void {
    if (!this.canExecute()) {
      this.notification.error('Completá los datos y prechecks antes de calcular.');
      return;
    }

    this.loading.set(true);
    this.loadingChange.emit(true);
    this.lastError.set(null);
    this.runVisualProgress();

    this.costosService
      .calculartarifas(this.aps!, this.mes!, this.anno!, this.getUsuarioId())
      .pipe(finalize(() => {
        this.loading.set(false);
        this.loadingChange.emit(false);
      }))
      .subscribe({
        next: (resp) => {
          const mapped = this.mapBackendSteps(resp);
          this.localSteps.set(mapped);
          this.result.set(resp);
          this.calculated.emit(resp);
          if (resp.exitoso) {
            this.notification.success('Cálculo finalizado correctamente.');
          }
        },
        error: (err: Error) => {
          this.lastError.set(err.message);
          this.notification.error(err.message);
        }
      });
  }

  iconByEstado(estado: PipelineStepUi['estado']): string {
    switch (estado) {
      case 'en-progreso': return 'pi pi-spin pi-spinner text-blue-500 text-xl';
      case 'completado': return 'pi pi-check-circle text-green-500 text-xl';
      case 'omitido': return 'pi pi-minus-circle text-orange-500 text-xl';
      case 'error': return 'pi pi-times-circle text-red-500 text-xl';
      default: return 'pi pi-clock text-500 text-xl';
    }
  }

  private runVisualProgress(): void {
    const steps = this.defaultSteps();
    this.localSteps.set(steps);
    steps.forEach((_, idx) => {
      setTimeout(() => {
        const current = [...this.localSteps()];
        if (!this.loading()) return;
        current[idx] = { ...current[idx], estado: this.isAps1031 && current[idx].step === 5 ? 'omitido' : 'en-progreso' };
        this.localSteps.set(current);
      }, 150 * (idx + 1));
    });
  }

  private mapBackendSteps(resp: CalculartarifasResponse): PipelineStepUi[] {
    if (!resp.pasosEjecutados?.length) return this.defaultSteps();
    return this.defaultSteps().map((s) => {
      const match = resp.pasosEjecutados.find((p) => Number(String(p.paso).replace(/\D+/g, '')) === s.step);
      if (!match) return s;
      const estado = (match.estado || '').toLowerCase();
      const normalized: PipelineStepUi['estado'] = estado.includes('omit') ? 'omitido' : estado.includes('error') ? 'error' : estado.includes('progreso') ? 'en-progreso' : 'completado';
      return { ...s, estado: normalized, mensaje: match.mensaje };
    });
  }

  private defaultSteps(): PipelineStepUi[] {
    return [
      { step: 1, label: 'Inicializar', estado: 'pendiente' },
      { step: 2, label: 'Limpiar datos', estado: 'pendiente' },
      { step: 3, label: 'Calcular base', estado: 'pendiente' },
      { step: 4, label: 'Aplicar ajustes', estado: 'pendiente' },
      { step: 5, label: 'Generar resumen', estado: 'pendiente' },
      { step: 6, label: 'Finalizar', estado: 'pendiente' }
    ];
  }

  private getUsuarioId(): number {
    try {
      const raw = localStorage.getItem('usuario');
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Number(parsed?.SISU_ID ?? 0);
    } catch {
      return 0;
    }
  }
}

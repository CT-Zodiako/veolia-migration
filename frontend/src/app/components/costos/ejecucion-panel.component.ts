import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CalculartarifasResponse } from '../../models/costos.models';
import { CostosService } from '../../services/costos.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-ejecucion-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ProgressSpinnerModule, MessageModule],
  template: `
    <p-card>
      <ng-template pTemplate="title">3. Ejecución</ng-template>

      <ng-container *ngIf="showSkeleton; else panelBody">
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton height="4rem"></p-skeleton>
      </ng-container>

      <ng-template #panelBody>
        <div class="mt-2 mb-3 flex align-items-center gap-2">
          <button pButton type="button" label="Calcular Tarifas" icon="pi pi-cog" [disabled]="!canExecute() || loading() || blocked" (click)="calcular()"></button>
          <p-progressSpinner *ngIf="loading()" strokeWidth="6" styleClass="w-2rem h-2rem"></p-progressSpinner>
          <button *ngIf="lastError()" pButton type="button" severity="secondary" label="Reintentar" icon="pi pi-refresh" [disabled]="loading() || blocked" (click)="calcular()"></button>
        </div>

        <p-message *ngIf="result()" [severity]="result()?.exitoso ? 'success' : 'error'" [text]="result()?.resultado ?? (result()?.exitoso ? 'Cálculo completado.' : 'Cálculo con errores.')"></p-message>
        <p-message *ngIf="lastError()" severity="error" [text]="lastError()!"></p-message>
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

  @Output() calculated = new EventEmitter<CalculartarifasResponse>();
  @Output() loadingChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly result = signal<CalculartarifasResponse | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor(
    private readonly costosService: CostosService,
    private readonly notification: NotificationService
  ) {}

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

    this.costosService
      .calculartarifas(this.aps!, this.mes!, this.anno!, this.getUsuarioId())
      .pipe(finalize(() => {
        this.loading.set(false);
        this.loadingChange.emit(false);
      }))
      .subscribe({
        next: (resp) => {
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

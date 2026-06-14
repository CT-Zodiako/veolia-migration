import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CalculartarifasResponse, CertificarTarifasResponse } from '../../models/costos.models';
import { CostosService } from '../../services/costos.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-certificacion-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, MessageModule, ProgressSpinnerModule],
  template: `
    <p-card>
      <ng-template pTemplate="title">4. Certificación</ng-template>

      <ng-container *ngIf="showSkeleton; else panelBody">
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton height="6rem"></p-skeleton>
      </ng-container>

      <ng-template #panelBody>
      <p-message *ngIf="!enabled" severity="info" text="La certificación se habilita luego de un cálculo exitoso." />

      <div class="mb-3" *ngIf="calculoResultado as calc">
        <p class="m-0 text-color-secondary">Resumen cálculo: {{ calc.resultado || (calc.exitoso ? 'Completado' : 'Fallido') }}</p>
      </div>

      <div class="flex align-items-center gap-2">
        <button pButton type="button" label="Certificar" icon="pi pi-shield" [disabled]="!canExecute() || loading() || blocked" (click)="certificar()"></button>
        <p-progressSpinner *ngIf="loading()" strokeWidth="6" styleClass="w-2rem h-2rem"></p-progressSpinner>
        <button *ngIf="lastError()" pButton type="button" severity="secondary" label="Reintentar" icon="pi pi-refresh" [disabled]="loading() || blocked" (click)="certificar()"></button>
      </div>

      <div class="mt-3" *ngIf="result() as r">
        <p-message [severity]="r.certificado ? 'success' : 'error'" [text]="r.certificado ? 'Certificación registrada' : 'No se pudo certificar'"></p-message>
        <p class="mb-1" *ngIf="r.fechaCertificacion">Fecha de certificación: <strong>{{ r.fechaCertificacion | date:'dd/MM/yyyy HH:mm' }}</strong></p>
        <p class="m-0 text-color-secondary" *ngIf="r.certificado">Detalle: certificado de período generado correctamente.</p>
      </div>
      </ng-template>
    </p-card>
  `
})
export class CertificacionPanelComponent {
  @Input() enabled = false;
  @Input() blocked = false;
  @Input() showSkeleton = false;
  @Input() aps: number | null = null;
  @Input() mes: number | null = null;
  @Input() anno: number | null = null;
  @Input() calculoResultado: CalculartarifasResponse | null = null;

  @Output() certified = new EventEmitter<CertificarTarifasResponse>();
  @Output() loadingChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly result = signal<CertificarTarifasResponse | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor(
    private readonly costosService: CostosService,
    private readonly notification: NotificationService
  ) {}

  canExecute(): boolean {
    return this.enabled && this.aps !== null && this.mes !== null && this.anno !== null;
  }

  certificar(): void {
    if (!this.canExecute()) {
      this.notification.error('No podés certificar sin cálculo exitoso y parámetros completos.');
      return;
    }

    this.loading.set(true);
    this.loadingChange.emit(true);
    this.lastError.set(null);
    this.costosService
      .certificarTarifas(this.aps!, this.mes!, this.anno!, this.getUsuarioId())
      .pipe(finalize(() => {
        this.loading.set(false);
        this.loadingChange.emit(false);
      }))
      .subscribe({
        next: (resp) => {
          this.result.set(resp);
          this.certified.emit(resp);
          if (resp.certificado) {
            this.notification.success('Período certificado correctamente.');
          } else {
            this.notification.error('El período no pudo certificarse.');
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

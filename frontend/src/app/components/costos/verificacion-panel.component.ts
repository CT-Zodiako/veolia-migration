import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CostosService } from '../../services/costos.service';
import { ValidapreactualizaResponse } from '../../models/costos.models';
import { NotificationService } from '../../services/notification.service';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';

@Component({
  selector: 'app-verificacion-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, MessageModule, ProgressSpinnerModule],
  template: `
    <p-card>
      <ng-template pTemplate="title">1. Verificación</ng-template>

      <ng-container *ngIf="showSkeleton; else panelBody">
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton height="5rem"></p-skeleton>
      </ng-container>

      <ng-template #panelBody>
        <p-message *ngIf="!enabled" severity="info" text="Completá primero APS, mes y año." />

        <div class="flex align-items-center gap-2 mt-3">
          <button pButton type="button" label="Verificar" icon="pi pi-search" [disabled]="!canExecute() || loading() || blocked" (click)="verificar()"></button>
          <p-progressSpinner *ngIf="loading()" strokeWidth="6" styleClass="w-2rem h-2rem" ariaLabel="Verificando"></p-progressSpinner>
          <button *ngIf="lastError()" pButton type="button" severity="secondary" label="Reintentar" icon="pi pi-refresh" [disabled]="loading() || blocked" (click)="verificar()"></button>
        </div>

        <div class="mt-3" *ngIf="result() as r">
          <p-message [severity]="r.puedeCalcular ? 'success' : 'error'" [text]="r.puedeCalcular ? 'Puede calcular' : 'No puede calcular'" />

          <div class="mt-2" *ngIf="r.mensajes.length">
            <p-message *ngFor="let m of r.mensajes" severity="info" [text]="m"></p-message>
          </div>

          <p class="mt-2 mb-0 text-color-secondary" *ngIf="r.antesLiquidar">
            Estado antesLiquidar: <strong>{{ r.antesLiquidar }}</strong>
          </p>
        </div>
      </ng-template>
    </p-card>
  `
})
export class VerificacionPanelComponent {
  @Input() aps: number | null = null;
  @Input() mes: number | null = null;
  @Input() anno: number | null = null;
  @Input() enabled = true;
  @Input() blocked = false;
  @Input() showSkeleton = false;

  @Output() verified = new EventEmitter<ValidapreactualizaResponse>();
  @Output() loadingChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly result = signal<ValidapreactualizaResponse | null>(null);
  readonly lastError = signal<string | null>(null);

  constructor(
    private readonly costosService: CostosService,
    private readonly notification: NotificationService
  ) {}

  canExecute(): boolean {
    return this.enabled && this.aps !== null && this.mes !== null && this.anno !== null;
  }

  verificar(): void {
    if (!this.canExecute()) {
      this.notification.error('Seleccioná APS, mes y año antes de verificar.');
      return;
    }

    const usuario = this.getUsuarioId();
    this.loading.set(true);
    this.loadingChange.emit(true);
    this.lastError.set(null);
    this.costosService
      .validapreactualiza(this.aps!, this.mes!, this.anno!, usuario)
      .pipe(finalize(() => {
        this.loading.set(false);
        this.loadingChange.emit(false);
      }))
      .subscribe({
        next: (resp) => {
          this.result.set(resp);
          this.verified.emit(resp);
          if (resp.puedeCalcular) {
            this.notification.success('Verificación exitosa. Podés continuar con prechecks.');
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

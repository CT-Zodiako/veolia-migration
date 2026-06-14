import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PrecheckResult } from '../../models/costos.models';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CostosService } from '../../services/costos.service';
import { NotificationService } from '../../services/notification.service';

export type PrecheckStatus = 'pending' | 'running' | 'success' | 'error';

export interface PrecheckUiItem {
  key: string;
  label: string;
  status: PrecheckStatus;
  detail?: string;
}

@Component({
  selector: 'app-prechecks-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, MessageModule, ProgressSpinnerModule],
  template: `
    <p-card>
      <ng-template pTemplate="title">2. Prechecks</ng-template>

      <ng-container *ngIf="showSkeleton; else panelBody">
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton styleClass="mb-2" height="2rem"></p-skeleton>
        <p-skeleton height="6rem"></p-skeleton>
      </ng-container>

      <ng-template #panelBody>
        <p-message *ngIf="!enabled" severity="warn" text="Disponible después de una verificación exitosa." />

        <div class="mt-3 flex align-items-center gap-2">
          <button pButton type="button" label="Ejecutar prechecks" icon="pi pi-play" [disabled]="!enabled || loading() || blocked" (click)="run()"></button>
          <p-progressSpinner *ngIf="loading()" strokeWidth="6" styleClass="w-2rem h-2rem"></p-progressSpinner>
          <button *ngIf="lastError()" pButton type="button" severity="secondary" label="Reintentar" icon="pi pi-refresh" [disabled]="loading() || blocked" (click)="run()"></button>
        </div>

        <div class="mt-3 grid" *ngIf="items().length">
          <div class="col-12" *ngFor="let item of items()">
            <div class="flex align-items-center justify-content-between border-1 border-round surface-border p-2">
              <div>
                <strong>{{ item.label }}</strong>
                <div class="text-sm text-color-secondary" *ngIf="item.detail">{{ item.detail }}</div>
              </div>
              <i [class]="statusIcon(item.status)"></i>
            </div>
          </div>
        </div>
      </ng-template>
    </p-card>
  `
})
export class PrechecksPanelComponent {
  @Input() aps: number | null = null;
  @Input() mes: number | null = null;
  @Input() anno: number | null = null;
  @Input() enabled = false;
  @Input() blocked = false;
  @Input() showSkeleton = false;

  @Output() prechecksCompleted = new EventEmitter<{ allPassed: boolean; items: PrecheckUiItem[] }>();
  @Output() loadingChange = new EventEmitter<boolean>();

  readonly loading = signal(false);
  readonly items = signal<PrecheckUiItem[]>(this.buildInitialItems());
  readonly lastError = signal<string | null>(null);

  constructor(
    private readonly costosService: CostosService,
    private readonly notification: NotificationService
  ) {}

  run(): void {
    if (!this.enabled || this.blocked || this.aps === null || this.mes === null || this.anno === null) {
      this.notification.error('Completá APS, mes y año antes de ejecutar prechecks.');
      return;
    }

    this.lastError.set(null);
    this.items.set(this.buildInitialItems().map((x) => ({ ...x, status: 'running' })));
    this.loading.set(true);
    this.loadingChange.emit(true);
    const usuario = this.getUsuarioId();

    this.costosService
      .runPrechecks(this.aps, this.mes, this.anno, usuario)
      .pipe(finalize(() => {
        this.loading.set(false);
        this.loadingChange.emit(false);
      }))
      .subscribe({
        next: (resp) => {
          const finished = this.mapFromBackend(resp.prechecks);
          this.items.set(finished);
          this.prechecksCompleted.emit({ allPassed: resp.puedeCalcular, items: finished });
          if (resp.puedeCalcular) {
            this.notification.success('Prechecks completados. Podés continuar con ejecución.');
          }
        },
        error: (err: Error) => {
          this.lastError.set(err.message);
          this.notification.error(err.message);
          this.items.set(this.buildInitialItems());
        }
      });
  }

  statusIcon(status: PrecheckStatus): string {
    switch (status) {
      case 'running':
        return 'pi pi-spin pi-spinner text-blue-500 text-xl';
      case 'success':
        return 'pi pi-check-circle text-green-500 text-xl';
      case 'error':
        return 'pi pi-times-circle text-red-500 text-xl';
      default:
        return 'pi pi-clock text-500 text-xl';
    }
  }

  private buildInitialItems(): PrecheckUiItem[] {
    return [
      { key: 'certificarFauco_cpsuivsfact', label: 'SUI vs Facturación', status: 'pending' },
      { key: 'certificarFauco_cpproductividad', label: 'Productividad', status: 'pending' },
      { key: 'certificarFauco_cpenero', label: 'Enero', status: 'pending' },
      { key: 'cenrtificarEditar', label: 'Certificar Editar', status: 'pending' }
    ];
  }

  private mapFromBackend(results: PrecheckResult[]): PrecheckUiItem[] {
    const lookup = new Map(results.map((item) => [item.nombre, item]));
    return this.buildInitialItems().map((item) => {
      const match = lookup.get(item.key);
      if (!match) return item;

      const normalized = (match.estado || '').toLowerCase();
      const status: PrecheckStatus = normalized.includes('success')
        ? 'success'
        : normalized.includes('error')
          ? 'error'
          : 'pending';

      return {
        ...item,
        status,
        detail: match.mensaje || (status === 'success' ? 'OK' : 'Sin detalle')
      };
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

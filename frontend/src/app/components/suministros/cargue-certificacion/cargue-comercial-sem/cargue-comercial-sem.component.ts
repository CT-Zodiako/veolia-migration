import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { CargueActual, FiltrosCertificacion } from '../../../../models/fase1-certificacion.models';
import { Fase1CertificacionService } from '../../../../services/fase1-certificacion.service';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-cargue-comercial-sem',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-card>
      <p class="m-0 mb-3">Creá el cargue con los parámetros seleccionados.</p>
      <div class="grid mb-3">
        <div class="col-12 md:col-3"><strong>Vigencia:</strong> {{ filtros?.vigencia || '—' }}</div>
        <div class="col-12 md:col-3"><strong>Departamento:</strong> {{ filtros?.departamentoId || '—' }}</div>
        <div class="col-12 md:col-3"><strong>Municipio:</strong> {{ filtros?.municipioId || '—' }}</div>
        <div class="col-12 md:col-3"><strong>Prestador:</strong> {{ filtros?.prestadorId || '—' }}</div>
      </div>
      <button pButton type="button" icon="pi pi-plus" label="Crear Cargue" [loading]="loading()" [disabled]="loading() || !canCreate()" (click)="crearCargue()"></button>
      <p *ngIf="cargueActual" class="mt-3">Cargue actual: <strong>#{{ cargueActual.cargueId }}</strong> · Estado: {{ cargueActual.estado }}</p>
    </p-card>
  `
})
export class CargueComercialSemComponent {
  @Input() filtros: FiltrosCertificacion | null = null;
  @Input() cargueActual: CargueActual | null = null;
  @Output() cargueChange = new EventEmitter<CargueActual>();

  readonly loading = signal(false);

  constructor(
    private readonly service: Fase1CertificacionService,
    private readonly notifications: NotificationService
  ) {}

  canCreate(): boolean {
    return !!this.filtros?.vigencia && !!this.filtros?.municipioId && !!this.filtros?.prestadorId && !!this.filtros?.tipoCargueId;
  }

  crearCargue(): void {
    if (!this.canCreate() || !this.filtros) return;
    this.loading.set(true);
    this.service
      .crearCargue({
        periodoId: this.filtros.vigencia!,
        municipioId: this.filtros.municipioId!,
        prestadorId: this.filtros.prestadorId!,
        tipoCargueId: this.filtros.tipoCargueId!,
        usuario: 'frontend'
      })
      .subscribe({
        next: (cargue) => {
          this.cargueChange.emit(cargue);
          this.notifications.success(`Cargue #${cargue.cargueId} creado.`);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }
}

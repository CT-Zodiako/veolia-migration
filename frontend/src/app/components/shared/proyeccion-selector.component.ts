import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { Proyeccion } from '../../models/proyecciones.models';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

@Component({
  selector: 'app-proyeccion-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  template: `
    <div class="form-group">
      <label *ngIf="label">{{ label }}</label>
      <p-select
        [options]="proyecciones"
        [(ngModel)]="selectedProyeccion"
        optionLabel="proyNombre"
        optionValue="proyId"
        [placeholder]="placeholder"
        [showClear]="true"
        [disabled]="loading || proyecciones.length === 0"
        [style]="{width: '100%'}"
        (onChange)="onSelect($event.value)">
      </p-select>
      <small *ngIf="loading" class="text-muted">Cargando proyecciones...</small>
    </div>
  `,
  styles: [`
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--color-text-body); }
    .text-muted { color: var(--color-text-muted); }
  `]
})
export class ProyeccionSelectorComponent implements OnChanges {
  @Input() aps: number | null = null;
  @Input() label = 'Proyección';
  @Input() placeholder = 'Seleccione proyección';
  @Input() selectedProyeccion: number | null = null;

  @Output() selectedProyeccionChange = new EventEmitter<number | null>();
  /** Emite el objeto Proyeccion completo (para pantallas que necesitan horizonte/descripción, no solo el ID). */
  @Output() proyeccionChange = new EventEmitter<Proyeccion | null>();

  proyecciones: Proyeccion[] = [];
  loading = false;

  constructor(
    private readonly service: ProyeccionesService,
    private readonly parametrosState: ParametrosConsultaStateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aps']) {
      this.cargarProyecciones();
    }
  }

  private cargarProyecciones(): void {
    this.proyecciones = [];

    if (!this.aps) {
      if (this.selectedProyeccion !== null) {
        this.onSelect(null);
      }
      return;
    }

    this.loading = true;
    this.service.consulta(this.aps).subscribe({
      next: (res) => {
        this.proyecciones = res.data || [];
        this.loading = false;
        this.restaurarOLimpiarSeleccion();
        this.cdr.detectChanges();
      },
      error: () => {
        this.proyecciones = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private restaurarOLimpiarSeleccion(): void {
    const existeEnLista = (id: number | null) => id !== null && this.proyecciones.some(p => p.proyId === id);

    if (existeEnLista(this.selectedProyeccion)) {
      return;
    }

    if (this.selectedProyeccion === null) {
      const guardado = this.parametrosState.getProyeccion();
      if (existeEnLista(guardado)) {
        this.selectedProyeccion = guardado;
        this.emitirCambio(guardado);
        return;
      }
    }

    if (this.selectedProyeccion !== null) {
      this.onSelect(null);
    }
  }

  onSelect(value: number | string | null): void {
    const proyId = value ? Number(value) : null;
    this.selectedProyeccion = proyId;
    this.emitirCambio(proyId);
    this.parametrosState.setProyeccion(proyId);
  }

  private emitirCambio(proyId: number | null): void {
    this.selectedProyeccionChange.emit(proyId);
    this.proyeccionChange.emit(this.proyecciones.find(p => p.proyId === proyId) ?? null);
  }
}

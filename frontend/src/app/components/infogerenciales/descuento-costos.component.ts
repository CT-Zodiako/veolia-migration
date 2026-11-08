import { Component, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { redondearFilas } from '../../shared/redondeo.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { DescuentoCostosDialogComponent, PeriodoDescuento } from '../shared/descuento-costos-dialog.component';

@Component({
  selector: 'app-descuento-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent, DescuentoCostosDialogComponent],
  providers: [MessageService],
  templateUrl: './descuento-costos.component.html',
  styleUrl: './descuento-costos.component.css'
})
export class DescuentoCostosComponent {
  private readonly parametros = inject(ParametrosConsultaStateService);
  private readonly hoy = new Date();

  readonly aps = signal<number | null>(null);
  // Legacy Selector.vue:153-158: without a stored period the selector starts on today (queried as today - 1 month).
  readonly anno = signal<number | null>(this.parametros.getAnno() === null ? this.hoy.getFullYear() : null);
  readonly mes = signal<number | null>(this.parametros.getMes() === null ? this.hoy.getMonth() + 1 : null);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'PARA_NOMBRE', header: 'COSTO', filtrable: true },
    { field: 'DESC_VALOR', header: 'DESCUENTO', numero: true }
  ];

  // Add/edit dialog shared with 304 (DescuentosCostosComponent); its state is exposed here for this screen's API.
  private readonly dialog = viewChild.required(DescuentoCostosDialogComponent);

  get dialogVisible() { return this.dialog().visible; }
  get dialogEsNuevo() { return this.dialog().esNuevo; }
  get catalogoOptions() { return this.dialog().catalogoOptions; }
  get dialogSeleccion() { return this.dialog().seleccion; }
  get dialogValor() { return this.dialog().valor; }

  constructor(private readonly service: InfoGerencialService) {}

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultarSiCompleto();
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
    this.consultarSiCompleto();
  }

  onApsChange(value: number | null): void {
    this.aps.set(value);
    this.consultarSiCompleto();
  }

  private consultarSiCompleto(): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (aps === null || anno === null || mes === null) {
      this.rows.set([]);
      return;
    }

    this.loading.set(true);
    const periodo = periodoAnterior(anno, mes);
    this.service.getApsDesCost(aps, periodo.anno, periodo.mes).subscribe({
      next: (r) => {
        this.rows.set(redondearFilas(r.data || [], { DESC_VALOR: 4 }));
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }

  abrirNuevo(): void {
    const periodo = this.periodoSeleccionado();
    if (periodo) this.dialog().abrirNuevo(periodo);
  }

  abrirEdicion(row: Record<string, unknown>): void {
    const periodo = this.periodoSeleccionado();
    if (periodo) this.dialog().abrirEdicion(periodo, row);
  }

  guardar(): void {
    this.dialog().guardar();
  }

  cerrarDialog(): void {
    this.dialog().cerrar();
  }

  recargar(): void {
    this.consultarSiCompleto();
  }

  private periodoSeleccionado(): PeriodoDescuento | null {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    return aps === null || anno === null || mes === null ? null : { aps, anno, mes };
  }
}

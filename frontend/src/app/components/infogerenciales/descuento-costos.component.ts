import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { redondearFilas } from '../../shared/redondeo.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

interface CatalogoDescuento {
  PARA_PARA: number;
  PARA_NOMBRE: string;
  DESC_VALOR: number;
}

@Component({
  selector: 'app-descuento-costos',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, DialogModule, ToastModule, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './descuento-costos.component.html',
  styleUrl: './descuento-costos.component.css'
})
export class DescuentoCostosComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'PARA_NOMBRE', header: 'Costo', filtrable: true },
    { field: 'DESC_VALOR', header: 'Descuento', numero: true }
  ];

  readonly dialogVisible = signal(false);
  readonly dialogEsNuevo = signal(true);
  readonly dialogLoading = signal(false);
  readonly dialogGuardando = signal(false);
  readonly catalogoOptions = signal<CatalogoDescuento[]>([]);
  readonly dialogSeleccion = signal<number | null>(null);
  readonly dialogValor = signal<number | null>(null);

  private editandoDescId: number | null = null;
  private editandoParaId: number | null = null;

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {}

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
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (aps === null || anno === null || mes === null) return;

    this.editandoDescId = null;
    this.editandoParaId = null;
    this.dialogEsNuevo.set(true);
    this.dialogSeleccion.set(null);
    this.dialogValor.set(null);
    this.dialogVisible.set(true);
    this.cargarCatalogo();
  }

  abrirEdicion(row: Record<string, unknown>): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (aps === null || anno === null || mes === null) return;

    this.editandoDescId = Number(row['DESC_ID']);
    this.editandoParaId = Number(row['PARA_COSTO20010']);
    this.dialogEsNuevo.set(false);
    this.dialogSeleccion.set(null);
    this.dialogValor.set(typeof row['DESC_VALOR'] === 'number' ? (row['DESC_VALOR'] as number) : Number(row['DESC_VALOR']) || 0);
    this.dialogVisible.set(true);
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    if (aps === null || anno === null || mes === null) return;

    this.dialogLoading.set(true);
    this.catalogoOptions.set([]);
    const periodo = periodoAnterior(anno, mes);
    const esNuevo = this.dialogEsNuevo();
    this.service.getApsDesCostUnico(this.editandoDescId ?? 0, aps, periodo.anno, periodo.mes, esNuevo).subscribe({
      next: (r) => {
        const opciones = (r.data || []) as CatalogoDescuento[];
        this.catalogoOptions.set(opciones);
        if (!esNuevo && this.editandoParaId !== null) {
          const actual = opciones.find((o) => Number(o.PARA_PARA) === this.editandoParaId);
          if (actual) this.dialogSeleccion.set(actual.PARA_PARA);
        }
        this.dialogLoading.set(false);
      },
      error: () => {
        this.dialogLoading.set(false);
      }
    });
  }

  cerrarDialog(): void {
    this.dialogVisible.set(false);
  }

  guardar(): void {
    const aps = this.aps();
    const anno = this.anno();
    const mes = this.mes();
    const seleccion = this.dialogSeleccion();
    if (aps === null || anno === null || mes === null) return;

    if (seleccion === null) {
      this.messages.add({ severity: 'warn', summary: 'Descuento', detail: 'Debe seleccionar un descuento.' });
      return;
    }

    const valor = this.dialogValor() ?? 0;
    const periodo = periodoAnterior(anno, mes);
    this.dialogGuardando.set(true);

    const accion = this.dialogEsNuevo()
      ? this.service.setApsDesCost(aps, periodo.anno, periodo.mes, seleccion, valor)
      : this.service.uptApsDesCost(aps, periodo.anno, periodo.mes, seleccion, valor);

    accion.subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Descuento', detail: this.dialogEsNuevo() ? 'Descuento registrado correctamente.' : 'Descuento actualizado correctamente.' });
        this.dialogGuardando.set(false);
        this.dialogVisible.set(false);
        this.consultarSiCompleto();
      },
      error: (e) => {
        this.messages.add({ severity: 'error', summary: 'Descuento', detail: e?.error?.message || 'No fue posible guardar el descuento.' });
        this.dialogGuardando.set(false);
      }
    });
  }
}

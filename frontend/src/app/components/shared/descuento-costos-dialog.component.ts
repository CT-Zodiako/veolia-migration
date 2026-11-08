import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

export interface CatalogoDescuento {
  PARA_PARA: number;
  PARA_NOMBRE: string;
  DESC_VALOR: number;
}

/** Period as selected in the screen selectors; the dialog queries/saves the month before (periodoAnterior). */
export interface PeriodoDescuento {
  aps: number;
  anno: number;
  mes: number;
}

/**
 * Add/edit discount dialog shared by 605 (Actualizacion de Costo) and 304 (Descuentos Costos).
 * Legacy front-tarificador/src/views/suministros/Descuentos.vue (openBasic / saveData). The host provides
 * MessageService (and renders the p-toast) and reloads its grid on (guardado).
 */
@Component({
  selector: 'app-descuento-costos-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, DialogModule],
  templateUrl: './descuento-costos-dialog.component.html',
  styleUrl: './descuento-costos-dialog.component.css'
})
export class DescuentoCostosDialogComponent {
  /** Emitted after a successful save and after the missing-cost warning, so the host reloads its grid. */
  readonly guardado = output<void>();

  readonly visible = signal(false);
  readonly esNuevo = signal(true);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly catalogoOptions = signal<CatalogoDescuento[]>([]);
  readonly seleccion = signal<number | null>(null);
  readonly valor = signal<number | null>(null);

  private periodo: PeriodoDescuento | null = null;
  private editandoDescId: number | null = null;
  private editandoParaId: number | null = null;

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {}

  abrirNuevo(periodo: PeriodoDescuento): void {
    this.periodo = periodo;
    this.editandoDescId = null;
    this.editandoParaId = null;
    this.esNuevo.set(true);
    this.seleccion.set(null);
    this.valor.set(null);
    this.visible.set(true);
    this.cargarCatalogo();
  }

  abrirEdicion(periodo: PeriodoDescuento, row: Record<string, unknown>): void {
    this.periodo = periodo;
    this.editandoDescId = Number(row['DESC_ID']);
    this.editandoParaId = Number(row['PARA_COSTO20010']);
    this.esNuevo.set(false);
    this.seleccion.set(null);
    this.valor.set(typeof row['DESC_VALOR'] === 'number' ? (row['DESC_VALOR'] as number) : Number(row['DESC_VALOR']) || 0);
    this.visible.set(true);
    this.cargarCatalogo();
  }

  private cargarCatalogo(): void {
    if (this.periodo === null) return;

    this.cargando.set(true);
    this.catalogoOptions.set([]);
    const { aps } = this.periodo;
    const anterior = periodoAnterior(this.periodo.anno, this.periodo.mes);
    const esNuevo = this.esNuevo();
    this.service.getApsDesCostUnico(this.editandoDescId ?? 0, aps, anterior.anno, anterior.mes, esNuevo).subscribe({
      next: (r) => {
        const opciones = (r.data || []) as CatalogoDescuento[];
        this.catalogoOptions.set(opciones);
        if (!esNuevo && this.editandoParaId !== null) {
          const actual = opciones.find((o) => Number(o.PARA_PARA) === this.editandoParaId);
          if (actual) this.seleccion.set(actual.PARA_PARA);
        }
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }

  cerrar(): void {
    this.visible.set(false);
  }

  guardar(): void {
    if (this.periodo === null) return;
    const seleccion = this.seleccion();

    if (seleccion === null) {
      // Descuentos.vue:252-258: alert, then reload and close the dialog.
      this.messages.add({ severity: 'warn', summary: 'Descuento', detail: 'debe seleccionar un descuento!!' });
      this.visible.set(false);
      this.guardado.emit();
      return;
    }

    const valor = this.valor() ?? 0;
    const { aps } = this.periodo;
    const anterior = periodoAnterior(this.periodo.anno, this.periodo.mes);
    const esNuevo = this.esNuevo();
    this.guardando.set(true);

    const accion = esNuevo
      ? this.service.setApsDesCost(aps, anterior.anno, anterior.mes, seleccion, valor)
      : this.service.uptApsDesCost(aps, anterior.anno, anterior.mes, seleccion, valor);

    accion.subscribe({
      next: () => {
        this.messages.add({ severity: 'success', summary: 'Descuento', detail: esNuevo ? 'Descuento registrado correctamente.' : 'Descuento actualizado correctamente.' });
        this.guardando.set(false);
        this.visible.set(false);
        this.guardado.emit();
      },
      error: (e) => {
        this.messages.add({ severity: 'error', summary: 'Descuento', detail: e?.error?.message || 'No fue posible guardar el descuento.' });
        this.guardando.set(false);
      }
    });
  }
}

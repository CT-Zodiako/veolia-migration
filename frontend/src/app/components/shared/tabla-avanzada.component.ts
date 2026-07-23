import { Component, HostListener, Input, OnInit, TemplateRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ExportarTablaDialogComponent } from './exportar-tabla-dialog.component';
import { GuardarVistaDialogComponent } from './guardar-vista-dialog.component';

export interface TablaColumn {
  field: string;
  header: string;
  numero?: boolean;
  filtrable?: boolean;
}

interface ColumnaPreset {
  nombre: string;
  campos: string[];
  ocultas: string[];
  fijadas: string[];
}

export class ColumnasState {
  orden: TablaColumn[];
  ocultas = new Set<string>();
  fijadas = new Set<string>();
  visibles: TablaColumn[];
  presets: ColumnaPreset[] = [];
  presetActual: string | null = null;
  private dragField: string | null = null;

  constructor(private readonly columnas: TablaColumn[], private readonly storageKey: string) {
    this.orden = [...columnas];
    this.visibles = [...this.orden];
    this.cargarPresets();
  }

  esFija(field: string): boolean {
    return this.fijadas.has(field);
  }

  toggleFijar(field: string): void {
    if (this.fijadas.has(field)) {
      this.fijadas.delete(field);
    } else {
      this.fijadas.add(field);
    }
    this.reordenarPorFijadas();
  }

  private reordenarPorFijadas(): void {
    const fijas = this.orden.filter(col => this.fijadas.has(col.field));
    const resto = this.orden.filter(col => !this.fijadas.has(col.field));
    this.orden = [...fijas, ...resto];
    this.recalcularVisibles();
  }

  setVisibles(seleccionadas: TablaColumn[], todas: TablaColumn[]): void {
    const camposVisibles = new Set(seleccionadas.map(col => col.field));
    this.ocultas = new Set(todas.filter(col => !camposVisibles.has(col.field)).map(col => col.field));
    this.recalcularVisibles();
  }

  ocultar(field: string): void {
    this.ocultas.add(field);
    this.recalcularVisibles();
  }

  restaurar(): void {
    this.orden = [...this.columnas];
    this.ocultas.clear();
    this.fijadas.clear();
    this.presetActual = null;
    this.recalcularVisibles();
  }

  onDragStart(field: string): void {
    this.dragField = field;
  }

  onDrop(targetField: string): void {
    if (this.dragField === null || this.dragField === targetField) {
      this.dragField = null;
      return;
    }

    const fromIndex = this.orden.findIndex(col => col.field === this.dragField);
    const toIndex = this.orden.findIndex(col => col.field === targetField);
    this.dragField = null;
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const [movida] = this.orden.splice(fromIndex, 1);
    this.orden.splice(toIndex, 0, movida);
    this.reordenarPorFijadas();
  }

  guardarPreset(nombre: string): void {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      return;
    }

    const preset: ColumnaPreset = {
      nombre: nombreLimpio,
      campos: this.orden.map(col => col.field),
      ocultas: [...this.ocultas],
      fijadas: [...this.fijadas]
    };

    this.presets = [...this.presets.filter(p => p.nombre !== nombreLimpio), preset];
    this.presetActual = nombreLimpio;
    this.guardarPresetsEnStorage();
  }

  aplicarPreset(nombre: string | null): void {
    const preset = this.presets.find(p => p.nombre === nombre);
    if (!preset) {
      return;
    }

    const porCampo = new Map(this.columnas.map(col => [col.field, col]));
    const nuevoOrden = preset.campos
      .map(field => porCampo.get(field))
      .filter((col): col is TablaColumn => !!col);

    for (const col of this.columnas) {
      if (!nuevoOrden.includes(col)) {
        nuevoOrden.push(col);
      }
    }

    this.orden = nuevoOrden;
    this.ocultas = new Set(preset.ocultas);
    this.fijadas = new Set(preset.fijadas || []);
    this.presetActual = preset.nombre;
    this.recalcularVisibles();
  }

  eliminarPresetActual(): void {
    if (!this.presetActual) {
      return;
    }

    this.presets = this.presets.filter(p => p.nombre !== this.presetActual);
    this.presetActual = null;
    this.guardarPresetsEnStorage();
  }

  private cargarPresets(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      this.presets = raw ? JSON.parse(raw) : [];
    } catch {
      this.presets = [];
    }
  }

  private guardarPresetsEnStorage(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
  }

  private recalcularVisibles(): void {
    this.visibles = this.orden.filter(col => !this.ocultas.has(col.field));
    this.forzarRecalculoColumnasFijas();
  }

  private forzarRecalculoColumnasFijas(): void {
    // PrimeNG solo recalcula la posición "sticky" de una columna fija cuando
    // cambia el valor del input [frozen]. Si una columna que ya estaba fija
    // se reordena (drag, aplicar preset, etc.), ese valor no cambia y queda
    // con el offset viejo. Disparar un resize fuerza su propio recálculo interno.
    if (typeof window === 'undefined') {
      return;
    }

    setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
  }
}

@Component({
  selector: 'app-tabla-avanzada',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ExportarTablaDialogComponent, GuardarVistaDialogComponent],
  templateUrl: './tabla-avanzada.component.html',
  styleUrl: './tabla-avanzada.component.css'
})
export class TablaAvanzadaComponent implements OnInit {
  @Input({ required: true }) columnas: TablaColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input({ required: true }) storageKey = '';
  @Input() nombreExportar = 'exportar';
  @Input() scrollHeight = '390px';
  @Input() filasPorPagina = 10;

  /** Si se pasa, reemplaza el contenido default (`{{ row[col.field] }}`) de cada celda.
   *  Contexto: `$implicit` = valor de la celda, `row` = fila completa, `col` = columna actual. */
  @Input() cellTemplate?: TemplateRef<{ $implicit: unknown; row: Record<string, unknown>; col: TablaColumn }>;

  /** Clase CSS adicional por celda (ej. resaltado de color según el dato de la fila). */
  @Input() cellClass?: (row: Record<string, unknown>, col: TablaColumn) => string;

  /** Si se pasa, agrega una columna final de acciones renderizando este template por fila.
   *  Contexto: `$implicit` = fila completa. */
  @Input() accionesTemplate?: TemplateRef<{ $implicit: Record<string, unknown> }>;
  @Input() accionesHeader = 'Acciones';

  columnasState!: ColumnasState;
  compacta = false;
  mostrarExport = false;
  mostrarGuardarVista = false;
  pantallaCompleta = signal(false);

  ngOnInit(): void {
    this.columnasState = new ColumnasState(this.columnas, `veolia:tabla-presets:${this.storageKey}`);
  }

  onColumnasChange(seleccionadas: TablaColumn[]): void {
    this.columnasState.setVisibles(seleccionadas, this.columnas);
  }

  setDensidad(compacta: boolean): void {
    this.compacta = compacta;
  }

  confirmarGuardarVista(nombre: string): void {
    this.columnasState.guardarPreset(nombre);
  }

  togglePantallaCompleta(): void {
    this.pantallaCompleta.update(valor => !valor);
  }

  get scrollHeightEfectivo(): string {
    return this.pantallaCompleta() ? 'calc(100vh - 260px)' : this.scrollHeight;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pantallaCompleta()) {
      this.pantallaCompleta.set(false);
    }
  }
}

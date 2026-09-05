import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, NgZone, OnDestroy, OnInit, AfterViewInit, OnChanges, SimpleChanges, TemplateRef, signal } from '@angular/core';
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
  visibles: TablaColumn[] = [];
  presets: ColumnaPreset[] = [];
  presetActual: string | null = null;
  private dragField: string | null = null;

  constructor(
    private readonly columnas: TablaColumn[],
    private readonly storageKey: string,
    private readonly fijadasPorDefecto: string[] = []
  ) {
    this.orden = [...columnas];
    this.cargarPresets();
    if (fijadasPorDefecto.length > 0) {
      this.fijadas = new Set(fijadasPorDefecto);
      this.reordenarPorFijadas();
    } else {
      this.visibles = [...this.orden];
    }
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
    this.fijadas = new Set(this.fijadasPorDefecto);
    this.presetActual = null;
    this.reordenarPorFijadas();
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
export class TablaAvanzadaComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) columnas: TablaColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input({ required: true }) storageKey = '';
  @Input() nombreExportar = 'exportar';
  @Input() scrollHeight = '390px';
  @Input() filasPorPagina = 10;

  /** Opciones del paginador; en pantalla completa arranca en la máxima. */
  readonly rowsPerPageOptionsList = [10, 20, 50];

  /** Filas por página efectivas: al entrar a pantalla completa se sugiere el
   *  máximo (50) pero el paginador sigue disponible para cambiarlo. */
  filasPorPaginaActual = this.filasPorPagina;
  private filasPorPaginaPrevia = this.filasPorPagina;

  @Input() autoWidth = false;

  /** Muestra el overlay de carga nativo de PrimeNG (spinner + fondo semitransparente)
   *  mientras el consumidor está esperando la respuesta de una consulta -- para que el
   *  usuario distinga "cargando" de "sin datos" en vez de ver la tabla vacía sin más. */
  @Input() loading = false;

  /** Fields que arrancan fijados la primera vez (sin vista guardada previa) y al
   *  usar "Restaurar columnas". El usuario puede des-fijarlos igual que cualquier
   *  otra columna; esto solo define el estado inicial, no un mínimo obligatorio. */
  @Input() columnasFijadasPorDefecto: string[] = [];

  /** Si se pasa, reemplaza el contenido default (`{{ row[col.field] }}`) de cada celda.
   *  Contexto: `$implicit` = valor de la celda, `row` = fila completa, `col` = columna actual. */
  @Input() cellTemplate?: TemplateRef<{ $implicit: unknown; row: Record<string, unknown>; col: TablaColumn }>;

  /** Clase CSS adicional por celda (ej. resaltado de color según el dato de la fila). */
  @Input() cellClass?: (row: Record<string, unknown>, col: TablaColumn) => string;

  /** Si se pasa, agrega una columna de acciones renderizando este template por fila.
   *  Contexto: `$implicit` = fila completa. */
  @Input() accionesTemplate?: TemplateRef<{ $implicit: Record<string, unknown> }>;
  @Input() accionesHeader = 'Acciones';
  /** Posición de la columna de acciones. Default 'fin' (convención de la app:
   *  Editar/Eliminar al final) -- 'inicio' para casos como el botón "Ver" de
   *  SUI853, donde tiene más sentido verlo primero antes que las columnas de dato. */
  @Input() accionesPosicion: 'inicio' | 'fin' = 'fin';

  /** Filtra qué filas van al CSV exportado. Por defecto exporta todas -- usarlo para
   *  excluir filas puramente visuales (ej. TOTAL/PROMEDIO sintéticas agregadas por el
   *  consumidor) que no deben aparecer en el archivo descargado. */
  @Input() filaExportable?: (row: Record<string, unknown>) => boolean;

  get rowsExportables(): Record<string, unknown>[] {
    return this.filaExportable ? this.rows.filter(this.filaExportable) : this.rows;
  }

  columnasState!: ColumnasState;
  compacta = true;
  mostrarExport = false;
  mostrarGuardarVista = false;
  pantallaCompleta = signal(false);

  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly el: ElementRef,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    // Primer ajuste cuando el layout inicial se estabiliza; el ajuste fino
    // ocurre cuando llega la data (ver ngOnChanges -> rows).
    setTimeout(() => this.ajustarFilasAlEspacio(), 100);
    // Resize FUERA de la zona de Angular + debounce: no disparar change
    // detection ni reflows en cada tick del arrastre.
    this.zone.runOutsideAngular(() => {
      window.addEventListener('resize', this.onResize);
    });
  }

  ngOnDestroy(): void {
    // Sin esto cada navegación dejaba un listener vivo disparando el
    // recalculo sobre instancias destruidas (leak detectado en review).
    window.removeEventListener('resize', this.onResize);
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
  }

  private readonly onResize = (): void => {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      this.zone.run(() => this.ajustarFilasAlEspacio());
    }, 150);
  };

  /** Ajusta filasPorPaginaActual a la mayor opción del paginador (10/20/50)
   *  que quepa en el espacio vertical disponible SIN scroll interno.
   *  Así, pantallas con más espacio libre muestran más filas por defecto. */
  private ajustarFilasAlEspacio(): void {
    if (this.pantallaCompleta()) {
      return;
    }
    const top = this.el.nativeElement.getBoundingClientRect().top;
    if (top <= 0) {
      return; // componente aún no renderizado en layout
    }
    const altoFila = this.compacta ? 22 : 30;
    const chrome = 120; // caption + header + paginador + margen inferior aprox.
    const disponible = window.innerHeight - top - chrome;
    const opciones = [...this.rowsPerPageOptionsList].sort((a, b) => a - b);
    let elegida = opciones[0];
    for (const opc of opciones) {
      if (opc * altoFila <= disponible) {
        elegida = opc;
      }
    }
    this.filasPorPaginaActual = elegida;
    // La asignación ocurre fuera del ciclo de chequeo (setTimeout/resize/data):
    // sin esto Angular reporta NG0100 porque [rows] cambió tras el check.
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.columnasState = new ColumnasState(
      this.columnas,
      `app:tabla-presets:${this.storageKey}`,
      this.columnasFijadasPorDefecto
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      // La data puede empujar la tabla a su posición final: re-medir.
      setTimeout(() => this.ajustarFilasAlEspacio(), 50);
    }
    if (changes['filasPorPagina'] && !this.pantallaCompleta()) {
      this.filasPorPaginaActual = this.filasPorPagina;
    }
    if (changes['columnas'] && this.columnasState) {
      this.columnasState = new ColumnasState(
        this.columnas,
        `app:tabla-presets:${this.storageKey}`,
        this.columnasFijadasPorDefecto
      );
    }
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

  private densidadPrevia = true;

  // En pantalla completa la densidad se fuerza a Compacta (sin opción Normal)
  // para maximizar filas visibles; al salir se restaura la densidad previa.
  togglePantallaCompleta(): void {
    this.pantallaCompleta.update(valor => !valor);
    if (this.pantallaCompleta()) {
      this.densidadPrevia = this.compacta;
      this.compacta = true;
      this.filasPorPaginaPrevia = this.filasPorPaginaActual;
      this.filasPorPaginaActual = Math.max(...this.rowsPerPageOptionsList);
    } else {
      this.compacta = this.densidadPrevia;
      this.filasPorPaginaActual = this.filasPorPaginaPrevia;
    }
  }

  get scrollHeightEfectivo(): string {
    // Pantalla completa: la tabla toma todo el alto del viewport menos el chrome
    // real de la toolbar/caption/paginador (compactado) para ver máximas filas.
    return this.pantallaCompleta() ? 'calc(100vh - 180px)' : this.scrollHeight;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pantallaCompleta()) {
      this.pantallaCompleta.set(false);
    }
  }
}

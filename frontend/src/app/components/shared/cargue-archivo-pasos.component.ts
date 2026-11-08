import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, computed, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';

export type CargueArchivoEstado = 'vacio' | 'validando' | 'listo' | 'error' | 'guardando' | 'guardado';

export interface CargueArchivoResumen {
  filas?: number;
  columnas?: number;
  /** Columnas del Plano Guía, solo si la pantalla ya las conoce ("21 de 21"). */
  columnasEsperadas?: number;
}

interface ErrorLocal {
  titulo: string;
  detalle: string;
}

type EstadoPaso = 'current' | 'done' | 'pending' | 'error' | 'optional';

const ESTADO_PASO_SR: Record<EstadoPaso, string> = {
  current: 'paso actual',
  done: 'completado',
  pending: 'pendiente',
  error: 'con error',
  optional: 'opcional'
};

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Cargue guiado en 3 pasos (design/cargue-archivos/03-pasos-guiados.html): descargar Plano Guía, seleccionar archivo,
 * revisar y guardar. Solo maneja la UI y la selección del archivo (extensión y archivo vacío); el parseo, la vista
 * previa, la confirmación y el guardado quedan en cada pantalla, que informa el avance con `estado`.
 */
@Component({
  selector: 'app-cargue-archivo-pasos',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './cargue-archivo-pasos.component.html',
  styleUrl: './cargue-archivo-pasos.component.css'
})
export class CargueArchivoPasosComponent implements OnChanges {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input({ required: true }) planoGuiaUrl!: string;
  @Input() planoGuiaDescripcion = 'Formato con las columnas esperadas.';
  @Input() accept = '.csv';
  @Input() disabled = false;
  @Input() disabledMessage = 'Seleccioná una empresa primero';
  @Input() periodoDestino = '';
  @Input() estado: CargueArchivoEstado = 'vacio';
  @Input() errores: string[] = [];
  @Input() resumen: CargueArchivoResumen | null = null;
  @Input() guardarLabel = 'Guardar Información';
  @Input() mensajeGuardado = 'Información guardada correctamente.';

  @Output() archivoSeleccionado = new EventEmitter<File>();
  @Output() archivoQuitado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  /** Tras Quitar/Cancelar el botón del chip desaparece: el foco pasa a la zona de selección cuando se vuelve a mostrar. */
  @ViewChild('dropZone') private set dropZone(zona: ElementRef<HTMLButtonElement> | undefined) {
    if (zona && this.enfocarZona) {
      this.enfocarZona = false;
      zona.nativeElement.focus();
    }
  }
  private enfocarZona = false;

  private static siguienteId = 0;
  readonly idBase = `cargue-pasos-${CargueArchivoPasosComponent.siguienteId++}`;

  readonly archivo = signal<File | null>(null);
  readonly errorLocal = signal<ErrorLocal | null>(null);
  readonly arrastrando = signal(false);
  private readonly estadoEntrada = signal<CargueArchivoEstado>('vacio');
  private profundidadArrastre = 0;

  /** El error de la validación local manda sobre el estado que informa la pantalla. */
  readonly estadoEfectivo = computed<CargueArchivoEstado>(() => (this.errorLocal() ? 'error' : this.estadoEntrada()));

  readonly estadoPaso2 = computed<EstadoPaso>(() => {
    const estado = this.estadoEfectivo();
    if (estado === 'error') return 'error';
    if ((estado === 'listo' || estado === 'guardando') && this.archivo()) return 'done';
    return 'current';
  });

  readonly estadoPaso3 = computed<EstadoPaso>(() => {
    const estado = this.estadoEfectivo();
    return estado === 'listo' || estado === 'guardando' ? 'current' : 'pending';
  });

  /** Texto de la región aria-live; getter porque `disabled` y `mensajeGuardado` son @Input planos. */
  get anuncio(): string {
    const nombre = this.archivo()?.name ?? '';
    switch (this.estadoEfectivo()) {
      case 'validando': return `Validando ${nombre}.`;
      case 'listo': return `Archivo listo: ${nombre}.`;
      case 'error': return `Error: ${this.errorLocal()?.titulo ?? 'el archivo no se puede cargar'}.`;
      case 'guardando': return 'Guardando información.';
      case 'guardado': return this.mensajeGuardado;
      default: return this.disabled ? this.disabledMessage : '';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estado']) {
      this.estadoEntrada.set(this.estado);
      // Las pantallas limpian el formulario después de guardar o cancelar: volver al paso 2 vacío. Un error local se
      // mantiene al volver a vacío: es la pantalla limpiando el archivo anterior tras un reemplazo rechazado.
      const vuelveAVacio = this.estado === 'vacio' && !this.errorLocal();
      if (!changes['estado'].firstChange && (vuelveAVacio || this.estado === 'guardado')) {
        this.limpiarArchivo();
      }
    }
  }

  srPaso(estado: EstadoPaso): string {
    return ESTADO_PASO_SR[estado];
  }

  tamano(file: File): string {
    return formatearTamano(file.size);
  }

  bloqueado(): boolean {
    const estado = this.estadoEfectivo();
    return this.disabled || estado === 'validando' || estado === 'guardando';
  }

  abrirSelector(): void {
    if (this.bloqueado() || !this.fileInput) return;
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.procesar(file);
  }

  onDragEnter(event: DragEvent): void {
    if (!this.tieneArchivos(event) || this.bloqueado()) return;
    event.preventDefault();
    this.profundidadArrastre++;
    this.arrastrando.set(true);
  }

  onDragOver(event: DragEvent): void {
    if (this.tieneArchivos(event)) event.preventDefault();
  }

  onDragLeave(): void {
    this.profundidadArrastre = Math.max(0, this.profundidadArrastre - 1);
    if (this.profundidadArrastre === 0) this.arrastrando.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.profundidadArrastre = 0;
    this.arrastrando.set(false);
    if (this.bloqueado()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.procesar(file);
  }

  quitar(): void {
    this.enfocarZona = !!this.archivo();
    this.limpiarArchivo();
    this.archivoQuitado.emit();
  }

  onCancelar(): void {
    this.enfocarZona = !!this.archivo();
    this.limpiarArchivo();
    this.cancelar.emit();
  }

  onGuardar(): void {
    if (this.estadoEfectivo() !== 'listo') return;
    this.guardar.emit();
  }

  /** Vuelve al paso 2 vacío (para pantallas que limpian sin cambiar `estado`). */
  reset(): void {
    this.limpiarArchivo();
  }

  private procesar(file: File): void {
    if (this.bloqueado()) return;
    const habiaArchivo = !!this.archivo() && !this.errorLocal();
    this.archivo.set(file);
    const error = this.validar(file);
    this.errorLocal.set(error);
    if (!error) this.archivoSeleccionado.emit(file);
    // Reemplazo rechazado: la pantalla todavía tiene el archivo anterior (vista previa y Guardar), que se quita.
    else if (habiaArchivo) this.archivoQuitado.emit();
  }

  private validar(file: File): ErrorLocal | null {
    const extensiones = this.accept.split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.startsWith('.'));
    const nombre = file.name.toLowerCase();
    if (extensiones.length && !extensiones.some((ext) => nombre.endsWith(ext))) {
      const punto = file.name.lastIndexOf('.');
      const ext = punto > 0 ? file.name.slice(punto).toLowerCase() : 'sin extensión';
      const esperado = extensiones.map((e) => e.slice(1).toUpperCase()).join(' o ');
      return {
        titulo: `El archivo no es ${esperado}`,
        detalle: `«${file.name}» es un archivo ${ext}. Guardalo como ${esperado} a partir del Plano Guía e intentá de nuevo.`
      };
    }
    if (file.size === 0) {
      return {
        titulo: 'El archivo está vacío',
        detalle: 'No tiene encabezados ni filas. Completá el Plano Guía con al menos una fila de datos debajo de los encabezados.'
      };
    }
    return null;
  }

  private limpiarArchivo(): void {
    this.archivo.set(null);
    this.errorLocal.set(null);
    this.arrastrando.set(false);
    this.profundidadArrastre = 0;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  private tieneArchivos(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
}

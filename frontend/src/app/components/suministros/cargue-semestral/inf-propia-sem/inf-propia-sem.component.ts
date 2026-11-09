import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import * as Papa from 'papaparse';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoEstado, CargueArchivoPasosComponent, CargueArchivoResumen } from '../../../shared/cargue-archivo-pasos.component';
import { EmpresasService, EmpresaItem } from '../../../../services/empresas.service';
import { SuministrosService } from '../../../../services/suministros.service';
import { CarguePropiaSemFila } from '../../../../models/cargue-semestral.models';

interface FilaCsv {
  [key: string]: string | undefined;
  CODAPS?: string;
  CODEMPRESA?: string;
  ANNO?: string;
  MES?: string;
  QRT?: string;
  QLU?: string;
  QNA?: string;
  QBL?: string;
  QR?: string;
  QRS?: string;
  LBL?: string;
  VL?: string;
  ESCE?: string;
  CTLMX?: string;
  CPE?: string;
  NAA?: string;
  TAFA?: string;
  CRTPRO?: string;
  CDFPRO?: string;
  QRSMUNRECP?: string;
}

// Legacy InfPropiaSemestral.vue:107-206.
const columnasPreview: TablaColumn[] = [
  { field: 'aps', header: 'APS' },
  { field: 'empr', header: 'EMPRESA' },
  { field: 'anno', header: 'AÑO' },
  { field: 'mes', header: 'MES' },
  { field: 'qrt', header: 'QRT' },
  { field: 'qlu', header: 'QLU' },
  { field: 'qna', header: 'QNA' },
  { field: 'qbl', header: 'QBL' },
  { field: 'qr', header: 'QR' },
  { field: 'qrs', header: 'QRS' },
  { field: 'qrsmunrecp', header: 'QRSmunrecp' },
  { field: 'lbl', header: 'LBL' },
  { field: 'vl', header: 'VL' },
  { field: 'esce', header: 'ESCE' },
  { field: 'ctlmx', header: 'CTLMX' },
  { field: 'cpe', header: 'CPE' },
  { field: 'naa', header: 'NAA' },
  { field: 'tafa', header: 'TAFA' },
  { field: 'crtpro', header: 'CRTPRO' },
  { field: 'cdfpro', header: 'CDFPRO' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-inf-propia-sem',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent, CargueArchivoPasosComponent],
  templateUrl: './inf-propia-sem.component.html',
  styleUrl: './inf-propia-sem.component.css'
})
export class InfPropiaSemComponent implements OnChanges {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) semestre!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly empresas = signal<EmpresaItem[]>([]);
  readonly empresaSeleccionada = signal<number | null>(null);
  readonly nombreArchivo = signal('');
  readonly filas = signal<CarguePropiaSemFila[]>([]);
  readonly errores = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly estado = signal('');
  readonly procesando = signal(false);

  /** Lectura vigente: un parseo que termina después de Cancelar/Quitar o de elegir otro archivo se descarta. */
  private lecturaActual = 0;

  readonly planoGuiaUrl = 'assets/layout/planos/plano_propio_semestral.csv';
  /** Tamaño del archivo publicado y columnas de su encabezado (descargas-estandar S2). */
  readonly planoGuiaMeta = 'CSV · < 1 KB · 20 columnas';

  // Estado del cargue guiado: la pantalla sigue siendo dueña del parseo, la vista previa y el guardado.
  readonly estadoCargue = computed<CargueArchivoEstado>(() => {
    if (this.guardando()) return 'guardando';
    if (this.procesando()) return 'validando';
    if (this.errores().length) return 'error';
    if (this.filas().length) return 'listo';
    // Archivo leído sin filas de datos (solo encabezados): antes quedaba sin vista previa ni botón de guardar.
    return this.nombreArchivo() ? 'error' : 'vacio';
  });

  readonly erroresCargue = computed(() =>
    this.errores().length ? this.errores() : this.nombreArchivo() && !this.procesando() ? ['El archivo no tiene filas de datos.'] : []
  );

  readonly resumenCargue = computed<CargueArchivoResumen | null>(() => (this.filas().length ? { filas: this.filas().length } : null));

  constructor(
    private readonly empresasService: EmpresasService,
    private readonly service: SuministrosService,
    private readonly confirmation: ConfirmationService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['aps'] && this.aps) {
      this.cargarEmpresas();
    }
  }

  private cargarEmpresas(): void {
    this.empresaSeleccionada.set(null);
    this.limpiarCargue();
    this.empresasService.getEmpresasPropias(this.aps, 1).subscribe({
      next: (items) => this.empresas.set(items || []),
      error: () => this.empresas.set([])
    });
  }

  get columnasPreview(): TablaColumn[] {
    return columnasPreview;
  }

  get periodoDestino(): string {
    return `Semestre ${this.semestre} de ${this.anno} (${this.semestre === 1 ? 'enero a junio' : 'julio a diciembre'})`;
  }

  onArchivoSeleccionado(archivo: File): void {
    if (this.empresaSeleccionada() === null) {
      this.estado.set('');
      this.errores.set(['Debe seleccionar una empresa antes de procesar el archivo.']);
      return;
    }

    // La vista previa anterior se quita apenas empieza a validarse el reemplazo.
    this.limpiarCargue();
    this.nombreArchivo.set(archivo.name);
    this.estado.set('');
    this.procesando.set(true);
    const lectura = ++this.lecturaActual;

    Papa.parse<FilaCsv>(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (lectura !== this.lecturaActual) return;
        this.procesando.set(false);
        this.procesarCsv(results.data);
      },
      error: () => {
        if (lectura !== this.lecturaActual) return;
        this.procesando.set(false);
        this.errores.set(['No fue posible leer el archivo.']);
      }
    });
  }

  // Legacy InfPropiaSemestral.vue:344-400: rows are checked in order and the first mismatch stops with one message.
  private procesarCsv(data: FilaCsv[]): void {
    const empresa = this.empresaSeleccionada();
    let error = '';
    for (const fila of data) {
      if (aNumero(fila.CODAPS) !== this.aps) {
        error = 'El APS Seleccionado no concuerda con el APS del archivo!';
      } else if (aNumero(fila.CODEMPRESA) !== empresa) {
        error = 'La Empresa Seleccionada no concuerda con la Empresa del archivo!';
      } else if (aNumero(fila.ANNO) !== this.anno) {
        error = 'El AÑO Seleccionado no concuerda con los del archivo!';
      } else if (Math.ceil((aNumero(fila.MES) ?? 0) / 6) !== this.semestre) {
        error = 'Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!';
      }
      if (error) break;
    }

    this.errores.set(error ? [error] : []);
    if (error) {
      this.filas.set([]);
      return;
    }

    this.filas.set(data.map((fila) => ({
      aps: this.aps,
      empr: empresa!,
      anno: this.anno,
      mes: aNumero(fila.MES) ?? 0,
      qrt: aNumero(fila.QRT) ?? 0,
      qlu: aNumero(fila.QLU) ?? 0,
      qna: aNumero(fila.QNA) ?? 0,
      qbl: aNumero(fila.QBL) ?? 0,
      qr: aNumero(fila.QR) ?? 0,
      qrs: aNumero(fila.QRS) ?? 0,
      lbl: aNumero(fila.LBL) ?? 0,
      vl: aNumero(fila.VL) ?? 0,
      esce: aNumero(fila.ESCE) ?? 0,
      ctlmx: aNumero(fila.CTLMX) ?? 0,
      cpe: aNumero(fila.CPE) ?? 0,
      naa: aNumero(fila.NAA) ?? 0,
      tafa: aNumero(fila.TAFA) ?? 0,
      crtpro: aNumero(fila.CRTPRO) ?? 0,
      cdfpro: aNumero(fila.CDFPRO) ?? 0,
      // Legacy :429 reads element.QRSMUNRECP; the template header is QRSmunrecp, so the value stays empty.
      qrsmunrecp: aNumero(fila.QRSMUNRECP) ?? undefined
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  guardar(): void {
    if (this.filas().length === 0 || this.errores().length > 0 || this.empresaSeleccionada() === null) return;

    this.confirmation.confirm({
      header: 'Guardar información propia',
      message: `¿Confirmás guardar ${this.filas().length} fila(s) de información propia semestral?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    this.guardando.set(true);
    this.service.setCargueInfPropiaSem({ resumesem: this.filas() }).subscribe({
      next: () => {
        this.estado.set('Información propia semestral guardada correctamente.');
        this.guardando.set(false);
        this.limpiarCargue();
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar la información propia semestral.');
        this.guardando.set(false);
      }
    });
  }

  private limpiarCargue(): void {
    this.lecturaActual++;
    this.procesando.set(false);
    this.nombreArchivo.set('');
    this.filas.set([]);
    this.errores.set([]);
  }
}

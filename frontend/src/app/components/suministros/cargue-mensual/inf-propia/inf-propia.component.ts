import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import * as Papa from 'papaparse';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoPasosComponent } from '../../../shared/cargue-archivo-pasos.component';
import { EmpresasService, EmpresaItem } from '../../../../services/empresas.service';
import { SuministrosService } from '../../../../services/suministros.service';
import { CarguePropiaFila } from '../../../../models/cargue-mensual.models';
import { periodoAnterior } from '../../../../shared/periodo-anterior.util';
import { ERROR_LECTURA, SIN_FILAS_DE_DATOS, estadoCargueMensual, periodoDestinoMensual } from '../cargue-pasos.util';

interface FilaCsv {
  [key: string]: string | undefined;
  CODAPS?: string;
  CODEMPRESA?: string;
  ANNO?: string;
  MES?: string;
  CP?: string;
  MT3AGUA?: string;
  M2CC?: string;
  M2LAV?: string;
  TI?: string;
  TM?: string;
  KLP?: string;
  T?: string;
  QA?: string;
  ESCENARIO?: string;
}

const columnasPreview: TablaColumn[] = [
  { field: 'aps', header: 'APS' },
  { field: 'empr', header: 'EMPRESA' },
  { field: 'anno', header: 'AÑO' },
  { field: 'mes', header: 'MES' },
  { field: 'cp', header: 'CP' },
  { field: 'mt3agua', header: 'MT3AGUA' },
  { field: 'm2cc', header: 'M2CC' },
  { field: 'm2lav', header: 'M2LAV' },
  { field: 'ti', header: 'TI' },
  { field: 'tm', header: 'TM' },
  { field: 'klp', header: 'KLP' },
  { field: 't', header: 'T' },
  { field: 'qa', header: 'QA' },
  { field: 'escenario', header: 'ESCENARIO' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-inf-propia',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent, CargueArchivoPasosComponent],
  templateUrl: './inf-propia.component.html',
  styleUrl: './inf-propia.component.css'
})
export class InfPropiaComponent implements OnChanges {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) mes!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly empresas = signal<EmpresaItem[]>([]);
  readonly empresaSeleccionada = signal<number | null>(null);
  readonly nombreArchivo = signal('');
  readonly filas = signal<CarguePropiaFila[]>([]);
  readonly errores = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly validando = signal(false);
  readonly estado = signal('');

  /** Lectura vigente: un parseo que termina después de Cancelar/Quitar o de elegir otro archivo se descarta. */
  private lecturaActual = 0;

  readonly planoGuiaUrl = 'assets/layout/planos/plano_propio_mensual.csv';
  /** Tamaño del archivo publicado y columnas de su encabezado (descargas-estandar S2). */
  readonly planoGuiaMeta = 'CSV · < 1 KB · 13 columnas';

  /** Estado del cargue guiado: validando mientras se parsea, error/listo según la validación, guardando al guardar. */
  readonly estadoCargue = computed(() => estadoCargueMensual({
    validando: this.validando(),
    guardando: this.guardando(),
    errores: this.errores().length,
    filas: this.filas().length
  }));

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

  // Los datos se guardan en el mes anterior al seleccionado (ver confirmarGuardado).
  get periodoDestino(): string {
    return periodoDestinoMensual(this.anno, this.mes);
  }

  onArchivoSeleccionado(archivo: File): void {
    if (this.empresaSeleccionada() === null) {
      this.estado.set('');
      this.errores.set(['Debe seleccionar una empresa antes de procesar el archivo.']);
      return;
    }

    this.nombreArchivo.set(archivo.name);
    this.estado.set('');
    this.filas.set([]);
    this.errores.set([]);
    this.validando.set(true);
    const lectura = ++this.lecturaActual;

    Papa.parse<FilaCsv>(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (lectura !== this.lecturaActual) return;
        this.validando.set(false);
        this.procesarCsv(results.data);
      },
      error: () => {
        if (lectura !== this.lecturaActual) return;
        this.validando.set(false);
        this.errores.set([ERROR_LECTURA]);
      }
    });
  }

  // Legacy InfPropiaMensual.vue:310-359: only the first row is checked, APS -> empresa -> AÑO y MES (selected month),
  // and the preview keeps the file values (:363-384).
  private procesarCsv(data: FilaCsv[]): void {
    const empresa = this.empresaSeleccionada();
    const primera = data[0];
    let error = '';
    if (!primera) {
      error = SIN_FILAS_DE_DATOS;
    } else if (aNumero(primera.CODAPS) !== this.aps) {
      error = 'El APS Seleccionado no concuerda con el APS del archivo!';
    } else if (aNumero(primera.CODEMPRESA) !== empresa) {
      error = 'La Empresa Seleccionada no concuerda con la Empresa del archivo!';
    } else if (aNumero(primera.ANNO) !== this.anno || aNumero(primera.MES) !== this.mes) {
      error = 'El AÑO y MES Seleccionado no concuerda con los del archivo!';
    }

    if (error) {
      this.errores.set([error]);
      this.filas.set([]);
      return;
    }

    this.errores.set([]);
    this.filas.set(data.map((fila) => ({
      aps: aNumero(fila.CODAPS) ?? this.aps,
      empr: aNumero(fila.CODEMPRESA) ?? empresa!,
      anno: aNumero(fila.ANNO) ?? this.anno,
      mes: aNumero(fila.MES) ?? this.mes,
      cp: aNumero(fila.CP) ?? 0,
      mt3agua: aNumero(fila.MT3AGUA) ?? 0,
      m2cc: aNumero(fila.M2CC) ?? 0,
      m2lav: aNumero(fila.M2LAV) ?? 0,
      ti: aNumero(fila.TI) ?? 0,
      tm: aNumero(fila.TM) ?? 0,
      klp: aNumero(fila.KLP) ?? 0,
      t: aNumero(fila.T) ?? 0,
      qa: aNumero(fila.QA) ?? 0,
      // Legacy :380 maps ESCENARIO as-is: a missing column is not sent and PROP_ESCENARIO stays empty.
      escenario: aNumero(fila.ESCENARIO) ?? undefined
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  guardar(): void {
    if (this.filas().length === 0 || this.empresaSeleccionada() === null) return;

    this.confirmation.confirm({
      header: 'Guardar información propia',
      message: `¿Confirmás guardar ${this.filas().length} fila(s) de información propia para el período seleccionado?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    const empresa = this.empresas().find((e) => e.EMPR_EMPR === this.empresaSeleccionada());
    if (!empresa) return;

    // Legacy InfPropiaMensual.vue:253-266 + CargueService.js:209-228: anno/mes = selected month - 1 and every row shifted
    // back one month.
    const periodo = periodoAnterior(this.anno, this.mes);
    this.guardando.set(true);
    this.service.setCargueInfPropia({
      aps: this.aps,
      empr: { emprempr: empresa.EMPR_EMPR, emprnombre: empresa.EMPR_NOMBRE },
      anno: periodo.anno,
      mes: periodo.mes,
      resumemes: this.filas().map((fila) => ({ ...fila, ...periodoAnterior(fila.anno, fila.mes) }))
    }).subscribe({
      next: () => {
        // Legacy CargueService.js:247-250.
        this.estado.set('Guardado Correctamente');
        this.guardando.set(false);
        this.limpiarCargue();
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar la información propia.');
        this.guardando.set(false);
      }
    });
  }

  private limpiarCargue(): void {
    this.lecturaActual++;
    this.validando.set(false);
    this.nombreArchivo.set('');
    this.filas.set([]);
    this.errores.set([]);
  }
}

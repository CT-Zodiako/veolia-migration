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
import { CargueCompetidorSemFila } from '../../../../models/cargue-semestral.models';

interface FilaCsv {
  [key: string]: string | undefined;
  CODAPS?: string;
  CODEMP?: string;
  ANNO?: string;
  MES?: string;
  N?: string;
  NA?: string;
  ND?: string;
  QLU?: string;
  QNA?: string;
  QBL?: string;
  QR?: string;
  CBLJ?: string;
  LBL?: string;
  CRTCOMP?: string;
  CDFCOMP?: string;
  QRTZ?: string;
}

const columnasPreview: TablaColumn[] = [
  { field: 'aps', header: 'APS' },
  { field: 'empr', header: 'EMPRESA' },
  { field: 'anno', header: 'AÑO' },
  { field: 'mes', header: 'MES' },
  { field: 'n', header: 'N' },
  { field: 'na', header: 'NA' },
  { field: 'nd', header: 'ND' },
  { field: 'qlu', header: 'QLU' },
  { field: 'qna', header: 'QNA' },
  { field: 'qbl', header: 'QBL' },
  { field: 'qr', header: 'QR' },
  { field: 'cblj', header: 'CBLJ' },
  { field: 'lbl', header: 'LBL' },
  { field: 'crtcomp', header: 'CRTCOMP' },
  { field: 'cdfcomp', header: 'CDFCOMP' },
  { field: 'qrtz', header: 'QRTZ' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-inf-competidor-sem',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent, CargueArchivoPasosComponent],
  templateUrl: './inf-competidor-sem.component.html',
  styleUrl: './inf-competidor-sem.component.css'
})
export class InfCompetidorSemComponent implements OnChanges {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) semestre!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly empresas = signal<EmpresaItem[]>([]);
  readonly empresaSeleccionada = signal<number | null>(null);
  readonly nombreArchivo = signal('');
  readonly filas = signal<CargueCompetidorSemFila[]>([]);
  readonly errores = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly estado = signal('');
  readonly procesando = signal(false);

  readonly planoGuiaUrl = 'assets/layout/planos/plano_competidor_semestral.csv';

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
    this.empresasService.getEmpresasPropias(this.aps, 0).subscribe({
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

    this.nombreArchivo.set(archivo.name);
    this.estado.set('');
    this.procesando.set(true);

    Papa.parse<FilaCsv>(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        this.procesando.set(false);
        this.procesarCsv(results.data);
      },
      error: () => this.procesando.set(false)
    });
  }

  // Legacy InfCompetidorSemestral.vue:333-367: rows are checked in order and the first mismatch stops with one message.
  private procesarCsv(data: FilaCsv[]): void {
    const empresa = this.empresaSeleccionada();
    let error = '';
    for (const fila of data) {
      if (aNumero(fila.CODAPS) !== this.aps) {
        error = 'El APS Seleccionado no concuerda con el APS del archivo!';
      } else if (aNumero(fila.CODEMP) !== empresa) {
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
      n: aNumero(fila.N) ?? 0,
      na: aNumero(fila.NA) ?? 0,
      nd: aNumero(fila.ND) ?? 0,
      qlu: aNumero(fila.QLU) ?? 0,
      qna: aNumero(fila.QNA) ?? 0,
      qbl: aNumero(fila.QBL) ?? 0,
      qr: aNumero(fila.QR) ?? 0,
      cblj: aNumero(fila.CBLJ) ?? 0,
      lbl: aNumero(fila.LBL) ?? 0,
      crtcomp: aNumero(fila.CRTCOMP) ?? 0,
      cdfcomp: aNumero(fila.CDFCOMP) ?? 0,
      qrtz: aNumero(fila.QRTZ) ?? 0
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  guardar(): void {
    if (this.filas().length === 0 || this.empresaSeleccionada() === null) return;

    this.confirmation.confirm({
      header: 'Guardar información competidor',
      message: `¿Confirmás guardar ${this.filas().length} fila(s) de información de competidor semestral?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    this.guardando.set(true);
    this.service.setCargueInfCompetidorSemestral({ resumesem: this.filas() }).subscribe({
      next: () => {
        this.estado.set('Información de competidor semestral guardada correctamente.');
        this.guardando.set(false);
        this.limpiarCargue();
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar la información de competidor semestral.');
        this.guardando.set(false);
      }
    });
  }

  private limpiarCargue(): void {
    this.procesando.set(false);
    this.nombreArchivo.set('');
    this.filas.set([]);
    this.errores.set([]);
  }
}

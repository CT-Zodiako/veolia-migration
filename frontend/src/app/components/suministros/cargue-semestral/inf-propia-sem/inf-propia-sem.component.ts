import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import * as Papa from 'papaparse';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../../../shared/tabla-avanzada.component';
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
  { field: 'lbl', header: 'LBL' },
  { field: 'vl', header: 'VL' },
  { field: 'esce', header: 'ESCE' },
  { field: 'ctlmx', header: 'CTLMX' },
  { field: 'cpe', header: 'CPE' },
  { field: 'naa', header: 'NAA' },
  { field: 'tafa', header: 'TAFA' },
  { field: 'crtpro', header: 'CRTPRO' },
  { field: 'cdfpro', header: 'CDFPRO' },
  { field: 'qrsmunrecp', header: 'QRSMUNRECP' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-inf-propia-sem',
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent],
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

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (this.empresaSeleccionada() === null) {
      this.estado.set('');
      this.errores.set(['Debe seleccionar una empresa antes de procesar el archivo.']);
      return;
    }

    this.nombreArchivo.set(archivo.name);
    this.estado.set('');

    Papa.parse<FilaCsv>(archivo, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => this.procesarCsv(results.data)
    });
  }

  private procesarCsv(data: FilaCsv[]): void {
    const errores: string[] = [];
    const empresa = this.empresaSeleccionada();

    data.forEach((fila, index) => {
      const numeroFila = index + 1;
      if (aNumero(fila.CODAPS) !== this.aps) {
        errores.push(`Fila ${numeroFila}: el APS del archivo no coincide con el APS seleccionado.`);
      }
      if (aNumero(fila.CODEMPRESA) !== empresa) {
        errores.push(`Fila ${numeroFila}: la empresa del archivo no coincide con la empresa seleccionada.`);
      }
      if (aNumero(fila.ANNO) !== this.anno) {
        errores.push(`Fila ${numeroFila}: el año del archivo no coincide con el año seleccionado.`);
      }
      const mes = aNumero(fila.MES) ?? 0;
      if (Math.ceil(mes / 6) !== this.semestre) {
        errores.push(`Fila ${numeroFila}: el mes ${fila.MES} está fuera del rango del semestre seleccionado.`);
      }
    });

    this.errores.set(errores);

    if (errores.length > 0) {
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
      qrsmunrecp: aNumero(fila.QRSMUNRECP) ?? 0
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  descargarPlano(): void {
    window.open('assets/layout/planos/plano_propio_semestral.csv', '_blank');
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
    this.nombreArchivo.set('');
    this.filas.set([]);
    this.errores.set([]);
  }
}

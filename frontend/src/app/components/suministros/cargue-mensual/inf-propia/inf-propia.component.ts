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
import { CarguePropiaFila } from '../../../../models/cargue-mensual.models';
import { periodoAnterior } from '../../../../shared/periodo-anterior.util';

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
  imports: [CommonModule, FormsModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent],
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
      if (aNumero(fila.ANNO) !== this.anno || aNumero(fila.MES) !== this.mes) {
        errores.push(`Fila ${numeroFila}: el año/mes del archivo no coincide con el período seleccionado.`);
      }
    });

    this.errores.set(errores);

    if (errores.length > 0) {
      this.filas.set([]);
      return;
    }

    const periodo = periodoAnterior(this.anno, this.mes);
    this.filas.set(data.map((fila) => ({
      aps: this.aps,
      empr: empresa!,
      anno: periodo.anno,
      mes: periodo.mes,
      cp: aNumero(fila.CP) ?? 0,
      mt3agua: aNumero(fila.MT3AGUA) ?? 0,
      m2cc: aNumero(fila.M2CC) ?? 0,
      m2lav: aNumero(fila.M2LAV) ?? 0,
      ti: aNumero(fila.TI) ?? 0,
      tm: aNumero(fila.TM) ?? 0,
      klp: aNumero(fila.KLP) ?? 0,
      t: aNumero(fila.T) ?? 0,
      qa: aNumero(fila.QA) ?? 0,
      escenario: aNumero(fila.ESCENARIO) ?? 0
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  descargarPlano(): void {
    window.open('assets/layout/planos/plano_propio_mensual.csv', '_blank');
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

    this.guardando.set(true);
    this.service.setCargueInfPropia({
      aps: this.aps,
      empr: { emprempr: empresa.EMPR_EMPR, emprnombre: empresa.EMPR_NOMBRE },
      anno: this.anno,
      mes: this.mes,
      resumemes: this.filas()
    }).subscribe({
      next: () => {
        this.estado.set('Información propia guardada correctamente.');
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
    this.nombreArchivo.set('');
    this.filas.set([]);
    this.errores.set([]);
  }
}

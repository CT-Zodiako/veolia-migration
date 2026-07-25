import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import * as Papa from 'papaparse';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../../../shared/tabla-avanzada.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { CargueComercialFila } from '../../../../models/cargue-mensual.models';
import { periodoAnterior } from '../../../../shared/periodo-anterior.util';

interface FilaCsv {
  [key: string]: string | undefined;
  CODAPS?: string;
  APS?: string;
  ANNO?: string;
  MES?: string;
  CODUSO?: string;
  NOMUSO?: string;
  CODFACTOR?: string;
  CODTIPO?: string;
  TIPO?: string;
  TIPONOM?: string;
  CANTIDAD?: string;
  TONELADAS?: string;
}

const columnasPreview: TablaColumn[] = [
  { field: 'codaps', header: 'COD APS' },
  { field: 'aps', header: 'APS' },
  { field: 'anno', header: 'AÑO' },
  { field: 'mes', header: 'MES' },
  { field: 'coduso', header: 'COD USO' },
  { field: 'nomuso', header: 'NOM USO' },
  { field: 'codfactor', header: 'COD FACTOR' },
  { field: 'codtipo', header: 'COD TIPO' },
  { field: 'tipo', header: 'TIPO' },
  { field: 'tiponom', header: 'TIPO NOM' },
  { field: 'cantidad', header: 'CANTIDAD' },
  { field: 'toneladas', header: 'TONELADAS' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-cargue-comercial',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent],
  templateUrl: './cargue-comercial.component.html',
  styleUrl: './cargue-comercial.component.css'
})
export class CargueComercialComponent {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) mes!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly nombreArchivo = signal('');
  readonly filas = signal<CargueComercialFila[]>([]);
  readonly errores = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly estado = signal('');

  readonly resumenVariables = computed(() => {
    const filas = this.filas();
    const n = filas.filter((f) => f.tipo === 1).reduce((acc, f) => acc + f.cantidad, 0);
    const na = filas.filter((f) => [2, 3, 4].includes(f.tipo)).reduce((acc, f) => acc + f.cantidad, 0);
    const nd = filas.filter((f) => f.tipo === 5).reduce((acc, f) => acc + f.cantidad, 0);
    const tafna = filas.reduce((acc, f) => acc + f.toneladas, 0);
    return { n, na, nd, tafna };
  });

  readonly resumenEstratos = computed(() => {
    const porEstrato = new Map<number, { cantidad: number; toneladas: number }>();
    this.filas().filter((f) => f.tipo === 1).forEach((f) => {
      const actual = porEstrato.get(f.codtipo) ?? { cantidad: 0, toneladas: 0 };
      actual.cantidad += f.cantidad;
      actual.toneladas += f.toneladas;
      porEstrato.set(f.codtipo, actual);
    });
    return Array.from(porEstrato.entries()).map(([estrato, valores]) => ({ estrato, ...valores }));
  });

  constructor(
    private readonly service: SuministrosService,
    private readonly confirmation: ConfirmationService
  ) {}

  get columnasPreview(): TablaColumn[] {
    return columnasPreview;
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

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

    data.forEach((fila, index) => {
      const numeroFila = index + 1;
      if (aNumero(fila.CODAPS) !== this.aps) {
        errores.push(`Fila ${numeroFila}: el APS del archivo no coincide con el APS seleccionado.`);
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
      codaps: aNumero(fila.CODAPS) ?? this.aps,
      aps: fila.APS ?? '',
      anno: periodo.anno,
      mes: periodo.mes,
      coduso: aNumero(fila.CODUSO) ?? 0,
      nomuso: fila.NOMUSO ?? '',
      codfactor: aNumero(fila.CODFACTOR) ?? 0,
      codtipo: aNumero(fila.CODTIPO) ?? 0,
      tipo: aNumero(fila.TIPO) ?? 0,
      tiponom: fila.TIPONOM ?? '',
      cantidad: aNumero(fila.CANTIDAD) ?? 0,
      toneladas: aNumero(fila.TONELADAS) ?? 0
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  descargarPlano(): void {
    window.open('assets/layout/planos/plano_usuarios.csv', '_blank');
  }

  guardar(): void {
    if (this.filas().length === 0) return;

    this.confirmation.confirm({
      header: 'Guardar información de usuarios',
      message: `¿Confirmás guardar ${this.filas().length} fila(s) de información comercial para el período seleccionado?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    this.guardando.set(true);
    const periodo = periodoAnterior(this.anno, this.mes);
    this.service.filecarguecomercial({
      aps: this.aps,
      anno: periodo.anno,
      mes: periodo.mes,
      resume: this.resumenVariables(),
      filecontent: this.filas()
    }).subscribe({
      next: () => {
        this.estado.set('Información de usuarios guardada correctamente.');
        this.guardando.set(false);
        this.limpiarCargue();
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar la información de usuarios.');
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

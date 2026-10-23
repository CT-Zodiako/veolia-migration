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

// Legacy CargueComercial.vue:120-179.
const columnasPreview: TablaColumn[] = [
  { field: 'codaps', header: 'Cod. Aps' },
  { field: 'aps', header: 'APS' },
  { field: 'anno', header: 'Año' },
  { field: 'mes', header: 'Mes' },
  { field: 'coduso', header: 'Cod. CU' },
  { field: 'nomuso', header: 'Nombre CU' },
  { field: 'codfactor', header: 'Cod. Factor' },
  { field: 'codtipo', header: 'Cod. Tipo' },
  { field: 'tipo', header: 'Tipo' },
  { field: 'tiponom', header: 'Nom. Tipo' },
  { field: 'cantidad', header: 'Cantidad' },
  { field: 'toneladas', header: 'Toneladas' }
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

  // Legacy CargueComercial.vue:330-342 (calcularResumenxestrato): one entry per TIPO 1 row, no aggregation.
  readonly resumenEstratos = computed(() =>
    this.filas().filter((f) => f.tipo === 1).map((f) => ({ coduso: f.coduso, nomuso: f.nomuso, cantidad: f.cantidad, toneladas: f.toneladas }))
  );

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

  // Legacy CargueComercial.vue:280-306: only the first row is checked, APS -> AÑO y MES (selected month), and the
  // preview keeps the file values (:308-329).
  private procesarCsv(data: FilaCsv[]): void {
    const primera = data[0];
    let error = '';
    if (!primera) {
      error = 'El archivo no contiene filas.';
    } else if (aNumero(primera.CODAPS) !== this.aps) {
      error = 'El APS Seleccionado no concuerda con el APS del archivo!';
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
      codaps: aNumero(fila.CODAPS) ?? this.aps,
      aps: fila.APS ?? '',
      anno: aNumero(fila.ANNO) ?? this.anno,
      mes: aNumero(fila.MES) ?? this.mes,
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
      // Legacy CargueService.js:58-79: every row shifted back one month.
      filecontent: this.filas().map((fila) => ({ ...fila, ...periodoAnterior(fila.anno, fila.mes) }))
    }).subscribe({
      next: () => {
        // Legacy CargueComercial.vue:410.
        this.estado.set('GUARDADO EXITOSAMENTE');
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

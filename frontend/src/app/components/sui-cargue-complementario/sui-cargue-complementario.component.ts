import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import * as Papa from 'papaparse';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { SuiComplementoFilaRequest } from '../../models/sui-integracion.models';
import { SuiIntegracionService } from '../../services/sui-integracion.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

interface FilaCsv {
  [key: string]: string | undefined;
  APSA_ID?: string;
  COM_ANNO?: string;
  COM_MES?: string;
  F24_DET?: string;
  F24_F1ET?: string;
  F24_CPEET?: string;
  F24_PRTZET?: string;
  F24_CEG?: string;
  F35_CAMRERS?: string;
  F35_QRS_MES?: string;
  F35_DISPALT9?: string;
  F35_INCCDFALT9?: string;
  F35_PRCTCRRCP?: string;
  F35_V0?: string;
  F35_VM?: string;
  F35_MCRS?: string;
  F35_ICRSM?: string;
  F35_ICCRS?: string;
  F35_FREIN?: string;
  F35_CAPPERDF?: string;
  F36_VL_MES?: string;
}

const columnasPreview: TablaColumn[] = [
  { field: 'APSA_ID', header: 'APS' },
  { field: 'COM_ANNO', header: 'AÑO' },
  { field: 'COM_MES', header: 'MES' },
  { field: 'F24_DET', header: 'DET' },
  { field: 'F24_F1ET', header: 'F1ET' },
  { field: 'F24_CPEET', header: 'CPEET' },
  { field: 'F24_PRTZET', header: 'PRTZET' },
  { field: 'F24_CEG', header: 'CEG' },
  { field: 'F35_CAMRERS', header: 'CAMRERS' },
  { field: 'F35_QRS_MES', header: 'QRS_MES' },
  { field: 'F35_DISPALT9', header: 'DISPALT9' },
  { field: 'F35_INCCDFALT9', header: 'INCCDFALT9' },
  { field: 'F35_PRCTCRRCP', header: 'PRCTCRRCP' },
  { field: 'F35_V0', header: 'V0' },
  { field: 'F35_VM', header: 'VM' },
  { field: 'F35_MCRS', header: 'MCRS' },
  { field: 'F35_ICRSM', header: 'ICRSM' },
  { field: 'F35_ICCRS', header: 'ICCRS' },
  { field: 'F35_FREIN', header: 'FREIN' },
  { field: 'F35_CAPPERDF', header: 'CAPPERDF' },
  { field: 'F36_VL_MES', header: 'VL_MES' }
];

const CAMPOS_OBLIGATORIOS: Array<{ campo: keyof FilaCsv; etiqueta: string }> = [
  { campo: 'F35_CAMRERS', etiqueta: 'CAMRERS' },
  { campo: 'F35_QRS_MES', etiqueta: 'QRS_MES' },
  { campo: 'F35_DISPALT9', etiqueta: 'DISPALT9' },
  { campo: 'F35_INCCDFALT9', etiqueta: 'INCCDFALT9' },
  { campo: 'F35_PRCTCRRCP', etiqueta: 'PRCTCRRCP' },
  { campo: 'F35_V0', etiqueta: 'V0' },
  { campo: 'F35_VM', etiqueta: 'VM' },
  { campo: 'F35_MCRS', etiqueta: 'MCRS' },
  { campo: 'F35_ICRSM', etiqueta: 'ICRSM' },
  { campo: 'F35_ICCRS', etiqueta: 'ICCRS' },
  { campo: 'F35_FREIN', etiqueta: 'FREIN' },
  { campo: 'F35_CAPPERDF', etiqueta: 'CAPPERDF' },
  { campo: 'F36_VL_MES', etiqueta: 'VL_MES' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-sui-cargue-complementario',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './sui-cargue-complementario.component.html',
  styleUrl: './sui-cargue-complementario.component.css'
})
export class SuiCargueComplementarioComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly verificando = signal(false);
  readonly archivosExistentes = signal<boolean | null>(null);
  readonly cantidadArchivos = signal(0);

  readonly nombreArchivo = signal('');
  readonly filas = signal<FilaCsv[]>([]);
  readonly errores = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly estado = signal('');

  readonly filtrosValidos = computed(() => !!this.aps() && !!this.anno() && !!this.mes());
  readonly mostrarFormulario = computed(() => this.filtrosValidos() && this.archivosExistentes() === false);
  readonly hayPreview = computed(() => this.filas().length > 0 && this.errores().length === 0);

  constructor(
    private readonly service: SuiIntegracionService,
    private readonly confirmation: ConfirmationService
  ) {}

  consultar(): void {
    if (!this.filtrosValidos()) return;
    this.limpiarCargue();
    this.estado.set('');
    this.verificarExistencia();
  }

  private verificarExistencia(): void {
    this.verificando.set(true);
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    this.service.existenArchivosGenerados({ aps: this.aps()!, anno: periodo.anno, mes: periodo.mes }).subscribe({
      next: (res) => {
        this.archivosExistentes.set(res.existen);
        this.cantidadArchivos.set(res.cantidad);
        this.verificando.set(false);
      },
      error: () => {
        this.archivosExistentes.set(null);
        this.verificando.set(false);
      }
    });
  }

  limpiar(): void {
    this.archivosExistentes.set(null);
    this.cantidadArchivos.set(0);
    this.limpiarCargue();
    this.estado.set('');
  }

  descargarPlano(): void {
    window.open('assets/layout/planos/sui_complemento.csv', '_blank');
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
    const aps = this.aps();
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    const errores: string[] = [];

    data.forEach((fila, index) => {
      const filaApsId = aNumero(fila.APSA_ID);
      const filaAnno = aNumero(fila.COM_ANNO);
      const filaMes = aNumero(fila.COM_MES);
      const numeroFila = index + 1;

      if (filaApsId !== aps) {
        errores.push(`Fila ${numeroFila}: el APS del archivo (${fila.APSA_ID}) no coincide con el APS seleccionado.`);
      }
      if (filaAnno !== periodo.anno || filaMes !== periodo.mes) {
        errores.push(`Fila ${numeroFila}: el año/mes del archivo (${fila.COM_ANNO}/${fila.COM_MES}) no coincide con el período seleccionado.`);
      }

      CAMPOS_OBLIGATORIOS.forEach(({ campo, etiqueta }) => {
        if (aNumero(fila[campo]) === null) {
          errores.push(`Fila ${numeroFila}: falta el valor obligatorio ${etiqueta}.`);
        }
      });
    });

    this.errores.set(errores);
    this.filas.set(errores.length === 0 ? data : []);
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  guardar(): void {
    if (!this.hayPreview() || !this.filtrosValidos()) return;

    this.confirmation.confirm({
      header: 'Guardar información complementaria',
      message: `¿Confirmás guardar ${this.filas().length} fila(s) de complemento SUI para el período seleccionado?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    const usuario = Number(JSON.parse(localStorage.getItem('usuario') || '{}')?.SISU_ID || 0);

    const filasRequest: SuiComplementoFilaRequest[] = this.filas().map((fila) => ({
      aps: aNumero(fila.APSA_ID) ?? this.aps()!,
      det: aNumero(fila.F24_DET),
      f1et: aNumero(fila.F24_F1ET),
      cpeet: aNumero(fila.F24_CPEET),
      prtzet: aNumero(fila.F24_PRTZET),
      ceg: aNumero(fila.F24_CEG),
      camrers: aNumero(fila.F35_CAMRERS) ?? 0,
      inccdfalt9: aNumero(fila.F35_INCCDFALT9) ?? 0,
      prctcrrcp: aNumero(fila.F35_PRCTCRRCP) ?? 0,
      v0: aNumero(fila.F35_V0) ?? 0,
      vm: aNumero(fila.F35_VM) ?? 0,
      mcrs: aNumero(fila.F35_MCRS) ?? 0,
      icrsm: aNumero(fila.F35_ICRSM) ?? 0,
      iccrs: aNumero(fila.F35_ICCRS) ?? 0,
      frein: aNumero(fila.F35_FREIN) ?? 0,
      capperdf: aNumero(fila.F35_CAPPERDF) ?? 0,
      qrsMes: aNumero(fila.F35_QRS_MES) ?? 0,
      dispalt9: aNumero(fila.F35_DISPALT9) ?? 0,
      vlMes: aNumero(fila.F36_VL_MES) ?? 0
    }));

    this.guardando.set(true);
    this.service.setCargueInfComplemento({
      aps: this.aps()!,
      anno: periodo.anno,
      mes: periodo.mes,
      usuario,
      filas: filasRequest
    }).subscribe({
      next: (res) => {
        this.estado.set(`Información guardada correctamente: ${res.filasAfectadas} fila(s) afectada(s).`);
        this.guardando.set(false);
        this.limpiarCargue();
        this.verificarExistencia();
      },
      error: (e) => {
        this.estado.set(e?.message || 'No fue posible guardar la información complementaria.');
        this.guardando.set(false);
      }
    });
  }

  get columnasPreview(): TablaColumn[] {
    return columnasPreview;
  }

  private limpiarCargue(): void {
    this.nombreArchivo.set('');
    this.filas.set([]);
    this.errores.set([]);
  }
}

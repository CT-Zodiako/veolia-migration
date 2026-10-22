import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import * as Papa from 'papaparse';
import { CommonPrimeNgModules } from '../../../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../../../shared/tabla-avanzada.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { CargueComercialSemFila } from '../../../../models/cargue-semestral.models';

interface FilaCsv {
  [key: string]: string | undefined;
  CODAPS?: string;
  NOMAPS?: string;
  ANNO?: string;
  SEMESTRE?: string;
  CODUSO?: string;
  NOMUSO?: string;
  COD_FACTOR?: string;
  NOM_FACT?: string;
  COD_TIPO?: string;
  NOM_TIPO?: string;
  SUS_M1?: string;
  SUS_M2?: string;
  SUS_M3?: string;
  SUS_M4?: string;
  SUS_M5?: string;
  SUS_M6?: string;
  AFO_M1?: string;
  AFO_M2?: string;
  AFO_M3?: string;
  AFO_M4?: string;
  AFO_M5?: string;
  AFO_M6?: string;
}

// Legacy CargueComercialSemestral.vue:85-224.
const columnasPreview: TablaColumn[] = [
  { field: 'codaps', header: 'Cod. Aps' },
  { field: 'aps', header: 'APS' },
  { field: 'anno', header: 'Año' },
  { field: 'semestre', header: 'Semestre' },
  { field: 'coduso', header: 'Cod. CU' },
  { field: 'nomuso', header: 'Nombre CU' },
  { field: 'codfactor', header: 'Cod. Factor' },
  { field: 'nomfact', header: 'Nom. Factor' },
  { field: 'codtipo', header: 'Cod. Tipo' },
  { field: 'nomtipo', header: 'Nom. Tipo' },
  { field: 'susm1', header: 'Sus M1' },
  { field: 'susm2', header: 'Sus M2' },
  { field: 'susm3', header: 'Sus M3' },
  { field: 'susm4', header: 'Sus M4' },
  { field: 'susm5', header: 'Sus M5' },
  { field: 'susm6', header: 'Sus M6' },
  { field: 'afom1', header: 'Afo M1' },
  { field: 'afom2', header: 'Afo M2' },
  { field: 'afom3', header: 'Afo M3' },
  { field: 'afom4', header: 'Afo M4' },
  { field: 'afom5', header: 'Afo M5' },
  { field: 'afom6', header: 'Afo M6' }
];

function aNumero(valor: string | undefined): number | null {
  if (valor === undefined || valor === null || valor.trim() === '') return null;
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : null;
}

@Component({
  selector: 'app-cargue-comercial-sem',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, TablaAvanzadaComponent],
  templateUrl: './cargue-comercial-sem.component.html',
  styleUrl: './cargue-comercial-sem.component.css'
})
export class CargueComercialSemComponent {
  @Input({ required: true }) aps!: number;
  @Input({ required: true }) anno!: number;
  @Input({ required: true }) semestre!: number;
  @Output() guardado = new EventEmitter<void>();

  readonly nombreArchivo = signal('');
  readonly filas = signal<CargueComercialSemFila[]>([]);
  readonly errores = signal<string[]>([]);
  readonly guardando = signal(false);
  readonly estado = signal('');

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

  // Legacy CargueComercialSemestral.vue:321-345: rows are checked in order and the first mismatch stops with one message.
  private procesarCsv(data: FilaCsv[]): void {
    let error = '';
    for (const fila of data) {
      if (aNumero(fila.CODAPS) !== this.aps) {
        error = 'El APS Seleccionado no concuerda con el APS del archivo!';
      } else if (aNumero(fila.ANNO) !== this.anno) {
        error = 'El AÑO Seleccionado no concuerda con los del archivo!';
      } else if (aNumero(fila.SEMESTRE) !== this.semestre) {
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
      codaps: aNumero(fila.CODAPS) ?? this.aps,
      aps: fila.NOMAPS ?? '',
      anno: this.anno,
      semestre: this.semestre,
      coduso: aNumero(fila.CODUSO) ?? 0,
      nomuso: fila.NOMUSO ?? '',
      codfactor: aNumero(fila.COD_FACTOR) ?? 0,
      nomfact: aNumero(fila.NOM_FACT) ?? 0,
      codtipo: aNumero(fila.COD_TIPO) ?? 0,
      nomtipo: fila.NOM_TIPO ?? '',
      susm1: aNumero(fila.SUS_M1) ?? 0,
      susm2: aNumero(fila.SUS_M2) ?? 0,
      susm3: aNumero(fila.SUS_M3) ?? 0,
      susm4: aNumero(fila.SUS_M4) ?? 0,
      susm5: aNumero(fila.SUS_M5) ?? 0,
      susm6: aNumero(fila.SUS_M6) ?? 0,
      afom1: aNumero(fila.AFO_M1) ?? 0,
      afom2: aNumero(fila.AFO_M2) ?? 0,
      afom3: aNumero(fila.AFO_M3) ?? 0,
      afom4: aNumero(fila.AFO_M4) ?? 0,
      afom5: aNumero(fila.AFO_M5) ?? 0,
      afom6: aNumero(fila.AFO_M6) ?? 0
    })));
  }

  cancelarCargue(): void {
    this.limpiarCargue();
  }

  descargarPlano(): void {
    window.open('assets/layout/planos/plano_usuarios_semestral.csv', '_blank');
  }

  guardar(): void {
    if (this.filas().length === 0) return;

    this.confirmation.confirm({
      header: 'Guardar información de usuarios',
      message: `¿Confirmás guardar ${this.filas().length} fila(s) de información comercial semestral?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Guardar',
      rejectLabel: 'Cancelar',
      accept: () => this.confirmarGuardado()
    });
  }

  private confirmarGuardado(): void {
    this.guardando.set(true);
    this.service.filecarguecomercialsemestral({ filecontent: this.filas() }).subscribe({
      next: () => {
        // Legacy CargueService.js:31-36.
        this.estado.set('Guardado Correctamente');
        this.guardando.set(false);
        this.limpiarCargue();
        this.guardado.emit();
      },
      error: (e) => {
        this.estado.set(e?.error?.message || 'No fue posible guardar la información de usuarios semestral.');
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

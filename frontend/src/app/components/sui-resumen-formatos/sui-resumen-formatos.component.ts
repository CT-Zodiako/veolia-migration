import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { columnasFormatoSui, EXPLICACION_FORMATOS_HREF, FormatoSui, opcionesPaginaSui } from './sui-formatos-legacy';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { SuiResumenFormatosRow, SuiResumenFormatosService } from '../../services/sui-resumen-formatos.service';

interface FormatoData {
  rows: SuiResumenFormatosRow[];
  columnas: TablaColumn[];
  storageKey: string;
  nombreExportar: string;
  titulo: string;
  opcionesPagina: number[];
}

interface FormatoConfig {
  key: FormatoSui;
  label: string;
  storageKey: string;
  nombreExportar: string;
  titulo: string;
}

@Component({
  selector: 'app-sui-resumen-formatos',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ApsSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './sui-resumen-formatos.component.html',
  styleUrl: './sui-resumen-formatos.component.css'
})
export class SuiResumenFormatosComponent implements OnInit, AfterViewInit {
  aps: number | null = null;
  loading = false;
  error = '';

  readonly formatos: FormatoConfig[] = [
    {
      key: 'f19',
      label: 'Formato 19',
      storageKey: 'sui-resumen-f19',
      nombreExportar: 'SUI_Resumen_F19',
      titulo: 'Variable para el cálculo de la tarifa de aprovechamiento y toneladas conjuntas'
    },
    {
      key: 'f23',
      label: 'Formulario 23',
      storageKey: 'sui-resumen-f23',
      nombreExportar: 'SUI_Resumen_F23',
      titulo: 'Costo de limpieza urbana y costo de barrido y limpieza de vias y áreas públicas'
    },
    {
      key: 'f24',
      label: 'Formulario 24',
      storageKey: 'sui-resumen-f24',
      nombreExportar: 'SUI_Resumen_F24',
      titulo: 'Costo de recolección y transporte'
    },
    {
      key: 'f35',
      label: 'Formulario 35',
      storageKey: 'sui-resumen-f35',
      nombreExportar: 'SUI_Resumen_F35',
      titulo: 'Costo de disposición final operador sitio de disposición final - este aplica solo relleno'
    },
    {
      key: 'f36',
      label: 'Formulario 36',
      storageKey: 'sui-resumen-f36',
      nombreExportar: 'SUI_Resumen_F36',
      titulo: 'Costo de tratamiento de lixiviados - operador sitio de disposición final'
    }
  ];

  readonly explicacionHref = EXPLICACION_FORMATOS_HREF;

  data: Record<string, FormatoData> = {};

  constructor(
    private readonly service: SuiResumenFormatosService,
    private readonly parametrosState: ParametrosConsultaStateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    for (const f of this.formatos) {
      this.data[f.key] = {
        rows: [],
        columnas: columnasFormatoSui(f.key),
        storageKey: f.storageKey,
        nombreExportar: f.nombreExportar,
        titulo: f.titulo,
        opcionesPagina: opcionesPaginaSui(f.key)
      };
    }
  }

  ngAfterViewInit(): void {
    const apsGuardado = this.parametrosState.getAps();
    if (apsGuardado && apsGuardado > 0) {
      this.aps = apsGuardado;
      this.cargar();
    }
  }

  onApsChange(apsId: number | null): void {
    if (this.aps === apsId) {
      return;
    }

    this.aps = apsId;
    if (apsId && apsId > 0) {
      setTimeout(() => this.cargar(), 0);
    } else {
      this.error = apsId === null ? '' : 'Ingresá un APS válido';
      this.limpiar();
    }
  }

  private cargar(): void {
    if (!this.aps || this.aps <= 0) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    forkJoin({
      f19: this.service.getResumenF19(this.aps),
      f23: this.service.getResumenF23(this.aps),
      f24: this.service.getResumenF24(this.aps),
      f35: this.service.getResumenF35(this.aps),
      f36: this.service.getResumenF36(this.aps)
    }).subscribe({
      next: (response) => {
        for (const f of this.formatos) {
          const rows = response[f.key as keyof typeof response] || [];
          this.data[f.key].rows = rows;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.data || 'Error consultando resumen de formatos y formularios SUI';
        this.loading = false;
        this.limpiar();
        this.cdr.markForCheck();
      }
    });
  }

  private limpiar(): void {
    for (const f of this.formatos) {
      this.data[f.key].rows = [];
    }
    this.cdr.markForCheck();
  }
}

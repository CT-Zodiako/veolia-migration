import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { SuiResumenFormatosRow, SuiResumenFormatosService } from '../../services/sui-resumen-formatos.service';

interface FormatoData {
  rows: SuiResumenFormatosRow[];
  columnas: TablaColumn[];
  storageKey: string;
  nombreExportar: string;
  titulo: string;
}

interface FormatoConfig {
  key: string;
  label: string;
  storageKey: string;
  nombreExportar: string;
  titulo: string;
  headers: Record<string, string>;
}

const RESUMEN_F19_HEADERS: Record<string, string> = {
  'F19_ANNO': 'AÑO',
  'F19_MES': 'MES',
  'F19_NJ': 'NJ',
  'F19_NDJ': 'NDJ',
  'F19_CRTJ': 'CRTJ',
  'F19_CDFJ': 'CDFJ',
  'F19_QRTJ': 'QRTJ',
  'F19_QRJ': 'QRJ',
  'F19_QBLJ': 'QBLJ',
  'F19_QLUJ': 'QLUJ',
  'F19_QNAZ': 'QNAZ',
  'F19_QAJ': 'QAJ',
};

const RESUMEN_F23_HEADERS: Record<string, string> = {
  'F23_ANNO': 'AÑO',
  'F23_MES': 'MES',
  'EMPR_EMPR': 'Empresas',
  'F23_ID': 'IDNOMAPS',
  'F23_NUAP': 'NUAP',
  'F23_N': 'N',
  'F23_CP': 'CP',
  'F23_CCC': 'CCC',
  'F23_M2CCJ': 'M2CCJ',
  'F23_CLAVJ': 'CLAVJ',
  'F23_M3AGUAJ': 'M3AGUAJ',
  'F23_M2LAVJ': 'M2LAVJ',
  'F23_CLPJ': 'CLPJ',
  'F23_KLPJ': 'KLPJ',
  'F23_CCEI': 'CCEI',
  'F23_TIJ': 'TIJ',
  'F23_CCEMJ': 'CCEMJ',
  'F23_TMJ': 'TMJ',
  'F23_CLUS': 'CLUS',
  'F23_CBLJ': 'CBLJ',
  'F23_LBLJ': 'LBLJ',
  'F23_CBLS': 'CBLS',
  'F23_FACBLCLUS': 'FACBLCLUS',
  'F23_ABC': 'ABC',
};

const RESUMEN_F24_HEADERS: Record<string, string> = {
  'F24_ANNO': 'AÑO',
  'F24_MES': 'MES',
  'F24_NUAP': 'NUAP',
  'F24_NUSD': 'NUSD',
  'F24_CENTROIDE': 'CENTROIDE',
  'F24_QRT': 'QRT',
  'F24_F1': 'F1',
  'F24_F2': 'F2',
  'F24_CPE': 'CPE',
  'F24_PRTZ': 'PRTZ',
  'F24_DET': 'DET',
  'F24_F1ET': 'F1ET',
  'F24_CPEET': 'CPEET',
  'F24_PRTZET': 'PRTZET',
  'F24_CEG': 'CEG',
  'F24_CRTP': 'CRTP',
  'F24_SALINIDAD': 'SALINIDAD',
  'F24_VACRTABC': 'VACRTABC',
  'F24_VACRT': 'VACRT',
  'F24_FCK': 'FCK',
  'F24_T': 'T',
  'F24_CRTZ': 'CRTZ',
  'F24_CRT': 'CRT',
  'F24_FACRT': 'FACRT',
  'F24_FACCS': 'FACCS',
};

const RESUMEN_F35_HEADERS: Record<string, string> = {
  'F35_ANNO': 'AÑO',
  'F35_MES': 'MES',
  'F35_NUSD': 'NUSD',
  'F35_NOMDF': 'NOMDF',
  'F35_CAMRERS': 'CAMRERS',
  'F35_QRSMES': 'QRSMES',
  'F35_QRSPROM': 'QRSPROM',
  'F35_CDFVU': 'CDFVU',
  'F35_PERADDT': 'PERADDT',
  'F35_CDFPC': 'CDFPC',
  'F35_INCENTIVO': 'INCENTIVO',
  'F35_DISPALT9': 'DISPALT9',
  'F35_INCCDFALT9': 'INCCDFALT9',
  'F35_VACDFABC': 'VACDFABC',
  'F35_VACDF': 'VACDF',
  'F35_PRCTCRRCP': 'PRCTCRRCP',
  'F35_CDF': 'CDF',
  'F35_CDFP': 'CDFP',
  'F35_FACCDF': 'FACCDF',
  'F35_V0': 'V0',
  'F35_VM': 'VM',
  'F35_MCRS': 'MCRS',
  'F35_ICRSM': 'ICRSM',
  'F35_ICCRS': 'ICCRS',
  'F35_FREIN': 'FREIN',
  'F35_CAPREMDF': 'CAPREMDF',
};

const RESUMEN_F36_HEADERS: Record<string, string> = {
  'F36_ANNO': 'AÑO',
  'F36_MES': 'MES',
  'F36_NUSD': 'NUSD',
  'F36_NOMDPTO': 'NOMDPTO',
  'F36_NOMMPIO': 'NOMMPIO',
  'F36_NOMDF': 'NOMDF',
  'F36_VLMES': 'VLMES',
  'F36_VLMPROM': 'VLMPROM',
  'F36_ESCENA': 'ESCENA',
  'F36_CTLMVU': 'CTLMVU',
  'F36_ANNOPOSCLA': 'ANNOPOSCLA',
  'F36_CTLMPC': 'CTLMPC',
  'F36_CTLM': 'CTLM',
  'F36_CTLMX': 'CTLMX',
  'F36_VACTLABC': 'VACTLABC',
  'F36_VACTL': 'VACTL',
  'F36_FCKCTL': 'FCKCTL',
  'F36_QRS': 'QRS',
  'F36_CTL': 'CTL',
  'F36_FACCTL': 'FACCTL',
};

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
      titulo: 'Variable para el cálculo de la tarifa de aprovechamiento y toneladas conjuntas',
      headers: RESUMEN_F19_HEADERS
    },
    {
      key: 'f23',
      label: 'Formulario 23',
      storageKey: 'sui-resumen-f23',
      nombreExportar: 'SUI_Resumen_F23',
      titulo: 'Costo de limpieza urbana y costo de barrido y limpieza de vías y áreas públicas',
      headers: RESUMEN_F23_HEADERS
    },
    {
      key: 'f24',
      label: 'Formulario 24',
      storageKey: 'sui-resumen-f24',
      nombreExportar: 'SUI_Resumen_F24',
      titulo: 'Costo de recolección y transporte',
      headers: RESUMEN_F24_HEADERS
    },
    {
      key: 'f35',
      label: 'Formulario 35',
      storageKey: 'sui-resumen-f35',
      nombreExportar: 'SUI_Resumen_F35',
      titulo: 'Costo de disposición final operador sitio de disposición final - este aplica solo relleno',
      headers: RESUMEN_F35_HEADERS
    },
    {
      key: 'f36',
      label: 'Formulario 36',
      storageKey: 'sui-resumen-f36',
      nombreExportar: 'SUI_Resumen_F36',
      titulo: 'Costo de tratamiento de lixiviados - operador sitio de disposición final',
      headers: RESUMEN_F36_HEADERS
    }
  ];

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
        columnas: [],
        storageKey: f.storageKey,
        nombreExportar: f.nombreExportar,
        titulo: f.titulo
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
          this.data[f.key].columnas = this.buildColumnas(f.key, rows);
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
      this.data[f.key].columnas = [];
    }
    this.cdr.markForCheck();
  }

  private buildColumnas(formatoKey: string, rows: SuiResumenFormatosRow[]): TablaColumn[] {
    if (!rows || rows.length === 0) {
      return [];
    }
    const config = this.formatos.find(f => f.key === formatoKey);
    const headers = config?.headers ?? {};
    const primeraFila = rows[0];
    return Object.keys(primeraFila).map(key => ({
      field: key,
      header: headers[key] ?? key,
      filtrable: true,
      numero: this.esColumnaNumerica(key, primeraFila[key])
    }));
  }

  private esColumnaNumerica(key: string, valor: unknown): boolean {
    const keyUpper = key.toUpperCase();
    // Los IDs/códigos numéricos se alinean a la izquierda como texto.
    if (keyUpper.includes('ID') || keyUpper.includes('COD') || keyUpper.includes('CODIGO')) {
      return false;
    }
    return typeof valor === 'number' && !Number.isNaN(valor);
  }
}

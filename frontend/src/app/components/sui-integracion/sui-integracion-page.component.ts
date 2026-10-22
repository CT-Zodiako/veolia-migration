import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { SuiFormato, SuiTab, InformeDatasetItem } from '../../models/sui-integracion.models';
import { SuiIntegracionService } from '../../services/sui-integracion.service';
import { InformesService } from '../../services/informes.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

const TODOS_LOS_TABS: SuiTab[] = ['F19', 'F23', 'F24', 'F35', 'F36', 'RESUMEN'];

/** Legacy views/sui/Suisui.vue:22-67: tab label and the subtitle shown above each table. */
const TABS: Array<{ value: SuiTab; label: string; subtitulo: string }> = [
  { value: 'F19', label: 'Formato 19', subtitulo: 'Variable para el cálculo de la tarifa de aprovechamiento y toneladas conjuntas' },
  { value: 'F23', label: 'Formulario 23', subtitulo: 'Costo de limpieza urbana y costo de barrido y limpieza de vias y áreas públicas' },
  { value: 'F24', label: 'Formato 24', subtitulo: 'Costo de recolección y transporte' },
  { value: 'F35', label: 'Formato 35', subtitulo: 'Costo de disposición final operador sitio de disposición final - este aplica solo relleno' },
  { value: 'F36', label: 'Formato 36', subtitulo: 'Costo de tratamiento de lixiviados - operador sitio de disposición final' },
  { value: 'RESUMEN', label: 'Resumen Variables', subtitulo: 'Resumen Variables' }
];

type ColumnaLegacy = [field: string, header: string, decimales?: number];

function columnas(defs: ColumnaLegacy[], textos: string[]): TablaColumn[] {
  return defs.map(([field, header, decimales]) => ({
    field,
    header,
    ...(textos.includes(field) ? {} : { numero: true }),
    ...(decimales === undefined ? {} : { decimales })
  }));
}

/**
 * Legacy components/tablesFormatosFormularios/Formato{19,23,24,35,36}.vue: curated columns, headers and
 * redondeo(valor, n) per column (null shown as 0). F24_CENTROIDE used redondeo(…, 55), i.e. unrounded.
 */
const COLUMNAS_SUI: Record<SuiFormato, TablaColumn[]> = {
  F19: columnas([['F19_NJ', 'NJ'], ['F19_NDJ', 'NDJ'], ['F19_CRTJ', 'CRTJ', 2], ['F19_CDFJ', 'CDFJ', 2], ['F19_QRTJ', 'QRTJ', 5],
    ['F19_QRJ', 'QRJ', 5], ['F19_QBLJ', 'QBLJ', 5], ['F19_QLUJ', 'QLUJ', 5], ['F19_QNAZ', 'QNAZ', 5], ['F19_QAJ', 'QAJ', 5]], []),
  F23: columnas([['EMPR_EMPR', 'Empresas'], ['F23_ID', 'IDNOMAPS'], ['F23_NUAP', 'NUAP'], ['F23_N', 'N'], ['F23_CP', 'CP', 2],
    ['F23_CCC', 'CCC', 2], ['F23_M2CCJ', 'M2CCJ'], ['F23_CLAVJ', 'CLAVJ', 2], ['F23_M3AGUAJ', 'M3AGUAJ'], ['F23_M2LAVJ', 'M2LAVJ', 2],
    ['F23_CLPJ', 'CLPJ', 2], ['F23_KLPJ', 'KLPJ'], ['F23_CCEI', 'CCEI', 2], ['F23_TIJ', 'TIJ'], ['F23_CCEMJ', 'CCEMJ', 2],
    ['F23_TMJ', 'TMJ'], ['F23_CLUS', 'CLUS', 2], ['F23_CBLJ', 'CBLJ', 2], ['F23_LBLJ', 'LBLJ', 2], ['F23_CBLS', 'CBLS', 2],
    ['F23_FACBLCLUS', 'FACBLCLUS', 4], ['F23_ABC', 'ABC']], ['EMPR_EMPR', 'F23_ID', 'F23_NUAP']),
  F24: columnas([['F24_NUAP', 'NUAP'], ['F24_NUSD', 'NUSD'], ['F24_CENTROIDE', 'CENTROIDE'], ['F24_QRT', 'QRT', 5], ['F24_F1', 'F1', 2],
    ['F24_F2', 'F2', 2], ['F24_CPE', 'CPE', 2], ['F24_PRTZ', 'PRTZ', 2], ['F24_DET', 'DET'], ['F24_F1ET', 'F1ET'],
    ['F24_CPEET', 'CPEET'], ['F24_PRTZET', 'PRTZET'], ['F24_CEG', 'CEG'], ['F24_CRTP', 'CRTP'], ['F24_SALINIDAD', 'SALINIDAD'],
    ['F24_VACRTABC', 'VACRTABC'], ['F24_VACRT', 'VACRT'], ['F24_FCK', 'FCK'], ['F24_T', 'T'], ['F24_CRTZ', 'CRTZ', 2],
    ['F24_CRT', 'CRT', 2], ['F24_FACRT', 'FACRT', 4], ['F24_FACCS', 'FACCS', 4]], ['F24_NUAP', 'F24_NUSD', 'F24_CENTROIDE']),
  F35: columnas([['F35_NUSD', 'NUSD'], ['F35_NOMDF', 'NOMDF'], ['F35_CAMRERS', 'CAMRERS'], ['F35_QRSMES', 'QRSMES', 5],
    ['F35_QRSPROM', 'QRSPROM', 5], ['F35_CDFVU', 'CDFVU', 2], ['F35_PERADDT', 'PERADDT'], ['F35_CDFPC', 'CDFPC', 2],
    ['F35_INCENTIVO', 'INCENTIVO', 2], ['F35_DISPALT9', 'DISPALT9'], ['F35_INCCDFALT9', 'INCCDFALT9'], ['F35_VACDFABC', 'VACDFABC'],
    ['F35_VACDF', 'VACDF'], ['F35_PRCTCRRCP', 'PRCTCRRCP'], ['F35_CDF', 'CDF', 2], ['F35_CDFP', 'CDFP', 2], ['F35_FACCDF', 'FACCDF', 4],
    ['F35_V0', 'V0'], ['F35_VM', 'VM'], ['F35_MCRS', 'MCRS'], ['F35_ICRSM', 'ICRSM'], ['F35_ICCRS', 'ICCRS'], ['F35_FREIN', 'FREIN'],
    ['F35_CAPREMDF', 'CAPREMDF']], ['F35_NUSD', 'F35_NOMDF']),
  F36: columnas([['F36_NUSD', 'NUSD'], ['F36_NOMDPTO', 'NOMDPTO'], ['F36_NOMMPIO', 'NOMMPIO'], ['F36_NOMDF', 'NOMDF'], ['F36_VLMES', 'VLMES', 5],
    ['F36_VLMPROM', 'VLMPROM', 5], ['F36_ESCENA', 'ESCENA'], ['F36_CTLMVU', 'CTLMVU', 2], ['F36_ANNOPOSCLA', 'ANNOPOSCLA'],
    ['F36_CTLMPC', 'CTLMPC', 2], ['F36_CTLM', 'CTLM', 2], ['F36_CTLMX', 'CTLMX', 2], ['F36_VACTLABC', 'VACTLABC'], ['F36_VACTL', 'VACTL'],
    ['F36_FCKCTL', 'FCKCTL', 6], ['F36_QRS', 'QRS', 5], ['F36_CTL', 'CTL', 2], ['F36_FACCTL', 'FACCTL', 4]],
    ['F36_NUSD', 'F36_NOMDPTO', 'F36_NOMMPIO', 'F36_NOMDF', 'F36_ESCENA', 'F36_ANNOPOSCLA'])
};

/** Legacy export file names per format (Formato*.vue exportFilename). */
const EXPORTAR: Record<SuiFormato, string> = {
  F19: 'InfoFormulario19', F23: 'InfoFormu23', F24: 'InfoFormato24', F35: 'InfoFormato35', F36: 'InfoForma36'
};

interface ResumenTabla {
  nombre: string;
  columnas: TablaColumn[];
  rows: Record<string, unknown>[];
}

@Component({
  selector: 'app-sui-integracion-page',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  template: `
    <section>
      <div class="card-section">
        <app-parametros-consulta
          [wrapInCard]="false"
          [mostrarAps]="true"
          [mostrarBoton]="false"
          [autoConsultar]="true"
          [aps]="aps()"
          (apsChange)="aps.set($event)"
          [anno]="anno()"
          (annoChange)="anno.set($event)"
          [mes]="mes()"
          (mesChange)="mes.set($event)"
          (consultar)="consultar()"
          (parametrosIncompletos)="limpiar()">
        </app-parametros-consulta>
      </div>

      <div class="card-section">
        <div class="flex gap-2 mb-2 flex-wrap align-items-center">
          <button pButton label="Procesar" severity="success" (click)="procesar()" [disabled]="loading() || !filtrosValidos()"></button>
          <a class="explicacion-formatos" href="assets/layout/planos/Explicación formatos y formularios.xlsx" download>⚡ Explicación formatos y formularios</a>
        </div>

        <p-message *ngIf="estado()" severity="info" [text]="estado()"></p-message>
        <p-message *ngIf="error()" severity="error" [text]="error()"></p-message>

        <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
          <p-tablist>
            <p-tab *ngFor="let tab of tabs" [value]="tab.value">{{ tab.label }}</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel *ngFor="let formato of formatos" [value]="formato">
              <h3>{{ subtitulo(formato) }}</h3>
              <app-tabla-avanzada
                [columnas]="columnas[formato]"
                [rows]="formatoData()[formato] || []"
                [storageKey]="'sui-ff-' + formato.toLowerCase()"
                [nombreExportar]="exportar[formato]"
              ></app-tabla-avanzada>
            </p-tabpanel>
            <p-tabpanel value="RESUMEN">
              <h3>{{ subtitulo('RESUMEN') }}</h3>
              <div class="card-section" *ngIf="semestreTitulo()">
                <h3>{{ semestreTitulo() }}</h3>
              </div>
              <div class="card-section" *ngFor="let tabla of resumenTablas(); let i = index">
                <h4>{{ tabla.nombre }}</h4>
                <app-tabla-avanzada
                  [columnas]="tabla.columnas"
                  [rows]="tabla.rows"
                  [storageKey]="'sui-resumen-' + i"
                  [nombreExportar]="tabla.nombre || 'resumen'"
                  [scrollHeight]="'300px'"
                ></app-tabla-avanzada>
              </div>
              <div *ngIf="!resumenTablas().length && !loading()" class="empty-state">No hay datos de resumen variables para los parámetros seleccionados.</div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    </section>
  `,
  styles: [`
    .card-section {
      background: var(--color-bg-card);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    .card-section:last-child { margin-bottom: 0; }
    .empty-state { color: var(--color-text-muted); font-size: 14px; text-align: center; padding: 24px; }
    h3, h4 { color: var(--color-text-body); margin: 0 0 12px; }
    .explicacion-formatos { color: var(--color-brand-accent); font-size: 14px; text-decoration: none; }
    .explicacion-formatos:hover { color: var(--color-brand-medium); text-decoration: underline; }
  `]
})
export class SuiIntegracionPageComponent implements OnInit {
  readonly aps = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly currentTab = signal<SuiTab>('F19');
  readonly formatoData = signal<Record<SuiFormato, Array<Record<string, unknown>>>>({ F19: [], F23: [], F24: [], F35: [], F36: [] });
  readonly estado = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly resumenTablas = signal<ResumenTabla[]>([]);
  readonly semestreTitulo = signal('');
  readonly tabs = TABS;
  readonly formatos: SuiFormato[] = ['F19', 'F23', 'F24', 'F35', 'F36'];
  readonly columnas = COLUMNAS_SUI;
  readonly exportar = EXPORTAR;
  readonly filtrosValidos = computed(() => !!this.aps() && !!this.mes() && !!this.anno());

  constructor(
    private readonly service: SuiIntegracionService,
    private readonly informesService: InformesService,
    private readonly confirmationService: ConfirmationService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.restore();
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tab = (params.get('tab') as SuiTab) || this.currentTab();
      this.currentTab.set(TODOS_LOS_TABS.includes(tab) ? tab : 'F19');
      this.aps.set(this.readNumber(params.get('aps')) ?? this.aps());
      this.mes.set(this.readNumber(params.get('mes')) ?? this.mes());
      this.anno.set(this.readNumber(params.get('anno')) ?? this.anno());
    });
    // Efecto separado a propósito: solo aps/mes/anno navegan el Router (deep-link de la
    // consulta). Cambiar de tab NO debe disparar router.navigate() — hacerlo en cada click
    // competía con las consultas en vuelo al backend real y se sentía como que la pantalla
    // se congelaba.
    effect(() => {
      const params = { aps: this.aps(), mes: this.mes(), anno: this.anno() };
      this.router.navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
    });
    effect(() => {
      const state = { aps: this.aps(), mes: this.mes(), anno: this.anno(), tab: this.currentTab() };
      localStorage.setItem('sui-integracion-state', JSON.stringify(state));
    });
  }

  ngOnInit(): void {
    // Auto-consulta inicial si ya hay parámetros completos (query params o restore).
    setTimeout(() => {
      if (this.filtrosValidos()) {
        this.consultar();
      }
    }, 0);
  }

  consultar(): void {
    if (!this.filtrosValidos()) return;
    this.loading.set(true);
    this.error.set('');
    this.resumenTablas.set([]);
    this.semestreTitulo.set('');
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    const payload = { aps: this.aps()!, mes: periodo.mes, anno: periodo.anno };

    let pending = 6;
    const decrement = (): void => {
      pending--;
      if (pending === 0) {
        this.loading.set(false);
      }
    };

    const handleError = (context: string) => (e: any): void => {
      this.error.update((current) => current ? `${current} | ${context}: ${e?.message || 'error'}` : `${context}: ${e?.message || 'error'}`);
      decrement();
    };

    this.service.consuformu19(payload).subscribe({
      next: (resp) => this.formatoData.update((data) => ({ ...data, F19: resp.filas || [] })),
      error: handleError('F19'),
      complete: decrement
    });

    this.service.consuformu23(payload).subscribe({
      next: (resp) => this.formatoData.update((data) => ({ ...data, F23: resp.filas || [] })),
      error: handleError('F23'),
      complete: decrement
    });

    this.service.consuforma24(payload).subscribe({
      next: (resp) => this.formatoData.update((data) => ({ ...data, F24: resp.filas || [] })),
      error: handleError('F24'),
      complete: decrement
    });

    this.service.consuforma35(payload).subscribe({
      next: (resp) => this.formatoData.update((data) => ({ ...data, F35: resp.filas || [] })),
      error: handleError('F35'),
      complete: decrement
    });

    this.service.consuforma36(payload).subscribe({
      next: (resp) => this.formatoData.update((data) => ({ ...data, F36: resp.filas || [] })),
      error: handleError('F36'),
      complete: decrement
    });

    this.informesService.getCostosJson(payload.aps, payload.anno, payload.mes).subscribe({
      next: (resp) => {
        const dataset = resp?.dataset || [];
        this.resumenTablas.set(dataset.map((item) => ({
          nombre: item.nombre,
          columnas: this.mapColumns(item),
          rows: this.mapRows(item)
        })));
        this.semestreTitulo.set(resp?.semestre || '');
      },
      error: handleError('Resumen Variables'),
      complete: decrement
    });
  }

  limpiar(): void {
    this.formatoData.set({ F19: [], F23: [], F24: [], F35: [], F36: [] });
    this.resumenTablas.set([]);
    this.semestreTitulo.set('');
    this.estado.set('');
    this.error.set('');
  }

  /** Legacy Suisui.vue:156-158 asked "Esta seguro de el proceso del SUI ?" before anything else. */
  procesar(): void {
    if (!this.filtrosValidos()) return;
    this.confirmationService.confirm({
      header: 'Procesar SUI',
      message: '¿Está seguro de ejecutar el proceso del SUI?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Procesar',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.prevalidarYProcesar()
    });
  }

  private prevalidarYProcesar(): void {
    this.loading.set(true);
    this.error.set('');
    this.estado.set('');
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    const payload = { aps: this.aps()!, mes: periodo.mes, anno: periodo.anno };

    this.service.getcanCertificate(payload).subscribe({
      next: (precheck) => {
        if (!precheck.puedeProcesar) {
          this.error.set(precheck.mensajes.join(' | ') || 'No es posible procesar el SUI para los parámetros seleccionados.');
          this.loading.set(false);
          return;
        }
        this.ejecutarProcesar(payload);
      },
      error: (e) => {
        this.error.set(e?.message || 'Error de validación previa al proceso');
        this.loading.set(false);
      }
    });
  }

  // El usuario lo toma el backend del token (legacy req.SISU_ID), nunca del body.
  private ejecutarProcesar(payload: { aps: number; mes: number; anno: number }): void {
    this.service.procesar(payload).subscribe({
      next: (res) => {
        this.estado.set(`Estado: ${res.estado}. Formatos: ${res.formatosProcesados.join(', ')}`);
        this.loading.set(false);
        this.consultar();
      },
      error: (e) => {
        this.error.set(e?.message || 'Error en Procesar');
        this.loading.set(false);
      }
    });
  }

  subtitulo(tab: SuiTab): string {
    return TABS.find((t) => t.value === tab)?.subtitulo ?? '';
  }

  mapColumns(item: InformeDatasetItem): { field: string; header: string; filtrable: boolean }[] {
    return (item.columns || []).map((c) => ({ field: c, header: c, filtrable: true }));
  }

  mapRows(item: InformeDatasetItem): Record<string, unknown>[] {
    const columns = item.columns || [];
    return (item.data || []).map((row) => {
      const record: Record<string, unknown> = {};
      columns.forEach((col, index) => { record[col] = (row as unknown[])[index]; });
      return record;
    });
  }

  onTabChange(value: string | number | undefined): void {
    const tab = String(value ?? 'F19') as SuiTab;
    this.currentTab.set(TODOS_LOS_TABS.includes(tab) ? tab : 'F19');
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem('sui-integracion-state');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { aps?: number; mes?: number; anno?: number; tab?: SuiTab };
      if (Number.isFinite(parsed.aps)) this.aps.set(Number(parsed.aps));
      if (Number.isFinite(parsed.mes)) this.mes.set(Number(parsed.mes));
      if (Number.isFinite(parsed.anno)) this.anno.set(Number(parsed.anno));
      if (parsed.tab && TODOS_LOS_TABS.includes(parsed.tab)) this.currentTab.set(parsed.tab);
    } catch { /* ignore */ }
  }

  private readNumber(value: string | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

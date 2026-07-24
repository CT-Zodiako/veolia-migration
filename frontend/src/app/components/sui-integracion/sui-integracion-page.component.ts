import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { ComplementoDialogComponent } from './complemento-dialog.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { SuiApplicability, SuiComplementoItemRequest, SuiFormato, SuiPrecheckResponse, SuiTab, InformeDatasetItem } from '../../models/sui-integracion.models';
import { SuiIntegracionService } from '../../services/sui-integracion.service';
import { InformesService } from '../../services/informes.service';
import { ApsService } from '../../services/aps.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

const TODOS_LOS_TABS: SuiTab[] = ['F19', 'F23', 'F24', 'F35', 'F36', 'RESUMEN'];

@Component({
  selector: 'app-sui-integracion-page',
  standalone: true,
  imports: [CommonModule, MessageModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent, ComplementoDialogComponent],
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
          <button pButton label="Prevalidar" severity="secondary" (click)="prevalidar()" [disabled]="loading() || !filtrosValidos()"></button>
          <button pButton label="Procesar" severity="success" (click)="procesar()" [disabled]="loading() || !puedeProcesar() || !filtrosValidos()"></button>
          <button pButton label="Complemento" severity="contrast" (click)="openComplemento()" [disabled]="!canEditComplemento()"></button>
          <p-button icon="pi pi-file-excel" label="Explicación formatos y formularios" severity="secondary" [text]="true" (click)="descargarExplicacion()"></p-button>
        </div>

        <p-message *ngIf="estado()" severity="info" [text]="estado()"></p-message>
        <p-message *ngIf="error()" severity="error" [text]="error()"></p-message>

        <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
          <p-tablist>
            <p-tab value="F19" [disabled]="!isTabVisible('F19')">
              <span class="tab-label">F19 <small [class.no-aplica]="getApplicability('F19') === 'NO APLICA'">{{ getApplicability('F19') }}</small></span>
            </p-tab>
            <p-tab value="F23" [disabled]="!isTabVisible('F23')">
              <span class="tab-label">F23 <small [class.no-aplica]="getApplicability('F23') === 'NO APLICA'">{{ getApplicability('F23') }}</small></span>
            </p-tab>
            <p-tab value="F24" [disabled]="!isTabVisible('F24')">
              <span class="tab-label">F24 <small [class.no-aplica]="getApplicability('F24') === 'NO APLICA'">{{ getApplicability('F24') }}</small></span>
            </p-tab>
            <p-tab value="F35" [disabled]="!isTabVisible('F35')">
              <span class="tab-label">F35 <small [class.no-aplica]="getApplicability('F35') === 'NO APLICA'">{{ getApplicability('F35') }}</small></span>
            </p-tab>
            <p-tab value="F36" [disabled]="!isTabVisible('F36')">
              <span class="tab-label">F36 <small [class.no-aplica]="getApplicability('F36') === 'NO APLICA'">{{ getApplicability('F36') }}</small></span>
            </p-tab>
            <p-tab value="RESUMEN" [disabled]="!isTabVisible('RESUMEN')">
              <span class="tab-label">Resumen Variables</span>
            </p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="F19"><app-tabla-avanzada [columnas]="columnasF19()" [rows]="formatoData()['F19'] || []" storageKey="sui-ff-f19" nombreExportar="SUI_F19"></app-tabla-avanzada></p-tabpanel>
            <p-tabpanel value="F23"><app-tabla-avanzada [columnas]="columnasF23()" [rows]="formatoData()['F23'] || []" storageKey="sui-ff-f23" nombreExportar="SUI_F23"></app-tabla-avanzada></p-tabpanel>
            <p-tabpanel value="F24"><app-tabla-avanzada [columnas]="columnasF24()" [rows]="formatoData()['F24'] || []" storageKey="sui-ff-f24" nombreExportar="SUI_F24"></app-tabla-avanzada></p-tabpanel>
            <p-tabpanel value="F35"><app-tabla-avanzada [columnas]="columnasF35()" [rows]="formatoData()['F35'] || []" storageKey="sui-ff-f35" nombreExportar="SUI_F35"></app-tabla-avanzada></p-tabpanel>
            <p-tabpanel value="F36"><app-tabla-avanzada [columnas]="columnasF36()" [rows]="formatoData()['F36'] || []" storageKey="sui-ff-f36" nombreExportar="SUI_F36"></app-tabla-avanzada></p-tabpanel>
            <p-tabpanel value="RESUMEN">
              <div class="card-section" *ngIf="semestreTitulo()">
                <h3>{{ semestreTitulo() }}</h3>
              </div>
              <div class="card-section" *ngFor="let item of resumenDatasets(); let i = index">
                <h4>{{ item.nombre }}</h4>
                <app-tabla-avanzada
                  [columnas]="mapColumns(item)"
                  [rows]="mapRows(item)"
                  [storageKey]="'sui-resumen-' + i"
                  [nombreExportar]="item.nombre || 'resumen'"
                  [scrollHeight]="'300px'"
                ></app-tabla-avanzada>
              </div>
              <div *ngIf="!resumenDatasets().length && !loading()" class="empty-state">No hay datos de resumen variables para los parámetros seleccionados.</div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </div>
    </section>

    <app-sui-complemento-dialog
      [visible]="showComplemento()"
      [formato]="currentFormato()"
      [items]="complementoItems()"
      (close)="showComplemento.set(false)"
      (save)="guardarComplemento($event)"
    />
  `,
  styles: [`
    .tab-label { display: inline-flex; align-items: center; gap: .4rem; }
    .tab-label small {
      font-size: .68rem;
      border-radius: 12px;
      padding: .12rem .45rem;
      font-weight: 700;
      color: var(--color-text-success);
      background: var(--color-bg-success-soft);
      border: 1px solid var(--color-border-success-soft);
    }
    .tab-label small.no-aplica {
      color: var(--color-brand-accent);
      background: var(--color-bg-danger-soft-alt);
      border-color: var(--color-border-danger-soft);
    }
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
  readonly puedeProcesar = signal(false);
  readonly showComplemento = signal(false);
  readonly complementoItems = signal<SuiComplementoItemRequest[]>([]);
  readonly apsaSoloRell = signal<number | null>(null);
  readonly apsaPropio = signal<number | null>(null);
  readonly resumenVariables = signal<InformeDatasetItem[]>([]);
  readonly semestreTitulo = signal('');
  readonly resumenDatasets = computed(() => this.resumenVariables());
  readonly applicability = signal<Record<SuiTab, SuiApplicability>>({
    F19: 'DESCONOCIDO',
    F23: 'DESCONOCIDO',
    F24: 'DESCONOCIDO',
    F35: 'DESCONOCIDO',
    F36: 'DESCONOCIDO',
    RESUMEN: 'APLICA'
  });
  readonly columnasF19 = computed(() => this.buildColumnas(this.formatoData()['F19']));
  readonly columnasF23 = computed(() => this.buildColumnas(this.formatoData()['F23']));
  readonly columnasF24 = computed(() => this.buildColumnas(this.formatoData()['F24']));
  readonly columnasF35 = computed(() => this.buildColumnas(this.formatoData()['F35']));
  readonly columnasF36 = computed(() => this.buildColumnas(this.formatoData()['F36']));
  readonly currentFormato = computed<SuiFormato>(() => {
    const tab = this.currentTab();
    return tab === 'RESUMEN' ? 'F24' : tab;
  });
  readonly filtrosValidos = computed(() => !!this.aps() && !!this.mes() && !!this.anno());

  constructor(
    private readonly service: SuiIntegracionService,
    private readonly informesService: InformesService,
    private readonly apsService: ApsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.restore();
    this.route.queryParamMap.subscribe((params) => {
      const tab = (params.get('tab') as SuiTab) || this.currentTab();
      this.currentTab.set(TODOS_LOS_TABS.includes(tab) ? tab : 'F19');
      this.aps.set(this.readNumber(params.get('aps')) ?? this.aps());
      this.mes.set(this.readNumber(params.get('mes')) ?? this.mes());
      this.anno.set(this.readNumber(params.get('anno')) ?? this.anno());
    });
    effect(() => {
      const state = { aps: this.aps(), mes: this.mes(), anno: this.anno(), tab: this.currentTab() };
      localStorage.setItem('sui-integracion-state', JSON.stringify(state));
      this.router.navigate([], { relativeTo: this.route, queryParams: state, queryParamsHandling: 'merge', replaceUrl: true });
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
    this.resumenVariables.set([]);
    this.semestreTitulo.set('');
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    const payload = { aps: this.aps()!, mes: periodo.mes, anno: periodo.anno };
    this.loadApsApplicability(payload.aps);

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
        this.resumenVariables.set(resp?.dataset || []);
        this.semestreTitulo.set(resp?.semestre || '');
      },
      error: handleError('Resumen Variables'),
      complete: decrement
    });
  }

  limpiar(): void {
    this.formatoData.set({ F19: [], F23: [], F24: [], F35: [], F36: [] });
    this.resumenVariables.set([]);
    this.semestreTitulo.set('');
    this.estado.set('');
    this.error.set('');
  }

  prevalidar(): void {
    if (!this.filtrosValidos()) return;
    this.loading.set(true);
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    this.service.getcanCertificate({ aps: this.aps()!, mes: periodo.mes, anno: periodo.anno }).subscribe({
      next: (res: SuiPrecheckResponse) => {
        this.puedeProcesar.set(res.puedeProcesar);
        this.estado.set(res.mensajes.join(' | ') || 'Prevalidación sin observaciones');
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Error de prevalidación');
        this.loading.set(false);
      }
    });
  }

  procesar(): void {
    if (!this.filtrosValidos()) return;
    const usuario = Number(JSON.parse(localStorage.getItem('usuario') || '{}')?.SISU_ID || 0);
    this.loading.set(true);
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    this.service.procesar({ aps: this.aps()!, mes: periodo.mes, anno: periodo.anno, usuario }).subscribe({
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

  descargarExplicacion(): void {
    window.open('assets/layout/planos/Explicación formatos y formularios.xlsx', '_blank');
  }

  buildColumnas(rows: Array<Record<string, unknown>>): TablaColumn[] {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]).map((field) => ({ field, header: field, filtrable: true }));
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
  openComplemento(): void { this.showComplemento.set(true); }
  canEditComplemento(): boolean {
    const formato = this.currentFormato();
    return ['F24', 'F35', 'F36'].includes(formato) && this.isTabVisible(formato);
  }
  isTabVisible(tab: SuiTab): boolean { return tab === 'RESUMEN' || this.getApplicability(tab) !== 'NO APLICA'; }
  getApplicability(tab: SuiTab): SuiApplicability { return this.applicability()[tab] ?? 'DESCONOCIDO'; }

  guardarComplemento(items: SuiComplementoItemRequest[]): void {
    const formato = this.currentFormato();
    if (!['F24', 'F35', 'F36'].includes(formato) || !this.filtrosValidos()) return;
    this.loading.set(true);
    const periodo = periodoAnterior(this.anno()!, this.mes()!);
    this.service.setCargueInfComplemento({ aps: this.aps()!, mes: periodo.mes, anno: periodo.anno, formato, complementoData: items }).subscribe({
      next: (res) => {
        this.estado.set(`Complemento guardado: ${res.filasAfectadas} filas afectadas.`);
        this.showComplemento.set(false);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'No fue posible guardar complemento');
        this.loading.set(false);
      }
    });
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
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private loadApsApplicability(aps: number): void {
    this.apsService.consultaAps(aps).subscribe({
      next: (items) => {
        const apsInfo = items?.[0];
        const soloRell = Number(apsInfo?.APSA_SOLORELL ?? 0);
        const propio = Number(apsInfo?.APSA_PROPIO ?? 0);

        this.apsaSoloRell.set(Number.isFinite(soloRell) ? soloRell : 0);
        this.apsaPropio.set(Number.isFinite(propio) ? propio : 0);
        this.applicability.set(this.resolveApplicability(this.apsaSoloRell() ?? 0, this.apsaPropio() ?? 0));
        this.ensureCurrentTabIsApplicable();
      },
      error: () => {
        this.apsaSoloRell.set(null);
        this.apsaPropio.set(null);
        this.applicability.set({ F19: 'DESCONOCIDO', F23: 'DESCONOCIDO', F24: 'DESCONOCIDO', F35: 'DESCONOCIDO', F36: 'DESCONOCIDO', RESUMEN: 'APLICA' });
      }
    });
  }

  private resolveApplicability(apsaSoloRell: number, apsaPropio: number): Record<SuiTab, SuiApplicability> {
    const base = apsaSoloRell === 1 ? 'NO APLICA' : 'APLICA';
    const rellenoAplica = apsaSoloRell === 1 || apsaPropio === 1;
    return {
      F19: base,
      F23: base,
      F24: base,
      F35: rellenoAplica ? 'APLICA' : 'NO APLICA',
      F36: rellenoAplica ? 'APLICA' : 'NO APLICA',
      RESUMEN: 'APLICA'
    };
  }

  private ensureCurrentTabIsApplicable(): void {
    if (this.isTabVisible(this.currentTab())) return;
    const fallback = TODOS_LOS_TABS.find((tab) => this.isTabVisible(tab));
    this.currentTab.set(fallback ?? 'F19');
  }
}

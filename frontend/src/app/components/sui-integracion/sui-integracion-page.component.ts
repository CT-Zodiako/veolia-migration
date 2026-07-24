import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { SuiFormato, SuiTab, InformeDatasetItem } from '../../models/sui-integracion.models';
import { SuiIntegracionService } from '../../services/sui-integracion.service';
import { InformesService } from '../../services/informes.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

const TODOS_LOS_TABS: SuiTab[] = ['F19', 'F23', 'F24', 'F35', 'F36', 'RESUMEN'];

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
        </div>

        <p-message *ngIf="estado()" severity="info" [text]="estado()"></p-message>
        <p-message *ngIf="error()" severity="error" [text]="error()"></p-message>

        <p-tabs [value]="currentTab()" (valueChange)="onTabChange($event)">
          <p-tablist>
            <p-tab value="F19">F19</p-tab>
            <p-tab value="F23">F23</p-tab>
            <p-tab value="F24">F24</p-tab>
            <p-tab value="F35">F35</p-tab>
            <p-tab value="F36">F36</p-tab>
            <p-tab value="RESUMEN">Resumen Variables</p-tab>
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
  readonly columnasF19 = computed(() => this.buildColumnas(this.formatoData()['F19']));
  readonly columnasF23 = computed(() => this.buildColumnas(this.formatoData()['F23']));
  readonly columnasF24 = computed(() => this.buildColumnas(this.formatoData()['F24']));
  readonly columnasF35 = computed(() => this.buildColumnas(this.formatoData()['F35']));
  readonly columnasF36 = computed(() => this.buildColumnas(this.formatoData()['F36']));
  readonly filtrosValidos = computed(() => !!this.aps() && !!this.mes() && !!this.anno());

  constructor(
    private readonly service: SuiIntegracionService,
    private readonly informesService: InformesService,
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

  procesar(): void {
    if (!this.filtrosValidos()) return;
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

  private ejecutarProcesar(payload: { aps: number; mes: number; anno: number }): void {
    const usuario = Number(JSON.parse(localStorage.getItem('usuario') || '{}')?.SISU_ID || 0);
    this.service.procesar({ ...payload, usuario }).subscribe({
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

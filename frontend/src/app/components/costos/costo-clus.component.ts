import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTitleSubtitle,
  ApexXAxis,
  NgApexchartsModule
} from 'ng-apexcharts';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { CostosService } from '../../services/costos.service';
import { InformesService } from '../../services/informes.service';
import { ComportaClusItem, CostoClusItem } from '../../models/costos.models';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { mesCorto } from '../../shared/mes-corto.util';
import { CARD_COSTO_COLORS } from './cuadricula-costo.component';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

interface DonutChartConfig {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  title: ApexTitleSubtitle;
  colors: string[];
}

interface AxisChartConfig {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  colors: string[];
}

const TOOLBAR = { show: true, tools: { download: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true } };

const CHART_HEIGHT = 280;

const EMPTY_DONUT: DonutChartConfig = {
  series: [],
  chart: { type: 'donut', height: CHART_HEIGHT, toolbar: TOOLBAR },
  labels: [],
  title: { text: '' },
  colors: CARD_COSTO_COLORS
};

const EMPTY_LINE: AxisChartConfig = {
  series: [],
  chart: { type: 'line', height: CHART_HEIGHT, toolbar: TOOLBAR },
  xaxis: { categories: [] },
  title: { text: '' },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' },
  plotOptions: {},
  legend: { show: true, position: 'bottom' },
  colors: CARD_COSTO_COLORS.slice(0, 5)
};

/**
 * Series del gráfico de línea: réplica del legacy (CostoService.getCompClusChart),
 * que descarta las primeras 3 columnas (INED_ANNO, INED_MES, INED_CP) y grafica
 * las 5 métricas restantes con label `INED_X` -> `X`. Acá se mapean explícito
 * sobre el modelo tipado (mismo resultado, sin depender del orden de claves).
 * El legacy usaba un borderColor aleatorio por serie; se reemplaza por una
 * paleta fija (primeros 5 colores de la paleta de tarjetas) para que el gráfico
 * sea determinista entre recargas.
 */
const COMPORTA_SERIES: ReadonlyArray<{ name: string; field: keyof ComportaClusItem }> = [
  { name: 'M2CCJ', field: 'inedM2ccj' },
  { name: 'M2LAVJ', field: 'inedM2lavj' },
  { name: 'TIJ', field: 'inedTij' },
  { name: 'KLPJ', field: 'inedKlpj' },
  { name: 'TMJ', field: 'inedTmj' }
];

@Component({
  selector: 'app-costo-clus',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    TableModule,
    ProgressBarModule,
    ButtonModule,
    ApsSelectorComponent,
    AnnoSelectorComponent,
    MesSelectorComponent
  ],
  template: `
    <div class="clus-container">
      <div class="card-section selector-section">
        <div class="back-row">
          <p-button
            label="Volver a Cálculo"
            icon="pi pi-arrow-left"
            [text]="true"
            severity="secondary"
            size="small"
            (click)="volverACalculo()"
          ></p-button>
        </div>
        <div class="grid">
          <div class="col-12 md:col-4">
            <app-aps-selector [selectedAps]="aps()" (selectedApsChange)="onParamChange('aps', $event)" />
          </div>
          <div class="col-12 md:col-4">
            <app-anno-selector [selectedAnno]="anno()" (selectedAnnoChange)="onParamChange('anno', $event)" />
          </div>
          <div class="col-12 md:col-4">
            <app-mes-selector [selectedMes]="mes()" (selectedMesChange)="onParamChange('mes', $event)" />
          </div>
        </div>
      </div>

      <div class="card-section" *ngIf="!hasParams()">
        <p class="empty-message">
          Seleccioná APS, año y mes arriba para ver el detalle CLUS.
        </p>
      </div>

      <ng-container *ngIf="hasParams()">
        <div class="error-message" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <div class="card-section">
          <h3 class="section-title">Costo de Limpieza Urbana</h3>

          <p class="empty-message" *ngIf="loadingClus()">Cargando costos CLUS...</p>

          <ng-container *ngIf="!loadingClus()">
            <div class="grid" *ngIf="clusRows().length; else sinCostos">
              <div class="col-12 lg:col-6">
                <apx-chart
                  [series]="donut().series"
                  [chart]="donut().chart"
                  [labels]="donut().labels"
                  [title]="donut().title"
                  [colors]="donut().colors"
                ></apx-chart>
              </div>

              <div class="col-12 lg:col-6">
                <ng-container *ngIf="hasClusJson(); else tablaClusFallback">
                  <h4 class="clus-json-caption">{{ clusJsonNombre() }}</h4>
                  <p-table [value]="clusJsonRows()" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '100%' }">
                    <ng-template pTemplate="header">
                      <tr>
                        <th *ngFor="let col of clusJsonColumns()">{{ col }}</th>
                      </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                      <tr>
                        <td *ngFor="let cell of row" [class.text-right]="isNumericCell(cell)">
                          <p-progressBar *ngIf="isPercentCell(cell); else celdaPlana" [value]="percentValue(cell)"></p-progressBar>
                          <ng-template #celdaPlana>{{ displayCell(cell) }}</ng-template>
                        </td>
                      </tr>
                    </ng-template>
                  </p-table>
                </ng-container>

                <ng-template #tablaClusFallback>
                  <p-table [value]="clusRows()" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '100%' }">
                    <ng-template pTemplate="header">
                      <tr>
                        <th>Actividad</th>
                        <th class="text-right">Valor</th>
                      </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-row>
                      <tr>
                        <td>{{ row.paraNombre }}</td>
                        <td class="text-right">
                          <div class="valor-cell">
                            <span>$ {{ row.costValor | number:'1.2-2' }}</span>
                            <p-progressBar [value]="porcentaje(row.costValor)"></p-progressBar>
                          </div>
                        </td>
                      </tr>
                    </ng-template>
                    <ng-template pTemplate="footer">
                      <tr>
                        <td colspan="2" class="text-right">
                          <strong>TOTAL CLUS: $ {{ totalClus() | number:'1.2-2' }}</strong>
                        </td>
                      </tr>
                    </ng-template>
                  </p-table>
                </ng-template>
              </div>
            </div>

            <ng-template #sinCostos>
              <p class="empty-message">No hay datos de costos CLUS para el período seleccionado.</p>
            </ng-template>
          </ng-container>
        </div>

        <div class="card-section">
          <h3 class="section-title">Comportamiento CLUS</h3>

          <p class="empty-message" *ngIf="loadingComporta()">Cargando comportamiento CLUS...</p>

          <ng-container *ngIf="!loadingComporta()">
            <apx-chart
              *ngIf="line().series.length; else sinComporta"
              [series]="line().series"
              [chart]="line().chart"
              [xaxis]="line().xaxis"
              [title]="line().title"
              [dataLabels]="line().dataLabels"
              [stroke]="line().stroke"
              [plotOptions]="line().plotOptions"
              [legend]="line().legend"
              [colors]="line().colors"
            ></apx-chart>

            <ng-template #sinComporta>
              <p class="empty-message">No hay datos de comportamiento CLUS para el período seleccionado.</p>
            </ng-template>
          </ng-container>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .clus-container { padding: 2px; }

    .back-row { display: flex; justify-content: flex-start; margin-bottom: 4px; }

    .card-section {
      background: var(--color-bg-card);
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 12px;
    }
    .card-section:last-child { margin-bottom: 0; }

    .section-title {
      color: var(--color-brand-strong);
      font-size: 16px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    .text-right { text-align: right; }

    .clus-json-caption {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .valor-cell {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
    }
    .valor-cell span { text-align: right; }
        .valor-cell ::ng-deep .p-progressbar { height: 6px; }

    .empty-message { color: var(--color-text-secondary); margin: 0; }
    .empty-message a { color: var(--color-brand-accent); }

    .error-message {
      background: var(--color-bg-danger-soft);
      border: 1px solid var(--color-border-danger-soft);
      color: var(--color-brand-accent);
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
  `]
})
export class CostoClusComponent implements OnInit, OnDestroy {
  readonly aps = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly anno = signal<number | null>(null);

  readonly hasParams = computed(() => !!(this.aps() && this.mes() && this.anno()));

  readonly clusRows = signal<CostoClusItem[]>([]);
  readonly totalClus = signal(0);
  readonly donut = signal<DonutChartConfig>({ ...EMPTY_DONUT });
  readonly line = signal<AxisChartConfig>({ ...EMPTY_LINE });

  // Dynamic "Componentes CLUS" JSON table (legacy GenericTable parity): when the
  // /informes/clus JSON document brings dataset[0] with columns+data, it replaces
  // the Actividad/Valor fallback table. Title comes from dataset[0].nombre.
  readonly clusJsonNombre = signal('');
  readonly clusJsonColumns = signal<string[]>([]);
  readonly clusJsonRows = signal<unknown[][]>([]);
  readonly hasClusJson = computed(() => this.clusJsonColumns().length > 0 && this.clusJsonRows().length > 0);

  readonly loadingClus = signal(false);
  readonly loadingComporta = signal(false);
  readonly errorMessage = signal('');

  private paramsSub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly costosService: CostosService,
    private readonly informesService: InformesService
  ) {}

  // Selector changes update the URL query params; the queryParamMap
  // subscription in ngOnInit reloads all data for the new period.
  // Keeps current filters so the calculo page restores the same context.
  volverACalculo(): void {
    this.router.navigate(['/calculo'], { queryParamsHandling: 'preserve' });
  }

  onParamChange(param: 'aps' | 'mes' | 'anno', value: number | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [param]: value ?? undefined },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  ngOnInit(): void {
    this.paramsSub = this.route.queryParamMap.subscribe((params) => {
      this.aps.set(this.readNumber(params.get('aps')));
      this.mes.set(this.readNumber(params.get('mes')));
      this.anno.set(this.readNumber(params.get('anno')));

      const aps = this.aps();
      const mes = this.mes();
      const anno = this.anno();
      if (!aps || !mes || !anno) {
        return;
      }

      // Regla legacy (Calculo.vue / Costos.vue): los query params traen el "mes
      // actual" que seleccionó el usuario, pero la consulta opera sobre el mes
      // YA CERRADO -- el anterior.
      const periodo = periodoAnterior(anno, mes);
      this.loadCostosClus(aps, periodo.mes, periodo.anno);
      this.loadComportaClus(aps, periodo.mes, periodo.anno);
    });
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe();
  }

  porcentaje(valor: number): number {
    const total = this.totalClus();
    if (!total) {
      return 0;
    }
    // Réplica del legacy getPorcenje: porcentaje con 2 decimales.
    return parseFloat(((valor * 100) / total).toFixed(2));
  }

  private loadCostosClus(aps: number, mes: number, anno: number): void {
    this.loadingClus.set(true);
    this.clearClusJson();
    this.costosService.consultarCostosClus(aps, mes, anno).subscribe({
      next: (rows) => {
        const data = rows || [];
        this.clusRows.set(data);

        // Réplica del legacy makeDataTable/getCosClusChart: total acumulado con
        // 6 decimales y donut con labels = paraNombre, series = costValor.
        let acumulado = 0;
        for (const row of data) {
          acumulado += row.costValor;
        }
        this.totalClus.set(parseFloat(acumulado.toFixed(6)));

        this.donut.set({
          series: data.map((row) => parseFloat(row.costValor.toFixed(6))),
          labels: data.map((row) => row.paraNombre),
          chart: { type: 'donut', height: CHART_HEIGHT, toolbar: TOOLBAR },
          title: { text: '' },
          colors: CARD_COSTO_COLORS
        });
        // Legacy (Costos.vue getCostoClus): after the donut, fetch the CLUS JSON
        // document; loadingClus is released when that request settles.
        this.loadClusJson(aps, anno, mes);
      },
      error: (err: Error) => {
        this.clusRows.set([]);
        this.totalClus.set(0);
        this.errorMessage.set(err?.message || 'No fue posible consultar los costos CLUS.');
        this.loadingClus.set(false);
      }
    });
  }

  private loadClusJson(aps: number, anno: number, mes: number): void {
    this.informesService.getClusJson(aps, anno, mes).subscribe({
      next: (resp) => {
        const item = resp?.dataset?.[0];
        if (item && (item.columns?.length ?? 0) > 0 && (item.data?.length ?? 0) > 0) {
          this.clusJsonNombre.set(item.nombre || '');
          this.clusJsonColumns.set(item.columns);
          this.clusJsonRows.set(item.data);
        } else {
          this.clearClusJson();
        }
        this.loadingClus.set(false);
      },
      error: () => {
        // Legacy parity: if the CLUS JSON request fails, the Actividad/Valor
        // fallback table stays visible (no hard error).
        this.clearClusJson();
        this.loadingClus.set(false);
      }
    });
  }

  private clearClusJson(): void {
    this.clusJsonNombre.set('');
    this.clusJsonColumns.set([]);
    this.clusJsonRows.set([]);
  }

  // Cell rendering parity with legacy GenericTable.vue:
  // - string containing '%' -> progress bar with parseFloat(value minus '%', ',' -> '.')
  // - numeric string (after ',' -> '.') -> thousands-formatted, right-aligned
  // - anything else -> raw string, left-aligned
  isPercentCell(value: unknown): boolean {
    return this.cellText(value).includes('%');
  }

  percentValue(value: unknown): number {
    return parseFloat(this.cellText(value).replace('%', '').replace(',', '.'));
  }

  isNumericCell(value: unknown): boolean {
    const text = this.cellText(value);
    if (text === '') {
      return false;
    }
    return this.isPercentCell(value) || !isNaN(Number(text.replace(',', '.')));
  }

  displayCell(value: unknown): string {
    const text = this.cellText(value);
    if (this.isPercentCell(value) || !this.isNumericCell(value)) {
      return text;
    }
    return this.formateoMiles(text);
  }

  private cellText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private formateoMiles(text: string): string {
    const parts = text.replace(',', '.').split('.');
    const entero = new Intl.NumberFormat('es-MX').format(Number(parts[0]));
    return parts[1] ? `${entero}.${parts[1]}` : `${entero}`;
  }

  private loadComportaClus(aps: number, mes: number, anno: number): void {
    this.loadingComporta.set(true);
    this.costosService.consultarComportaClus(aps, mes, anno).subscribe({
      next: (rows) => {
        const data = rows || [];
        this.line.set({
          ...EMPTY_LINE,
          series: COMPORTA_SERIES.map((s) => ({
            name: s.name,
            data: data.map((row) => Number(row[s.field]) || 0)
          })),
          xaxis: { categories: data.map((row) => mesCorto(row.inedMes)) },
          chart: { type: 'line', height: CHART_HEIGHT, toolbar: TOOLBAR }
        });
        this.loadingComporta.set(false);
      },
      error: (err: Error) => {
        this.line.set({ ...EMPTY_LINE });
        this.errorMessage.set(err?.message || 'No fue posible consultar el comportamiento CLUS.');
        this.loadingComporta.set(false);
      }
    });
  }

  private readNumber(value: string | null): number | null {
    if (value === null) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}

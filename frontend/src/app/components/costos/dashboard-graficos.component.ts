import { CommonModule } from '@angular/common';
import { Component, effect, input, signal } from '@angular/core';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
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
import { ToneladasService } from '../../services/toneladas.service';
import { TafnaService } from '../../services/tafna.service';
import { KilometrosService } from '../../services/kilometros.service';
import { TrnaService } from '../../services/trna.service';
import { UsuariosGraficoService } from '../../services/usuarios-grafico.service';
import { TarifasService } from '../../services/tarifas.service';
import { mesCorto } from '../../shared/mes-corto.util';

interface DonutChartConfig {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  title: ApexTitleSubtitle;
  colors?: string[];
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
const EMPTY_AXIS: AxisChartConfig = {
  series: [],
  chart: { type: 'bar', height: 300, toolbar: TOOLBAR },
  xaxis: { categories: [] },
  title: { text: '' },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' },
  plotOptions: {},
  legend: { show: false },
  colors: []
};
const EMPTY_DONUT: DonutChartConfig = {
  series: [],
  chart: { type: 'donut', height: 300, toolbar: TOOLBAR },
  labels: [],
  title: { text: '' }
};

@Component({
  selector: 'app-dashboard-graficos',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, NgApexchartsModule],
  template: `
    <div class="grid">
      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="title">QRT</ng-template>
          <apx-chart
            [series]="qrt().series"
            [chart]="qrt().chart"
            [labels]="qrt().labels"
            [title]="qrt().title"
          ></apx-chart>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="title">Qa</ng-template>
          <apx-chart
            [series]="qa().series"
            [chart]="qa().chart"
            [xaxis]="qa().xaxis"
            [title]="qa().title"
            [dataLabels]="qa().dataLabels"
            [stroke]="qa().stroke"
          ></apx-chart>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="title">TAFNA</ng-template>
          <apx-chart
            [series]="tafna().series"
            [chart]="tafna().chart"
            [xaxis]="tafna().xaxis"
            [title]="tafna().title"
            [dataLabels]="tafna().dataLabels"
            [stroke]="tafna().stroke"
          ></apx-chart>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="title">Kilómetros (LBL)</ng-template>
          <apx-chart
            [series]="kilometros().series"
            [chart]="kilometros().chart"
            [xaxis]="kilometros().xaxis"
            [title]="kilometros().title"
            [dataLabels]="kilometros().dataLabels"
            [stroke]="kilometros().stroke"
            [plotOptions]="kilometros().plotOptions"
          ></apx-chart>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="title">TRNA</ng-template>
          <apx-chart
            [series]="trna().series"
            [chart]="trna().chart"
            [xaxis]="trna().xaxis"
            [title]="trna().title"
            [dataLabels]="trna().dataLabels"
            [stroke]="trna().stroke"
          ></apx-chart>
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card>
          <ng-template pTemplate="title">Usuarios Promedio</ng-template>
          <apx-chart
            [series]="usuarios().series"
            [chart]="usuarios().chart"
            [xaxis]="usuarios().xaxis"
            [title]="usuarios().title"
            [dataLabels]="usuarios().dataLabels"
            [stroke]="usuarios().stroke"
            [plotOptions]="usuarios().plotOptions"
            [legend]="usuarios().legend"
          ></apx-chart>
        </p-card>
      </div>

      <div class="col-12">
        <p-card>
          <ng-template pTemplate="title">Tarifas</ng-template>
          <apx-chart
            [series]="tarifas().series"
            [chart]="tarifas().chart"
            [labels]="tarifas().labels"
            [title]="tarifas().title"
          ></apx-chart>
        </p-card>
      </div>
    </div>
  `
})
export class DashboardGraficosComponent {
  readonly aps = input<number | null>(null);
  readonly mes = input<number | null>(null);
  readonly anno = input<number | null>(null);

  readonly qrt = signal<DonutChartConfig>({ ...EMPTY_DONUT, chart: { type: 'donut', height: 300, toolbar: TOOLBAR } });
  readonly qa = signal<AxisChartConfig>({ ...EMPTY_AXIS, chart: { type: 'bar', height: 300, toolbar: TOOLBAR }, colors: ['#f57802'] });
  readonly tafna = signal<AxisChartConfig>({ ...EMPTY_AXIS, chart: { type: 'bar', height: 300, toolbar: TOOLBAR }, colors: ['#9500c7'] });
  readonly kilometros = signal<AxisChartConfig>({
    ...EMPTY_AXIS,
    chart: { type: 'bar', height: 300, toolbar: TOOLBAR },
    plotOptions: { bar: { horizontal: true } },
    colors: ['#006dc7']
  });
  readonly trna = signal<AxisChartConfig>({ ...EMPTY_AXIS, chart: { type: 'line', height: 300, toolbar: TOOLBAR }, colors: ['#2ea39d'] });
  readonly usuarios = signal<AxisChartConfig>({
    ...EMPTY_AXIS,
    chart: { type: 'bar', height: 300, stacked: true, toolbar: TOOLBAR },
    plotOptions: { bar: { horizontal: false } },
    legend: { show: true, position: 'bottom' },
    colors: ['#42A5F5', '#66BB6A', '#FFA726']
  });
  readonly tarifas = signal<DonutChartConfig>({ ...EMPTY_DONUT, chart: { type: 'polarArea', height: 300, toolbar: TOOLBAR } });

  constructor(
    private readonly toneladasService: ToneladasService,
    private readonly tafnaService: TafnaService,
    private readonly kilometrosService: KilometrosService,
    private readonly trnaService: TrnaService,
    private readonly usuariosGraficoService: UsuariosGraficoService,
    private readonly tarifasService: TarifasService
  ) {
    effect(() => {
      const aps = this.aps();
      const mes = this.mes();
      const anno = this.anno();
      if (!aps || !mes || !anno) {
        return;
      }

      this.toneladasService.getQrt(aps, anno, mes).subscribe({
        next: (rows) => {
          this.qrt.set({
            series: rows.map((r) => r.valor),
            labels: rows.map((r) => r.tipo),
            chart: { type: 'donut', height: 300, toolbar: TOOLBAR },
            title: { text: '' }
          });
        }
      });

      this.toneladasService.getQa(aps, anno, mes).subscribe({
        next: (rows) => {
          this.qa.set({
            ...EMPTY_AXIS,
            series: [{ name: 'Qa', data: rows.map((r) => r.valor) }],
            xaxis: { categories: rows.map((r) => mesCorto(r.mes)) },
            chart: { type: 'bar', height: 300, toolbar: TOOLBAR },
            colors: ['#f57802']
          });
        }
      });

      this.tafnaService.getTafna(aps, anno, mes).subscribe({
        next: (rows) => {
          this.tafna.set({
            ...EMPTY_AXIS,
            series: [{ name: 'TAFNA', data: rows.map((r) => r.valor) }],
            xaxis: { categories: rows.map((r) => mesCorto(r.mes)) },
            chart: { type: 'bar', height: 300, toolbar: TOOLBAR },
            colors: ['#9500c7']
          });
        }
      });

      this.kilometrosService.getLbl(aps, anno, mes).subscribe({
        next: (rows) => {
          this.kilometros.set({
            ...EMPTY_AXIS,
            series: [{ name: 'LBL', data: rows.map((r) => r.valor) }],
            xaxis: { categories: rows.map((r) => mesCorto(r.mes)) },
            chart: { type: 'bar', height: 300, toolbar: TOOLBAR },
            plotOptions: { bar: { horizontal: true } },
            colors: ['#006dc7']
          });
        }
      });

      this.trnaService.getTrna(aps, anno, mes).subscribe({
        next: (rows) => {
          this.trna.set({
            ...EMPTY_AXIS,
            series: [{ name: 'TRNA', data: rows.map((r) => r.trna) }],
            xaxis: { categories: rows.map((r) => r.faprNombre) },
            chart: { type: 'line', height: 300, toolbar: TOOLBAR },
            colors: ['#2ea39d']
          });
        }
      });

      this.usuariosGraficoService.getUsuagraf(aps, anno, mes).subscribe({
        next: (rows) => {
          this.usuarios.set({
            ...EMPTY_AXIS,
            series: rows.map((r) => ({ name: r.tipo, data: [r.valor] })),
            xaxis: { categories: ['Promedio 6 meses'] },
            chart: { type: 'bar', height: 300, stacked: true, toolbar: TOOLBAR },
            plotOptions: { bar: { horizontal: false } },
            legend: { show: true, position: 'bottom' },
            colors: ['#42A5F5', '#66BB6A', '#FFA726']
          });
        }
      });

      this.tarifasService.getchartTarifas(aps, anno, mes).subscribe({
        next: (points) => {
          this.tarifas.set({
            series: points.map((p) => p.value),
            labels: points.map((p) => p.label),
            chart: { type: 'polarArea', height: 300, toolbar: TOOLBAR },
            title: { text: '' }
          });
        }
      });
    });
  }
}

import {
  ApexAxisChartSeries,
  ApexChart,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexXAxis
} from 'ng-apexcharts';
import { LblItem, QaItem, QrtItem } from '../../models/costos.models';
import { TafnaResponse } from '../../models/tafna.models';
import { TrnaResponse } from '../../models/trna.models';
import { UsuarioPromedioResponse } from '../../models/usuarios-grafico.models';
import { TarifaRow } from '../../services/tarifas.service';
import { mesCorto } from '../../shared/mes-corto.util';

/** Apex config of one Cálculo Tarifas chart (legacy views/procesos/Calculo.vue:40-102). */
export interface GraficaCalculo {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  xaxis: ApexXAxis;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  colors: string[];
}

const ALTO = 260;

function grafica(tipo: ApexChart['type'], parcial: Partial<GraficaCalculo>): GraficaCalculo {
  return {
    series: [],
    chart: { type: tipo, height: ALTO, toolbar: { show: false } },
    labels: [],
    xaxis: {},
    plotOptions: {},
    legend: { show: false },
    colors: [],
    ...parcial
  };
}

// Legacy CostoService.getQrtChart: doughnut, labels = TIPO, data = VALOR, legend right.
export function graficaQrt(filas: QrtItem[]): GraficaCalculo {
  return grafica('donut', {
    series: filas.map((f) => f.valor),
    labels: filas.map((f) => f.tipo),
    legend: { show: true, position: 'right' },
    colors: ['#42A5F5', '#66BB6A', '#FFA726']
  });
}

// Legacy CostoService.getQachart / TafnaService.getChartTafna: bar per month (monthService.nombreMes).
function barrasPorMes(filas: { mes: number; valor: number }[], color: string): GraficaCalculo {
  return grafica('bar', {
    series: [{ name: '', data: filas.map((f) => f.valor) }],
    xaxis: { categories: filas.map((f) => mesCorto(f.mes)) },
    colors: [color]
  });
}

export const graficaQa = (filas: QaItem[]) => barrasPorMes(filas, '#f57802');
export const graficaTafna = (filas: TafnaResponse[]) => barrasPorMes(filas, '#9500c7');

// Legacy KilometrosService.getChartKilometros + Calculo.vue:658-680 (getBarOptions): horizontal bar per month, axis from
// floor(min - 1%) to floor(max + 1%).
export function graficaLbl(filas: LblItem[]): GraficaCalculo {
  const base = barrasPorMes(filas, '#006dc7');
  const valores = filas.map((f) => f.valor);
  const xaxis: ApexXAxis = { ...base.xaxis };
  if (valores.length) {
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    xaxis.min = Math.floor(min - min * 0.01);
    xaxis.max = Math.floor(max + max * 0.01);
  }
  return { ...base, xaxis, plotOptions: { bar: { horizontal: true } } };
}

// Legacy TrnaService.getChartTrna: line, labels = FAPR_NOMBRE, data = TRNA.
export function graficaTrna(filas: TrnaResponse[]): GraficaCalculo {
  return grafica('line', {
    series: [{ name: '', data: filas.map((f) => f.trna) }],
    xaxis: { categories: filas.map((f) => f.faprNombre) },
    colors: ['#2ea39d']
  });
}

// Legacy UsuariosService.getChartUsuarios: stacked bar with label "N", one dataset per TIPO (three datasets); null when empty.
export function graficaUsuarios(filas: UsuarioPromedioResponse[]): GraficaCalculo | null {
  const usadas = filas.slice(0, 3);
  if (!usadas.length) return null;
  return grafica('bar', {
    chart: { type: 'bar', height: ALTO, stacked: true, toolbar: { show: false } },
    series: usadas.map((f) => ({ name: f.tipo, data: [f.valor] })),
    xaxis: { categories: ['N'] },
    legend: { show: true },
    colors: ['#42A5F5', '#66BB6A', '#FFA726']
  });
}

// Legacy TarifasService.getchartTarifas: polarArea of the first tarifa row without its first three columns.
export function graficaTarifas(filas: TarifaRow[]): GraficaCalculo {
  const fila = filas[0] ?? {};
  const entradas = Object.entries(fila).slice(3);
  return grafica('polarArea', {
    series: entradas.map(([, valor]) => Number(valor)),
    labels: entradas.map(([clave]) => clave),
    legend: { show: true },
    colors: ['#72a32e', '#db0000', '#83db00', '#ebc22f', '#9b00de', '#2ea39d', '#27b800', '#72a32e', '#ff028c', '#d6b20f']
  });
}

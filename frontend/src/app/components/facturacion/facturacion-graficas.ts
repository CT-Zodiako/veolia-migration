import { ChartConfiguration, TooltipItem } from 'chart.js';
import { ResumenFacturacion, TonoResumen, formatoEje, formatoNumero } from './facturacion-resumen';

/** Theme colors read from the component's CSS custom properties (light/dark). */
export interface PaletaGraficas {
  subsidio: string;
  contribucion: string;
  neutro: string;
  fondo: string;
  texto: string;
  textoSuave: string;
  rejilla: string;
  fuente: string;
}

type Config = ChartConfiguration<'bar' | 'line', (number | [number, number] | null)[], string>;

const colorTono = (p: PaletaGraficas, tono: TonoResumen) =>
  tono === 'subsidio' ? p.subsidio : tono === 'contribucion' ? p.contribucion : p.neutro;

function base(p: PaletaGraficas, etiquetaValor: (item: TooltipItem<'bar' | 'line'>) => string | null): Config['options'] {
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    font: { family: p.fuente },
    plugins: {
      legend: { display: false },
      tooltip: {
        filter: (item) => etiquetaValor(item) !== null,
        callbacks: { label: (item) => etiquetaValor(item) ?? '' }
      }
    }
  } as Config['options'];
}

/** (a) Tarifa plena vs what each clase de uso pays: a dumbbell per clase. */
export function graficaClases(r: ResumenFacturacion, p: PaletaGraficas): Config {
  const colores = r.clases.map((c) => colorTono(p, c.tono));
  return {
    type: 'bar',
    data: {
      labels: r.clases.map((c) => c.clase),
      datasets: [
        {
          type: 'bar',
          label: 'Diferencia',
          data: r.clases.map((c) => (c.plena !== null && c.paga !== null ? [Math.min(c.plena, c.paga), Math.max(c.plena, c.paga)] : null)),
          backgroundColor: colores,
          barThickness: 2,
          order: 2
        },
        {
          type: 'line',
          label: 'Tarifa plena',
          data: r.clases.map((c) => c.plena),
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 7,
          pointBackgroundColor: p.fondo,
          pointBorderColor: p.neutro,
          pointBorderWidth: 1.5,
          order: 1
        },
        {
          type: 'line',
          label: 'Paga',
          data: r.clases.map((c) => c.paga),
          showLine: false,
          pointRadius: 6,
          pointHoverRadius: 7,
          pointBackgroundColor: colores,
          pointBorderColor: colores,
          order: 0
        }
      ]
    },
    options: {
      ...base(p, (item) => (item.datasetIndex === 0 ? null : `${item.dataset.label}: ${formatoNumero(item.parsed.x, 2)}`)),
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: p.textoSuave, font: { size: 11 }, callback: (v) => formatoEje(Number(v)) },
          grid: { color: p.rejilla },
          border: { display: false }
        },
        y: { ticks: { color: p.texto, font: { size: 12 } }, grid: { display: false }, border: { display: false } }
      }
    }
  };
}

/** (b) Each component of the tarifa plena next to the same component with subsidio y contribución, for one clase. */
export function graficaComponentes(r: ResumenFacturacion, p: PaletaGraficas): Config {
  const serie = (label: string, color: string | string[], valor: (i: number) => number | null) => ({
    type: 'bar' as const,
    label,
    data: r.componentes.map((_, i) => valor(i)),
    backgroundColor: color,
    borderRadius: 4,
    barThickness: 8
  });
  return {
    type: 'bar',
    data: {
      labels: r.componentes.map((c) => c.componente),
      datasets: [
        serie('Tarifa plena', p.neutro, (i) => r.componentes[i].plena),
        serie('Con subsidio y contribución', r.componentes.map((c) => colorTono(p, c.tono)), (i) => r.componentes[i].syc)
      ]
    },
    options: {
      ...base(p, (item) => `${item.dataset.label}: ${formatoNumero(item.parsed.x, 2)}`),
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: p.textoSuave, font: { size: 11 }, callback: (v) => formatoEje(Number(v)) },
          grid: { color: p.rejilla },
          border: { display: false }
        },
        y: { ticks: { color: p.texto, font: { size: 13, weight: 500 } }, grid: { display: false }, border: { display: false } }
      }
    }
  };
}

/** (c) What estratos 1, 4 and 6 pay for each tipo de tarifa. */
export function graficaTiposTarifa(r: ResumenFacturacion, p: PaletaGraficas): Config {
  const serie = (label: string, color: string, valor: (i: number) => number | null) => ({
    type: 'bar' as const,
    label,
    data: r.porTipoTarifa.map((_, i) => valor(i)),
    backgroundColor: color,
    borderRadius: 4,
    barThickness: 8
  });
  return {
    type: 'bar',
    data: {
      labels: r.porTipoTarifa.map((t) => t.tipoTarifa),
      datasets: [
        serie('Estrato 1', p.subsidio, (i) => r.porTipoTarifa[i].estrato1),
        serie('Estrato 4', p.neutro, (i) => r.porTipoTarifa[i].estrato4),
        serie('Estrato 6', p.contribucion, (i) => r.porTipoTarifa[i].estrato6)
      ]
    },
    options: {
      ...base(p, (item) => `${item.dataset.label}: ${formatoNumero(item.parsed.x, 0)}`),
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: p.textoSuave, font: { size: 11 }, callback: (v) => formatoEje(Number(v)) },
          grid: { color: p.rejilla },
          border: { display: false }
        },
        y: { ticks: { color: p.texto, font: { size: 13, weight: 500 } }, grid: { display: false }, border: { display: false } }
      }
    }
  };
}

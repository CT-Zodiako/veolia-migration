import { calcularBarrasFormatos, calcularKpisSui, contarPorEstadoSui, estadoFormato, filtrarPorEstadoSui } from './sui-dashboard.util';

const FILAS = [
  { APSID: 1, APSNOM: 'Tunja', F19: 'PROCESADO', F23: 'Pendiente', F24: 'NO APLICA', F35: 'PROCESADO', F36: 'PROCESADO' },
  { APSID: 2, APSNOM: 'Duitama', F19: 'PROCESADO', F23: 'PROCESADO', F24: 'NO APLICA', F35: 'PROCESADO', F36: 'PROCESADO' },
  { APSID: 3, APSNOM: 'Sogamoso', F19: ' pendiente ', F23: 'PENDIENTE', F24: 'PROCESADO', F35: 'PROCESADO', F36: 'NO APLICA' }
];

describe('sui-dashboard.util', () => {
  // DashBoard.vue:157-163 definirColor (case-insensitive): PENDIENTE, NO APLICA, anything else processed.
  it('classifies a format value like legacy definirColor', () => {
    expect(['PROCESADO', 'Pendiente', ' pendiente ', 'no aplica', '', null].map(estadoFormato)).toEqual([
      'procesado', 'pendiente', 'pendiente', 'no-aplica', 'procesado', 'procesado'
    ]);
  });

  it('computes the KPIs from every row', () => {
    expect(calcularKpisSui(FILAS)).toEqual({
      total: 3,
      alDia: 1,
      conPendientes: 2,
      porcentaje: 33,
      nombresPendientes: ['Tunja', 'Sogamoso'],
      formatosProcesados: 9,
      formatosAplicables: 12,
      porcentajeFormatos: 75
    });
  });

  it('returns zeroed KPIs without rows', () => {
    expect(calcularKpisSui([])).toMatchObject({ total: 0, porcentaje: 0, porcentajeFormatos: 0 });
  });

  it('builds one bar per format with processed over applicable', () => {
    expect(calcularBarrasFormatos(FILAS)).toEqual([
      { formato: 'F19', procesados: 2, pendientes: 1, aplicables: 3, ancho: 67 },
      { formato: 'F23', procesados: 1, pendientes: 2, aplicables: 3, ancho: 33 },
      { formato: 'F24', procesados: 1, pendientes: 0, aplicables: 1, ancho: 100 },
      { formato: 'F35', procesados: 3, pendientes: 0, aplicables: 3, ancho: 100 },
      { formato: 'F36', procesados: 2, pendientes: 0, aplicables: 2, ancho: 100 }
    ]);
    expect(calcularBarrasFormatos([])).toEqual([]);
  });

  it('filters and counts by APS state', () => {
    expect(filtrarPorEstadoSui(FILAS, 'todos')).toEqual(FILAS);
    expect(filtrarPorEstadoSui(FILAS, 'alDia').map((r) => r.APSID)).toEqual([2]);
    expect(filtrarPorEstadoSui(FILAS, 'pendientes').map((r) => r.APSID)).toEqual([1, 3]);
    expect(contarPorEstadoSui(FILAS)).toEqual({ todos: 3, alDia: 1, pendientes: 2 });
  });
});

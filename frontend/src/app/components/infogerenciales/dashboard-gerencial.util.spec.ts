import { calcularBarrasPorDia, calcularKpis, contarPorEstado, filtrarPorEstado } from './dashboard-gerencial.util';

const fila = (id: number, nombre: string, fecha: string | null, correo: string | null = 'a@x.co') => ({
  APSA_ID: id,
  APSA_NOMAPS: nombre,
  TARI_FECHACREACION: fecha,
  SISU_CORREO: correo
});

// Unordered on purpose: the backend sorts by APS name, not by date.
const filas = [
  fila(1004, 'Aguachica', '2026-08-18T09:00:00'),
  fila(1008, 'Anserma', '2026-09-18T08:00:00'),
  fila(1024, 'Barrancabermeja', '2026-08-18T11:00:00'),
  fila(1009, 'Chinchiná', null, null),
  fila(1017, 'Buga', '2026-09-03T10:00:00'),
  fila(1014, 'Bucaramanga', '2026-08-18T12:00:00'),
  fila(1020, 'Dosquebradas', '')
];

describe('calcularKpis', () => {
  it('counts calculated APS over all rows, rounds the percent and lists pending names', () => {
    const kpis = calcularKpis(filas);

    expect(kpis.total).toBe(7);
    expect(kpis.calculados).toBe(5);
    expect(kpis.pendientes).toBe(2);
    expect(kpis.porcentaje).toBe(71); // 5/7 = 71.4 %
    expect(kpis.nombresPendientes).toEqual(['Chinchiná', 'Dosquebradas']);
  });

  it('takes the latest calculation date (dd/MM/yyyy) and the APS that has it', () => {
    const kpis = calcularKpis(filas);

    expect(kpis.ultimaFecha).toBe('18/09/2026');
    expect(kpis.ultimaAps).toBe('Anserma');
  });

  it('breaks a same-day tie by the later time of day', () => {
    const kpis = calcularKpis([fila(1, 'Temprano', '2026-09-18T07:00:00'), fila(2, 'Tarde', '2026-09-18T15:00:00')]);

    expect(kpis.ultimaAps).toBe('Tarde');
  });

  it('returns zeros and no latest date when there are no rows or no calculations', () => {
    expect(calcularKpis([])).toEqual({
      total: 0,
      calculados: 0,
      pendientes: 0,
      porcentaje: 0,
      nombresPendientes: [],
      ultimaFecha: null,
      ultimaAps: null
    });
    expect(calcularKpis([fila(1, 'Sola', null)]).ultimaFecha).toBeNull();
  });
});

describe('calcularBarrasPorDia', () => {
  it('groups by calendar day in ascending order, labels dd/MM and puts Pendiente last', () => {
    const barras = calcularBarrasPorDia(filas);

    expect(barras.map((b) => [b.etiqueta, b.cantidad, b.pendiente])).toEqual([
      ['18/08', 3, false],
      ['03/09', 1, false],
      ['18/09', 1, false],
      ['Pendiente', 2, true]
    ]);
  });

  it('sizes each bar proportionally to the largest count, Pendiente included', () => {
    const barras = calcularBarrasPorDia(filas);

    expect(barras.map((b) => Math.round(b.ancho))).toEqual([100, 33, 33, 67]);
  });

  it('orders days across years and still shows Pendiente with zero when everything is calculated', () => {
    const barras = calcularBarrasPorDia([fila(1, 'A', '2027-01-02T00:00:00'), fila(2, 'B', '2026-12-31T00:00:00')]);

    expect(barras.map((b) => [b.etiqueta, b.cantidad, b.ancho])).toEqual([
      ['31/12', 1, 100],
      ['02/01', 1, 100],
      ['Pendiente', 0, 0]
    ]);
  });

  it('has no bars without rows', () => {
    expect(calcularBarrasPorDia([])).toEqual([]);
  });
});

describe('filtrarPorEstado / contarPorEstado', () => {
  it('keeps every row, only calculated or only pending rows, in their original order', () => {
    expect(filtrarPorEstado(filas, 'todos')).toEqual(filas);
    expect(filtrarPorEstado(filas, 'calculados').map((r) => r.APSA_ID)).toEqual([1004, 1008, 1024, 1017, 1014]);
    expect(filtrarPorEstado(filas, 'pendientes').map((r) => r.APSA_ID)).toEqual([1009, 1020]);
  });

  it('counts each chip', () => {
    expect(contarPorEstado(filas)).toEqual({ todos: 7, calculados: 5, pendientes: 2 });
  });
});

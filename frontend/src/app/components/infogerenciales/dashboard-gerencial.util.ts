import { formatearFechaLegacy } from './fecha-legacy.util';

/** Fila de getDashBoardGerencial: APSA_ID, APSA_NOMAPS, TARI_FECHACREACION, SISU_CORREO. */
export type FilaDashboard = Record<string, unknown>;

export type FiltroEstado = 'todos' | 'calculados' | 'pendientes';

export interface KpisDashboard {
  total: number;
  calculados: number;
  pendientes: number;
  porcentaje: number;
  nombresPendientes: string[];
  ultimaFecha: string | null;
  ultimaAps: string | null;
}

export interface BarraDia {
  etiqueta: string;
  cantidad: number;
  /** Largo de la barra en %, relativo a la barra más larga (Pendiente incluida). */
  ancho: number;
  pendiente: boolean;
}

/** dd/mm/yyyy de la fecha de cálculo, o null si la APS no tiene cálculo (legacy "N/A"). */
export function fechaCalculo(row: FilaDashboard): string | null {
  const fecha = formatearFechaLegacy(row['TARI_FECHACREACION']);
  return fecha === 'N/A' ? null : fecha;
}

export function estaCalculado(row: FilaDashboard): boolean {
  return fechaCalculo(row) !== null;
}

/** yyyy-mm-dd a partir de dd/mm/yyyy, para ordenar por día calendario. */
function claveDia(fecha: string): string {
  return fecha.split('/').reverse().join('-');
}

export function calcularKpis(rows: FilaDashboard[]): KpisDashboard {
  const calculadas = rows.filter(estaCalculado);
  // Día calendario primero; en el mismo día desempata la hora del valor crudo (ISO, comparable como texto).
  const orden = (row: FilaDashboard) => `${claveDia(fechaCalculo(row)!)}|${String(row['TARI_FECHACREACION'])}`;
  let ultima: FilaDashboard | null = null;
  for (const row of calculadas) {
    if (!ultima || orden(row) > orden(ultima)) ultima = row;
  }

  return {
    total: rows.length,
    calculados: calculadas.length,
    pendientes: rows.length - calculadas.length,
    porcentaje: rows.length ? Math.round((calculadas.length / rows.length) * 100) : 0,
    nombresPendientes: rows.filter((r) => !estaCalculado(r)).map((r) => String(r['APSA_NOMAPS'] ?? '')),
    ultimaFecha: ultima ? fechaCalculo(ultima) : null,
    ultimaAps: ultima ? String(ultima['APSA_NOMAPS'] ?? '') : null
  };
}

/** Una barra por día de cálculo (ascendente, etiqueta dd/MM) y al final la fila "Pendiente". */
export function calcularBarrasPorDia(rows: FilaDashboard[]): BarraDia[] {
  if (rows.length === 0) return [];

  const porDia = new Map<string, number>();
  let pendientes = 0;
  for (const row of rows) {
    const fecha = fechaCalculo(row);
    if (fecha === null) {
      pendientes++;
    } else {
      const clave = claveDia(fecha);
      porDia.set(clave, (porDia.get(clave) ?? 0) + 1);
    }
  }

  const dias = [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, cantidad]) => {
      const [, mes, dia] = clave.split('-');
      return { etiqueta: `${dia}/${mes}`, cantidad, pendiente: false };
    });
  const conteos = [...dias, { etiqueta: 'Pendiente', cantidad: pendientes, pendiente: true }];
  const max = Math.max(...conteos.map((c) => c.cantidad));

  return conteos.map((c) => ({ ...c, ancho: max ? (c.cantidad / max) * 100 : 0 }));
}

export function filtrarPorEstado<T extends FilaDashboard>(rows: T[], filtro: FiltroEstado): T[] {
  if (filtro === 'todos') return rows;
  const calculado = filtro === 'calculados';
  return rows.filter((r) => estaCalculado(r) === calculado);
}

export function contarPorEstado(rows: FilaDashboard[]): Record<FiltroEstado, number> {
  const calculados = rows.filter(estaCalculado).length;
  return { todos: rows.length, calculados, pendientes: rows.length - calculados };
}

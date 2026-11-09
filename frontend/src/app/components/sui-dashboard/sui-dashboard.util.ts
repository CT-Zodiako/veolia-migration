/** Fila de /sui/dashboard: APSID, APSNOM, F19, F23, F24, F35, F36, USUARIO. */
export type FilaSui = Record<string, unknown>;

export const FORMATOS_SUI = ['F19', 'F23', 'F24', 'F35', 'F36'] as const;

export type EstadoFormato = 'procesado' | 'pendiente' | 'no-aplica';

export type FiltroEstadoSui = 'todos' | 'alDia' | 'pendientes';

export interface KpisSui {
  total: number;
  /** APS sin ningún formato pendiente. */
  alDia: number;
  conPendientes: number;
  porcentaje: number;
  nombresPendientes: string[];
  /** Formatos procesados sobre los que aplican (se excluye NO APLICA). */
  formatosProcesados: number;
  formatosAplicables: number;
  porcentajeFormatos: number;
}

export interface BarraFormato {
  formato: string;
  procesados: number;
  pendientes: number;
  aplicables: number;
  /** % procesado sobre los aplicables, redondeado. */
  ancho: number;
}

const porcentaje = (parte: number, total: number): number => (total ? Math.round((parte / total) * 100) : 0);

/** Legacy DashBoard.vue:157-163 definirColor (sin distinguir mayúsculas): PENDIENTE, NO APLICA, o procesado. */
export function estadoFormato(valor: unknown): EstadoFormato {
  const texto = String(valor ?? '').toUpperCase().trim();
  if (texto === 'PENDIENTE') return 'pendiente';
  if (texto === 'NO APLICA') return 'no-aplica';
  return 'procesado';
}

export function tienePendientes(row: FilaSui): boolean {
  return FORMATOS_SUI.some((f) => estadoFormato(row[f]) === 'pendiente');
}

export function calcularKpisSui(rows: FilaSui[]): KpisSui {
  const pendientes = rows.filter(tienePendientes);
  let procesados = 0;
  let aplicables = 0;
  for (const row of rows) {
    for (const f of FORMATOS_SUI) {
      const estado = estadoFormato(row[f]);
      if (estado === 'no-aplica') continue;
      aplicables++;
      if (estado === 'procesado') procesados++;
    }
  }

  return {
    total: rows.length,
    alDia: rows.length - pendientes.length,
    conPendientes: pendientes.length,
    porcentaje: porcentaje(rows.length - pendientes.length, rows.length),
    nombresPendientes: pendientes.map((r) => String(r['APSNOM'] ?? '')),
    formatosProcesados: procesados,
    formatosAplicables: aplicables,
    porcentajeFormatos: porcentaje(procesados, aplicables)
  };
}

/** Una barra por formato SUI con el avance procesado / aplicables. */
export function calcularBarrasFormatos(rows: FilaSui[]): BarraFormato[] {
  if (rows.length === 0) return [];

  return FORMATOS_SUI.map((formato) => {
    const estados = rows.map((r) => estadoFormato(r[formato]));
    const procesados = estados.filter((e) => e === 'procesado').length;
    const pendientes = estados.filter((e) => e === 'pendiente').length;
    const aplicables = procesados + pendientes;
    return { formato, procesados, pendientes, aplicables, ancho: porcentaje(procesados, aplicables) };
  });
}

export function filtrarPorEstadoSui<T extends FilaSui>(rows: T[], filtro: FiltroEstadoSui): T[] {
  if (filtro === 'todos') return rows;
  const conPendientes = filtro === 'pendientes';
  return rows.filter((r) => tienePendientes(r) === conPendientes);
}

export function contarPorEstadoSui(rows: FilaSui[]): Record<FiltroEstadoSui, number> {
  const pendientes = rows.filter(tienePendientes).length;
  return { todos: rows.length, alDia: rows.length - pendientes, pendientes };
}

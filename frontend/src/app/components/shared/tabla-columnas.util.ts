import { TablaColumn } from './tabla-avanzada.component';

export type FilaDinamica = Record<string, unknown>;

/**
 * Arma columnas para app-tabla-avanzada a partir de filas de forma dinámica
 * (sin TablaColumn[] fijo declarado a mano), infiriendo alineación numérica
 * mirando el primer valor no vacío de cada campo (convención del skill
 * veolia-ui-style: columnas de valor numérico van alineadas a la derecha).
 */
export function columnasDesdeFilas(rows: FilaDinamica[]): TablaColumn[] {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map(field => ({
    field,
    header: field,
    numero: esColumnaNumerica(rows, field)
  }));
}

function esColumnaNumerica(rows: FilaDinamica[], field: string): boolean {
  for (const row of rows) {
    const valor = row[field];
    if (valor !== null && valor !== undefined && valor !== '') {
      return typeof valor === 'number';
    }
  }
  return false;
}

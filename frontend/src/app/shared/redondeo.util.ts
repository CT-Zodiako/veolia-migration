export function redondear(valor: unknown, precision: number): number {
  const num = typeof valor === 'number' ? valor : Number(valor ?? 0);
  return Number((Number.isFinite(num) ? num : 0).toFixed(precision));
}

export function redondearFilas<T extends Record<string, unknown>>(rows: T[], decimales: Record<string, number>): T[] {
  return rows.map((row) => {
    const copia: Record<string, unknown> = { ...row };
    for (const [campo, precision] of Object.entries(decimales)) {
      if (campo in copia) {
        copia[campo] = redondear(copia[campo], precision);
      }
    }
    return copia as T;
  });
}

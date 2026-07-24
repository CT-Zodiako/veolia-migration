export type FuncionAgregacion = 'sum' | 'avg' | 'count' | 'max' | 'min';

export interface PivotColumnDef {
  field: string;
  headerName: string;
  /** true = columna identificadora, agrupable (equivalente a colmOper:1 en el legacy). */
  agrupable: boolean;
}

export interface PivotRow {
  [key: string]: unknown;
  children?: PivotRow[];
  id?: string;
}

export function aplicarAgregacion(valores: unknown[], funcion: FuncionAgregacion): number | null {
  const numericos = valores
    .map((v) => (typeof v === 'number' ? v : parseFloat(String(v))))
    .filter((v) => !isNaN(v));

  if (numericos.length === 0) return null;

  switch (funcion) {
    case 'sum':
      return numericos.reduce((a, b) => a + b, 0);
    case 'avg':
      return numericos.reduce((a, b) => a + b, 0) / numericos.length;
    case 'count':
      return numericos.length;
    case 'max':
      return Math.max(...numericos);
    case 'min':
      return Math.min(...numericos);
  }
}

/**
 * Port de TablaPivot.vue#pivotarJerarquico (front-tarificador/src/lib/TablaPivot.vue).
 * Agrupa `filas` en un árbol por `clavesAgrupar` (en orden) y agrega `camposOperacion`
 * con `funcionAgregacion` en cada nivel. Cada nodo resultante expone `children` con el
 * siguiente nivel (o las filas originales, sin las columnas de agrupación, en las hojas).
 */
export function pivotarJerarquico(
  filas: Record<string, unknown>[],
  clavesAgrupar: string[],
  camposOperacion: string[],
  funcionAgregacion: FuncionAgregacion
): PivotRow[] {
  if (clavesAgrupar.length === 0) return [];

  const resultado: Record<string, any> = {};
  for (const fila of filas) {
    let actual = resultado;
    for (const clave of clavesAgrupar) {
      const valor = String(fila[clave]);
      if (!actual[valor]) actual[valor] = {};
      actual = actual[valor];
    }
    if (!actual['_items']) actual['_items'] = [];
    actual['_items'].push(fila);
  }

  let idCounter = 0;

  function aplanar(obj: Record<string, any>, nivel: number): PivotRow[] {
    const salida: PivotRow[] = [];
    const claveActual = clavesAgrupar[nivel];
    const esUltimoNivel = nivel === clavesAgrupar.length - 1;

    for (const [clave, valor] of Object.entries(obj)) {
      if (clave === '_items') continue;

      if (esUltimoNivel) {
        const items = valor['_items'] as Record<string, unknown>[];
        const children: PivotRow[] = items.map((item) => {
          const hijo: PivotRow = {};
          for (const k of Object.keys(item)) {
            if (!clavesAgrupar.includes(k)) hijo[k] = item[k];
          }
          return hijo;
        });

        const fila: PivotRow = { [claveActual]: clave, children, id: `n${nivel}-${idCounter++}` };
        for (const campo of camposOperacion) {
          fila[campo] = aplicarAgregacion(items.map((it) => it[campo]), funcionAgregacion);
        }
        salida.push(fila);
      } else {
        const hijos = aplanar(valor, nivel + 1);
        const nodo: PivotRow = { [claveActual]: clave, children: hijos, id: `n${nivel}-${idCounter++}` };

        for (const campo of camposOperacion) {
          const valoresDescendientes = hijos
            .flatMap((h) => (h.children ? h.children.map((c) => c[campo]) : [h[campo]]))
            .filter((v) => v !== undefined);
          if (valoresDescendientes.length > 0) {
            nodo[campo] = aplicarAgregacion(valoresDescendientes, funcionAgregacion);
          }
        }
        salida.push(nodo);
      }
    }
    return salida;
  }

  return aplanar(resultado, 0);
}

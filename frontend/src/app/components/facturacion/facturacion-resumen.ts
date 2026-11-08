/**
 * Cards and chart data of the Facturación tab (design/facturacion-detallado/01-detallado-facturacion.html),
 * computed only from the rows the Facturación table already returns (VACUO_FACTURACION).
 */

export type FilaFacturacion = Record<string, unknown>;
export type TonoResumen = 'neutro' | 'subsidio' | 'contribucion';

/** Design concept -> column of the Facturación rows. */
export const COLUMNAS_RESUMEN = {
  claseUso: 'CLAS_NOMBRE',
  tipoTarifa: 'PARA_NOMBRE',
  tipoFactura: 'TIPO_FACT',
  factorSubCon: 'TARI_SUBCONT',
  tarifaPlena: 'TARIFAPLENA',
  tarifaSyC: 'TARIFASYC',
  tafna: 'TARI_TAFNA'
} as const;

/** Components of the tarifa plena, in the design order. */
export const COMPONENTES_TARIFA: ReadonlyArray<readonly [string, string]> = [
  ['TRT', 'TARI_TRT'],
  ['TDF', 'TARI_TDF'],
  ['TBL', 'TARI_TBL'],
  ['TLU', 'TARI_TLU'],
  ['TTL', 'TARI_TTL'],
  ['TC', 'TARI_TC'],
  ['TA', 'TARI_TA']
];

const ORDEN_CLASES = [
  'ESTRATO 1', 'ESTRATO 2', 'ESTRATO 3', 'ESTRATO 4', 'ESTRATO 5', 'ESTRATO 6',
  'COMERCIAL', 'COMERCIAL RANG. 1', 'COMERCIAL RANG. 2', 'COMERCIAL RANG. 3',
  'INDUSTRIAL', 'INDUSTRIAL RANG. 1', 'INDUSTRIAL RANG. 2', 'INDUSTRIAL RANG. 3',
  'OFICIAL', 'OFICIAL RANG. 1', 'OFICIAL RANG. 2', 'OFICIAL RANG. 3'
];

const ORDEN_TARIFAS = ['AFORO ORDINARIO', 'AFORO PERMANENTE', 'SIN AFORO', 'NO REC. PAP', 'DESOCUPADO'];

export const SIN_DATO = '—';

export interface TarjetaResumen {
  etiqueta: string;
  valor: string;
  unidad: string;
  detalle: string;
  tono: TonoResumen;
}

export interface ClasePagoResumen {
  clase: string;
  plena: number | null;
  paga: number | null;
  tono: TonoResumen;
}

export interface ComponenteResumen {
  componente: string;
  valor: number | null;
  porcentaje: number | null;
  texto: string;
}

export interface TarifaEstratosResumen {
  tipoTarifa: string;
  estrato1: number | null;
  estrato4: number | null;
  estrato6: number | null;
}

export interface FiltroResumen {
  tipoFactura?: string | null;
  tipoTarifa?: string | null;
}

export interface ResumenFacturacion {
  vacio: boolean;
  opcionesTipoFactura: string[];
  opcionesTipoTarifa: string[];
  /** Effective selection: the requested one when it exists in the rows, else the first option. */
  tipoFactura: string | null;
  tipoTarifa: string | null;
  tarjetas: TarjetaResumen[];
  tafna: TarjetaResumen;
  subtituloClases: string;
  clases: ClasePagoResumen[];
  componentes: ComponenteResumen[];
  subtituloTarifas: string;
  porTipoTarifa: TarifaEstratosResumen[];
}

const formatos = new Map<number, Intl.NumberFormat>();

/** Colombian format (thousands ".", decimals ","); null -> "—". */
export function formatoNumero(valor: number | null, decimales: number): string {
  if (valor === null) return SIN_DATO;
  let formato = formatos.get(decimales);
  if (!formato) {
    formato = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
    formatos.set(decimales, formato);
  }
  return formato.format(valor);
}

/** Fraction against the tarifa plena as the design writes it: "−70 %", "+245 %". */
export function formatoVariacion(fraccion: number | null): string {
  if (fraccion === null) return SIN_DATO;
  const puntos = Math.round(fraccion * 100);
  if (puntos < 0) return `−${formatoNumero(-puntos, 0)} %`;
  if (puntos > 0) return `+${formatoNumero(puntos, 0)} %`;
  return '0 %';
}

/** Money axis labels of the design: "250 mil", "1 millón". */
export function formatoEje(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1_000_000) {
    const millones = valor / 1_000_000;
    return `${formatoCorto(millones)} ${Math.abs(millones) === 1 ? 'millón' : 'millones'}`;
  }
  if (abs >= 1_000) return `${formatoCorto(valor / 1_000)} mil`;
  return formatoCorto(valor);
}

function formatoCorto(valor: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(valor);
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function texto(valor: unknown): string {
  return String(valor ?? '').trim();
}

function clave(valor: string): string {
  return valor.toUpperCase().replace(/\s+/g, ' ');
}

function distintos(filas: readonly FilaFacturacion[], columna: string): string[] {
  const vistos = new Set<string>();
  for (const f of filas) {
    const v = texto(f[columna]);
    if (v) vistos.add(v);
  }
  return [...vistos];
}

/** Known values first in the design order, unknown ones after in row order. */
function ordenar(valores: string[], orden: string[]): string[] {
  const rango = (v: string) => {
    const i = orden.indexOf(clave(v));
    return i < 0 ? orden.length : i;
  };
  return valores.map((v, i) => ({ v, i })).sort((a, b) => rango(a.v) - rango(b.v) || a.i - b.i).map((x) => x.v);
}

function tono(plena: number | null, paga: number | null): TonoResumen {
  if (plena === null || paga === null) return 'neutro';
  const puntos = Math.round((paga / plena - 1) * 100);
  if (!Number.isFinite(puntos) || puntos === 0) return 'neutro';
  return puntos < 0 ? 'subsidio' : 'contribucion';
}

function variacion(plena: number | null, paga: number | null): number | null {
  if (plena === null || paga === null || plena === 0) return null;
  return paga / plena - 1;
}

function tarjetaPaga(etiqueta: string, f: FilaFacturacion | undefined): TarjetaResumen {
  const plena = numero(f?.[COLUMNAS_RESUMEN.tarifaPlena]);
  const paga = numero(f?.[COLUMNAS_RESUMEN.tarifaSyC]);
  const fraccion = variacion(plena, paga);
  return {
    etiqueta,
    valor: formatoNumero(paga, 2),
    unidad: '',
    detalle: fraccion === null ? SIN_DATO : `${formatoVariacion(fraccion)} frente a la tarifa plena`,
    tono: tono(plena, paga)
  };
}

export function resumirFacturacion(filas: readonly FilaFacturacion[], filtro: FiltroResumen): ResumenFacturacion {
  const opcionesTipoFactura = distintos(filas, COLUMNAS_RESUMEN.tipoFactura);
  const opcionesTipoTarifa = ordenar(distintos(filas, COLUMNAS_RESUMEN.tipoTarifa), ORDEN_TARIFAS);
  const elegir = (opciones: string[], pedido?: string | null) =>
    pedido && opciones.includes(pedido) ? pedido : opciones[0] ?? null;
  const tipoFactura = elegir(opcionesTipoFactura, filtro.tipoFactura);
  const tipoTarifa = elegir(opcionesTipoTarifa, filtro.tipoTarifa);

  const deFactura = filas.filter((f) => texto(f[COLUMNAS_RESUMEN.tipoFactura]) === tipoFactura);
  const seleccion = deFactura.filter((f) => texto(f[COLUMNAS_RESUMEN.tipoTarifa]) === tipoTarifa);
  const buscar = (lista: readonly FilaFacturacion[], clase: string) =>
    lista.find((f) => clave(texto(f[COLUMNAS_RESUMEN.claseUso])) === clase);

  const e1 = buscar(seleccion, 'ESTRATO 1');
  const e4 = buscar(seleccion, 'ESTRATO 4');
  const e6 = buscar(seleccion, 'ESTRATO 6');

  const plena4 = numero(e4?.[COLUMNAS_RESUMEN.tarifaPlena]);
  const fraccion4 = variacion(plena4, numero(e4?.[COLUMNAS_RESUMEN.tarifaSyC]));
  const paga1 = numero(e1?.[COLUMNAS_RESUMEN.tarifaSyC]);
  const paga6 = numero(e6?.[COLUMNAS_RESUMEN.tarifaSyC]);
  const brecha = paga1 !== null && paga6 !== null && paga1 !== 0 ? paga6 / paga1 : null;

  const tarjetas: TarjetaResumen[] = [
    {
      etiqueta: 'Estrato 4 · tarifa plena',
      valor: formatoNumero(plena4, 2),
      unidad: '',
      detalle: fraccion4 === null || Math.round(fraccion4 * 100) === 0
        ? 'Sin subsidio ni contribución'
        : `${formatoVariacion(fraccion4)} frente a la tarifa plena`,
      tono: 'neutro'
    },
    tarjetaPaga('Estrato 1 paga', e1),
    tarjetaPaga('Estrato 6 paga', e6),
    {
      etiqueta: 'Brecha estrato 6 / estrato 1',
      valor: formatoNumero(brecha, 1),
      unidad: brecha === null ? '' : 'veces',
      detalle: 'Lo que paga cada uno',
      tono: 'neutro'
    }
  ];

  // TAFNA is the same on every row; take the first one that has it.
  const tafnaFila = (seleccion.length ? seleccion : filas).find((f) => numero(f[COLUMNAS_RESUMEN.tafna]) !== null);
  const tafna: TarjetaResumen = {
    etiqueta: 'TAFNA · residuos no aprovechables',
    valor: formatoNumero(numero(tafnaFila?.[COLUMNAS_RESUMEN.tafna]), 2),
    unidad: '',
    detalle: 'Toneladas. Igual para todas las filas',
    tono: 'neutro'
  };

  const clases = ordenar(distintos(seleccion, COLUMNAS_RESUMEN.claseUso), ORDEN_CLASES).map((clase) => {
    const f = buscar(seleccion, clave(clase));
    const plena = numero(f?.[COLUMNAS_RESUMEN.tarifaPlena]);
    const paga = numero(f?.[COLUMNAS_RESUMEN.tarifaSyC]);
    return { clase, plena, paga, tono: tono(plena, paga) };
  });

  const valores = COMPONENTES_TARIFA.map(([componente, columna]) => ({ componente, valor: numero(e4?.[columna]) }));
  const total = valores.reduce((suma, c) => suma + (c.valor ?? 0), 0);
  const componentes: ComponenteResumen[] = valores.map(({ componente, valor }) => {
    const porcentaje = valor !== null && total > 0 ? (valor / total) * 100 : null;
    return { componente, valor, porcentaje, texto: porcentaje === null ? SIN_DATO : `${formatoNumero(porcentaje, 1)} %` };
  });

  const porTipoTarifa = ordenar(distintos(deFactura, COLUMNAS_RESUMEN.tipoTarifa), ORDEN_TARIFAS).map((tipo) => {
    const filasTipo = deFactura.filter((f) => texto(f[COLUMNAS_RESUMEN.tipoTarifa]) === tipo);
    const paga = (clase: string) => numero(buscar(filasTipo, clase)?.[COLUMNAS_RESUMEN.tarifaSyC]);
    return { tipoTarifa: tipo, estrato1: paga('ESTRATO 1'), estrato4: paga('ESTRATO 4'), estrato6: paga('ESTRATO 6') };
  });

  return {
    vacio: filas.length === 0,
    opcionesTipoFactura,
    opcionesTipoTarifa,
    tipoFactura,
    tipoTarifa,
    tarjetas,
    tafna,
    subtituloClases: tipoTarifa && tipoFactura ? `${tipoTarifa} · ${tipoFactura}` : '',
    clases,
    componentes,
    subtituloTarifas: tipoFactura ? `Estratos 1, 4 y 6 · ${tipoFactura}` : '',
    porTipoTarifa
  };
}

import { FilaDinamica } from '../shared/tabla-columnas.util';

/**
 * Crecimiento Variables Programadas (903): las filas que devuelve Drive vienen con las
 * cabeceras de la hoja como claves (V_N, C_N, CCS, NOM_APS, MES...). El legacy las mandaba
 * crudas y el backend Node las leía por esos nombres (proyecciones/controller.js:345,
 * 435-482,565-578,640-685). Acá se traducen a los nombres de los DTO del backend nuevo.
 *
 * Cada tabla es [cabecera legacy, campo del request, tipo]. Las cabeceras se respetan tal
 * como las lee el legacy (V_CBLj, V_QRTz, C_QRechazo...); si la hoja usa otra capitalización
 * se acepta igual (comparación sin mayúsculas/minúsculas).
 */
type Tipo = 'numero' | 'texto';
type Campo = readonly [cabecera: string, campo: string, tipo: Tipo];

const CAMPOS_USUARIOS: readonly Campo[] = [
  ['COD_APS', 'codAps', 'numero'],
  ['ANNO', 'anno', 'numero'],
  // Legacy registrarcrecimientousuarios: SEMESTRE <- fila.MES.
  ['MES', 'semestre', 'numero'],
  ['CODUSO', 'coduso', 'numero'],
  ['NOMCLASEUSO', 'nomclaseuso', 'texto'],
  ['CODFACTOR', 'codfactor', 'numero'],
  ['VALORFACTOR', 'valorfactor', 'numero'],
  ['CODTIPOPRED', 'codtipopred', 'numero'],
  ['NOMTIPOPRED', 'nomtipopred', 'texto'],
  ['CANTIDAD', 'cantidad', 'numero'],
  ['TONELADAS', 'toneladas', 'numero']
];

const CAMPOS_PROPIA: readonly Campo[] = [
  ['COD_APS', 'codAps', 'numero'],
  ['NOM_APS', 'nomAps', 'texto'],
  ['COD_EMPRESA', 'codEmpresa', 'numero'],
  ['NOM_EMPRESA', 'nomEmpresa', 'texto'],
  ['ANNO', 'anno', 'numero'],
  ['MES', 'mes', 'numero'],
  ['V_DISPTERC', 'vDispterc', 'texto'],
  ['IAT', 'iat', 'texto'],
  ['V_N', 'vN', 'numero'],
  ['V_NA', 'vNa', 'numero'],
  ['V_ND', 'vNd', 'numero'],
  ['V_TAFNA', 'vTafna', 'numero'],
  ['V_QRT', 'vQrt', 'numero'],
  ['V_QLU', 'vQlu', 'numero'],
  ['V_QNA', 'vQna', 'numero'],
  ['V_QBL', 'vQbl', 'numero'],
  ['V_QR', 'vQr', 'numero'],
  ['V_QRS', 'vQrs', 'numero'],
  ['V_CBLj', 'vCblj', 'numero'],
  ['V_LBL', 'vLbl', 'numero'],
  ['V_VALOR_MTS3', 'vValorMts3', 'numero'],
  ['V_M2CC', 'vM2cc', 'numero'],
  ['V_M2LAV', 'vM2lav', 'numero'],
  ['V_TI', 'vTi', 'numero'],
  ['V_TM', 'vTm', 'numero'],
  ['V_KLP', 'vKlp', 'numero'],
  ['V_VL', 'vVl', 'numero'],
  ['V_ESCENARIO', 'vEscenario', 'numero'],
  ['V_CTLMX', 'vCtlmx', 'numero'],
  ['V_T', 'vT', 'numero'],
  ['V_CPE', 'vCpe', 'numero'],
  ['V_VA_CRT', 'vVaCrt', 'numero'],
  ['V_VA_CRT_ABC', 'vVaCrtAbc', 'numero'],
  ['V_VA_CDF', 'vVaCdf', 'numero'],
  ['V_VA_CDF_ABC', 'vVaCdfAbc', 'numero'],
  ['V_NAA', 'vNaa', 'numero'],
  ['V_QA', 'vQa', 'numero'],
  ['V_TAFA', 'vTafa', 'numero'],
  ['V_CP', 'vCp', 'numero'],
  ['V_CRT_PROPIO', 'vCrtPropio', 'numero'],
  ['V_CDF_FACTURADO', 'vCdfFacturado', 'numero'],
  ['V_QRTz', 'vQrtz', 'numero'],
  ['V_CDF_TERCERO', 'vCdfTercero', 'numero'],
  ['V_CTL_TERCERO', 'vCtlTercero', 'numero'],
  ['V_IR_TERCERO', 'vIrTercero', 'numero'],
  ['V_QRS_MUNRECP', 'vQrsMunrecp', 'numero']
];

const CAMPOS_TERCEROS: readonly Campo[] = [
  ['COD_APS', 'codAps', 'numero'],
  ['NOM_APS', 'nomAps', 'texto'],
  ['COD_EMPRESA', 'codEmpresa', 'numero'],
  ['NOM_EMPRESA', 'nomEmpresa', 'texto'],
  ['ANNO', 'anno', 'numero'],
  ['MES', 'mes', 'numero'],
  ['C_N', 'cN', 'numero'],
  ['C_NA', 'cNa', 'numero'],
  ['C_ND', 'cNd', 'numero'],
  ['C_TAFNA', 'cTafna', 'numero'],
  ['C_VALOR_MTS3', 'cValorMts3', 'numero'],
  ['C_QRT', 'cQrt', 'numero'],
  ['C_QLU', 'cQlu', 'numero'],
  ['C_QNA', 'cQna', 'numero'],
  ['C_QBL', 'cQbl', 'numero'],
  ['C_QRechazo', 'cQrechazo', 'numero'],
  ['C_QRS', 'cQrs', 'numero'],
  ['C_CBLj', 'cCblj', 'numero'],
  ['C_LBL', 'cLbl', 'numero'],
  ['C_M2CC', 'cM2cc', 'numero'],
  ['C_M2LAV', 'cM2lav', 'numero'],
  ['C_TI', 'cTi', 'numero'],
  ['C_TM', 'cTm', 'numero'],
  ['C_KLP', 'cKlp', 'numero'],
  ['C_VL', 'cVl', 'numero'],
  ['C_ESCENARIO', 'cEscenario', 'numero'],
  ['C_T', 'cT', 'numero'],
  ['C_CPE', 'cCpe', 'numero'],
  ['C_CTLMX', 'cCtlmx', 'numero'],
  ['C_VA_CRT', 'cVaCrt', 'numero'],
  ['C_VA_CRT_ABC', 'cVaCrtAbc', 'numero'],
  ['C_VA_CDF', 'cVaCdf', 'numero'],
  ['C_VA_CDF_ABC', 'cVaCdfAbc', 'numero'],
  ['C_NAA', 'cNaa', 'numero'],
  ['C_QA', 'cQa', 'numero'],
  ['C_TAFA', 'cTafa', 'numero'],
  ['C_CRT_COMPETIDOR', 'cCrtCompetidor', 'numero'],
  ['C_CDF_COMPETIDOR', 'cCdfCompetidor', 'numero'],
  ['C_QRTz', 'cQrtz', 'numero'],
  ['C_CTL_SIN_INCENTIVO', 'cCtlSinIncentivo', 'numero'],
  ['C_INCENTIVO', 'cIncentivo', 'numero'],
  ['C_CDFSINCENTIVO', 'cCdfsincentivo', 'numero'],
  ['C_CPODA', 'cCpoda', 'numero']
];

const CAMPOS_DESCUENTOS: readonly Campo[] = [
  ['COD_APS', 'codAps', 'numero'],
  ['NOM_APS', 'nomAps', 'texto'],
  ['ANNO', 'anno', 'numero'],
  ['MES', 'mes', 'numero'],
  ['CCS', 'dccs', 'numero'],
  ['CBL', 'dcbl', 'numero'],
  ['CLUS', 'dclus', 'numero'],
  ['CRT', 'dcrt', 'numero'],
  ['CDF', 'dcdf', 'numero'],
  ['CTL', 'dctl', 'numero'],
  ['VBA', 'dvba', 'numero']
];

export type ItemCrecimiento = Record<string, number | string | null>;

export const mapearUsuariosDrive = (filas: FilaDinamica[]) => mapear(filas, CAMPOS_USUARIOS);
export const mapearPropiaDrive = (filas: FilaDinamica[]) => mapear(filas, CAMPOS_PROPIA);
export const mapearTercerosDrive = (filas: FilaDinamica[]) => mapear(filas, CAMPOS_TERCEROS);
export const mapearDescuentosDrive = (filas: FilaDinamica[]) => mapear(filas, CAMPOS_DESCUENTOS);

function mapear(filas: FilaDinamica[], campos: readonly Campo[]): ItemCrecimiento[] {
  const items: ItemCrecimiento[] = [];
  filas.forEach((fila, indice) => {
    if (Object.values(fila).every(vacio)) return;
    const item: ItemCrecimiento = {};
    for (const [cabecera, campo, tipo] of campos) {
      const valor = leer(fila, cabecera);
      // Fila de la hoja = índice + 2 (la fila 1 son las cabeceras).
      item[campo] = tipo === 'texto' ? texto(valor) : numero(valor, indice + 2, cabecera);
    }
    items.push(item);
  });
  return items;
}

function leer(fila: FilaDinamica, cabecera: string): unknown {
  if (cabecera in fila) return fila[cabecera];
  const clave = Object.keys(fila).find(k => k.toUpperCase() === cabecera.toUpperCase());
  return clave === undefined ? null : fila[clave];
}

function vacio(valor: unknown): boolean {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

function texto(valor: unknown): string | null {
  return vacio(valor) ? null : String(valor);
}

// Legacy: TO_NUMBER(:n) en Oracle. Un texto no numérico hacía fallar todo el INSERT;
// acá se informa antes de enviar en vez de guardar NULL en silencio.
function numero(valor: unknown, filaHoja: number, cabecera: string): number | null {
  if (vacio(valor)) return null;
  if (typeof valor === 'number') return valor;
  const convertido = Number(String(valor).trim());
  if (!Number.isFinite(convertido)) {
    throw new Error(`Fila ${filaHoja}, columna ${cabecera}: "${valor}" no es un número.`);
  }
  return convertido;
}

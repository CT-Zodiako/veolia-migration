import { TablaColumn } from '../shared/tabla-avanzada.component';

export type FormatoSui = 'f19' | 'f23' | 'f24' | 'f35' | 'f36';

type ColumnaLegacy = [field: string, header: string, decimales?: number];

/** Legacy ResumenFormatos.vue:8-12 / ReversionesSui.vue:8-9: link to the format explanation workbook. */
export const EXPLICACION_FORMATOS_HREF = 'assets/layout/planos/Explicación formatos y formularios.xlsx';

/**
 * Legacy components/TableResumenAps/Formato{19,23,24,35,36}.vue (same columns in TableReversionesAps, which adds REVE ID
 * first): curated columns, headers and redondeo(valor, n) per column. Every column has a "Contiene" filter.
 * Formato36 binds MES to "F19_MES" (typo, always blank); F36_MES is used here.
 */
const DEFINICIONES: Record<FormatoSui, ColumnaLegacy[]> = {
  f19: [['F19_ANNO', 'AÑO'], ['F19_MES', 'MES'], ['F19_NJ', 'NJ'], ['F19_NDJ', 'NDJ'], ['F19_CRTJ', 'CRTJ', 2], ['F19_CDFJ', 'CDFJ', 2],
    ['F19_QRTJ', 'QRTJ', 5], ['F19_QRJ', 'QRJ', 5], ['F19_QBLJ', 'QBLJ', 5], ['F19_QLUJ', 'QLUJ', 5], ['F19_QNAZ', 'QNAZ', 5], ['F19_QAJ', 'QAJ', 5]],
  f23: [['F23_ANNO', 'AÑO'], ['F23_MES', 'MES'], ['EMPR_EMPR', 'Empresas'], ['F23_ID', 'IDNOMAPS'], ['F23_NUAP', 'NUAP'], ['F23_N', 'N'],
    ['F23_CP', 'CP', 2], ['F23_CCC', 'CCC', 2], ['F23_M2CCJ', 'M2CCJ'], ['F23_CLAVJ', 'CLAVJ', 2], ['F23_M3AGUAJ', 'M3AGUAJ'],
    ['F23_M2LAVJ', 'M2LAVJ', 2], ['F23_CLPJ', 'CLPJ', 2], ['F23_KLPJ', 'KLPJ'], ['F23_CCEI', 'CCEI', 2], ['F23_TIJ', 'TIJ'],
    ['F23_CCEMJ', 'CCEMJ', 2], ['F23_TMJ', 'TMJ'], ['F23_CLUS', 'CLUS', 2], ['F23_CBLJ', 'CBLJ', 2], ['F23_LBLJ', 'LBLJ', 2],
    ['F23_CBLS', 'CBLS', 2], ['F23_FACBLCLUS', 'FACBLCLUS', 4], ['F23_ABC', 'ABC']],
  f24: [['F24_ANNO', 'AÑO'], ['F24_MES', 'MES'], ['F24_NUAP', 'NUAP'], ['F24_NUSD', 'NUSD'], ['F24_CENTROIDE', 'CENTROIDE', 5],
    ['F24_QRT', 'QRT', 5], ['F24_F1', 'F1', 2], ['F24_F2', 'F2', 2], ['F24_CPE', 'CPE', 2], ['F24_PRTZ', 'PRTZ', 2], ['F24_DET', 'DET'],
    ['F24_F1ET', 'F1ET'], ['F24_CPEET', 'CPEET'], ['F24_PRTZET', 'PRTZET'], ['F24_CEG', 'CEG'], ['F24_CRTP', 'CRTP'],
    ['F24_SALINIDAD', 'SALINIDAD'], ['F24_VACRTABC', 'VACRTABC'], ['F24_VACRT', 'VACRT'], ['F24_FCK', 'FCK'], ['F24_T', 'T'],
    ['F24_CRTZ', 'CRTZ', 2], ['F24_CRT', 'CRT', 2], ['F24_FACRT', 'FACRT', 4], ['F24_FACCS', 'FACCS', 4]],
  f35: [['F35_ANNO', 'AÑO'], ['F35_MES', 'MES'], ['F35_NUSD', 'NUSD'], ['F35_NOMDF', 'NOMDF'], ['F35_CAMRERS', 'CAMRERS'],
    ['F35_QRSMES', 'QRSMES', 5], ['F35_QRSPROM', 'QRSPROM', 5], ['F35_CDFVU', 'CDFVU', 2], ['F35_PERADDT', 'PERADDT'],
    ['F35_CDFPC', 'CDFPC', 2], ['F35_INCENTIVO', 'INCENTIVO', 2], ['F35_DISPALT9', 'DISPALT9'], ['F35_INCCDFALT9', 'INCCDFALT9'],
    ['F35_VACDFABC', 'VACDFABC'], ['F35_VACDF', 'VACDF'], ['F35_PRCTCRRCP', 'PRCTCRRCP'], ['F35_CDF', 'CDF', 2], ['F35_CDFP', 'CDFP', 2],
    ['F35_FACCDF', 'FACCDF', 4], ['F35_V0', 'V0'], ['F35_VM', 'VM'], ['F35_MCRS', 'MCRS'], ['F35_ICRSM', 'ICRSM'], ['F35_ICCRS', 'ICCRS'],
    ['F35_FREIN', 'FREIN'], ['F35_CAPREMDF', 'CAPREMDF']],
  f36: [['F36_ANNO', 'AÑO'], ['F36_MES', 'MES'], ['F36_NUSD', 'NUSD'], ['F36_NOMDPTO', 'NOMDPTO'], ['F36_NOMMPIO', 'NOMMPIO'],
    ['F36_NOMDF', 'NOMDF'], ['F36_VLMES', 'VLMES', 5], ['F36_VLMPROM', 'VLMPROM', 5], ['F36_ESCENA', 'ESCENA'], ['F36_CTLMVU', 'CTLMVU', 2],
    ['F36_ANNOPOSCLA', 'ANNOPOSCLA'], ['F36_CTLMPC', 'CTLMPC', 2], ['F36_CTLM', 'CTLM', 2], ['F36_CTLMX', 'CTLMX', 2],
    ['F36_VACTLABC', 'VACTLABC'], ['F36_VACTL', 'VACTL'], ['F36_FCKCTL', 'FCKCTL', 6], ['F36_QRS', 'QRS', 5], ['F36_CTL', 'CTL', 2],
    ['F36_FACCTL', 'FACCTL', 4]]
};

/** Identifiers, periods and names are shown left-aligned as text. */
const TEXTO = new Set([
  'REVE_ID', 'EMPR_EMPR', 'F23_ID', 'F23_NUAP', 'F24_NUAP', 'F24_NUSD', 'F35_NUSD', 'F35_NOMDF',
  'F36_NUSD', 'F36_NOMDPTO', 'F36_NOMMPIO', 'F36_NOMDF', 'F36_ESCENA', 'F36_ANNOPOSCLA'
]);

export function columnasFormatoSui(formato: FormatoSui, conReveId = false): TablaColumn[] {
  const defs: ColumnaLegacy[] = conReveId ? [['REVE_ID', 'REVE ID'], ...DEFINICIONES[formato]] : DEFINICIONES[formato];
  return defs.map(([field, header, decimales]) => ({
    field,
    header,
    filtrable: true,
    ...(TEXTO.has(field) || field.endsWith('_ANNO') || field.endsWith('_MES') ? {} : { numero: true }),
    ...(decimales === undefined ? {} : { decimales })
  }));
}

/** Legacy Formato*.vue:9,13: 10 rows per page; [10, 20, 100, 200] except Formato24 [10, 20, 50]. */
export function opcionesPaginaSui(formato: FormatoSui): number[] {
  return formato === 'f24' ? [10, 20, 50] : [10, 20, 100, 200];
}

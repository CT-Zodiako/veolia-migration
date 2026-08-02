export interface ApiEnvelope<T> {
  status: 'ok' | 'error' | boolean;
  data: T;
  message: string;
  traceId?: string;
}

export interface ApsOption {
  apsaId: number;
  apsaNombre: string;
}

export interface Reliquidacion {
  relqId: number;
  apsaId: number;
  relqNombre: string;
  relqDescripcion?: string | null;
  relqDesde: string;
  relqHasta: string;
  relqEstado: string;
  relqFecha?: string | null;
  apsaNomaps?: string | null;
  mailSolicita?: string | null;
  mailAprueba?: string | null;
  relqSolicita?: number | null;
  relqAprueba?: number | null;
  relqIdAtt?: number | null;
}

export interface CrearReliquidacionRequest {
  apsaId: number;
  nombre: string;
  descripcion?: string;
  desde: string;
  hasta: string;
  usuSolicita: number;
  estado?: string;
  usuAprueba: number;
  idAtt?: number | null;
}

export interface ActualizarReliquidacionRequest extends CrearReliquidacionRequest {
  relqId: number;
}

/**
 * Fila de RELIQ.VREL_COMPARACOSTOS.
 * Columnas confirmadas contra el legacy (back-tarificador/src/modules/reliq/cargue/controller.js,
 * líneas 169-224, y front-tarificador/src/reliq/views/CompararCosto.vue, líneas 34-326):
 * CODRELIQ/APSNOM/COSTANNO/COSTMES + 11 tríos RELQ_X/TARI_X/DIFE_X por componente de costo.
 * No existen columnas apsaId/relqDesde/relqHasta/costoAps/costoEmpresa/difCosto en esta vista.
 */
export interface CompararCostos {
  codReliq: number;
  apsNom?: string | null;
  costAnno?: number | null;
  costMes?: number | null;

  relqCcsener?: number | null;
  tariCcsener?: number | null;
  difeCcsener?: number | null;

  relqCcsenerapv?: number | null;
  tariCcsenerapv?: number | null;
  difeCcsenerapv?: number | null;

  relqCcsacue?: number | null;
  tariCcsacue?: number | null;
  difeCcsacue?: number | null;

  relqCcsacueapv?: number | null;
  tariCcsacueapv?: number | null;
  difeCcsacueapv?: number | null;

  relqCbls?: number | null;
  tariCbls?: number | null;
  difeCbls?: number | null;

  relqClus?: number | null;
  tariClus?: number | null;
  difeClus?: number | null;

  relqCrt?: number | null;
  tariCrt?: number | null;
  difeCrt?: number | null;

  relqCdf?: number | null;
  tariCdf?: number | null;
  difeCdf?: number | null;

  relqCtl?: number | null;
  tariCtl?: number | null;
  difeCtl?: number | null;

  relqVba?: number | null;
  tariVba?: number | null;
  difeVba?: number | null;

  relqIat?: number | null;
  tariIat?: number | null;
  difeIat?: number | null;
}

/**
 * Fila de RELIQ.VREL_COMPARATARIFACOBRO.
 * Columnas confirmadas contra el legacy Vue (front-tarificador/src/reliq/views/CompararTarifas.vue,
 * líneas 65-637): tríos ORIG/REL/DIF por componente tarifario + acumulados de tarifa plena y
 * cobro/devolución. No existen columnas `reli`/`tarifa`/`componente` en la vista real.
 */
export interface CompararTarifas {
  mes?: number | null;
  anno?: number | null;
  clasNombre?: string | null;
  paraNombre?: string | null;
  faprNombre?: string | null;

  tcOrig?: number | null;
  tcRel?: number | null;
  tcDif?: number | null;

  tcaprovOrig?: number | null;
  tcaprovRel?: number | null;
  tcaprovDif?: number | null;

  tcaddOrig?: number | null;
  tcaddRel?: number | null;
  tcaddDif?: number | null;

  tcaddaprovOrig?: number | null;
  tcaddaprovRel?: number | null;
  tcaddaprovDif?: number | null;

  tblOrig?: number | null;
  tblRel?: number | null;
  tblDif?: number | null;

  tluOrig?: number | null;
  tluRel?: number | null;
  tluDif?: number | null;

  trtOrig?: number | null;
  trtRel?: number | null;
  trtDif?: number | null;

  tdfOrig?: number | null;
  tdfRel?: number | null;
  tdfDif?: number | null;

  ttlOrig?: number | null;
  ttlRel?: number | null;
  ttlDif?: number | null;

  taOrig?: number | null;
  taRel?: number | null;
  taDif?: number | null;

  tarPlenaEneOrg?: number | null;
  tarPlenaEneRel?: number | null;
  devolene?: number | null;

  tarPlenaAcuOrg?: number | null;
  tarPlenaAcuRel?: number | null;
  devolacu?: number | null;
}

/**
 * Bloque del dataset de RELIQ.PK_JSONRESUMEN.freli_jsongral (resumen de Comparar Tarifas).
 * Estructura dinámica: cada bloque trae su propio set de columnas (ver legacy
 * GenericTable.vue líneas 88-104), por eso `columns`/`data` en vez de campos fijos.
 */
export interface ResumenCompararTarifasDatasetItem {
  nombre: string | null;
  columns: string[];
  data: unknown[][];
}

export interface ResumenCompararTarifas {
  periodo: string | null;
  dataset: ResumenCompararTarifasDatasetItem[];
}

export interface ReliInfoUsuarios {
  iuaeId: number;
  reliId: number;
  anno: number;
  mes: number;
  diviDivi?: number | null;
  clasClaseUso?: number | null;
  clasNombre?: string | null;
  paraTipTar20012?: number | null;
  tipoTarifaNombre?: string | null;
  paraUbicacion20016?: number | null;
  paraTipFac20014?: number | null;
  faprCodigo?: number | null;
  factorProduccionNombre?: string | null;
  cantidad: number;
  toneladas: number;
}

export interface ReliInfoEmpresa {
  inedId: number;
  reliId: number;
  anno: number;
  mes: number;
  empresaNombre?: string | null;
  cblj: number;
  lblj: number;
  n: number;
  m3agua: number;
  cp: number;
  m2ccj: number;
  m2lavj: number;
  tij: number;
  klpj: number;
  tmj: number;
  clavj: number;
  qrtj: number;
  qrsj: number;
}

export interface ReliInfoAps {
  iaedId: number;
  reliId: number;
  anno: number;
  mes: number;
  empresaNombre?: string | null;
  diviDivi?: number | null;
  qrtz: number;
  cpe: number;
  t: number;
  vacrtAbc: number;
  vacrt: number;
  crtz: number;
  qbl: number;
  qlu: number;
  qr: number;
  tafa: number;
  nd: number;
  na: number;
  qna: number;
  tafna: number;
  qa: number;
  aprovecha: number;
  qalmacen: number;
  cpeet: number;
  qrtet: number;
  crtcomp: number;
  cdfcomp: number;
  qrscomp: number;
  naa: number;
  nda: number;
}

export interface ReliInfoRelleno {
  iareId: number;
  reliId: number;
  anno: number;
  mes: number;
  qrs: number;
  c: number;
  vl: number;
  ctmlx: number;
  ctlk: number;
  escenario: number;
  cdfk: number;
  vacdfAbc: number;
  vacdf: number;
  vactlAbc: number;
  vactl: number;
}

export interface ReliInfoAdicional {
  ceadId: number;
  reliId: number;
  anno: number;
  mes: number;
  cdf: number;
  ctl: number;
}

/**
 * Cambio puntual (antes/despues) de un campo dentro de una fila de resumen del
 * Tarificador. Estructura confirmada contra el legacy
 * (front-tarificador/src/reliq/components/tarificador/Resumen*TablaCambios.vue,
 * ver p.ej. ResumenUsuariosTablaCambios.vue:104-109): cada fila trae un array
 * `cambios` con el nombre de columna y su valor antes/despues de la tarificación.
 */
export interface ResumenTarificadorCambio {
  col: string;
  antes: unknown;
  despues: unknown;
}

/**
 * Fila cruda de cualquiera de los 5 resumenes del Tarificador
 * (reliqTarificador/resumenUsuarios|resumenEmpresa|resumenAdicional|resumenRelleno|resumenAPS).
 * El shape exacto de los campos "planos" (iuae_anno, ined_anno, etc.) y de los objetos
 * anidados (empr_empr, divi_divi, fapr_codigo, clas_claseuso, para_tiptar20012, rell_id)
 * varía por tab; se tipa como índice abierto porque viene directo del PL/SQL
 * (fnrei_previsualizar_*) y no hay DDL/documentación oficial de esas funciones.
 */
export interface ResumenTarificadorFila {
  cambios?: ResumenTarificadorCambio[];
  [key: string]: unknown;
}

export interface ResumenTarificadorDto {
  filas?: ResumenTarificadorFila[];
  [key: string]: unknown;
}

/**
 * Contadores del bloque "resultados" devuelto por
 * reliq.pkrei_aplicarreliquida.fnrei_aplicartodo (ver legacy
 * tarificador/controller.js:303-312 y Tarificador.vue:86-105, dialog de aprobación).
 */
export interface AprobarReliquidacionContadores {
  iaed: number;
  ined: number;
  iare: number;
  iuae: number;
  cead: number;
}

export interface AprobarReliquidacionResultado {
  mensaje?: string | null;
  codmes?: string | null;
  resultados?: AprobarReliquidacionContadores | null;
  rawResultado?: string | null;
}

export interface AprobarReliquidacionResponse {
  ok: boolean;
  mensaje: string;
  resultado?: AprobarReliquidacionResultado | null;
}

export interface EstadoReliquidacion {
  ok: boolean;
  estado: string;
  puedeAprobar: boolean;
}

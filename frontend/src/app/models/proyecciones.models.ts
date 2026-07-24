export interface ApiEnvelope<T> {
  status: boolean;
  data: T;
  message: string;
  traceId?: string;
}

export interface MutationResponse {
  success: boolean;
  message?: string | null;
  id?: number | null;
}

export interface ApsOption {
  apsaId: number;
  apsaNombre: string;
}

export interface Proyeccion {
  proyId: number;
  apsaId: number;
  apsaNombre?: string | null;
  proyNombre: string;
  proyDescripcion?: string | null;
  proyTipo100: number;
  proyTipoNombre?: string | null;
  proyAnnoDes: number;
  proyMesDes: number;
  proyAnnoHas: number;
  proyMesHas: number;
  proyEstado: number;
  proyFecha?: string | null;
  sisuCorreo?: string | null;
}

export interface ProyeccionCreate {
  apsaId: number;
  proyNombre: string;
  proyTipo100: number;
  proyAnnoDes: number;
  proyMesDes: number;
  proyAnnoHas: number;
  proyMesHas: number;
}

export type ProyeccionUpdate = ProyeccionCreate;

export interface LineaTiempoRow {
  proyId: number;
  apsaId: number;
  anno: number;
  mes: number;
  deltipc?: number | null;
  deltipcc?: number | null;
  deltsmlv?: number | null;
  deltioexp?: number | null;
  deltfacproduc?: number | null;
  deltindipcc?: number | null;
  deltipccs?: number | null;
}

export interface LineaTiempoUpsert {
  proyId: number;
  apsaId: number;
  isNew: boolean;
  rows: LineaTiempoRow[];
}

// PROY_USUARIOS no tiene ID sustituto (clave natural PROY_ID/COD_APS/ANNO/SEMESTRE/CODTIPOPRED/CODUSO).
export interface CrecimientoUsuariosItem {
  anno: number;
  semestre: number;
  coduso?: number | null;
  nomclaseuso?: string | null;
  codfactor?: number | null;
  valorfactor?: number | null;
  codtipopred?: number | null;
  nomtipopred?: string | null;
  cantidad?: number | null;
  toneladas?: number | null;
}

// PROY_PROPIA: variables de cálculo propio del APS (sin ID sustituto).
export interface CrecimientoPropiaItem {
  nomAps?: string | null;
  codEmpresa?: number | null;
  nomEmpresa?: string | null;
  anno: number;
  mes: number;
  vDispterc?: string | null;
  iat?: string | null;
  vN?: number | null;
  vNa?: number | null;
  vNd?: number | null;
  vTafna?: number | null;
  vQrt?: number | null;
  vQlu?: number | null;
  vQna?: number | null;
  vQbl?: number | null;
  vQr?: number | null;
  vQrs?: number | null;
  vCblj?: number | null;
  vLbl?: number | null;
  vValorMts3?: number | null;
  vM2cc?: number | null;
  vM2lav?: number | null;
  vTi?: number | null;
  vTm?: number | null;
  vKlp?: number | null;
  vVl?: number | null;
  vEscenario?: number | null;
  vCtlmx?: number | null;
  vT?: number | null;
  vCpe?: number | null;
  vVaCrt?: number | null;
  vVaCrtAbc?: number | null;
  vVaCdf?: number | null;
  vVaCdfAbc?: number | null;
  vNaa?: number | null;
  vQa?: number | null;
  vTafa?: number | null;
  vCp?: number | null;
  vCrtPropio?: number | null;
  vCdfFacturado?: number | null;
  vQrtz?: number | null;
  vCdfTercero?: number | null;
  vCtlTercero?: number | null;
  vIrTercero?: number | null;
  vQrsMunrecp?: number | null;
}

// PROY_COMPETIDOR: variables del competidor/tercero (sin ID sustituto).
export interface CrecimientoTercerosItem {
  nomAps?: string | null;
  codEmpresa?: number | null;
  nomEmpresa?: string | null;
  anno: number;
  mes: number;
  cN?: number | null;
  cNa?: number | null;
  cNd?: number | null;
  cTafna?: number | null;
  cValorMts3?: number | null;
  cQrt?: number | null;
  cQlu?: number | null;
  cQna?: number | null;
  cQbl?: number | null;
  cQrechazo?: number | null;
  cQrs?: number | null;
  cCblj?: number | null;
  cLbl?: number | null;
  cM2cc?: number | null;
  cM2lav?: number | null;
  cTi?: number | null;
  cTm?: number | null;
  cKlp?: number | null;
  cVl?: number | null;
  cEscenario?: number | null;
  cT?: number | null;
  cCpe?: number | null;
  cCtlmx?: number | null;
  cVaCrt?: number | null;
  cVaCrtAbc?: number | null;
  cVaCdf?: number | null;
  cVaCdfAbc?: number | null;
  cNaa?: number | null;
  cQa?: number | null;
  cTafa?: number | null;
  cCrtCompetidor?: number | null;
  cCdfCompetidor?: number | null;
  cQrtz?: number | null;
  cCtlSinIncentivo?: number | null;
  cIncentivo?: number | null;
  cCdfsincentivo?: number | null;
  cCpoda?: number | null;
}

// PROY_DESCUENTOS: sin ID sustituto, clave natural (PROY_ID, ANNO, MES).
export interface DescuentoItem {
  nomAps?: string | null;
  anno: number;
  mes: number;
  dccs?: number | null;
  dcbl?: number | null;
  dclus?: number | null;
  dcrt?: number | null;
  dcdf?: number | null;
  dctl?: number | null;
  dvba?: number | null;
}

export interface CrecimientoPayload {
  usuarios: CrecimientoUsuariosItem[];
  propia: CrecimientoPropiaItem[];
  terceros: CrecimientoTercerosItem[];
  descuentos: DescuentoItem[];
}

export interface CrecimientoDriveTab {
  sheetTitle: string;
  columns: string[];
  rows: Record<string, unknown>[];
  error?: string | null;
}

export interface SubcontConsulta {
  apsaId: number;
  proyId: number;
  anno: number;
  mes: number;
}

export interface SubcontItem {
  clasClase: number;
  sucoValor?: number | null;
}

export interface SubcontUpsert {
  proyId: number;
  apsaId: number;
  anno: number;
  mes: number;
  items: SubcontItem[];
}

// AUCO_CLASESUSO -- catálogo real de clase de uso (Estratos 1-6 + Comercial/Industrial/Oficial).
export interface ClaseUso {
  clasClase: number;
  clasNombre: string;
}

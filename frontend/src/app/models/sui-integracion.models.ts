export interface ApiResponseEnvelope<T = unknown> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  oraCode?: string;
}

export type SuiFormato = 'F19' | 'F23' | 'F24' | 'F35' | 'F36';
export type SuiTab = SuiFormato | 'RESUMEN';

export interface SuiConsultaRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface SuiProcesarRequest extends SuiConsultaRequest {
  usuario: number;
}

export interface SuiComplementoFilaRequest {
  aps: number;
  det: number | null;
  f1et: number | null;
  cpeet: number | null;
  prtzet: number | null;
  ceg: number | null;
  camrers: number;
  inccdfalt9: number;
  prctcrrcp: number;
  v0: number;
  vm: number;
  mcrs: number;
  icrsm: number;
  iccrs: number;
  frein: number;
  capperdf: number;
  qrsMes: number;
  dispalt9: number;
  vlMes: number;
}

export interface SuiComplementoRequest {
  aps: number;
  anno: number;
  mes: number;
  usuario: number;
  filas: SuiComplementoFilaRequest[];
}

export interface SuiExistenArchivosResponse {
  existen: boolean;
  cantidad: number;
}

export interface InformeDatasetItem {
  nombre: string;
  columns: string[];
  data: unknown[][];
}

export interface InformeCostosResponse {
  semestre: string;
  dataset: InformeDatasetItem[];
}

export interface SuiFormatoResponse {
  formato: SuiFormato;
  filas: Array<Record<string, unknown>>;
}

export interface SuiPrecheckResponse {
  puedeProcesar: boolean;
  mensajes: string[];
}

export interface SuiProcesarResponse {
  exitoso: boolean;
  formatosProcesados: string[];
  estado: string;
}

export interface SuiComplementoResponse {
  guardado: boolean;
  filasAfectadas: number;
}

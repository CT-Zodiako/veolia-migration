export interface ApiResponseEnvelope<T = unknown> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  oraCode?: string;
}

export type SuiFormato = 'F19' | 'F23' | 'F24' | 'F35' | 'F36';
export type SuiApplicability = 'APLICA' | 'NO APLICA' | 'DESCONOCIDO';

export interface SuiConsultaRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface SuiProcesarRequest extends SuiConsultaRequest {
  usuario: number;
}

export interface SuiComplementoItemRequest {
  item: number;
  valor: string;
}

export interface SuiComplementoRequest extends SuiConsultaRequest {
  formato: Extract<SuiFormato, 'F24' | 'F35' | 'F36'>;
  complementoData: SuiComplementoItemRequest[];
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

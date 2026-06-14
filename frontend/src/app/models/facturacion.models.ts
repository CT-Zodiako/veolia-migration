export interface ApiResponseEnvelope<T = unknown> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  oraCode?: string;
}

export interface FacturacionRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface FacturacionConsultaMeta {
  aps: number;
  anno: number;
  mes: number;
  annoConsultado: number;
  mesConsultado: number;
}

export interface FacturacionResponse {
  periodo: FacturacionConsultaMeta;
  filas: Array<Record<string, unknown>>;
}

export interface DetaFacturacionResponse extends FacturacionResponse {}
export interface FacturacionClusResponse extends FacturacionResponse {}
export interface FacturacionDincResponse extends FacturacionResponse {}
export interface FacturacionElectronicaResponse extends FacturacionResponse {}

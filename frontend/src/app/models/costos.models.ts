export interface ApiResponseEnvelope<T = unknown> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  oraCode?: string;
}

export interface CostosRequest {
  aps: number;
  mes: number;
  anno: number;
  usuario: number;
}

export interface AntesLiquidarState {
  estado?: string;
  mensaje?: string;
  [key: string]: unknown;
}

export interface ValidapreactualizaResponse {
  puedeCalcular: boolean;
  mensajes: string[];
  antesLiquidar?: AntesLiquidarState | string;
}

export interface PrecheckResult {
  nombre: string;
  estado: 'success' | 'error' | 'pending' | string;
  mensaje: string;
}

export interface RunPrechecksResponse {
  puedeCalcular: boolean;
  prechecks: PrecheckResult[];
}

export interface PasoEjecucion {
  paso: number;
  nombre?: string;
  estado: 'pendiente' | 'en-progreso' | 'completado' | 'omitido' | 'error' | string;
  mensaje?: string;
}

export interface CalculartarifasResponse {
  exitoso: boolean;
  pasosEjecutados: PasoEjecucion[];
  resultado?: string;
}

export interface CertificarTarifasResponse {
  certificado: boolean;
  fechaCertificacion?: string;
}

export interface CostoItem {
  apsId: number;
  mes: number;
  anno: number;
  costValor: number;
  costTipo: string;
  costFecha: string;
}

export interface CostoClusItem {
  apsaId: number;
  costAnno: number;
  costMes: number;
  paraCosto20021: number;
  paraNombre: string;
  costValor: number;
}

export interface ComportaClusItem {
  apsaId: number;
  inedAnno: number;
  inedMes: number;
  inedCp: number;
  inedM2ccj: number;
  inedM2lavj: number;
  inedTij: number;
  inedKlpj: number;
  inedTmj: number;
}

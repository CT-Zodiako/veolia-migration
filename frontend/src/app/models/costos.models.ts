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

export interface VerificacionDetalle {
  empresaNombre: string;
  grupo: string;
  variable: string;
  valor: number;
  empresaPropia: number;
}

export interface ValidapreactualizaResponse {
  puedeCalcular: boolean;
  detalle: VerificacionDetalle[];
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

export interface CalculartarifasResponse {
  exitoso: boolean;
  resultado?: string;
}

export interface CertificarTarifasResponse {
  certificado: boolean;
  fechaCertificacion?: string;
}

export interface CostoItem {
  apsCosto: number;
  empresaCosto: number;
  codCosto: number;
  nomCosto: string;
  annoCosto: number;
  mesCosto: number;
  aCobrar: number | null;
  valor: number | null;
  variacion: number | null;
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

// Legacy toneladas/qrt, toneladas/qa and kilometros/lbl rows behind the Cálculo Tarifas charts (Calculo.vue:40-68).
export interface QrtItem {
  aps: number;
  empresa: number;
  tipo: string;
  valor: number;
}

export interface QaItem {
  aps: number;
  empresa: number;
  anno: number;
  mes: number;
  valor: number;
}

export interface LblItem {
  aps: number;
  empresa: number;
  mpio: number;
  anno: number;
  mes: number;
  valor: number;
  estado: number;
}

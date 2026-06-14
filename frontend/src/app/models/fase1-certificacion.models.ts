export interface ApiResponseEnvelope<T = unknown> {
  status: string;
  data: T;
  message: string;
  traceId?: string;
  oraCode?: string;
}

export interface SelectOption {
  id: number;
  nombre: string;
}

export interface Periodo extends SelectOption {}
export interface Municipio extends SelectOption {
  departamentoId?: number;
}
export interface Prestador extends SelectOption {}
export interface TipoCargue extends SelectOption {}

export interface FiltrosCertificacion {
  vigencia: number | null;
  departamentoId: number | null;
  municipioId: number | null;
  prestadorId: number | null;
  tipoCargueId: number | null;
}

export interface CrearCargueRequest {
  periodoId: number;
  municipioId: number;
  prestadorId: number;
  tipoCargueId: number;
  usuario: string;
}

export interface CargueActual {
  cargueId: number;
  estado: string;
  periodoId?: number;
  municipioId?: number;
  prestadorId?: number;
  tipoCargueId?: number;
}

export interface ArchivoCargaResponse {
  archivoId: number;
  filasLeidas: number;
  filasValidas?: number;
  filasInvalidas: number;
  errores?: Array<Record<string, unknown>>;
}

export interface ParseoResponse {
  filasTotales: number;
  filasValidas: number;
  filasInvalidas: number;
  detalleErrores?: ErrorCargue[];
}

export interface ErrorCargue {
  fila?: number;
  columna?: string;
  mensaje?: string;
  codigo?: string;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface ResumenCargue {
  totales?: number;
  validos?: number;
  invalidos?: number;
  detalle?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ValidacionInicio {
  validacionId: number;
  estado: string;
  resumen?: string;
}

export interface ValidacionEstado {
  estado: string;
  totales?: Record<string, number>;
  errores?: ErrorCargue[];
}

export interface EjecucionInicio {
  ejecucionId: number;
  estado: string;
}

export interface EjecucionEstado {
  estado: string;
  progreso?: number;
  resultado?: Record<string, unknown>;
}

export interface ResultadoCertificacion {
  items: Array<Record<string, unknown>>;
  totales?: Record<string, number>;
}

export interface ConfirmacionResponse {
  confirmado: boolean;
  fecha?: string;
}

export interface ReversionResponse {
  revertido: boolean;
}

export interface PlantillaResponse {
  fileName: string;
  contentType: string;
  base64: string;
}

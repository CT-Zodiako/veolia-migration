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
  relqSolicita?: number | null;
  relqAprueba?: number | null;
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
}

export interface ActualizarReliquidacionRequest extends CrearReliquidacionRequest {
  relqId: number;
}

export interface CompararCostos {
  codReliq: number;
  apsNom: string;
  costAnno: number;
  costMes: number;
  costo: number;
}

export interface CompararTarifas {
  reli: number;
  tarifa: number;
  componente: string;
  anno?: number;
  mes?: number;
}

export interface ReliInfoUsuarios {
  iuaeId: number;
  reliId: number;
  cantidad?: number;
  toneladas?: number;
  costo?: number;
  tarifa?: number;
}

export interface ReliInfoEmpresa {
  inedId: number;
  reliId: number;
  cblj?: number;
  costo?: number;
  tarifa?: number;
}

export interface ReliInfoAps {
  iaedId: number;
  reliId: number;
  qrtz?: number;
  costo?: number;
  tarifa?: number;
}

export interface ReliInfoRelleno {
  iareId: number;
  reliId: number;
  qrs?: number;
  costo?: number;
  tarifa?: number;
}

export interface ReliInfoAdicional {
  ceadId: number;
  reliId: number;
  cdf?: number;
  ctl?: number;
}

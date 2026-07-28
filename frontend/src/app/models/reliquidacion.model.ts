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
  anno: number;
  mes: number;
  diviDivi?: number | null;
  clasClaseUso?: number | null;
  paraTipTar20012?: number | null;
  paraUbicacion20016?: number | null;
  paraTipFac20014?: number | null;
  faprCodigo?: number | null;
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

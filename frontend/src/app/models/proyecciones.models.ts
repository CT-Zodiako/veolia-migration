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
  detlId?: number;
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

export interface CrecimientoUsuariosItem {
  prusId?: number | null;
  anno: number;
  semestre: number;
  coduso?: number | null;
  codtipopred?: number | null;
  cantidad?: number | null;
  toneladas?: number | null;
}

export interface CrecimientoPropiaItem {
  prprId?: number | null;
  anno: number;
  mes: number;
  vUsuarios?: number | null;
  vToneladas?: number | null;
  vIngresos?: number | null;
  vCostos?: number | null;
}

export interface CrecimientoTercerosItem {
  prcoId?: number | null;
  anno: number;
  mes: number;
  cUsuarios?: number | null;
  cToneladas?: number | null;
  cIngresos?: number | null;
  cCostos?: number | null;
}

export interface DescuentoItem {
  prdeId?: number | null;
  anno: number;
  mes: number;
  porcentaje?: number | null;
  valor?: number | null;
}

export interface CrecimientoPayload {
  usuarios: CrecimientoUsuariosItem[];
  propia: CrecimientoPropiaItem[];
  terceros: CrecimientoTercerosItem[];
  descuentos: DescuentoItem[];
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

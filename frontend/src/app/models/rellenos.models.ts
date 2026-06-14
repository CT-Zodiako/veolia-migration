export interface RellenoItem {
  RELL_ID: number;
  RELL_NOMRELLENO: string;
  RELL_DESCRIPCION?: string | null;
  RELL_ESTADO: number;
  RELL_PROPIO: number;
  RELL_REGIONAL: number;
  RELL_NUSD?: string | null;
  RELL_FECHACREACION: string;
  USUA_USUA: number;
}

export interface RellenoRequest {
  rell_id: number;
}

export interface CrearRellenoRequest {
  rell_nomrelleno: string;
  rell_descripcion: string | null;
  rell_estado: number;
  rell_propio: number;
  rell_regional: number;
  rell_nusd: string | null;
}

export type EditarRellenoRequest = CrearRellenoRequest;

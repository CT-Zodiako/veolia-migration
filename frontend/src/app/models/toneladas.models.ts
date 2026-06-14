import { ApiResponseEnvelope } from './costos.models';

export interface ToneladasRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface QrtResponse {
  aps: number;
  empresa: number;
  tipo: string;
  valor: number;
}

export interface QaResponse {
  aps: number;
  empresa: number;
  anno: number;
  mes: number;
  valor: number;
}

export interface DetalleResponse {
  aps: number;
  empresa: number;
  mpio: number;
  anno: number;
  mes: number;
  tipo: string;
  valor: number;
}

export type ToneladasEnvelope<T> = ApiResponseEnvelope<T>;

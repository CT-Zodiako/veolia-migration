import { ApiResponseEnvelope } from './costos.models';

export interface KilometrosRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface LblResponse {
  aps: number;
  empresa: number;
  mpio: number;
  anno: number;
  mes: number;
  valor: number;
  estado: number;
}

export type KilometrosEnvelope<T> = ApiResponseEnvelope<T>;

import { ApiResponseEnvelope } from './costos.models';

export interface TafnaRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface TafnaResponse {
  aps: number;
  empresa: number;
  anno: number;
  mes: number;
  valor: number;
}

export type TafnaEnvelope<T> = ApiResponseEnvelope<T>;

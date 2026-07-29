import { ApiResponseEnvelope } from './costos.models';

export interface TrnaRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface TrnaResponse {
  apsaId: number;
  emprEmpr: number;
  diviDivi: number;
  apsaNomaps: string;
  faprNombre: string;
  faprCodigo: number;
  faprValor: number;
  trna: number;
}

export type TrnaEnvelope<T> = ApiResponseEnvelope<T>;

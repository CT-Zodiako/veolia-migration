import { ApiResponseEnvelope } from './costos.models';

export interface UsuariosGraficoRequest {
  aps: number;
  anno: number;
  mes: number;
}

export interface UsuarioPromedioResponse {
  aps: number;
  empresa: number;
  tipo: string;
  valor: number;
}

export type UsuariosGraficoEnvelope<T> = ApiResponseEnvelope<T>;

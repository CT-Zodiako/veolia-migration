import { Formato2Response } from './sui853-cft.model';

export interface FacPayload extends Formato2Response {
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FacEnvelope {
  status: string | boolean;
  data: FacPayload;
  message?: string;
}

// Keep the original metadata and row keys; only adapt the shared table's title input.
export function facTableData(payload: FacPayload): FacPayload {
  if (!payload || !Array.isArray(payload.data)) throw new Error('Respuesta FAC inválida.');
  const dialogHeader = payload.meta?.['dialogHeader'];
  return { ...payload, title: typeof dialogHeader === 'string' && dialogHeader.trim() ? dialogHeader : payload.title };
}

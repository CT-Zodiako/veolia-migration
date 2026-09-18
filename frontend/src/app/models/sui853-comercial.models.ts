export interface ComercialRequest { apsId: string; year: number; month: number; }
export type ComercialRow = Record<string, unknown>;
export interface ComercialSummary {
  title?: string | null;
  meta?: { dialogHeader?: string | null; [key: string]: unknown };
  data?: ComercialRow[];
  [key: string]: unknown;
}
export interface ComercialEnvelope<T> { status: string; data: T; message: string; }

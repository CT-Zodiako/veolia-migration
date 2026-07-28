// Modelos para los 12 endpoints de SUI853/CFT. Los 12 ejecutan el mismo SQL
// genérico en el backend (SELECT SUI.f_render_formato2(:codigo) AS json FROM
// dual) y devuelven la misma forma de respuesta, cambiando solo el código de
// formato SUI. Ver doc migracion/modules/sui853/CFT.md para el contrato real
// por endpoint (columnas, fila de ejemplo) y
// backend/Veolia.Api/Contracts/Sui853/Formato2ResponseDto.cs para el DTO
// espejado acá.
//
// Los nombres de campo respetan EXACTAMENTE las claves JSON reales (mezcla de
// SNAKE_CASE en las secciones de nivel superior — SIN_MOVIMIENTO/
// CON_MOVIMIENTO — y camelCase/snake_case en las columnas — backgroundColor/
// mouse_over), no se normalizan a una convención única.

export interface ApiEnvelope<T> {
  status: 'ok' | 'error' | boolean;
  data: T;
  message: string;
  traceId?: string;
}

export interface TablaColumnaMeta {
  field: string;
  header: string;
  formato: string | null;
  decimal: number | null;
  alineacion: string | null;
  backgroundColor: string | null;
  filter: boolean | null;
  mouse_over: string | null;
}

export interface TablaSeccion {
  tableTitle: string | null;
  tableColor: string | null;
  headers: TablaColumnaMeta[];
}

export interface Formato2Response {
  title: string | null;
  SIN_MOVIMIENTO: TablaSeccion | null;
  CON_MOVIMIENTO: TablaSeccion | null;
  data: Record<string, unknown>[];
}

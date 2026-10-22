// Modelos para los 27 endpoints Formato2 de SUI853 (CFT/CVNA/CVA). Todos
// ejecutan el mismo SQL genérico en el backend (SELECT
// SUI.f_render_formato2(:codigo) AS json FROM dual) y devuelven el JSON de la
// función sin pérdida (Formato2Payload en
// backend/Veolia.Api/Modules/Sui853/Cft/Sui853CftContracts.cs) más
// meta.dialogHeader, igual que el legacy. Ver doc migracion/modules/sui853/CFT.md.
//
// Los nombres de campo respetan EXACTAMENTE las claves JSON reales (mezcla de
// SNAKE_CASE en las secciones de nivel superior — SIN_MOVIMIENTO/
// CON_MOVIMIENTO — y camelCase/snake_case en las columnas — backgroundColor/
// mouse_over), no se normalizan a una convención única. Las claves no
// modeladas llegan igual (índice genérico).

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

// El legacy (TablaScrollHorizontal.vue) lee headersConFiltro/headersSinFiltro
// cuando vienen y si no, headers.
export interface TablaSeccion {
  tableTitle: string | null;
  tableColor: string | null;
  headers?: TablaColumnaMeta[] | null;
  headersConFiltro?: TablaColumnaMeta[] | null;
  headersSinFiltro?: TablaColumnaMeta[] | null;
  [key: string]: unknown;
}

export interface Formato2Response {
  title: string | null;
  // meta.dialogHeader = "{CODIGO} | {NOMBRE} | {DESCRIPCION}" (sui.TCAT_DOCUMENTO).
  meta?: Record<string, unknown> | null;
  SIN_MOVIMIENTO: TablaSeccion | null;
  CON_MOVIMIENTO: TablaSeccion | null;
  // f_render_formato2 puede devolver "data": null.
  data: Record<string, unknown>[] | null;
  [key: string]: unknown;
}

// cdft.vue (legacy) — /cdft — pantalla distinta a las 12+ de Formato2 (no
// usa SUI.f_render_formato2), consulta por año y devuelve un listado plano
// por APS. Ver POST api/v1/sui853/cdft/cdft, body { anno }.
export interface CdftRow {
  annoFiscal: string;
  nombreAps: string;
  valorCorriente: number;
  valor2018: number;
  qrtz: number;
  // Índice genérico requerido para que CdftRow sea asignable a
  // Record<string, unknown>[] al pasarlo como `[rows]` de app-tabla-avanzada.
  [key: string]: unknown;
}

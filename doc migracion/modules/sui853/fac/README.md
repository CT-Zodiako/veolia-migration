# SUI 853 — General / FAC

## Scope and source trace

Only the active **General** tab is migrated. There are no APS, year or month inputs, no writes, and no segment placeholders.

Authoritative legacy sources (under `/Users/zodiako/DEV/oracle`):

- `front-tarificador/src/router/index.js`: authenticated `/fac` route.
- `front-tarificador/src/sui853/views/General/fac.vue`: invokes `general.cfa()` once on mount; SEG 2/3 are commented out.
- `front-tarificador/src/sui853/services/general.js`: POST `sui853General/fac` with `{}`; exposes `meta.dialogHeader` as `header`.
- `back-tarificador/src/modules/sui853/General/routes.js`: hard-coded `F853GR01`.
- `back-tarificador/src/modules/sui853/General/controller.js`: renders the format and enriches metadata from `SUI.TCAT_DOCUMENTO`.
- `front-tarificador/src/sui853/components/TablaScrollHorizontal.vue`: dynamic column/table and detail title behavior.

## New contract

Authenticated `POST /api/v1/sui853/general/fac`, empty body. There is no format-code parameter. SQL:

```sql
SELECT SUI.f_render_formato2(:codigo) AS json FROM dual
```

The repository always binds `F853GR01`. The normal API envelope contains the original dynamic JSON object in `data`; exact row keys, nulls, column definitions, unknown properties and metadata survive server serialization. JSON strings and double-encoded JSON are accepted. Missing/malformed payloads or missing `data` arrays fail explicitly rather than looking like empty success. A genuine empty array is valid.

Optional title query:

```sql
SELECT td.CODIGO || ' | ' || td.NOMBRE || ' | ' || td.DESCRIPCION
FROM sui.TCAT_DOCUMENTO td WHERE td.CODIGO = :codigo
```

A nonempty title updates only `meta.dialogHeader`. Missing catalog rows or database errors in this optional query retain the rendered payload/title. Non-object metadata is retained rather than replaced. Cancellation propagates. Errors returned to clients do not expose Oracle details or payloads.

## Frontend and reuse boundary

`/fac` is guarded and registered as **SUI 853 - FAC**, menu ID **40001**, system **3**. Menu visibility uses the existing authenticated system menu tree and permissions; no synthetic menu nodes or database menu changes are introduced.

The page loads automatically, has one General tab, a loading state, an empty state, and an explicit retry on failure. It reuses `Sui853Formato2TablaComponent` for frozen columns, filters, formatting, color classes, export and row detail/copy. That shared component only reads `title`, not `meta.dialogHeader`. The FAC-only adapter preserves the entire payload and maps the dialog header into the table presentation's `title`, so both the table and detail display it. No shared component or shared DTO is changed. The original payload title remains unchanged on the server.

## Unknowns and runtime acceptance gate

Oracle was unavailable. No row fields, grants, catalogs or sample business values were inferred or invented. Validate before production:

1. Function availability, actual CLOB/string encoding and the real `F853GR01` response shape with `data`, `SIN_MOVIMIENTO` and `CON_MOVIMIENTO`.
2. Actual FAC field types, nullability, numeric ranges/precision, column metadata and alignment requirements. The existing table supports its established metadata subset; section colors/titles and explicit L/C/R alignment are not individually rendered by that shared component. These are retained in the payload, not removed.
3. Browser numeric precision: JSON numbers are preserved server-side, but JavaScript cannot represent all Oracle decimals or integers exactly. Check actual FAC values before deciding on a type-changing numeric-string contract.
4. Read/execute grants for `SUI.f_render_formato2` and optional read access to `SUI.TCAT_DOCUMENTO`; catalog columns and code uniqueness are unverified. No grant/schema changes were made. Read-only SELECT calls do not establish that the unavailable PL/SQL implementation has no internal side effects.
5. Actual system-3 menu tree includes permitted ID 40001. Existing authentication is reused; this task does not introduce endpoint-level menu authorization.
6. Compare actual response, title, filter behavior, formatting, frozen columns, CSV and detail/copy against legacy with populated and empty FAC data, including light/dark themes.

## Verification handoff

Focused backend contract tests cover normal/double-encoded JSON, metadata and unknown-field preservation, exact server-side decimals/casing/nulls, missing-title fallback, unusual metadata, malformed payloads, and unauthenticated access before repository invocation.

No test/build commands were run as requested. Parent owns validation and candidate review. The reported pre-existing `StubTarifasRepository` compilation blocker was not changed. CodeGraph was unavailable (missing index); targeted source reads were used without creating an out-of-scope index.

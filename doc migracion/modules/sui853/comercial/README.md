# SUI-853 Comercial — bounded migration

## Implemented contract

| Legacy operation | New operation | Input / scope |
| --- | --- | --- |
| `POST sui853Operaciones/residuosGeneradosInforme` | `POST /api/v1/sui853/comercial/residuosGeneradosInforme` | `{ apsId: string, year: integer, month: integer }` |
| `POST sui853Operaciones/resumenResiduosGenerados` | `POST /api/v1/sui853/comercial/resumenResiduosGenerados` | No parameters; fixed `F853GR02` |

Both new endpoints use the application's `x-access-token` authentication context and `ApiEnvelopeResponse` (`status`, `data`, `message`, trace information). Invalid detail parameters receive HTTP 400 through `[ApiController]` validation. Missing authentication receives HTTP 401. Database failures return a generic HTTP 500 without Oracle messages or SQL. Cancellation propagates to connection opening, commands and row reads.

The frontend route is `/facturacionServicioAseo`, guarded like adjacent SUI routes. Detail and summary have separate loading/error/empty states; changing or clearing parameters cancels outstanding HTTP subscriptions and clears stale results. A failure in either request does not hide the other result. APS/year/month use the existing shared selectors, including assigned-APS lookup and persistence. No duplicate APS endpoint was introduced.

## Source evidence

Behavior reconstructed from `/Users/zodiako/DEV/oracle`:

- `back-tarificador/src/modules/sui853/operaciones/routes.js`: active routes and fixed summary code.
- `back-tarificador/src/modules/sui853/operaciones/controller.js`: detail is `SELECT * FROM SUI.TGEN_COMERCIAL WHERE APS = :1 AND ANNO = :2 AND MES = :3`; summary uses `SUI.f_render_formato2` and a separate `sui.TCAT_DOCUMENTO` title lookup.
- `front-tarificador/src/sui853/views/comercial/tgenComercial.vue`: calls both operations and derives detail columns from returned keys.
- `front-tarificador/src/router/index.js`: legacy page route.
- `front-tarificador/src/service/MenuService.js`: menu ID `10001`, “Facturación Servicio Aseo”. This ID is source evidence, not live Oracle catalog verification.

## Explicit compatibility decisions

- **The summary is global.** The legacy route ignores APS/year/month and passes `F853GR02`. The page explicitly labels that scope. Do not silently replace it with an inferred commercial code or apply guessed filters.
- **No schema is invented.** Detail retains `SELECT *`, exact Oracle column names and nulls. Columns are generated from the union of returned keys rather than a guessed schema. There is no inferred ordering or state filter.
- **Numbers in data rows are strings.** Oracle NUMBER values in detail use provider-specific `OracleDecimal`, avoiding conversion through .NET decimal/double. JSON numbers in summary `data` are converted from their exact JSON representation to strings before browser parsing. This deliberate transport difference prevents JavaScript identifier/decimal rounding; the UI does not apply number pipes or coercion. APS input is a digit string of at most 38 characters; year is 1–9999 and month 1–12. APS remains string-bound, avoiding an unverified assumption about its Oracle type.
- **Shared APS limitation is explicit.** The existing selector emits JavaScript numbers; this screen rejects unsafe integers instead of querying with a rounded identifier. Supporting larger APS IDs in that shared selector requires a separate, wider change.
- **Summary metadata is retained.** Raw JSON objects preserve unknown sections, `title`, all existing `meta` fields and `meta.dialogHeader`. Both ordinary and double-encoded JSON are accepted. The existing CFT DTO is deliberately not reused because it drops metadata. The shared advanced table is reused for export/filtering, with section header labels when available, and full summary metadata remains inspectable below it. Numeric presentation is intentionally raw rather than rounded through the existing Formato2 formatter.
- No global JSON policy, Oracle writes, procedures that mutate data, dependency changes or unrelated module edits were introduced. `f_render_formato2` is used exactly as the legacy read workflow; its internal implementation is not available here.

## Validation and remaining acceptance work

Oracle runtime was unavailable. No live payload/schema or runtime parity claim is made. Tests were added but execution/builds are delegated to the parent session.

Focused tests cover request field names, validation, authentication short-circuiting, summary metadata retention, double encoding and precise JSON number transport. They are not integration tests against Oracle or middleware.

Before production acceptance:

1. Run backend focused tests and frontend/backend builds.
2. Confirm the real APS column type, identifier lengths, complete detail column types (especially dates, timestamps, LOBs and any non-NUMBER provider types), and actual Formato2 `data` shape. The UI explicitly rejects unsupported summary shapes rather than displaying an empty success.
3. Compare authenticated detail and summary with legacy for an occupied and empty period; check nulls, large identifiers and fractional amounts. Confirm Oracle NUMBER string output under deployment culture/NLS settings.
4. Verify menu ID `10001` in the target catalog and access for an assigned user. Authentication follows adjacent SUI controllers; no new per-APS server authorization policy is inferred.
5. Exercise rapid parameter changes, incomplete selections, independent request failures, expired authentication, retries, dark mode and CSV export. Confirm summary metadata/header content and decide separately whether exact legacy colors/merged-header presentation is needed.

The active workflow only is in scope: no speculative CRUD, mutation endpoints, schema creation or new commercial report codes.

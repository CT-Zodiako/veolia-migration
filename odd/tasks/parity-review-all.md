# Feature: Full legacy-parity review and test coverage

Review every migrated module of the three systems (Reliquidaciones, SUI853, VEO-Regulator) against the legacy Vue/Express/Oracle source and leave it covered by automated tests.
Legacy AS-IS source (read-only): `/Users/zodiako/DEV/oracle/{front-tarificador,back-tarificador}`. Method: `.agents/skills/veolia-migration-review/SKILL.md`.
Branch: `fix/auth-hardening-test-suite` (no push, no PR).

## Specs

- **S1** — Scope: "quiero terminar todas la  revisiones y pruebas". Every leaf menu option in `doc migracion/modules/auth/AUGE_MENU_202604272009.md` gets a parity review and automated tests.
- **S2** — It is a migration: "recuerda que tambien es una revision entre el viejo y el nuevo receurda que es una migracion". Each review compares the legacy endpoint/SQL/screen against the new one (fields, catalogs, filters, NOT NULL constraints, DTO casing), per the skill checklist.
- **S3** — Parity bugs: "Reportar y preguntar". For each module, list the parity bugs found and wait for the user's approval before changing production code. Test-only fixes and new tests do not need approval.
- **S4** — Order: "Por riesgo" — Reliquidaciones first, then SUI853, then VEO-Regulator.
- **S5** — Frontend tests: "Sí, agregar tests" — add Angular unit-test infrastructure and tests for the reviewed components.
- **S6** — Delivery: "no quiero hacer push ni pr por ahora". Local work-unit commits only.
- **S8** — Reliquidaciones approved fixes (user, verbatim selections): "R1 Aprobar sin esquema reliq., R2 Resumen vacío rompe todo, K1+K2 Reliquidar Tarifa, C1 Picklist APS en Crear"; "C2 Extracción vacía = éxito, C3 Validar usuarios > 0, R3 Buffer 4000 → 32767, R4 Estados aprobables"; K3 negatives: "Dejarlo como está"; cosmetics (2-decimal rounding with nulls as 0, legacy per-column filters in Comparar Costos, Comparar Tarifas and Cargue): "Sí, agregarlos". Each fix gets a test that reproduces it first.
- **S9** — SUI853 approved work (user, verbatim selections): bugs "M1 Comercial: catálogo APS, M2/O1 Resumen sin filtrar, F1/F2/F6 Tabla Formato2, Carga genérica: fechas"; Drive loads 30004/30005/30007: "Migrar corrigiendo el legacy" (delete-before-insert by APS/año/mes in one transaction, parameterized dates, real company instead of "Test", forward the month filter legacy ignored); exports/visual: "M3 Export Comercial, Formatos y encabezados, Filtros/export APS Empresa/Docs, Copiar en CDFT".
- **S7** — Each module review records: legacy source paths, endpoint contract table (legacy vs new), findings (bug / intentional deviation / OK), tests added, and verdict (approved / pending decision).

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S5 | Add Angular unit-test infrastructure (runner + one smoke spec) — done | inline | 31d5882 |
| T2 | S1 | Make `AuthRepositoryOracleIntegrationTests` skip (not silently pass) without Oracle — done | inline | 445626e |
| T3 | S2,S3,S7 | Reliquidaciones — Crear (5001) | worker | 9e4e2e7 |
| T4 | S2,S3,S7 | Reliquidaciones — Cargue (5002) | worker | 131bcc6 |
| T5 | S2,S3,S7 | Reliquidaciones — Comparar Costos (5003) | worker | 131bcc6 |
| T6 | S2,S3,S7 | Reliquidaciones — Comparar Tarifas (5004) | worker | 131bcc6 |
| T7 | S2,S3,S7 | Reliquidaciones — Tarificador: Verificación de Cambios / Aplicar en Tarifas (6001, 6002) | worker | 1857ab4 |
| T8 | S2,S3,S7 | SUI853 Configuración — 30001, 30002, 30003, 30005, 30006, 30007; gap 30004 Cargue Residuos | inline | |
| T9 | S2,S3,S7 | SUI853 CFT group — 7001-7006, 7010, 7011 | inline | |
| T10 | S2,S3,S7 | SUI853 CRT/CDFT/CVNA/CVA — 8001, 8002, 8008, 8009, 8010, 9001 | inline | |
| T11 | S2,S3,S7 | SUI853 Comercial 10001, Operaciones 20001, FAC 40001 | inline | |
| T12 | S2 | SUI853 — confirm legacy-dead options 7007-7009, 8003-8007 — done, all dead | explore | n/a |
| T13 | S2,S3,S7 | Regulator Auth/Usuarios — 100, 204, auth endpoints | inline | |
| T14 | S2,S3,S7 | Regulator Configuración — APS 201, Empresas 202, Rellenos 203 | inline | |
| T15 | S2,S3,S7 | Regulator Suministros — 301-304, 307-309, 311 | inline | |
| T16 | S2,S3,S7 | Regulator Cargues — 701, 702 | inline | |
| T17 | S2,S3,S7 | Regulator Procesos — Cálculo Tarifas 401 | inline | |
| T18 | S2,S3,S7 | Regulator Informes comerciales — 501-504 | inline | |
| T19 | S2,S3,S7 | Regulator Informes gerenciales — 601-606 | inline | |
| T20 | S2,S3,S7 | Regulator SUI — 801-805 | inline | |
| T21 | S2,S3,S7 | Regulator Proyecciones — 901-905 | inline | |
| T22 | S2,S3,S7 | Regulator Generales 1001 + PGIRS 2001-2003 | inline | |
| T23 | S2,S3,S7 | Regulator Reversiones — 3001-3004 | inline | |
| T24 | S3 | Pending auth decisions: anonymous asignarSistema/registro/getMenuByUser, JWT `exp`, hardcoded secret fallback | ask | |
| T25 | S1,S7 | Recreate `doc migracion/ESTADO-MIGRACION.md` with final per-option verdicts | inline | |

## Review results

(One section per task as it closes: legacy paths, contract table, findings, tests, verdict.)

### T8 — SUI853 Configuración (30001-30007) — pending user decision
- Legacy menu paths come from `front-tarificador/src/service/MenuService.js` (DB AUGE_MENU only filters MENU_IDs): 30004 = "Cargue Residuos" → `/residuosGeneradosDrive` (`configuracion/residuosGenerados.vue`), 30005 = "Cargue Facturacion" → `/resumenInformesGeneradosDrive`, 30007 = "Cargue Facturacion Mes" → `/cargaFacturacionMes`.
- 30001 APS Empresa / 30002 APS Documentos: same SQL (`SUI.VCFGAPSEMPRESA`, `SUI.VCFGAPSDOCUMENTO`), columns 1:1 — OK. Cosmetic: missing per-column filters, CSV export, sorting, page size 24, thousands separator on TCFG_APS_ID.
- 30003 Formularios: OK; new keeps DECIMALES for `porcentaje` (legacy nulled them) — intentional fix.
- 30005/30007 BUG blocking (verified): screens are 75-line stubs (APS select only); no Drive harvest endpoint and no `postInformes` insert into `SUI.TGEN_COMERCIAL` (59 columns). Legacy flow: `sui853CVA/drive/harvestFacturacion` → `sui853Configuracion/postInformes`. Legacy quirks to decide: EMPRESA hard-coded "Test", DEVFEXCOE←D_CSDF duplicated source, no delete-before-insert (re-runs duplicate), no transaction (partial loads), TO_DATE string interpolation (SQL injection), 30007 month filter never forwarded.
- 30004 GAP (not migrated): legacy harvests Drive folder `1X28TgHTNi4DxiA1LYEMnQlo9xqA8KV9s` tab "Hoja SUI Recolección" filtered by APS name + year → `postResuidos` inserts row by row into `SUI.TGEN_RESGENERADOS` (column map in explore report). Same legacy risks. Needs a new Drive folder-listing capability (current `IGoogleSheetsService` has no `Files.List`); 30004/30005/30007 can share one harvest service.
- 30006 Carga genérica: intentional deviations (SUI-only, atomic, strict numbers). BUG functional (likely, inferred from Sheets API default): DATE columns read with UNFORMATTED_VALUE arrive as serial numbers and are rejected (`GoogleSheetsService.cs:63`, `CargaGenericaContracts.cs:72`). Low: FLOAT/BINARY_DOUBLE "Tipo no soportado". Cosmetic: 400 message/failing row not shown.
- Menu labels "Informes"/"Informes Mes" hide that 30005/30007 are load screens (cosmetic). Note: the menu parity spec checks routing only, not screen completeness.

### T9/T10 — SUI853 Formato2 screens (7001-7006, 7010, 7011, 8001, 8002, 8008, 8009, 9001) and CDFT 8010 — pending user decision
- Legacy: `back-tarificador/src/modules/sui853/{CFT,CVNA,CVA}/routes.js`, `TablaScrollHorizontal.vue`; new: `Sui853CftController.cs:17-195`, `Sui853CftRepository.cs`, `shared/sui853-formato2-tabla.component.*`, `CdftController.cs`, `CdftRepository.cs`.
- All 27 format codes match legacy 1:1; tabs per option match; formatting (`NA`, %, fecha, G/T/R colors, "Ver" modal, title) copied 1:1. Legacy `jwtOken`/`jwtToken` bug not carried over.
- F1 BUG functional (risk): lossy `Formato2ResponseDto` drops unknown keys (`meta`, `headersConFiltro/SinFiltro`); FAC/Comercial already use lossless `JsonObject`. F2 BUG (uncertain): no double-encoded JSON fallback (legacy had it). F6 BUG: `"data": null` crashes the template.
- F3 INTENTIONAL: shows CON_MOVIMIENTO columns too. F5 cosmetic: page heading, "SEG n" labels, paginator 10/24/50.
- CDFT OK (same SQL/filters/columns); C1 cosmetic decimals, C2 copy without execCommand fallback/toast.

### T11 — SUI853 Comercial 10001, Operaciones 20001, FAC 40001 — pending user decision
- M1 BUG functional/blocking (verified): Comercial APS selector uses regulator `APSA_ID` (`aps-selector.component.ts:19`) but `SUI.TGEN_COMERCIAL.APS` uses `TCFG_APS_ID` (legacy `tgenComercial.vue` uses `tcfgAps`; Operaciones already does).
- M2/O1 BUG functional: summary F853GR02 not filtered by APS name/año/mes (legacy filtered client-side; new sends ANNO/MES as strings).
- M3 BUG functional (export for SUI upload): legacy export padded MUNI/POBLADO, per-field decimals, column picker, file name "APS mes año".
- M4/O2 cosmetic: numbered headers, value formats, HH:MM, hidden EMPRESA/DEVEPENXOTR.
- FAC 40001: OK. O3 intentional: Operaciones checks IdSistema==3.

### T12 — SUI853 legacy-dead options — done (no migration needed)
- 7007 CBLz, 7008 CMAGzda, 7009 CFTz, 8003 CRTs, 8004-8006 CDFTd, 8007 CT NUIT: commented out in `MenuService.js:464-478,509-532`, no router entry, no view, no backend route. Never rendered in legacy even when granted. Excluding them is correct (pinned by `sidebar-menu.service.spec.ts`).

### T3 — Reliquidaciones Crear (5001) — pending user decision
- Legacy: `back-tarificador/src/modules/reliq/{routes.js,controller.js}`, `front-tarificador/src/reliq/views/ReliqCrear.vue`, `ModalCrearReliq.vue`. New: `ReliqCrearController.cs`, `ReliqCrearRepository.cs`, `reliq-crear.component.*`.
- Prior audit (apsaId 422, Solicitante/Aprobador collapsed, window.confirm, estado picklist): all FIXED. Estado stored as 1/2 via `EstadoCatalogoAOracle` (verified, `ReliqCrearRepository.cs:47,195`).
- C1 BUG functional/authorization scope: APS picklist lists every APS (`consultaGeneral`), legacy only the user's assigned active APS.
- C2 BUG low: extraction null/empty or "STUB_OK" treated as success; legacy accepted only "ok".
- C3 BUG low: backend accepts usuSolicita/usuAprueba = 0 (UI blocks it).
- C4 UNVERIFIED: descripción required in legacy, optional now; NOT NULL unknown (no DDL). C6 UNVERIFIED: single transaction vs internal COMMIT in `freli_extraccion`.
- Intentional/OK: LEFT JOINs (C7), estado text→1/2 fixes legacy bug (C5), idAtt fix (C8).

### T4 — Reliquidaciones Cargue (5002) — pending user decision
- Legacy: `reliq/cargue/{routes.js,controller.js}`, `Cargue.vue`. New: `ReliqCargueController.cs`, `ReliqCargueRepository.cs`, `reliq-cargue.component.*`.
- Prior audit (no pTemplate, Reliquidar never invoked, 70-90% columns missing): all FIXED; visible/editable columns match legacy 1:1.
- K1 BUG high (confirmed `reliq-cargue.component.ts:~296`): Reliquidar shows success toast even when the package returns `ERR|code|msg` (severity from `res.status`, always "ok").
- K2 BUG functional: tabs not refreshed after Reliquidar (legacy re-fetched all 5).
- K3 BUG functional (needs business rule): backend rejects negatives on an inconsistent subset of fields; legacy had no validation.
- K4 UNVERIFIED: `IAED_APROVECHA`, `IARE_ESCENARIO` mapped to decimal without CAST (FLOAT parse risk).
- K7 BUG cosmetic: no per-column filters. K5/K6: repo comments inaccurate about legacy (USUA_USUA was hardcoded 9).
- R4 (from T7) re-assessed LOW: values are only 1/2; difference is only for other values.

### T5 — Reliquidaciones Comparar Costos (5003) — pending user decision
- Legacy: `back-tarificador/src/modules/reliq/cargue/{routes.js:28,controller.js:169-224}`, `front-tarificador/src/reliq/views/CompararCosto.vue`. New: `ReliqCargueController.cs:11`, `ReliqCargueRepository.cs:28-93`, `reliq-comparar-costo.component.ts`.
- Contract: same route, `{reliq}`, same 40 columns of `RELIQ.VREL_COMPARACOSTOS`; response now envelope + 404 `RELIQ_NOT_FOUND`; auth required (intentional).
- Prior audit (7 cols, 4 field names): FIXED. `signal()+[(ngModel)]`: NOT FOUND.
- C1 BUG cosmetic: no 2-decimal rounding, null shown blank (legacy → 0). C3 UNCERTAIN: view columns may be FLOAT without CAST (Dapper decimal parse error seen on RELI_INFO*); RELIQ schema absent in dev DB.

### T6 — Reliquidaciones Comparar Tarifas (5004) — pending user decision
- Legacy: `cargue/controller.js:8-37,143-167`, `CompararTarifas.vue`. New: `ReliqCargueRepository.cs:95-150,177-229`, `reliq-comparar-tarifas.component.*`.
- Prior audit (3 cols, raw `<pre>`, aps=0): FIXED. Request renamed `aps`→`apsaId` (frontend consistent).
- T1 BUG functional: per-column text filters (MES, ANNO, CLAS_NOMBRE, PARA_NOMBRE, FAPR_NOMBRE) missing. T2 BUG cosmetic: rounding. T6 UNCERTAIN: FLOAT mapping. Dead code: `CompararTarifasDto.cs`.

### T7 — Reliquidaciones Tarificador (6001/6002) — pending user decision
- Legacy: `reliq/tarificador/{routes.js,controller.js:185}`, `Tarificador.vue`; 6002 `/aplicarTarifas` had no router entry in legacy (dead link). New: `ReliqTarificadorRepository.cs`, `ReliqTarificadorController.cs`, `reliq-tarificador.component.*`.
- R1 BUG blocking (confirmed): `PKREI_APLICARRELIQUIDA.fnrei_aplicartodo` without `reliq.` schema (`ReliqTarificadorRepository.cs:30`) vs legacy `reliq.pkrei_aplicarreliquida`; PLS-00201 unless a synonym exists.
- R2 BUG blocking (confirmed backend side): empty resumen → 404 (`ReliqTarificadorController.cs:124`); frontend `forkJoin` of 5 resúmenes + estado fails entirely, Aprobar never appears. Legacy returned 200 `resultado:null` per tab.
- R3 BUG low: output buffer 4000 vs legacy 32767.
- R4 BUG functional (cross-module, see T3): approvable states "1"/"CREADA" vs legacy "anything but 2"; Crear writes 'CREADA' but `estadoLabel` knows only '1'/'2'.
- Intentional: Previsualizar click (R5), no APS selector (R6), auth on resúmenes (R7).


## Log

- **L1** (user, original request): "no quiero hacer push ni pr por ahora quiero terminar todas la  revisiones y pruebas"
- **L2** (user, earlier in session): "arranca receurda que tambien es una revision entre el viejo y el nuevo receurda que es una migracion"
- **L3** (user decisions, 2026-10-21): bugs → "Reportar y preguntar"; order → "Por riesgo"; frontend tests → "Sí, agregar tests".
- **L4** (evidence, 2026-10-21): backend suite restored and auth hardened on branch `fix/auth-hardening-test-suite` (bc2ade0, 1d25579, b5d5194); 199/199 passing excluding 4 Oracle integration tests that silently pass without Oracle. Frontend has 0 specs; `ng build` passes.
- **L6** (evidence, T1): `npm test` runs `@angular/build:unit-test` + Vitest 4 + jsdom; menu parity spec 3/3, mutation check (adding unmapped 30004) fails as expected; `ng build` passes. npm blocked install scripts (esbuild, lmdb, ...) via allowScripts without effect on build/test.
- **L7** (delivery slices, no push per S6): slice 1 = auth hardening + suite repair (bc2ade0, 1d25579, b5d5194); slice 2 = test infrastructure (31d5882, 445626e); next slices = one per system review (Reliquidaciones, SUI853, VEO-Regulator).
- **L8** (evidence, T2): `[OracleFact]` skips unless VEOLIA_ORACLE_TESTS=1; backend suite 199 passed / 4 skipped in 0.75s; opted-in run without Oracle fails with "Oracle is not reachable". README section 6 documents the commands.
- **L9** (user decision, Reliquidaciones): approved R1, R2, K1+K2, C1, C2, C3, R3, R4 and cosmetics; K3 left as is.
- **L10** (user decision, SUI853): approved all four bug groups, migrating 30004/30005/30007 fixing legacy defects, and all four export/visual items.
- **L11** (evidence, worker W-B mvj1jawh): K1/K2, rounding (opt-in `decimales` on tabla-avanzada) and legacy filters implemented with RED→GREEN; scoped specs 20/20; ng build passes. Legacy faithful exceptions: RELQ_CLUS and TBL_ORIG unrounded; Comparar Costo legacy filters never rendered (none added).
- **L12** (evidence, legacy): legacy `back-tarificador/src/database/database.js` exports only `open` and `executeMany`; `db.procedure` (used by reliq Crear extraction and Cargue Reliquidar, `reliq/controller.js:122,157`, `reliq/cargue/controller.js:73,116`) does not exist, so in the on-disk legacy those calls always threw after the autocommitted INSERT. The legacy `"ok"` check never ran; the real `freli_extraccion` return value is unknown (local stub returns 'STUB_OK').
- **L13** (user decision, C2): asked again after L12 — "\"ok\" exacto" (only the exact "ok" is success; anything else rolls back). Risk accepted: if production returns "OK", creation fails.
- **L14** (evidence, worker W-A mvj1jawf + parent checks): R1-R4, C1-C3 implemented with RED→GREEN; combined checks backend 228 passed / 4 skipped, frontend 24/24, ng build OK. Commits: 1857ab4 (T7), 131bcc6 (T4-T6). Slice 3 = Reliquidaciones (1857ab4, 131bcc6, Crear commit).
- **L5** (evidence): prior audit (2026-07-27, Engram) reported blocking Reliquidaciones bugs: Crear never sends `apsaId` (422), Cargue tables lack `pTemplate`, Comparar Tarifas/Costo show 3-7 of 30-40 real columns, transversal `readonly signal() + [(ngModel)]` bug; schema `RELIQ` absent from dev ADB. Not yet re-verified.

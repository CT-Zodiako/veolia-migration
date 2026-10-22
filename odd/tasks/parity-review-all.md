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
- **S10** — Regulator auth/config approved work (user, verbatim selections): security "Exigir token en las 6 anónimas, Solo admins gestionan usuarios, Validar expiración del token, Exigir JwtSecret configurado"; bugs "R1 SISU_FECHA en registro, Empresas E1+E2+E3, APS A1+A2, Menores L2+L3+R3"; grids "Sí, restaurar" (legacy sorting, page sizes and column filters on Usuarios/APS/Empresas/Rellenos; project dialog instead of alert()). "Admin" = user with permission to menu 204 Usuarios.
- **S11** — Regulator T15-T23 approved work (user, verbatim selections): blocking "K1 Certificar mensual (701), S1 SUI Procesar (801), G1 PGIRS editar/crear (2001), P2 Crecimiento desde Drive (903)"; data/audit "T1+S2 Usuario desde el token, P1 Descripción de proyecciones, A1 INSERTs de Aprovechamiento/Poda, P4 Líneas de tiempo bloqueadas"; functional "G1 Informes gerenciales todas APS, S5 Complemento SUI sin relleno, P3 Subsidios proyección (905), C1 Índices CRA vacíos = 0"; back to legacy rules "K2 Cargue semestral (702), Productividad (303), S6 Período complemento (802), P6 Desde/APS en proyecciones"; cosmetics "Sí, todos" (501/601/504 rounding/formats, 502 visible errors + paginator, 801 curated columns/headers/rounding + confirm before Procesar + "Explicación formatos" link + subtitles, Proyecciones grid sorting/filters/page sizes, PGIRS 2002/2003 labels as legacy, 3004 sorting).
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
| T8 | S2,S3,S7 | SUI853 Configuración — 30001, 30002, 30003, 30005, 30006, 30007; gap 30004 Cargue Residuos | worker | 6017621, a59c197 |
| T9 | S2,S3,S7 | SUI853 CFT group — 7001-7006, 7010, 7011 | worker | 3634590, ad840cb |
| T10 | S2,S3,S7 | SUI853 CRT/CDFT/CVNA/CVA — 8001, 8002, 8008, 8009, 8010, 9001 | worker | 3634590 |
| T11 | S2,S3,S7 | SUI853 Comercial 10001, Operaciones 20001, FAC 40001 | worker | 6017621 |
| T12 | S2 | SUI853 — confirm legacy-dead options 7007-7009, 8003-8007 — done, all dead | explore | n/a |
| T13 | S2,S3,S7 | Regulator Auth/Usuarios — 100, 204, auth endpoints | worker | 331d1aa, cee4481 |
| T14 | S2,S3,S7 | Regulator Configuración — APS 201, Empresas 202, Rellenos 203 | worker | cee4481 |
| T15 | S2,S3,S7 | Regulator Suministros — 301-304, 307-309, 311 | worker | fdc1d81 |
| T16 | S2,S3,S7 | Regulator Cargues — 701, 702 | worker | fdc1d81 |
| T17 | S2,S3,S7 | Regulator Procesos — Cálculo Tarifas 401 | worker | fdc1d81 |
| T18 | S2,S3,S7 | Regulator Informes comerciales — 501-504 | worker | c3eb9f3 |
| T19 | S2,S3,S7 | Regulator Informes gerenciales — 601-606 | worker | c3eb9f3 |
| T20 | S2,S3,S7 | Regulator SUI — 801-805 | worker | c3eb9f3 |
| T21 | S2,S3,S7 | Regulator Proyecciones — 901-905 | worker | af7dea6 |
| T22 | S2,S3,S7 | Regulator Generales 1001 + PGIRS 2001-2003 | worker | af7dea6 |
| T23 | S2,S3,S7 | Regulator Reversiones — 3001-3004 | worker | af7dea6 |
| T24 | S3,S10 | Pending auth decisions: anonymous asignarSistema/registro/getMenuByUser, JWT `exp`, hardcoded secret fallback — decided (S10) | worker | 331d1aa |
| T25 | S1,S7 | Recreate `doc migracion/ESTADO-MIGRACION.md` with final per-option verdicts — done | inline | see final docs commit |

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

### T13 — Regulator Auth/Usuarios (100, 204, auth) — pending user decision
- R1 BUG blocking (likely, verified in code): `registro` INSERT writes `SISU_FECHA` (`UsuariosRepository.cs:~86-105`) but the only DDL (`back-tarificador/DataBase/Scripts/AUGE_SISUSUARIO.sql`) has no such column → ORA-00904 on every user creation unless production has it.
- R2 BUG security (verified): JWT `exp` (12 h) never validated (legacy enforced 6 h via jwt.verify); hard-coded secret fallback when `Auth:JwtSecret` missing; escalation chain: anonymous `registro` (estado from body) → anonymous `asignarSistema` (MERGE inserts) → `login` → `uptUserMenu`/`setApsxUsuario` with no role check (`MenuController.cs:48-53`). Anonymous `getSistemasPorUsuario` leaks sisuId + systems for any email.
- T24 context: none of the 6 anonymous routes is called before login; all callers already send the token.
- R3 low: orphan `/menu-usuario` ignores selected system. R4 cosmetic: user grid sorting/filters/page sizes, reset password via alert(). R5/R6/R7 intentional/OK.

### T14 — Regulator APS 201, Empresas 202, Rellenos 203 — pending user decision
- A1 BUG functional: Resolución was radio 720/351 (default 720), now free number, nullable. A2 low: APSA_NOMAPS VARCHAR2(30) without maxlength.
- E1 BUG data: empresa name normalization lowercases the rest of the name (`empresa-form.component.ts:72`); legacy only capitalized the first letter. E2 BUG: `EMPR_ESTADO` VARCHAR2 compared `=== 1` → every company shows "Inactiva". E3 BUG: NUAP null violates `EMPR_NUAP NOT NULL DEFAULT '0'` (legacy had same defect).
- Rellenos: legacy CRITICAL bugs fixed. L1 UNCERTAIN: legacy wrote RELL_ESTADO 1/0, new writes 1/2 (check DISTINCT in prod). L2 low security: `ex.StackTrace` returned to client (`RellenosController.cs:24`). L3 low: RELL_NOMRELLENO VARCHAR2(20) no maxlength. L4 cosmetic: grids lost sorting/15 rows/filters.

### T15/T16/T17 — Regulator Suministros, Cargues 701/702, Cálculo Tarifas 401 — pending user decision
- K1 BUG blocking (verified): `CertificarAsync` calls `PK_CERTIFICACION.fauco_certificar` with 3 args (aps, anno, mes) as string (`SuministrosRepository.cs:518-519`); package signature is `(aps, mes, anno, usuario) RETURN integer` (`Database/Fase1CargueCertificacion/PK_CERTIFICACION.sql:5`), legacy `suministros/controller.js:623` passes 4 + COMMIT → PLS-00306, monthly certification never runs.
- T1 BUG audit integrity (verified): Costos takes `Usuario` from the request body (`CostosController.cs:16-34`, frontend localStorage fallback 0) instead of the JWT SISU_ID like legacy → spoofable user in AUCO_TARICERTIFICADA and PK_LIQUIDAR.
- A1 BUG blocking (unverified): invented column names in INSERTs replacing legacy positional VALUES — 308 `APROFECHA`/`USUARIO` (`AprovechamientoRepository.cs:38`), 309 `CPTE_VARIACION`/`CPTE_FECCREA`/`USUA_USUA` (`SuministrosRepository.cs:614`); not found in any DDL → possible ORA-00904.
- C1 BUG low: Índices CRA new modal saves blank values as 0 (legacy null). S1 risk: SubCont consulta adds `SUCO_ESTADO = 1` filter (legacy none) — PL/SQL-generated rows may disappear.
- K2 decision: 702 hides all tabs when tariffs exist; legacy semestral always showed tabs (only CERTIFICAR disabled). P1 decision: productividad insert month (legacy inserted current month, read/updated previous; new uses previous for all).
- OK/improvements: 301 duplicate guard + transaction, 302 bind fix, 304, 307, 311 parameterized (SQL injection fixed), loads atomic, prechecks server-side.
- T2 unverified: 7 `pendiente_ddl` tables, stub PK_LIQUIDAR.

### T18/T19/T20 — Regulator Informes comerciales 501-504, gerenciales 601-606, SUI 801-805 — pending user decision
- 501-504, 601-606, 803-805: SQL/views identical to legacy (503/504/604 now verified 1:1); routes renamed where intentional (605 → infogerencial, 803/804 renamed).
- S1 BUG blocking (verified): SUI Procesar binds `PK_SUI.fsui_fejecutasui(:1 aps, :2 Mes, :3 Anno, :4)` (`SuiRepository.cs:~83-111`) but legacy binds `2: anno, 3: mes` (`sui/controller.js:139-148`); OUT read as Int32 vs legacy string; `fsui_estado` called as 3-arg scalar although the dashboard uses it as 2-arg table function. Built against a local stub `Database/Fase3IntegracionSui/PK_SUI.sql`.
- S2 BUG audit/security: Procesar and Cargue complemento take `Usuario` from the request body (legacy token SISU_ID) — same class as T1.
- G1 BUG functional: 601-604 show an APS selector that auto-restores the last APS and filters client-side; legacy hid the selector (all-APS management reports). G2 unverified: 603 filters on APSA_ID (column existence unknown).
- S5 BUG functional (business rule): 802 requires 13 F35/F36 fields (non-nullable decimals) though F35/F36 apply only to APS with own relleno; legacy sent null. S6 decision: 802 period check now compares against month-1 (legacy compared selected month, saved month-1) → existing CSVs rejected.
- Cosmetic: C1 501 rounding returns strings; C2 502 error never rendered, paginator 10/20/100/200; C4 504 number format; G3 601 not rounded; G4 auto-load; G5 date sort; S7 801 curated columns/headers/rounding, missing confirm before Procesar, "Explicación formatos" link, subtitles.
- S3 intentional (verify SUI_AUDITORIA exists); S4 intentional fix (802 single delete, one transaction).

### T21/T22/T23 — Regulator Proyecciones 901-905, Generales 1001 + PGIRS 2001-2003, Reversiones 3001-3004 — pending user decision
- July audit claim (DELTESTADO only frontend) is OUTDATED: server guard exists (`LineaTiempoRepository.cs:77-104`).
- G1 BUG blocking (verified): PGIRS 2001 edit/create call `BeginTransaction()` on a never-opened connection (`PgirsRepository.cs:68-69,117-118`) → always 500.
- P2 BUG data-loss (verified DTO side): Crecimiento Drive rows keyed by sheet headers (`V_N`, `C_N`, `CCS`, `NOM_APS`, `MES`) but DTO properties are `VN`, `CN`, `Dccs`, `NomAps`, `Semestre` without JsonPropertyName (`ProyeccionesContracts.cs:~173-334`) → values stored NULL, Semestre 0.
- P1 BUG data-loss: proyección Descripción required/written in legacy (`formCrear.vue:41-47`, `controller.js:18`); new create/edit omit it, grid still shows the column.
- P3 BUG: 905 legacy queried month-1 but saved to the selected month; new saves month-1.
- P4 BUG (likely): line-time guard rejects the whole batch if any submitted row is locked; frontend always submits all rows → partially locked timelines can't be edited.
- P5 UNCERTAIN: edit/delete require PROYESTADO=1; legacy never set it (check production DISTINCT). P6 decision: legacy fixed desde = last tariff and locked APS on edit; new allows any.
- P7 cosmetic: 901 grid sorting/filters, 905 page sizes.
- 1001 Generales OK (APS scoping intentional). PGIRS 2002/2003 open the same data as legacy, labels crossed (G2 cosmetic). Relaciones.vue/Municipios.vue unreachable in legacy → no migration.
- Reversiones 3001-3004 OK (legacy 3001 was dead code); R1 uncertain: gate accepts "0" and "1".

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
- **L15** (user decision, T13/T14/T24): approved all security items, R1, E1-E3, A1-A2, L2, L3, R3 and grid restoration. Deployment impact: production likely signs JWTs with the hard-coded fallback secret; requiring `Auth:JwtSecret` means configuring it on the IIS server before deploying, and all users re-login.
- **L16** (user decision, T15-T23): approved every listed item and all cosmetics (S11).
- **L17** (evidence, W-C mvj1wq4s): M1, M2/O1, M3, Comercial/Residuos formats, APS Empresa/Documentos done test-first; frontend 81/81, ng build OK; frontend only.
- **L18** (evidence, W-E mvj1wq4v): 30004/30005/30007 Drive loads + Carga genérica dates implemented test-first (backend 453 passed / 4 skipped; ng build OK). Server-side harvest+load in one call, exact (APS,ANNO,MES) delete-then-insert in one transaction, bind params, EMPRESA from SUI.VCFGAPSEMPRESA, IdSistema==3. Flags: DEVFEXCOE←D_CSDF kept as legacy; 30007 month applied to subfolder names (may find nothing); /cargueResiduos has no top-bar title. Independent verifier mvj2ms4g running (data-deletion risk).
- **L19** (evidence, W-F mvj26lbg): auth items 1-6 test-first, backend 453/4 skipped, ng build OK. Only login + validate-credentials anonymous; admin = menu 204 of system 1 (IUserAdminAuthorization); exp validated (missing exp rejected); Auth:JwtSecret required (min 32, no fallback); R1 INSERT legacy columns; R3 getGeneralMenuTree honors idSistema for admins. Production: set Auth__JwtSecret before deploy, all users re-login, confirm admins hold menu 204 in system 1. Independent verifier running.
- **L20** (parent, #26 partial): tabla-avanzada `rowsPerPageOptionsList` is now an opt-in @Input (default 10/20/50 unchanged); Formato2 passes legacy 10/24/50 (RED "expected [10,20,50] to deeply equal [10,24,50]" → GREEN 10/10); top-bar titles: /cssaprovechamiento "Estimación CSS", new titles for /cargueResiduos, /informesGenerados, /informesGeneradosMes (not unit-tested; cosmetic).
- **L21** (evidence, W-G mvj26lbm): E1-E3, A1-A2, L2-L3, 4 grids (15 rows, [15,30,50,100], legacy default sort/filters), reset-password dialogs done RED→GREEN; RegulatorConfigContractTests 10 cases green; ng build OK. Full suites flaky under load (load avg ~55) in other workers' files.
- **L22** (evidence, verifiers): T8 Drive loads verifier mvj2ms4g PASS V1-V5 (no blockers); applied its V3 recommendation inline test-first (month filter on file names only, month load replaces only that month, empty harvest rejected; RED 3 → GREEN 83/83). Auth verifier mvj2tpea PASS A1-A6 (175 passed); production checklist recorded in docs/deployment-iis.md. Combined scoped backend run 310 passed / 4 skipped.
- **L23** (commits): 331d1aa auth (T24/T13 R1-R3), a59c197 Drive loads (T8), cee4481 config grids (T14/T13 R4), ad840cb paginator/titles (#26). Parallel workers W-I/W-J collided on RecordingDbConnection; fixed with `file`-local test types.
- **L24** (evidence + commits): W-I c3eb9f3 (T18-T20; 502 paging 10/20/100/200 added by parent RED→GREEN), W-H fdc1d81 (T15-T17), W-J af7dea6 (T21-T23; PGIRS 2002/2003 labels by parent RED→GREEN). Scoped checks: W-I+W-H backend 45/45, frontend 41/41; W-J backend 28/28, frontend 25/25.
- **L25** (user decision, P2): asked again in plainer words; "Dejar las 4 mejoras (recomendado)" — keep selected-APS fallback for COD_APS, case-insensitive headers, clear numeric error, skip blank rows.
- **L26** (final check, idle machine): backend 508 passed / 0 failed / 4 skipped (Oracle opt-in); frontend 178 passed in 47 files; `ng build` OK. ESTADO-MIGRACION.md recreated. All tasks T1-T25 closed; no push/PR (S6).
- **L5** (evidence): prior audit (2026-07-27, Engram) reported blocking Reliquidaciones bugs: Crear never sends `apsaId` (422), Cargue tables lack `pTemplate`, Comparar Tarifas/Costo show 3-7 of 30-40 real columns, transversal `readonly signal() + [(ngModel)]` bug; schema `RELIQ` absent from dev ADB. Not yet re-verified.

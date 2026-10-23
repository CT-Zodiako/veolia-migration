# Feature: Validate the migrated system against real Oracle

Prove that the SQL, views, packages and data the new backend relies on exist and work on a real Oracle database, closing the "Pendiente Oracle" items of `doc migracion/ESTADO-MIGRACION.md`.
Target: 192.168.13.35 / PDBTARIF720 (Oracle 19c SE2), user TARIFICADOR_ADMIN, schemas TARIFICADOR, SUI, RELIQ. Connection from the local, uncommitted `backend/Veolia.Api/appsettings.json` (never printed or committed).

## Specs

- **S1** — User request (verbatim): "prueba contra oracle real".
- **S2** — Target database (user, verbatim selection): "192.168.13.35 (PDBTARIF720)".
- **S3** — Test type (user, verbatim selection): "Lectura + escritura". Offered scope of writes: the existing tests that write and restore (assign APS and restore). No business processes that change data (cargues, certificar, calcular, reliquidar, procesar SUI, Drive loads, truncate) are executed.
- **S4** — Read-only verification may compile/parse statements (DBMS_SQL.PARSE does not execute DML or PL/SQL; DDL statements are excluded because parse would execute them) and run SELECTs.
- **S5** — Any mismatch found is reported to the user before changing production code (same rule as parity-review-all S3).

## Tasks

| ID | Specs | Task | Route | Evidence |
|---|---|---|---|---|
| T1 | S1-S3 | Run the opted-in Oracle integration tests (`VEOLIA_ORACLE_TESTS=1`) — done | inline | 4/4 passed |
| T2 | S1,S4 | Parse-check every SQL statement and PL/SQL block used by the backend repositories against the real schemas — done | inline | 252 OK / 2 FAIL / 8 skipped |
| T3 | S1,S4 | Answer the specific "Pendiente Oracle" questions (package signatures, column orders, catalog values, admins with menu 204, AUGE_DEADTOKEN, Formato2 JSON shape) — done | inline | see L4-L6 |
| T4 | S1,S4 | Run the read endpoints' queries for real data and check Dapper/DTO mapping (FLOAT→decimal) — done | worker | 170/172 pass |
| T5 | S5 | Report findings; fix the approved ones test-first | ask | |

## Log

- **L1** (user, original request): "prueba contra oracle real"
- **L2** (user decisions): database "192.168.13.35 (PDBTARIF720)"; type "Lectura + escritura".
- **L3** (evidence): connected as TARIFICADOR_ADMIN to PDBTARIF720 (19c SE2). Schemas present: TARIFICADOR (598 objects), SUI (200), RELIQ (84). The app sets CURRENT_SCHEMA = TARIFICADOR on open (`Shared/Data/OracleConnectionFactory.cs`). TARIFICADOR_ADMIN holds DBA-level privileges (GRANT ANY ROLE, INSERT/UPDATE ANY TABLE, SELECT ANY TABLE): deployment should use a least-privilege account.
- **L4** (T1): `VEOLIA_ORACLE_TESTS=1` AuthRepositoryOracleIntegrationTests 4/4 passed against PDBTARIF720 (they write and restore AUCO_APSUSUARIOS state).
- **L5** (T2): 262 SQL literals extracted from backend/Veolia.Api; DBMS_SQL.PARSE (compile only, never executes): 252 OK, 2 FAIL, 8 skipped (7 dynamic SQL, 1 TRUNCATE). Harness validated: an unknown column fails with ORA-00904, but PL/SQL anonymous blocks are NOT semantically compiled by PARSE (a 3-arg fauco_certificar passed), so routine signatures were checked separately against ALL_ARGUMENTS. FAILs: (a) `SuiRepository.cs:266` INSERT INTO SUI_AUDITORIA → ORA-00942, the table exists in no schema, so SUI Procesar audit never persists (caught and logged as warning); (b) `CrecimientoRepository.cs:200` false positive (text inside a comment).
- **L6** (T3): every PL/SQL routine the backend calls exists with the argument count AND order the code binds, and matching return types: PK_CERTIFICACION.fauco_certificar(aps, mes, anno, usuario) NUMBER (K1 fix confirmed), fauco_certificarsem(aps, semestre, anno, usuario), PK_SUI.fsui_fejecutasui(aps, anno, mes, usutar) VARCHAR2 (S1 fix confirmed; it COMMITs internally and returns 'Proceso Terminado satisfactoriamente ....'), PK_SUI.fsui_estado(anno, mes) TABLE, PK_VALGRAL.* (aps, anno, mes) VARCHAR2 (fauco_integracion returns '0' or a message, never '1'), PK_GIRS.fpgirs_mensual/semestral (aps, anno, mes|semestre) CLOB (real JSON ≤ ~1000 chars, under the 4000 output buffer), PK_LIQUIDAR.fauco_calculartarifas, PK_PROYLIQUIDA.fproy_proyectar, PK_REVERSION.fauco_reversion, PK_TRNA.fauco_trna, PK_VALIDACIONES.fauco_antesliquidar, RELIQ.PK_RELI.freli_extraccion (returns exactly 'ok' or 'err', no internal COMMIT — C2/C6 confirmed), RELIQ.PK_RELIQUIDAR.freli_reliquidar, RELIQ.PK_JSONRESUMEN.freli_jsongral, RELIQ.PKREI_APLICARRELIQUIDA.fnrei_aplicartodo (sets RELQESTADO = 2 'Aplicada' — catalog 1/2 confirmed), RELIQ.PKREI_UPDTARIFADOR.fnrei_previsualizar* (2nd arg defaulted, 1-arg call valid), SUI.f_render_formato2 CLOB (real keys: title, _comment*, SIN_MOVIMIENTO, data — no meta/headersConFiltro; single-encoded; 3.9-18 KB). Data: 4 active admins hold menu 204 of system 1; AUGE_DEADTOKEN.DTKN_TOKEN exists; AUGE_SISUSUARIO has no SISU_FECHA (R1 fix needed); 0 duplicate correos; EMPR_ESTADO VARCHAR2 '0'/'1'; PROYESTADO 0/1 (no NULL); RELL_ESTADO 0/1/2 coexist; RELQESTADO 0/1/9 in data (listing filters 1/2 like legacy); APROV_ACTIVAR and AUCO_PODATECHO positional INSERTs match column order; SUI.VCFGAPSEMPRESA has exactly 1 empresa for each of the 23 APS.
- **L7** (T4, worker mvl10efs): new opt-in `backend/Veolia.Api.Tests/OracleReal/OracleReadSmokeTests.cs` calls the 172 routes of `read-only-routes.txt` through the real pipeline (no stubs) with discovered real parameters; a guard test pins the allow-list. Real run: 170 pass, 2 ORACLE-FINDING: (1) POST suministros/getcanCertificate → 500, `SELECT * FROM AUCO_TARIFAS` read as dynamic rows overflows System.Decimal on 39-40 digit NUMBER/FLOAT columns (legacy used `SELECT count(1) AS CANTIDAD`, suministros/controller.js:550-555); (2) POST reliqCargue/resumenCompararTarifas → 404 although freli_jsongral returns 2920 chars: alias `json_trna` does not bind to `ResumenRow.JsonTrna` (Dapper does not match underscores). Without the variable the theory is skipped; full suite 923 passed / 5 skipped.


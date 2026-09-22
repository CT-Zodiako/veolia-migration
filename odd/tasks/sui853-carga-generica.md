# Feature: SUI853 Carga genérica

## Goal
Migrate the legacy SUI853 Configuración → Carga genérica flow to Angular and ASP.NET Core with controlled Google Sheets preview, Oracle table mapping, optional truncate, and data loading.

## Tasks

- [x] Document and freeze the legacy contract and security decisions.
- [x] Extend the .NET Google Sheets/data-access layer and implement authenticated API endpoints.
- [x] Add Angular service, component, route, and menu mapping for menu ID 30006.
- [x] Add focused backend/frontend regression tests and validate build/type checks.
- [ ] Run review and record parity differences, risks, and acceptance evidence.

## Constraints

- Preserve legacy observable behavior where safe, but do not reproduce unauthenticated destructive operations or unrestricted schema access without explicit approval.
- User decision: use the safe mode—preview and load are included; truncate requires explicit confirmation and authentication; destination schema is restricted to SUI.
- Keep Oracle identifiers validated and parameterize values; dynamic identifiers must be allowlisted/validated.
- Do not mutate the legacy database during analysis or tests.
- Production configuration and credentials remain external to Git.

## Legacy sources

- `/Users/zodiako/DEV/oracle/front-tarificador/src/sui853/views/configuracion/cargueGenerico.vue`
- `/Users/zodiako/DEV/oracle/front-tarificador/src/sui853/services/configuracionService.js`
- `/Users/zodiako/DEV/oracle/back-tarificador/src/modules/sui853/configuracion/routes.js`
- `/Users/zodiako/DEV/oracle/back-tarificador/src/modules/sui853/configuracion/controller.js`

## Evidence

- Legacy menu ID 30006 maps to `/cargaGenerica` under parent 30000.
- Current Angular route catalog has no 30006 entry; current .NET configuration API only exposes APS/formulario functionality.
- Legacy loading has preview, Google Sheets tab listing, dynamic Oracle inserts, and truncate operations; exact security hardening and partial-load policy require an explicit implementation decision.
- Implemented backend/frontend flow with SUI-only destinations, authenticated system-3 requests, explicit truncate confirmation, preview, selected-column load, and route/menu registration.
- Fixed table-list contract to return unqualified `TABLE_NAME` values, matching the frontend's fixed `owner: SUI` and identifier validation.
- Verification: 20 backend CargaGenerica tests passed; Angular `ngc --noEmit` passed; `git diff --check` passed. SQLite NU1903 and existing nullability warnings remain.

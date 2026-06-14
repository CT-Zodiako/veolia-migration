# Módulo SUI-REVERSIONES

## Resumen del módulo

Módulo documental AS-IS para **reportería read-only** de reversiones SUI (Fase 4), con trazabilidad completa Actor → Frontend → Endpoint → Lógica backend → Base de datos.

## Scope

### In scope
- 5 endpoints `POST` de consulta:
  - `/sui/reversionesF19`
  - `/sui/reversionesF23`
  - `/sui/reversionesF24`
  - `/sui/reversionesF35`
  - `/sui/reversionesF36`
- Frontend observado:
  - `front-tarificador/src/views/sui/ReversionesSui.vue`
  - `front-tarificador/src/components/TableReversionesAps/Formato19.vue`
  - `front-tarificador/src/components/TableReversionesAps/Formato23.vue`
  - `front-tarificador/src/components/TableReversionesAps/Formato24.vue`
  - `front-tarificador/src/components/TableReversionesAps/Formato35.vue`
  - `front-tarificador/src/components/TableReversionesAps/Formato36.vue`
- Objetos DB: `sui_revf19`, `sui_revf23`, `sui_revf24`, `sui_revf35`, `sui_revf36`.

### Out of scope
- Cambios runtime de backend/frontend.
- Hardening de seguridad (`authJwt`) en rutas `reversionesF*`.
- Cambios de esquema, paginación o normalización de respuesta.

## Dependencias

- Backend módulo SUI:
  - `back-tarificador/src/modules/sui/routes.js`
  - `back-tarificador/src/modules/sui/controller.js`
- Frontend cliente API:
  - `front-tarificador/src/service/SuiService.js`
- Dependencia cross-módulo (origen de datos):
  - `suministros` → `PK_REVISION.fauco_reversionsui`

## Artefactos del módulo

| Archivo | Estado | Propósito |
|---|---|---|
| `docs/modulos/sui-reversiones/_index.md` | `implementado_as_is` | Alcance y dependencias del módulo de reportería read-only. |
| `docs/modulos/sui-reversiones/funcionalidades/sui-reversiones-core.md` | `implementado_as_is` | Contrato único de 5 endpoints, auth matrix, DDL validado y trazabilidad completa. |

## Tracker DDL del módulo

| Objeto | Tipo | Estado |
|---|---|---|
| `sui_revf19` | Tabla | `validado` |
| `sui_revf23` | Tabla | `validado` |
| `sui_revf24` | Tabla | `validado` |
| `sui_revf35` | Tabla | `validado` |
| `sui_revf36` | Tabla | `validado` |

## Artefactos SDD relacionados

- `sdd/sui-reversiones/proposal`
- `sdd/sui-reversiones/spec`
- `sdd/sui-reversiones/design`
- `sdd/sui-reversiones/tasks`

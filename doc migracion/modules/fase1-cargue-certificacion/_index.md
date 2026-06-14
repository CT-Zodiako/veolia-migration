---
modulo: fase1-cargue-certificacion
fase: 1
version: v1
estado: implementado_as_is
estado_ddl: validado
fuentes:
  - sdd/flujo-tarifas/explore
  - sdd/flujo-tarifas/proposal
  - sdd/flujo-tarifas/spec
  - sdd/flujo-tarifas/design
  - sdd/flujo-tarifas/fase1-cargue-certificacion/ddl
  - sdd/flujo-tarifas/fase1-cargue-certificacion/ddl-parte2
trazabilidad: actor-frontend-endpoint-backend-db
---

# Fase 1 — Cargue y Certificación (AS-IS)

## Alcance

Documentación AS-IS del flujo operativo de cargue mensual/semestral y certificación, sin cambios runtime.

## Documentos de la fase

- `funcionalidades/fase1-cargue-certificacion-core.md`
- `funcionalidades/fase1-variables-operativas.md`
- `funcionalidades/fase1-detalles-db.md`
- `cross-cutting/fase1-auth-riesgos.md`
- `GOOGLE_SHEETS_MIGRATION.md` — Guía de migración segura de credenciales Google Sheets

## Trazabilidad macro

Actor Operativo → `Cargue.vue` / `CargueSem.vue` → `CargueService.js` → `/api/v1/suministros/*` → `modules/suministros/{routes.js,controller.js}` → PL/SQL (`PK_CERTIFICACION`, `PK_GIRS`) + tablas Oracle.

## Tracker DDL obligatorio (cobertura completa)

| Tipo | Objeto | Estado | Fuente |
|---|---|---|---|
| Package | `PK_CERTIFICACION` (11 funciones) | `validado` | `ddl` |
| Tabla registro | `AUCO_TARICERTIFICADA` | `validado` | `ddl` |
| Tabla registro | `AUCO_CARGUECOMERCIAL` | `validado` | `ddl` |
| Tabla productiva | `AUCO_INFOEMPRDIVI` | `validado` | `ddl-parte2` |
| Tabla productiva | `AUCO_INFOAPSEMPRDIVI` | `validado` | `ddl-parte2` |
| Tabla productiva | `AUCO_INFOAPSRELLENO` | `validado` | `ddl-parte2` |
| Tabla productiva | `AUCO_INFUSUAPSEMPRDIVI` | `validado` | `ddl-parte2` |
| Tabla productiva | `AUCO_CERTADICIONAL` | `validado` | `ddl-parte2` |
| Tabla productiva | `AUCO_PODATECHO` | `validado` | `ddl-parte2` |
| Secuencia | `SPROY_INFOEMPRDIVI` | `validado` | `ddl-parte2` |
| Secuencia | `SPROY_INFOAPSRELLENO` | `validado` | `ddl-parte2` |

## Checklist de cierre (spec/design/tasks)

| Criterio | Resultado |
|---|---|
| Endpoints scope Fase 1 (~16) documentados | ✅ |
| Tablas DDL Fase 1 (8) documentadas | ✅ |
| Secuencias DDL Fase 1 (2) documentadas | ✅ |
| Funciones `PK_CERTIFICACION` (11) documentadas | ✅ |
| Requisitos funcionales spec (6) cubiertos | ✅ |
| Escenarios spec (11) trazados en narrativa/tablas | ✅ |

## Riesgos y dependencias

- Dependencia crítica de PL/SQL Oracle (`PK_CERTIFICACION`, `PK_GIRS`).
- Existen endpoints de certificación sin `authJwt` en rutas AS-IS (`certificarMensual`, `plcertificarSemestral`, `cenrtificarEditar`).
- Contratos heterogéneos y typo preservado (`cenrtificarEditar`).
- **🔐 CRÍTICO**: Credenciales Google Cloud (service account key) hardcodeadas en `gsec.json`. Ver `GOOGLE_SHEETS_MIGRATION.md` para guía de mitigación.

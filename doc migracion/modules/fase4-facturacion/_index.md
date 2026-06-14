---
modulo: fase4-facturacion
fase: 4
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase4/explore
  - sdd/flujo-tarifas/fase4/proposal
  - sdd/flujo-tarifas/fase4/spec
  - sdd/flujo-tarifas/fase4/design
  - sdd/flujo-tarifas/fase4/tasks
trazabilidad: actor-frontend-endpoint-backend-db
---

# Fase 4 — Facturación (AS-IS)

## Alcance

Esta fase documenta el cierre E2E del flujo de tarifas: consulta comercial de facturación por APS/período, con 5 endpoints y 5 vistas Oracle.

## Documentos de la fase

- `funcionalidades/fase4-consulta-facturacion.md`
- `funcionalidades/fase4-endpoints-contratos.md`
- `datos/fase4-vistas-base.md`
- `datos/fase4-vistas-especializadas.md`
- `cross-cutting/fase4-auth-riesgos-reglas.md`

## Trazabilidad macro

Actor Comercial → `Detallefacturacion.vue` → `FacturaService.js` → `/api/v1/facturacion/*` → `modules/facturacion/{routes.js,controller.js}` → vistas `VACUO_*` y `VAUCO_FATELECTRONICA`.

## Endpoints de la fase (5)

| Endpoint | Método | Vista consultada |
|---|---|---|
| `/api/v1/facturacion/facturacion` | POST | `VACUO_FACTURACION` |
| `/api/v1/facturacion/detafacturacion` | POST | `VACUO_DETAFACTURACION` |
| `/api/v1/facturacion/facturacionclus` | POST | `VACUO_FACTURACIONCLUS` |
| `/api/v1/facturacion/facturaciondinc` | POST | `VACUO_FACTURACIONDINC` |
| `/api/v1/facturacion/facturacionelectronica` | POST | `VAUCO_FATELECTRONICA` |

## Matriz Actor → FE → EP → BE → DB

| Actor | Frontend | Endpoint | Backend | DB |
|---|---|---|---|---|
| Comercial | `Detallefacturacion.vue` (`getFacturacion`) | `/facturacion/facturacion` | `controller.facturacion` | `VACUO_FACTURACION` |
| Comercial | `Detallefacturacion.vue` (`getDetalleFacturacion`) | `/facturacion/detafacturacion` | `controller.detallefacturacion` | `VACUO_DETAFACTURACION` |
| Comercial | `Detallefacturacion.vue` (`getFacturacionClus`) | `/facturacion/facturacionclus` | `controller.facturacionclus` | `VACUO_FACTURACIONCLUS` |
| Comercial | `Detallefacturacion.vue` (`getFacturacionDinc`) | `/facturacion/facturaciondinc` | `controller.facturaciondinc` | `VACUO_FACTURACIONDINC` |
| Comercial | `Detallefacturacion.vue` (`getFacturacionElectronica`) | `/facturacion/facturacionelectronica` | `controller.facturacionelectronica` | `VAUCO_FATELECTRONICA` |

## Tracker DDL obligatorio (COMPLETO ✅)

| Cobertura | Estado |
|---|---|
| 5/5 endpoints documentados | ✅ |
| 5/5 vistas documentadas (joins + campos principales) | ✅ |
| Regla temporal mes anterior documentada con ejemplos | ✅ |
| Validación cruzada Fase 3 ↔ Fase 4 documentada | ✅ |
| Dependencias ocultas `PK_TARIFACOMPONENTE.*` documentadas | ✅ |

## Referencias inter-fase

- Fase 1: `../fase1-cargue-certificacion/_index.md`
- Fase 2: `../fase2-calculo-tarifas/_index.md`
- Fase 3: `../fase3-integracion-sui/_index.md`

# Módulo VALIDACIONES

## Resumen del módulo

Módulo documental AS-IS para validaciones operativas de FAUCO, sin cambios runtime y con trazabilidad Actor → UI → API → Lógica → DB.

## Scope

### In scope
- 7 endpoints `POST /api/v1/validaciones/*`.
- Backend: `back-tarificador/src/modules/validaciones/{routes.js,controller.js}`.
- Frontend service: `front-tarificador/src/service/Validaciones.js`.
- Package Oracle: `TARIFICADOR.PK_VALGRAL` (9 funciones, DDL estado `validado`).
- Riesgos AS-IS: JWT no aplicado en rutas, mismatch `db.procedure`.

### Out of scope
- Cambios de negocio o runtime.
- Corrección de seguridad JWT en código.
- Refactor de capa DB Node (`database.js`) o normalización de respuestas.

## Dependencias

- Registro de módulo en app: `back-tarificador/src/app.js`
- Middleware auth (no aplicado en rutas del módulo): `back-tarificador/src/middlewares/authJwt.js`
- Base DB Node: `back-tarificador/src/database/database.js`
- Dependencias cross-módulo:
  - `reversiones` consume validaciones de integración (fase 2 del workflow)
  - `suministros` reutiliza validación de existencia de tarifa

## Consideraciones cross-módulo

- `validaciones` funciona como **fase 2** en el flujo observado:
  `Reversiones (autorización) → Validaciones (gate) → Suministros (ejecución) → SUI (salida)`.
- Dependencias críticas:
  - `fauco_integracion` se consume desde `reversiones`.
  - `fauco_existarifa` también aparece reutilizada desde `suministros`.

## Estrategia incremental (sin big-bang)

1. Fase 1: documentación AS-IS estricta de validaciones (este cambio).
2. Fase 2: consolidación cross-módulo reversiones/validaciones/suministros con paridad funcional.
3. Fase 3: contrato TO-BE con trazabilidad 1:1 desde evidencia AS-IS.

## Artefactos del módulo

| Archivo | Estado | Propósito |
|---|---|---|
| `docs/modulos/validaciones/_index.md` | `implementado_as_is` | Alcance, dependencias, artefactos y estado DDL del módulo. |
| `docs/modulos/validaciones/funcionalidades/validaciones-core.md` | `implementado_as_is` | Catálogo de endpoints, trazabilidad completa, matriz auth, riesgos AS-IS y DDL del package. |

## Tracker DDL del módulo

| Objeto | Tipo | Estado | Referencia |
|---|---|---|---|
| `TARIFICADOR.PK_VALGRAL` (spec) | Package Specification | `validado` | `funcionalidades/validaciones-core.md#registro_ddl_modulo` |
| `TARIFICADOR.PK_VALGRAL` (body) | Package Body | `validado` | `funcionalidades/validaciones-core.md#registro_ddl_modulo` |

## Artefactos SDD relacionados

- `sdd/validaciones/explore`
- `sdd/validaciones/spec`
- `sdd/validaciones/design`
- `sdd/validaciones/tasks`
- `sdd/validaciones/ddl`

# Módulo SUMINISTROS

## Resumen del módulo

Módulo documental AS-IS para la **fase 3** del workflow de Reversiones (ejecución técnica e histórico), sin cambios runtime y con trazabilidad Actor → UI → API → Lógica → DB.

## Scope

### In scope
- `POST /api/v1/suministros/setReversion`.
- `GET /api/v1/suministros/getReversion`.
- Frontend observado: `Reversiones.vue`, `DetaReversion.vue`, `CargueService.js`.
- Objetos DB validados del alcance: `TARIFICADOR.AUCO_REVERSIONES`, `TARIFICADOR.PK_REVERSION` (spec + body).

### Out of scope
- Resto de endpoints de `suministros` fuera de Reversiones.
- Cambios funcionales/técnicos en backend/frontend/DB.
- Normalización de contratos de respuesta.
- DDL detallado de tablas internas tocadas por `PK_REVERSION` (queda pendiente por fase posterior).

## Dependencias

- Backend: `back-tarificador/src/modules/suministros/{routes.js,controller.js}`.
- Middleware auth: `back-tarificador/src/middlewares/authJwt.js`.
- Frontend:
  - `front-tarificador/src/views/suministros/Reversiones.vue`
  - `front-tarificador/src/views/informes/DetaReversion.vue`
  - `front-tarificador/src/service/CargueService.js`
- Dependencia cross-módulo de entrada: `validaciones` (gate previo a ejecutar reversión).

## Consideraciones cross-módulo

- `suministros` cubre la **fase 3 (ejecución)** del flujo:
  `reversiones (autorización) → validaciones (gate) → suministros (ejecución destructiva + histórico)`.
- La UI de `Reversiones.vue` valida primero vía `Validaciones.verificacion_reversiones` y recién luego invoca `setReversar`.

## Estrategia de trazabilidad documental

- Cada funcionalidad se documenta con cadena completa:
  **Actor → UI → API → Lógica → DB**.
- Separación estricta:
  - `observado_en_codigo`
  - `pendiente_validacion`
- Estado DDL por objeto: `pendiente | recibido | validado`.

## Artefactos del módulo

| Archivo | Estado | Propósito |
|---|---|---|
| `docs/modulos/suministros/_index.md` | `implementado_as_is` | Alcance, dependencias, artefactos y estado DDL del módulo. |
| `docs/modulos/suministros/funcionalidades/suministros-reversiones-core.md` | `implementado_as_is` | Endpoints críticos, trazabilidad completa, matriz auth y registro DDL del módulo. |

## Tracker DDL del módulo

| Objeto | Tipo | Estado | Referencia |
|---|---|---|---|
| `TARIFICADOR.AUCO_REVERSIONES` | Tabla | `validado` | `funcionalidades/suministros-reversiones-core.md#registro_ddl_modulo` |
| `TARIFICADOR.PK_REVERSION` (spec) | Package Specification | `validado` | `funcionalidades/suministros-reversiones-core.md#registro_ddl_modulo` |
| `TARIFICADOR.PK_REVERSION` (body) | Package Body | `validado` | `funcionalidades/suministros-reversiones-core.md#registro_ddl_modulo` |
| Tablas internas `AUCO_REVE*`, `sui_revf*`, originales `auco_*`/`sui_*` | Tablas referenciadas | `pendiente_validacion` | `funcionalidades/suministros-reversiones-core.md#registro_ddl_modulo` |

## Estado DDL (resumen solicitado)

| Objeto | Estado |
|---|---|
| `AUCO_REVERSIONES` | `validado` |
| `PK_REVERSION` | `validado` |
| Tablas internas (~15) | `referenced/pendiente` |

## Artefactos SDD relacionados

- `sdd/suministros/explore`
- `sdd/suministros/spec`
- `sdd/suministros/design`
- `sdd/suministros/tasks`
- `sdd/suministros/ddl`

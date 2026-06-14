# Módulo REVERSIONES

## Resumen del módulo

Módulo documental AS-IS para autorización de reversiones, sin cambios runtime y con trazabilidad Actor → UI → API → Lógica → DB.

## Scope

### In scope
- `POST /api/v1/reversiones/crearAutorizacion`
- `GET /api/v1/reversiones/detalladoAutorizacion`
- Componentes frontend observados: `AutorizacionReversiones.vue`, `DetalladoAutorizacion.vue`, `ReversionService.js`
- Objetos DB del módulo: `TARIFICADOR.REVE_AUTORIZACION`, `TARIFICADOR.VREVE_AUTORIZACION`

### Out of scope
- Ejecución funcional de reversiones en `suministros`
- Validaciones de reversiones en `validaciones`
- Reportes SUI de reversiones en `sui`
- Cambios de negocio, normalización de contratos o refactor SQL

## Dependencias

- Backend módulo: `back-tarificador/src/modules/reversiones/{routes.js,controller.js}`
- Middleware auth: `back-tarificador/src/middlewares/authJwt.js`
- Frontend observado:
  - `front-tarificador/src/views/reversion/AutorizacionReversiones.vue`
  - `front-tarificador/src/views/reversion/DetalladoAutorizacion.vue`
  - `front-tarificador/src/service/ReversionService.js`
  - Menú/rutas relacionadas de navegación: `front-tarificador/src/service/MenuService.js`, `front-tarificador/src/router/index.js`

## Consideraciones cross-módulo

- `reversiones` (este módulo) cubre **autorización**.
- Flujo end-to-end de negocio depende además de:
  - `validaciones` (prevalidación)
  - `suministros` (ejecución de reversiones)
  - `sui` (reportes/formularios)
- Estado AS-IS: dependencia explícita, sin expandir alcance funcional en este artefacto.

## Estrategia incremental (sin big-bang)

1. Fase 1 (este cambio): documentación AS-IS estricta de autorización.
2. Fase 2: documentar/validar módulos dependientes (`validaciones`, `suministros`, `sui`) manteniendo paridad funcional.
3. Fase 3: consolidar contrato TO-BE con mapeo 1:1 desde evidencia AS-IS.

## Artefactos del módulo

| Archivo | Estado | Propósito |
|---|---|---|
| `docs/modulos/reversiones/_index.md` | `implementado_as_is` | Alcance, dependencias, artefactos y estado DDL del módulo. |
| `docs/modulos/reversiones/funcionalidades/reversiones-core.md` | `implementado_as_is` | Endpoints catalog, matriz auth, trazabilidad completa y DDL embebido. |

## Tracker DDL del módulo

| Objeto | Tipo | Estado | Referencia |
|---|---|---|---|
| `TARIFICADOR.REVE_AUTORIZACION` | Tabla | `validado` | `funcionalidades/reversiones-core.md#registro_ddl_modulo` |
| `TARIFICADOR.VREVE_AUTORIZACION` | Vista | `validado` | `funcionalidades/reversiones-core.md#registro_ddl_modulo` |

## Artefactos SDD relacionados

- `sdd/reversiones/explore`
- `sdd/reversiones/spec`
- `sdd/reversiones/design`
- `sdd/reversiones/tasks`

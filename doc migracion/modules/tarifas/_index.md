# Módulo TARIFAS

## Resumen del módulo

Módulo documental AS-IS para consultas de tarifas en backend `tarifas`, sin cambios runtime y con trazabilidad completa Actor → Frontend → API → Lógica → DB.

## Documentos

- `funcionalidades/tarifas-core.md` — extracción AS-IS de 4 endpoints (`/`, `/consultageneral`, `/tarxcom`, `/tarxcomgeneral`) con matriz auth, contratos no normalizados, DDL por estado y pendientes de validación.

## Cobertura de extracción

- Backend TARIFAS: `back-tarificador/src/modules/tarifas/{routes.js,controller.js}`
- Registro de módulo en app: `back-tarificador/src/app.js`
- Dependencia AUTH (middleware): `back-tarificador/src/middlewares/authJwt.js`
- Frontend consumidor observado:
  - `front-tarificador/src/service/TarifasService.js`
  - `front-tarificador/src/views/procesos/Calculo.vue`
  - `front-tarificador/src/views/informes/Detalletarifas.vue`
  - `front-tarificador/src/views/informesgerenciales/DetalletarifasGen.vue`
  - `front-tarificador/src/router/index.js`
- Base URL backend observada: `http://10.162.10.91:4000/api/v1/` (`front-tarificador/src/service/BackendTarificadorConsumerService.js`)
- Objetos DB observados: `vauco_tarifa4`, `vauco_tardetalle`, `auco_apsaseo`

## Alcance in-scope (fase 1 AS-IS)

- `POST /api/v1/tarifas/`
- `POST /api/v1/tarifas/consultageneral`
- `POST /api/v1/tarifas/tarxcom`
- `POST /api/v1/tarifas/tarxcomgeneral`

## Fuera de alcance

- Refactor de SQL o normalización de contratos de respuesta.
- Cambios de negocio o migración TO-BE.
- Confirmación física DDL fuera de evidencia en código (permanece en `pendiente_validacion`).

## Dependencias transversales

- **AUTH (directa)**:
  - Las 4 rutas usan `authJwt.verificarToken`.
  - Contrato de seguridad referenciado en `docs/modulos/auth/funcionalidades/auth-core.md`.
- **APS (directa por datos)**:
  - `tarxcomgeneral` usa join con `auco_apsaseo` (ownership funcional/documental del objeto en módulo APS).
  - Referencia: `docs/modulos/aps/funcionalidades/aps-configuracion.md`.

## Estrategia incremental (sin big-bang)

1. Fase 1: documentación AS-IS estricta (este módulo).
2. Fase 2: validación de pendientes (`consultageneral` sin FE observado y DDL físico).
3. Fase 3: diseño TO-BE con paridad funcional, mapeando cada decisión a evidencia AS-IS.

## Registro de archivos del módulo

| Archivo | Estado | Propósito |
|---|---|---|
| `docs/modulos/tarifas/_index.md` | `implementado_as_is` | Alcance, dependencias, estrategia incremental y tracker DDL. |
| `docs/modulos/tarifas/funcionalidades/tarifas-core.md` | `implementado_as_is` | Evidencia funcional AS-IS por endpoint y secciones obligatorias de migración. |

## Tracker DDL del módulo

| Objeto | Estado | Referencia |
|---|---|---|
| `TARIFICADOR.vauco_tarifa4` | `validado` | `docs/modulos/tarifas/funcionalidades/tarifas-core.md#registro_ddl_modulo` |
| `TARIFICADOR.vauco_tardetalle` | `validado` | `docs/modulos/tarifas/funcionalidades/tarifas-core.md#registro_ddl_modulo` |
| `TARIFICADOR.auco_apsaseo` | `validado` | `docs/modulos/tarifas/funcionalidades/tarifas-core.md#registro_ddl_modulo` |

## Artefactos SDD relacionados

- `sdd/migracion-tarifas/proposal`
- `sdd/migracion-tarifas/spec`
- `sdd/migracion-tarifas/design`
- `sdd/migracion-tarifas/tasks`
- `sdd/migracion-tarifas/explore`

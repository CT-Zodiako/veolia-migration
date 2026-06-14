# modulo

- nombre: `aps-configuracion`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/aps/{routes.js,controller.js}`
  - Frontend: `front-tarificador/src/views/configuracion/Aps.vue`, `front-tarificador/src/components/apsConf/{apsGrid.vue,formAps.vue}`, `front-tarificador/src/service/ApsService.js`, `front-tarificador/src/components/apsSelector.vue`, `front-tarificador/src/reliq/services/ReleqService.js`
  - DB: `TARIFICADOR.AUCO_APSASEO`, `TARIFICADOR.AUCO_APSUSUARIOS`, `TARIFICADOR.AUGE_SISUSUARIO`, `TARIFICADOR.SAUCO_APSASEO`

## actores

- **Usuario de configuración**: gestiona catálogo APS en ruta `/aps`.
- **Usuario autenticado de módulos transversales**: consume selector de APS (`apsSelector.vue`) para filtrar vistas por APS.
- **Usuario de reliquidación**: consulta correo/usuario por APS usando `aps/usuarioPorAPS`.

## funcionalidades

### F-APS-CONF-01 — Listado general de APS (grilla de configuración)

- flujo:
  1. Usuario abre `/aps` y renderiza `Aps.vue` con `apsGrid`.
  2. `apsGrid` ejecuta `ApsService.getApsGeneral()` en `created()`.
  3. FE invoca `POST /api/v1/aps/consultageneral`.
  4. Backend ejecuta `SELECT * FROM auco_apsaseo ORDER BY APSA_NOMAPS`.
  5. La grilla muestra columnas (`APSA_ID`, `APSA_NOMAPS`, `APSA_RESOLUCION`, `APSA_PROPIO`, `APSA_SOLORELL`, `APSA_ESTADO`, `APSA_VIAT`, `APSA_IDSUI`).
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `views/configuracion/Aps.vue`, `components/apsConf/apsGrid.vue` → `POST /api/v1/aps/consultageneral` → `aps/controller.consultageneral` → `AUCO_APSASEO`
- estado: `implementado_as_is`

### F-APS-CONF-02 — Consulta por ID y edición de APS

- flujo:
  1. Usuario pulsa botón editar en `apsGrid`.
  2. FE llama `ApsService.getApsbyId(id)` contra `POST /api/v1/aps/consultaaps`.
  3. Formulario `formAps.vue` carga datos y, al guardar, invoca `ApsService.updtAps(...)`.
  4. FE ejecuta `PUT /api/v1/aps/editar/:id`.
  5. Backend ejecuta `UPDATE auco_apsaseo SET ... WHERE APSA_ID = :8`.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `components/apsConf/{apsGrid.vue,formAps.vue}` → `POST /api/v1/aps/consultaaps`, `PUT /api/v1/aps/editar/:id` → `aps/controller.consultaruna`, `aps/controller.modificar` → `AUCO_APSASEO`
- estado: `implementado_as_is`

### F-APS-CONF-03 — Alta de APS

- flujo:
  1. Usuario pulsa “Nuevo” en `apsGrid`.
  2. `formAps.vue` construye payload (`nombre`, `idsui`, `resolucion`, `propio`, `relleno`, `estado`, `iat`) y llama `ApsService.newAps(...)`.
  3. FE invoca `POST /api/v1/aps/crear`.
  4. Backend llama `apscontroller.registro(...)` con `req.SISU_ID` y referencia secuencia `SAUCO_APSASEO.nextval` en SQL de inserción.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `components/apsConf/formAps.vue` → `POST /api/v1/aps/crear` → `aps/controller.registro` → `AUCO_APSASEO` + `SAUCO_APSASEO`
- estado: `en_validacion` (ver `pendiente_validacion`)

### F-APS-CONF-04 — Selector APS transversal por usuario autenticado

- flujo:
  1. Componente `apsSelector.vue` monta y llama `ApsService.getAps()`.
  2. FE invoca `GET /api/v1/aps` con `x-access-token` (`jwtOken`).
  3. Backend ejecuta `apscontroller.listar(req.SISU_ID)`.
  4. Query filtra APS por `AUCO_APSUSUARIOS` activas de usuario.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado → `components/apsSelector.vue` → `GET /api/v1/aps` → `aps/controller.listar` → `AUCO_APSASEO` + `AUCO_APSUSUARIOS`
- estado: `implementado_as_is`

### F-APS-CONF-05 — Consulta usuario por APS (flujo reliquidación)

- flujo:
  1. `ReleqService.getApsUsuario(data)` invoca `POST /api/v1/aps/usuarioPorAPS`.
  2. Ruta `aps/routes.js` procesa request sin middleware `authJwt.verificarToken`.
  3. `apscontroller.usuarioPorAPS` ejecuta join `AUCO_APSUSUARIOS` + `AUGE_SISUSUARIO` filtrando estados activos.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario reliquidación → `reliq/services/ReleqService.js` → `POST /api/v1/aps/usuarioPorAPS` → `aps/controller.usuarioPorAPS` → `AUCO_APSUSUARIOS` + `AUGE_SISUSUARIO`
- estado: `implementado_as_is`

## endpoints_catalog

Base: `/api/v1/aps`

| Método | Path | Auth requerida | Request ejemplo | Response OK observada | Errores esperados observados | Observaciones AS-IS |
|---|---|---|---|---|---|---|
| POST | `/consultageneral` | Sí (`authJwt.verificarToken`) | `null` body (FE envía `null`) | `status(resultado.status).send(resultado.data)`; controlador retorna `{status:200,data:[...]}` | `500 {data:"Error"}` desde controlador + `401/403` middleware | Orden por `APSA_NOMAPS` |
| POST | `/consultaaps` | Sí (`authJwt.verificarToken`) | `{ "aps": 123 }` | `status(resultado.status).send(resultado.data)` (array de filas) | `500 {data:"Error"}` + `401/403` middleware | FE consume `response.data[0]` |
| POST | `/crear` | Sí (`authJwt.verificarToken`) | `{ "nombre":"X", "idsui":"Y", "resolucion":720, "propio":1, "relleno":0, "estado":1, "iat":0 }` | `res.send(resultado)` (sin `await` en ruta) | No manejo explícito en ruta; errores quedan implícitos en promesa/controlador | `registro` referencia secuencia `SAUCO_APSASEO` |
| PUT | `/editar/:id` | Sí (`authJwt.verificarToken`) | Path `:id` + body de campos APS | `res.send(resultado)` (sin `await` en ruta) | No manejo explícito en ruta; errores quedan implícitos en promesa/controlador | Actualiza `APSA_IDSUI` y `APSA_VIAT` |
| GET | `/` | Sí (`authJwt.verificarToken`) | Sin body | `status(resultado.status).send(resultado.data)` con APS filtradas por usuario | `500 {data:"Error"}` + `401/403` middleware | Endpoint usado por selector transversal APS |
| POST | `/usuarioPorAPS` | No middleware observado | `{ "aps": 123 }` | `status(resultado.status).send(resultado.data)`; controlador retorna `{status:200,data:[{SISU_CORREO,SISU_ID}]}` | No manejo explícito de errores en ruta; depende de throw/runtime | FE envía header token pero backend no lo valida en ruta |

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.AUCO_APSASEO`: `validado`
- `TARIFICADOR.AUCO_APSUSUARIOS`: `validado`
- `TARIFICADOR.AUGE_SISUSUARIO`: `recibido`
- `TARIFICADOR.SAUCO_APSASEO` (SEQUENCE): `recibido`

### ddl_recibido

#### TARIFICADOR.AUGE_SISUSUARIO
- estado: `recibido`
- fuente: `back-tarificador/DataBase/Scripts/AUGE_SISUSUARIO.sql`
```sql
CREATE TABLE TARIFICADOR.AUGE_SISUSUARIO (
  SISU_ID NUMBER NOT NULL,
  SISU_NOMBRES VARCHAR2(150) NOT NULL,
  SISU_APELLIDOS VARCHAR2(150) NOT NULL,
  SISU_CORREO VARCHAR2(50) NOT NULL,
  SISU_PASS VARCHAR2(100) NOT NULL,
  SISU_ESTADO SMALLINT DEFAULT 1 NOT NULL,
  CONSTRAINT PK_AUGE_SISUSUARIO PRIMARY KEY (SISU_ID),
  CONSTRAINT CHECK_AUGE_SISUSUARIO CHECK (SISU_ESTADO = 1 OR SISU_ESTADO=0),
  CONSTRAINT UN_AUGE_SISUSUARIO UNIQUE (SISU_CORREO)
);
```

### ddl_validado

#### TARIFICADOR.AUCO_APSASEO
- estado: `validado`
- fuente: `docs/modulos/auth/funcionalidades/auth-core.md` (bloque `registro_ddl_modulo`)

#### TARIFICADOR.AUCO_APSUSUARIOS
- estado: `validado`
- fuente: `docs/modulos/auth/funcionalidades/auth-core.md` (bloque `registro_ddl_modulo`)

### ddl_recibido

#### TARIFICADOR.SAUCO_APSASEO
- estado: `recibido`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE SEQUENCE TARIFICADOR.SAUCO_APSASEO INCREMENT BY 1 MINVALUE 1 MAXVALUE 9999999999999999999999999999 NOCYCLE CACHE 20 NOORDER;
```

### ddl_pendiente
- Sin pendientes DDL para esta faceta.

## observado_en_codigo

- Ruta FE `/aps` registrada en router y menú.
- `ApsService` usa `jwtOken` en headers `x-access-token` para rutas APS protegidas.
- `usuarioPorAPS` existe en `aps/routes.js` sin middleware de token.
- `apscontroller.listar` filtra APS por asignación usuario (`AUCO_APSUSUARIOS`) y estado activo.
- `formAps.vue` transforma checkboxes booleanas a enteros (`1/0`) antes de enviar al backend.

## pendiente_validacion

- `aps/controller.registro` presenta SQL con placeholder `:7 :8` y firma de parámetros desalineada respecto de `routes.js`.
- En `aps/routes.js`, `POST /crear` y `PUT /editar/:id` envían `res.send(resultado)` sin `await` explícito a llamadas async del controlador.
- `POST /api/v1/aps/usuarioPorAPS` no aplica `authJwt.verificarToken` en backend, aunque FE envía token.

## validacion_cruzada_facetas

| Eje | Faceta contraste | Resultado | Evidencia |
|---|---|---|---|
| APS catálogo vs APS permisos | `aps-permisos` | `consistente` | Objetos compartidos `AUCO_APSASEO` y `AUCO_APSUSUARIOS` mantienen mismo estado DDL (`validado`) |
| APS rutas propias vs Auth | `aps-permisos` | `consistente` | Este documento mantiene ownership en `/api/v1/aps/*`; `aps-permisos` mantiene ownership de `/api/v1/auth/*` |
| APS base vs SUI853 | `aps-sui853` | `consistente` | SUI853 consume objetos SUI (`VCFG*`, `TCFG_APS`) y no redefine endpoints APS/Auth |
| Criterio de riesgos | `aps-permisos` + `aps-sui853` | `consistente` | Los 3 documentos separan `observado_en_codigo` de `pendiente_validacion` |

## checkpoints_g1_g5

| Gate | Estado | Evidencia observada |
|---|---|---|
| G1 Trazabilidad completa | `cumple` | F-APS-CONF-01..05 incluyen Actor → UI → API → Lógica → DB |
| G2 Evidencia verificable | `cumple` | Referencias concretas a `Aps.vue`, `apsGrid.vue`, `formAps.vue`, `ApsService.js`, `aps/{routes,controller}.js` |
| G3 DDL en archivo | `cumple` | `registro_ddl_modulo` contiene `validado/recibido/pendiente` por objeto |
| G4 Riesgos aislados | `cumple` | Incertidumbres técnicas separadas en `pendiente_validacion` |
| G5 Dependencias explícitas | `cumple` | Dependencia APS↔Auth y APS↔SUI explicitada en `validacion_cruzada_facetas` |

## checklist_dod_fase1

- [x] Paridad funcional AS-IS documentada sin inventar comportamiento
- [x] Trazabilidad completa Actor → UI → API → Lógica → DB
- [x] DDL del módulo persistido en este archivo con estado por objeto
- [x] Riesgos aislados en `pendiente_validacion`
- [x] Consistencia cruzada validada contra `aps-permisos` y `aps-sui853`
- [x] Gates G1–G5 en `cumple`

**handoff_siguiente_fase**: `sdd-verify` (validación de consistencia final contra `sdd/migracion-aps/spec` y `design`).

# modulo

- nombre: `empresas-core`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/empresas/{routes.js,controller.js}`
  - Middleware dependiente: `back-tarificador/src/middlewares/authJwt.js`
  - Frontend: `front-tarificador/src/service/EmpresaService.js`, `views/configuracion/Empresas.vue`, `components/emprConf/{emprGrid.vue,formEmpr.vue}`, componentes de `cargue_components/*` que consumen `getEmpresasPropias`.
  - Base URL backend observada: `http://10.162.10.91:4000/api/v1/` (`front-tarificador/src/service/BackendTarificadorConsumerService.js`).
  - DB: `TARIFICADOR.AUGE_EMPRESAS`, `TARIFICADOR.AUCO_APSEMPRDIVI`, `TARIFICADOR.SAUGE_EMPRESAS`.
- limites_modulo:
  - Este documento cubre solo 5 endpoints con consumo frontend observado.
  - Endpoints fuera de alcance: `DELETE /eliminar/:id`, `POST /consultarAps`, `GET /:id`.

## actores

- **Usuario de configuración**: gestiona catálogo de empresas desde `/empresas` (listar, crear, consultar por ID, editar).
- **Usuario de cargue (mensual/semestral/complementario)**: consulta combos de empresas propias o competidoras por APS.
- **API EMPRESAS**: expone endpoints protegidos y ejecuta SQL Oracle mediante `db.open(...)`.

## funcionalidades

### F-EMPRESAS-01 — Listado general de empresas

- flujo:
  1. Usuario ingresa a `views/configuracion/Empresas.vue`, que renderiza `emprGrid`.
  2. En `created()`, `emprGrid.consultarData()` invoca `EmpresaService.getEmpresas()`.
  3. FE ejecuta `GET /api/v1/empresas/` con header `x-access-token`.
  4. Ruta aplica `authJwt.verificarToken` y llama `empresacontroller.consultatodas()`.
  5. Controlador ejecuta `SELECT * FROM auge_empresas ORDER BY EMPR_NOMBRE`.
  6. Backend responde `res.send(resultado)` y FE pinta la grilla.
- frontend:
  - `front-tarificador/src/views/configuracion/Empresas.vue`
  - `front-tarificador/src/components/emprConf/emprGrid.vue`
  - `front-tarificador/src/service/EmpresaService.js#getEmpresas`
- backend:
  - `GET /api/v1/empresas/` (con `authJwt.verificarToken`)
  - `empresas/controller.js#consultatodas`
- db:
  - `AUGE_EMPRESAS`
  - SQL observado: `SELECT * FROM auge_empresas ORDER BY EMPR_NOMBRE`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `Empresas.vue` + `emprGrid.vue#consultarData`
  - → `EmpresaService.getEmpresas()`
  - → `GET /api/v1/empresas/`
  - → `empresacontroller.consultatodas`
  - → `AUGE_EMPRESAS`
- estado: `implementado_as_is`

### F-EMPRESAS-02 — Creación de empresa

- flujo:
  1. Usuario abre modal “Nueva Empresa” en `emprGrid`.
  2. `formEmpr.launchAction()` (modo nuevo) llama `EmpresaService.newEmpr(...)`.
  3. FE envía `POST /api/v1/empresas/crear` con body `{nombre, estado, propia, nuap}` y token.
  4. Ruta extrae `req.SISU_ID` desde middleware AUTH y llama `empresacontroller.registro(nombre, estado, propia, usuario, nuap)`.
  5. Controlador ejecuta `INSERT INTO AUGE_EMPRESAS VALUES (SAUGE_EMPRESAS.nextval, :1, :2, :3, sysdate, :4, :5 )`.
  6. Backend responde `res.send(resultado)`.
- frontend:
  - `front-tarificador/src/components/emprConf/formEmpr.vue`
  - `front-tarificador/src/service/EmpresaService.js#newEmpr`
- backend:
  - `POST /api/v1/empresas/crear` (con `authJwt.verificarToken`)
  - `empresas/controller.js#registro`
- db:
  - `AUGE_EMPRESAS`
  - `SAUGE_EMPRESAS.nextval`
  - `sysdate`
  - bind order observado: `[nombre, estado, propia, req.SISU_ID, nuap]`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `formEmpr.vue#launchAction`
  - → `EmpresaService.newEmpr()`
  - → `POST /api/v1/empresas/crear`
  - → `empresacontroller.registro` (usa `req.SISU_ID`)
  - → `AUGE_EMPRESAS` + `SAUGE_EMPRESAS`
- estado: `implementado_as_is`

### F-EMPRESAS-03 — Consulta de empresas propias/competidoras por APS

- flujo:
  1. Vistas de cargue invocan `initCombo(aps)` al montar o cambiar `stapsSeleccionado`.
  2. `EmpresaService.getEmpresasPropias(aps, 1|0)` arma `{aps, propia}`.
  3. FE ejecuta `POST /api/v1/empresas/consultarpropias` con token.
  4. Ruta llama `empresacontroller.consultarpropias(aps, propia)`.
  5. Controlador ejecuta join `AUGE_EMPRESAS` + `AUCO_APSEMPRDIVI` filtrando `apsa_id`, `EMPR_PROPIA` y `ES.EMPR_ESTADO = 1`.
  6. FE mapea `EMPR_EMPR`/`EMPR_NOMBRE` para poblar combos.
- frontend:
  - `front-tarificador/src/components/cargue_components/InfPropia.vue`
  - `front-tarificador/src/components/cargue_components/InfCompetidor.vue`
  - `front-tarificador/src/components/cargue_components/propio/{InfPropiaMensual.vue,InfPropiaSemestral.vue}`
  - `front-tarificador/src/components/cargue_components/competidor/{InfCompetidorMensual.vue,InfCompetidorSemestral.vue}`
  - `front-tarificador/src/components/cargue_components/sui_complemento/CargueComplemento.vue`
  - `front-tarificador/src/service/EmpresaService.js#getEmpresasPropias`
- backend:
  - `POST /api/v1/empresas/consultarpropias` (con `authJwt.verificarToken`)
  - `empresas/controller.js#consultarpropias`
- db:
  - `AUGE_EMPRESAS`
  - `AUCO_APSEMPRDIVI`
  - SQL observado:

```sql
SELECT es.*
  FROM AUGE_EMPRESAS es
 INNER JOIN AUCO_APSEMPRDIVI apsem
    ON (es.empr_empr = apsem.empr_empr AND apsa_id = :1)
 WHERE EMPR_PROPIA = :2
   AND ES.EMPR_ESTADO = 1
```

- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario cargue → componentes `cargue_components/*#initCombo`
  - → `EmpresaService.getEmpresasPropias(aps, propia)`
  - → `POST /api/v1/empresas/consultarpropias`
  - → `empresacontroller.consultarpropias`
  - → `AUGE_EMPRESAS` + `AUCO_APSEMPRDIVI`
- estado: `implementado_as_is`

### F-EMPRESAS-04 — Consulta general de empresa por ID

- flujo:
  1. Usuario pulsa editar en `emprGrid`.
  2. `openBasic(type)` llama `EmpresaService.getEmprbyId(type)`.
  3. FE ejecuta `POST /api/v1/empresas/consultaempr` con body `{empr}` y token.
  4. Ruta llama `empresacontroller.consultaempr(empr)`.
  5. Controlador ejecuta `SELECT * FROM auge_empresas WHERE empr_empr = :1`.
  6. FE consume `response.data[0]` y precarga `formEmpr`.
- frontend:
  - `front-tarificador/src/components/emprConf/emprGrid.vue#openBasic`
  - `front-tarificador/src/service/EmpresaService.js#getEmprbyId`
- backend:
  - `POST /api/v1/empresas/consultaempr` (con `authJwt.verificarToken`)
  - `empresas/controller.js#consultaempr`
- db:
  - `AUGE_EMPRESAS`
  - SQL observado: `SELECT * FROM auge_empresas WHERE empr_empr = :1`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `emprGrid.vue#openBasic`
  - → `EmpresaService.getEmprbyId()`
  - → `POST /api/v1/empresas/consultaempr`
  - → `empresacontroller.consultaempr`
  - → `AUGE_EMPRESAS`
- estado: `implementado_as_is`

### F-EMPRESAS-05 — Edición de empresa

- flujo:
  1. Usuario actualiza formulario en `formEmpr`.
  2. `launchAction()` (modo edición) invoca `EmpresaService.updtEmpr(pk, nombre, propia, estado, nuap)`.
  3. FE ejecuta `PUT /api/v1/empresas/editar/:id` con body `{nombre, estado, propia, nuap}` + token.
  4. Ruta llama `empresacontroller.modificar(id, nombre, estado, propia, nuap)`.
  5. Controlador ejecuta `UPDATE auge_empresas ...` con placeholders no secuenciales.
  6. Backend responde `res.send(resultado)`.
- frontend:
  - `front-tarificador/src/components/emprConf/formEmpr.vue#launchAction`
  - `front-tarificador/src/service/EmpresaService.js#updtEmpr`
- backend:
  - `PUT /api/v1/empresas/editar/:id` (con `authJwt.verificarToken`)
  - `empresas/controller.js#modificar`
- db:
  - `AUGE_EMPRESAS`
  - SQL observado: `UPDATE auge_empresas SET EMPR_NOMBRE = :1, EMPR_ESTADO = :2, EMPR_PROPIA = :3, EMPR_NUAP = :5 WHERE EMPR_EMPR = :4`
  - bind order observado: `[nombre, estado, propia, nuap, id]`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario configuración → `formEmpr.vue#launchAction`
  - → `EmpresaService.updtEmpr()`
  - → `PUT /api/v1/empresas/editar/:id`
  - → `empresacontroller.modificar`
  - → `AUGE_EMPRESAS`
- estado: `implementado_as_is`

## endpoints_catalog

Base: `/api/v1/empresas`

| Método | Path | Auth requerida | Request ejemplo | Response AS-IS | Observaciones |
|---|---|---|---|---|---|
| GET | `/` | Sí (`authJwt.verificarToken`) | Sin body | `res.send(resultado)` (default 200, array de empresas) | Ordenado por `EMPR_NOMBRE` en SQL. |
| POST | `/crear` | Sí (`authJwt.verificarToken`) | `{ "nombre":"Acme", "estado":1, "propia":"1", "nuap":"X123" }` | `res.send(resultado)` (default 200, resultado DML) | Usa `req.SISU_ID`, `SAUGE_EMPRESAS.nextval` y `sysdate`. |
| POST | `/consultarpropias` | Sí (`authJwt.verificarToken`) | `{ "aps": 1015, "propia": 1 }` | `res.send(resultado)` (default 200, array) | Join `AUGE_EMPRESAS` + `AUCO_APSEMPRDIVI`, filtro `ES.EMPR_ESTADO = 1`. |
| POST | `/consultaempr` | Sí (`authJwt.verificarToken`) | `{ "empr": 25 }` | `res.send(resultado)` (default 200, array) | FE retorna `response.data[0]`. |
| PUT | `/editar/:id` | Sí (`authJwt.verificarToken`) | Path `:id` + body `{ "nombre":"Acme", "estado":1, "propia":"1", "nuap":"X123" }` | `res.send(resultado)` (default 200, resultado DML) | SQL usa placeholders `:1,:2,:3,:5,:4` (no secuencial). |

> Fuera de alcance documental en este cambio: `GET /:id` (placeholder), `DELETE /eliminar/:id`, `POST /consultarAps`.

## matriz_auth_rutas

| Endpoint in-scope | Middleware en `routes.js` | Resultado |
|---|---|---|
| `GET /` | `[authJwt.verificarToken]` | `ok` |
| `POST /crear` | `[authJwt.verificarToken]` | `ok` |
| `POST /consultarpropias` | `[authJwt.verificarToken]` | `ok` |
| `POST /consultaempr` | `[authJwt.verificarToken]` | `ok` |
| `PUT /editar/:id` | `[authJwt.verificarToken]` | `ok` |

Contrato de autenticación observado (`authJwt.verificarToken`):
- Header requerido: `x-access-token`.
- Sin token: `403 { message: "No existe token de verificacion" }`.
- Token inválido o registrado en `AUGE_DEADTOKEN`: `401 { message: "No Autorizado!" }`.
- Inyección de contexto: `req.SISU_ID` y `req.idSistema`.

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.AUGE_EMPRESAS`: `validado`
- `TARIFICADOR.AUCO_APSEMPRDIVI`: `validado`
- `TARIFICADOR.SAUGE_EMPRESAS` (SEQUENCE): `validado`

### ddl_recibido

#### TARIFICADOR.AUGE_EMPRESAS
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-27`
```sql
CREATE TABLE "TARIFICADOR"."AUGE_EMPRESAS"
(
  "EMPR_EMPR" NUMBER NOT NULL ENABLE,
  "EMPR_NOMBRE" VARCHAR2(255),
  "EMPR_ESTADO" VARCHAR2(10),
  "EMPR_PROPIA" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "EMPR_FECHACREACION" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  "EMPR_NUAP" VARCHAR2(30) DEFAULT '0' NOT NULL ENABLE,
  CONSTRAINT "PK_AUGE_EMPRESAS" PRIMARY KEY ("EMPR_EMPR")
);
COMMENT ON TABLE TARIFICADOR.AUGE_EMPRESAS IS 'Información de las empresas (sociedades) es diferente de municipios';
```

#### TARIFICADOR.AUCO_APSEMPRDIVI
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-27`
```sql
CREATE TABLE "TARIFICADOR"."AUCO_APSEMPRDIVI"
(
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "EMPR_EMPR" NUMBER NOT NULL ENABLE,
  "DIVI_DIVI" NUMBER NOT NULL ENABLE,
  "APEM_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "APEM_FECHACREACION" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  "APSA_UBICACION" NUMBER DEFAULT 0,
  CONSTRAINT "PK_AUCO_APSEMPRDIVI" PRIMARY KEY ("APSA_ID", "EMPR_EMPR", "DIVI_DIVI")
);
GRANT UPDATE ON "TARIFICADOR"."AUCO_APSEMPRDIVI" TO "RELIQ";
GRANT SELECT ON "TARIFICADOR"."AUCO_APSEMPRDIVI" TO "RELIQ";
GRANT INSERT ON "TARIFICADOR"."AUCO_APSEMPRDIVI" TO "RELIQ";
GRANT DELETE ON "TARIFICADOR"."AUCO_APSEMPRDIVI" TO "RELIQ";
ALTER TABLE "TARIFICADOR"."AUCO_APSEMPRDIVI" ADD CONSTRAINT "AUCO_APEMPDIV_APSA_ID_FKEY" FOREIGN KEY ("APSA_ID")
  REFERENCES "TARIFICADOR"."AUCO_APSASEO" ("APSA_ID") ENABLE;
ALTER TABLE "TARIFICADOR"."AUCO_APSEMPRDIVI" ADD CONSTRAINT "AUCO_APEMPDIV_DIVI_DIVI_FKEY" FOREIGN KEY ("DIVI_DIVI")
  REFERENCES "TARIFICADOR"."AUGE_DIVIPOLI" ("DIVI_DIVI") ENABLE;
ALTER TABLE "TARIFICADOR"."AUCO_APSEMPRDIVI" ADD CONSTRAINT "AUCO_APEMPDIV_EMPR_EMPR_FKEY" FOREIGN KEY ("EMPR_EMPR")
  REFERENCES "TARIFICADOR"."AUGE_EMPRESAS" ("EMPR_EMPR") ENABLE;
```

#### TARIFICADOR.SAUGE_EMPRESAS (SEQUENCE)
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-27`
```sql
CREATE SEQUENCE TARIFICADOR.SAUGE_EMPRESAS
INCREMENT BY 1
MINVALUE 1
MAXVALUE 9999999999999999999999999999
NOCYCLE
CACHE 20
NOORDER;
```

### ddl_pendiente
- Sin pendientes DDL para el módulo EMPRESAS en el alcance actual.

## observado_en_codigo

- `EmpresaService.getEmprbyId()` retorna directamente `response.data[0]`.
- `EmpresaService.newEmpr()` y `updtEmpr()` normalizan nombre con `charAt(0).toUpperCase() + slice(1)` antes de enviar.
- Los flujos de cargue consumen `getEmpresasPropias(aps, 1|0)` para poblar combos de empresa en componentes mensual, semestral y complemento.
- Las rutas FE `/empresas`, `/cargue`, `/carguesem`, `/carguecomplemento` están marcadas con `meta.requiresAuth: true`.

## pendiente_validacion

- `[out_of_scope_endpoint]` `GET /api/v1/empresas/:id` responde string placeholder: `"mostar un registro especifico  ..."`.
- `[out_of_scope_endpoint]` `DELETE /api/v1/empresas/eliminar/:id`:
  - ruta recibe `:id` pero usa `req.body.empresa`;
  - llamada en ruta sin `await` (`empresacontroller.eliminar(empresa)`);
  - SQL con paréntesis extra: `WHERE empr_empr = :1)`.
- `[out_of_scope_endpoint]` `POST /api/v1/empresas/consultarAps` no aplica `authJwt.verificarToken` en backend.
- `[in_scope_endpoint]` `modificar` usa placeholders no secuenciales (`:1,:2,:3,:5,:4`) con bind `[nombre, estado, propia, nuap, id]`.
- `[in_scope_endpoint]` en `controller.js` hay asignaciones `sql = ...` sin `let/const` en varias funciones.

## validacion_cruzada_facetas

| Eje | Faceta contraste | Resultado | Evidencia |
|---|---|---|---|
| Dependencia EMPRESAS → AUTH | `docs/modulos/auth/funcionalidades/auth-core.md` | `consistente` | Se usa el mismo contrato de middleware (`x-access-token`, 401/403, `req.SISU_ID`). |
| Dependencia EMPRESAS → APS | `docs/modulos/aps/funcionalidades/aps-configuracion.md` | `consistente` | EMPRESAS consume `apsa_id` y `AUCO_APSEMPRDIVI`; ownership de APS permanece en módulo APS. |
| Consistencia documental con USUARIOS | `docs/modulos/usuarios/funcionalidades/usuarios-usuagraf.md` | `consistente` | Se mantiene formato de estados `implementado_as_is` / `pendiente_validacion` y secciones de trazabilidad/DDL. |

## checkpoints_g1_g5

| Gate | Estado | Evidencia observada |
|---|---|---|
| G1 Trazabilidad completa | `cumple` | F-EMPRESAS-01..05 incluyen Actor → UI → API → Lógica → DB |
| G2 Evidencia verificable | `cumple` | Referencias directas a `EmpresaService.js`, `emprConf/*`, `cargue_components/*`, `empresas/{routes,controller}.js` |
| G3 DDL en archivo | `cumple` | `registro_ddl_modulo` declara 3 objetos con estado `pendiente_validacion` |
| G4 Riesgos aislados | `cumple` | Hallazgos separados en `pendiente_validacion` |
| G5 Dependencias explícitas | `cumple` | Dependencias con AUTH (middleware y `req.SISU_ID`) y APS (`apsa_id`, `AUCO_APSEMPRDIVI`) documentadas |

## checklist_dod_fase1

- [x] 5 endpoints in-scope documentados con trazabilidad completa
- [x] 3 endpoints fuera de alcance explicitados
- [x] Contrato de seguridad AUTH y matriz de middleware por ruta
- [x] Relación con APS (`apsa_id`, `AUCO_APSEMPRDIVI`) documentada
- [x] Catálogo consolidado de endpoints in-scope
- [x] Anomalías AS-IS registradas sin corrección
- [x] Estado DDL por objeto en `pendiente_validacion`
- [x] Terminología consistente con módulos AUTH/APS/USUARIOS

## handoff_siguiente_fase

- alcance_cumplido: documentación AS-IS de EMPRESAS completada para 5 endpoints con consumidores FE.
- pendientes_abiertos:
  - DDL formal de `AUGE_EMPRESAS`, `AUCO_APSEMPRDIVI`, `SAUGE_EMPRESAS`.
  - Validación funcional posterior de endpoints out-of-scope con anomalías (`GET /:id`, `DELETE /eliminar/:id`, `POST /consultarAps`).
- recomendacion_siguiente_fase: `sdd-verify`.

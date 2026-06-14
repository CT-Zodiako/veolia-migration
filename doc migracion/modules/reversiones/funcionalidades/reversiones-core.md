# modulo

- nombre: `reversiones-core`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/reversiones/{routes.js,controller.js}`
  - Middleware dependiente: `back-tarificador/src/middlewares/authJwt.js`
  - Frontend: `front-tarificador/src/views/reversion/AutorizacionReversiones.vue`, `front-tarificador/src/views/reversion/DetalladoAutorizacion.vue`, `front-tarificador/src/service/ReversionService.js`
  - DB: `TARIFICADOR.REVE_AUTORIZACION`, `TARIFICADOR.VREVE_AUTORIZACION`
- limites_modulo:
  - Solo 2 endpoints de autorización (`crearAutorizacion`, `detalladoAutorizacion`).
  - Sin cambios runtime ni normalización de contratos/respuestas.

## actores

- **Usuario autenticado de reversiones**: registra autorizaciones desde UI de autorización.
- **API REVERSIONES**: valida token, usa `req.SISU_ID` y persiste/consulta en Oracle.

## funcionalidades

### F-REVE-01 — Crear autorización (`POST /api/v1/reversiones/crearAutorizacion`)

- flujo:
  1. Usuario abre `AutorizacionReversiones.vue`.
  2. `onAuthReversion()` calcula período previo (`date.setMonth(date.getMonth() - 1)`) y arma payload `{aps, anno, mes, descripcion}`.
  3. `ReversionService.autorizar_reversion(data)` ejecuta `POST /api/v1/reversiones/crearAutorizacion` con `x-access-token`.
  4. Ruta aplica `authJwt.verificarToken`, toma `req.SISU_ID` y llama `reversionesController.crearAutorizacion(...)`.
  5. Controller ejecuta `INSERT INTO TARIFICADOR.REVE_AUTORIZACION (..., AUTO_FECCREA=SYSDATE, USUA_USUARIO=:5)`.
  6. Backend responde `res.send(resultado)`.
- frontend:
  - `front-tarificador/src/views/reversion/AutorizacionReversiones.vue#onAuthReversion`
  - `front-tarificador/src/service/ReversionService.js#autorizar_reversion`
- backend:
  - `POST /api/v1/reversiones/crearAutorizacion` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/reversiones/controller.js#crearAutorizacion`
- db:
  - `TARIFICADOR.REVE_AUTORIZACION`
  - SQL observado:
    ```sql
    INSERT INTO TARIFICADOR.REVE_AUTORIZACION
      (APSA_ID, AUTO_ANNO, AUTO_MES, AUTO_DESCRIPCION, AUTO_FECCREA, USUA_USUARIO)
    VALUES(:1, :2, :3, :4, SYSDATE , :5)
    ```
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado → `AutorizacionReversiones.vue#onAuthReversion`
  - → `ReversionService.autorizar_reversion`
  - → `POST /api/v1/reversiones/crearAutorizacion`
  - → `reversionesController.crearAutorizacion` (usa `req.SISU_ID`)
  - → `TARIFICADOR.REVE_AUTORIZACION`
- estado: `implementado_as_is`

### F-REVE-02 — Detallado de autorización (`GET /api/v1/reversiones/detalladoAutorizacion`)

- flujo:
  1. FE invoca `ReversionService.detallado_autorizacion()`.
  2. Service ejecuta `GET /api/v1/reversiones/detalladoAutorizacion` con `x-access-token`.
  3. Ruta aplica `authJwt.verificarToken`, toma `req.SISU_ID` y llama `reversionesController.detalladoAutorizacion(usuario)`.
  4. Controller consulta `VREVE_AUTORIZACION` filtrando por `SISU_ID = :1`, con orden `ORDER BY 2 DESC, 3 DESC, 1`.
  5. Backend responde `res.send(resultado)`.
- frontend:
  - `front-tarificador/src/views/reversion/DetalladoAutorizacion.vue`
  - `front-tarificador/src/service/ReversionService.js#detallado_autorizacion`
- backend:
  - `GET /api/v1/reversiones/detalladoAutorizacion` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/reversiones/controller.js#detalladoAutorizacion`
- db:
  - `TARIFICADOR.VREVE_AUTORIZACION`
  - SQL observado:
    ```sql
    SELECT *
      FROM vreve_autorizacion
     WHERE SISU_ID = :1
     ORDER BY 2 DESC, 3 DESC, 1
    ```
  - lógica embebida de la vista (AS-IS crítica):
    - Si `AUTO_MES = 12` entonces `AUTO_ANNO = AUTO_ANNO + 1`
    - Si `AUTO_MES = 12` entonces `AUTO_MES = 1`
    - Caso contrario: `AUTO_ANNO` y `AUTO_MES + 1`.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado → `DetalladoAutorizacion.vue` (ruta `/detautorizacion`, menú `3004`)
  - → `ReversionService.detallado_autorizacion`
  - → `GET /api/v1/reversiones/detalladoAutorizacion`
  - → `detalladoAutorizacion` (filtro `req.SISU_ID`)
  - → `TARIFICADOR.VREVE_AUTORIZACION`
- estado: `implementado_as_is`

## endpoints_catalog

Base: `/api/v1/reversiones`

| Método | Path | Auth requerida | Request ejemplo | Response AS-IS | Observaciones |
|---|---|---|---|---|---|
| POST | `/crearAutorizacion` | Sí (`authJwt.verificarToken`) | `{ "aps":1015, "anno":2024, "mes":3, "descripcion":"Motivo" }` | `res.send(resultado)` | Inserta en `REVE_AUTORIZACION` con `SYSDATE` y `USUA_USUARIO=req.SISU_ID`. |
| GET | `/detalladoAutorizacion` | Sí (`authJwt.verificarToken`) | Sin body | `res.send(resultado)` | Consulta `VREVE_AUTORIZACION` filtrada por `SISU_ID=req.SISU_ID`; ordena por año/mes desc. |

## matriz_auth_rutas

| Endpoint | Middleware | Identidad usada | Sin token | Menú/ruta FE relacionada |
|---|---|---|---|---|
| `POST /crearAutorizacion` | `[authJwt.verificarToken]` | `req.SISU_ID` → `USUA_USUARIO` | `403` (`No existe token de verificacion`) | Menú `3003` → `/reversion_auth` |
| `GET /detalladoAutorizacion` | `[authJwt.verificarToken]` | `req.SISU_ID` (filtro `SISU_ID`) | `403` (`No existe token de verificacion`) | Menú `3004` → `/detautorizacion` |

Contexto cross-módulo de navegación (fuera de alcance funcional de este módulo):
- Menú `3001` (`/reversiones`) y `3002` (`/detareversiones`) pertenecen al flujo global de reversiones.
- Menú `805` (`/reversiones_sui`) pertenece a reportes SUI de reversiones.

## contratos_as_is_no_normalizar

### C-REVE-01 — `POST /api/v1/reversiones/crearAutorizacion`
- request_body observado: `{ aps, anno, mes, descripcion }`
- response observado: `res.send(resultado)`
- sql_as_is:
  ```sql
  INSERT INTO TARIFICADOR.REVE_AUTORIZACION
    (APSA_ID, AUTO_ANNO, AUTO_MES, AUTO_DESCRIPCION, AUTO_FECCREA, USUA_USUARIO)
  VALUES(:1, :2, :3, :4, SYSDATE , :5)
  ```
- binds_as_is: `[aps, anno, mes, descripcion, req.SISU_ID]`

### C-REVE-02 — `GET /api/v1/reversiones/detalladoAutorizacion`
- request observado: sin body
- response observado: `res.send(resultado)`
- sql_as_is:
  ```sql
  SELECT *
    FROM vreve_autorizacion
   WHERE SISU_ID = :1
   ORDER BY 2 DESC, 3 DESC, 1
  ```
- binds_as_is: `[req.SISU_ID]`

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.REVE_AUTORIZACION`: `validado`
- `TARIFICADOR.VREVE_AUTORIZACION`: `validado`

### ddl_recibido

#### `TARIFICADOR.REVE_AUTORIZACION` (TABLA)
- estado: `validado`
```sql
CREATE TABLE "TARIFICADOR"."REVE_AUTORIZACION" 
   ( "APSA_ID" NUMBER(*,0) NOT NULL ENABLE, 
  "AUTO_ANNO" NUMBER(*,0) NOT NULL ENABLE, 
  "AUTO_MES" NUMBER(*,0) NOT NULL ENABLE, 
  "AUTO_DESCRIPCION" VARCHAR2(500) NOT NULL ENABLE, 
  "AUTO_FECCREA" DATE DEFAULT sysdate NOT NULL ENABLE, 
  "USUA_USUARIO" NUMBER(*,0) NOT NULL ENABLE, 
  CONSTRAINT "PK_REVE_AUTORIZACION" PRIMARY KEY ("APSA_ID", "AUTO_ANNO", "AUTO_MES")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 COMPUTE STATISTICS 
  STORAGE(INITIAL 65536 NEXT 1048576 MINEXTENTS 1 MAXEXTENTS 2147483645
  PCTINCREASE 0 FREELISTS 1 FREELIST GROUPS 1
  BUFFER_POOL DEFAULT FLASH_CACHE DEFAULT CELL_FLASH_CACHE DEFAULT)
  TABLESPACE "USERS" ENABLE
   ) SEGMENT CREATION IMMEDIATE 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  STORAGE(INITIAL 65536 NEXT 1048576 MINEXTENTS 1 MAXEXTENTS 2147483645
  PCTINCREASE 0 FREELISTS 1 FREELIST GROUPS 1
  BUFFER_POOL DEFAULT FLASH_CACHE DEFAULT CELL_FLASH_CACHE DEFAULT)
  TABLESPACE "USERS";
```

#### `TARIFICADOR.VREVE_AUTORIZACION` (VISTA)
- estado: `validado`
```sql
CREATE OR REPLACE FORCE VIEW "TARIFICADOR"."VREVE_AUTORIZACION" ("APSA_NOMAPS", "AUTO_ANNO", "AUTO_MES", "AUTO_DESCRIPCION", "AUTO_FECCREA", "SISU_CORREO", "SISU_ID") AS 
  SELECT DISTINCT AA.APSA_NOMAPS, 
         CASE WHEN AUTO_MES = 12 THEN AUTO_ANNO + 1 ELSE AUTO_ANNO END AUTO_ANNO, 
         CASE WHEN AUTO_MES = 12 THEN 1 ELSE AUTO_MES + 1 END AUTO_MES, 
         AUTO_DESCRIPCION, AR.AUTO_FECCREA, AS2.SISU_CORREO, AU.SISU_ID  
    FROM REVE_AUTORIZACION ar 
         JOIN AUGE_SISUSUARIO as2 ON AR.USUA_USUARIO = as2.sisu_id
         JOIN AUCO_APSASEO aa ON AA.APSA_ID = AR.APSA_ID
       JOIN AUCO_APSUSUARIOS au ON aa.APSA_ID = au.APSA_ID
  ORDER BY AR.AUTO_FECCREA;
```

### ddl_pendiente
- Sin pendientes DDL para el alcance actual (`validado` en ambos objetos).

## semillas_minimas_db

- Precondiciones mínimas observables para reproducir flujo AS-IS:
  - JWT válido con claim `SISU_ID`.
  - `APSA_ID` existente en `AUCO_APSASEO`.
  - `USUA_USUARIO` referenciable vía `AUGE_SISUSUARIO` para visualizar correo en la vista.
  - Relación `AUCO_APSUSUARIOS` para poblar `SISU_ID` en `VREVE_AUTORIZACION`.

## plan_pruebas_r

- `R1`: crear autorización con token válido y payload completo → debe insertar en `REVE_AUTORIZACION`.
- `R2`: crear autorización duplicada `(APSA_ID, AUTO_ANNO, AUTO_MES)` → Oracle rechaza por `PK_REVE_AUTORIZACION`.
- `R3`: consultar detallado con token válido → devuelve filas filtradas por `SISU_ID`.
- `R4`: validar rollover de vista para registros con `AUTO_MES=12` → salida esperada año+1/mes=1.
- `R5`: request sin token en ambos endpoints → middleware responde `403`.

## definicion_de_cierre

- Endpoints documentados: 2/2.
- Trazabilidad completa Actor → UI → API → Lógica → DB: 2/2.
- Matriz auth por endpoint con evidencia de middleware: 2/2.
- DDL embebido en el mismo archivo y estado `validado`: 2/2 objetos.
- Dependencias cross-módulo explicitadas sin expandir alcance.

## riesgos_y_decisiones

- decisión_to_be: mantener contrato AS-IS sin normalización en fase documental.
  - observado_as_is: backend responde `res.send(resultado)` sin capa de DTO.
  - riesgo_migracion: clientes dependen de forma de respuesta Oracle sin contrato explícito versionado.
- decisión_to_be: no mezclar ejecución de reversiones (`suministros`) en este módulo.
  - observado_as_is: el módulo `reversiones` solo autoriza/consulta autorización.
  - riesgo_migracion: migrar solo autorización no completa journey end-to-end.

## desviaciones_formales

- Ninguna desviación funcional respecto a `sdd/reversiones/spec` y `sdd/reversiones/design`.

## observado_en_codigo

- `AutorizacionReversiones.vue` calcula período del mes anterior antes del POST.
- `ReversionService.js` usa `jwtOken` de `localStorage` como header `x-access-token`.
- `detalladoAutorizacion` es `GET` y filtra por `req.SISU_ID` en backend.
- Menú de navegación incluye IDs `3001–3004` y `805` para flujo global de reversiones.

## pendiente_validacion

- El flujo global de ejecución/reportería de reversiones depende de módulos fuera de alcance (`validaciones`, `suministros`, `sui`).

## dependencias_cross_modulo

- `suministros`: ejecución operativa de reversiones (no cubierta aquí).
- `validaciones`: prevalidación de reversión (no cubierta aquí).
- `sui`: reportes y formatos de reversión (no cubierta aquí).

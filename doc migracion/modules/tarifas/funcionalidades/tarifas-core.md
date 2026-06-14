# modulo

- nombre: `tarifas-core`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/tarifas/{routes.js,controller.js}`
  - Middleware dependiente: `back-tarificador/src/middlewares/authJwt.js`
  - Registro del módulo: `back-tarificador/src/app.js` (`app.use(apiv1 + 'tarifas', ...)`)
  - Frontend: `front-tarificador/src/service/TarifasService.js`, `views/procesos/Calculo.vue`, `views/informes/Detalletarifas.vue`, `views/informesgerenciales/DetalletarifasGen.vue`
  - Base URL backend observada: `http://10.162.10.91:4000/api/v1/` (`front-tarificador/src/service/BackendTarificadorConsumerService.js`)
  - DB: `vauco_tarifa4`, `vauco_tardetalle`, `auco_apsaseo`
- limites_modulo:
  - Este documento cubre solo 4 endpoints `POST` bajo `/api/v1/tarifas`.
  - No incluye rediseño SQL, ni normalización de contratos, ni cambios runtime.

## actores

- **Usuario autenticado de procesos**: consume gráfica de tarifas desde `Calculo.vue`.
- **Usuario autenticado de informes**: consulta detalle tarifario por APS en `Detalletarifas.vue`.
- **Usuario autenticado de informes gerenciales**: consulta detalle general en `DetalletarifasGen.vue`.
- **Actor no confirmado**: consumidor funcional de `/consultageneral` no observado en FE revisado.

## funcionalidades

### F-TARIFAS-01 — Consulta de tarifa base (`POST /api/v1/tarifas/`)

- flujo:
  1. `Calculo.vue#getTarifas` arma `{aps, anno, mes}` desde `stapsSeleccionado` y `stDate`.
  2. Invoca `TarifasService.getchartTarifas(aps, anno, mes)`.
  3. El service llama `getTarifa(...)` y ejecuta `axios.post(api_endpoint + "tarifas", data, {"x-access-token": ...})`.
  4. Backend `routes.js` aplica `authJwt.verificarToken` y ejecuta `tarifacontroller.consultatarifa(aps, anno, mes)`.
  5. `controller.js` ejecuta SQL AS-IS sobre `vauco_tarifa4` y retorna `resultado`.
  6. Ruta responde `res.send(resultado)` y FE construye dataset de `chartTarifas`.
- frontend:
  - `front-tarificador/src/views/procesos/Calculo.vue#getTarifas`
  - `front-tarificador/src/service/TarifasService.js#getchartTarifas`
  - `front-tarificador/src/service/TarifasService.js#getTarifa`
- backend:
  - `POST /api/v1/tarifas/` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/tarifas/controller.js#consultatarifa`
- db:
  - `vauco_tarifa4`
  - SQL observado: `SELECT * FROM vauco_tarifa4  WHERE apsa_id = :1 AND tari_anno = :2 AND tari_mes = :3`
  - bind observado: `[aps, anno, mes]`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado de procesos → `Calculo.vue#getTarifas`
  - → `TarifasService.getchartTarifas` → `TarifasService.getTarifa`
  - → `POST /api/v1/tarifas/`
  - → `tarifacontroller.consultatarifa`
  - → `vauco_tarifa4`
- estado: `implementado_as_is`

### F-TARIFAS-02 — Consulta general de tarifa (`POST /api/v1/tarifas/consultageneral`)

- flujo:
  1. Backend expone `POST /consultageneral` con `authJwt.verificarToken`.
  2. Ruta extrae `{aps, anno, mes}` y llama `tarifacontroller.consultageneral(aps, anno, mes)`.
  3. Controlador ejecuta SQL AS-IS sobre `vauco_tarifa4` filtrando por período.
  4. Ruta responde `res.send(resultado)`.
- frontend:
  - No se observó consumidor en `front-tarificador/src` para `api_endpoint + "tarifas/consultageneral"`.
- backend:
  - `POST /api/v1/tarifas/consultageneral` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/tarifas/controller.js#consultageneral`
- db:
  - `vauco_tarifa4`
  - SQL observado: `SELECT * FROM vauco_tarifa4  WHERE tari_anno = :2 AND tari_mes = :3`
  - bind observado: `[anno, mes]`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Actor no confirmado → `pendiente_validacion (sin UI observada)`
  - → `POST /api/v1/tarifas/consultageneral`
  - → `tarifacontroller.consultageneral`
  - → `vauco_tarifa4`
- estado: `pendiente_validacion`

### F-TARIFAS-03 — Tarifa por componente (`POST /api/v1/tarifas/tarxcom`)

- flujo:
  1. `Detalletarifas.vue#actualizaInfoGeneral` crea `TarifasService` y ejecuta `getTarifaxCosto()`.
  2. `getTarifaxCosto()` calcula `{aps, anno, mes}` y llama `TarifasService.getTarxCos(aps, anno, mes)`.
  3. Service ejecuta `axios.post(api_endpoint + "tarifas/tarxcom", data, {"x-access-token": ...})`.
  4. Backend aplica middleware y ejecuta `tarifacontroller.consultaTarxCom(...)`.
  5. Controlador consulta `vauco_tardetalle`.
  6. Service redondea numéricos a 6 decimales (`toFixed(6)`) antes de retornar a la vista.
- frontend:
  - `front-tarificador/src/views/informes/Detalletarifas.vue#getTarifaxCosto`
  - `front-tarificador/src/service/TarifasService.js#getTarxCos`
- backend:
  - `POST /api/v1/tarifas/tarxcom` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/tarifas/controller.js#consultaTarxCom`
- db:
  - `vauco_tardetalle`
  - SQL observado: `SELECT * FROM vauco_tardetalle WHERE APSA_ID = :1 AND TARI_ANNO = :2 AND TARI_MES = :3`
  - bind observado: `[aps, anno, mes]`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado de informes → `Detalletarifas.vue#getTarifaxCosto`
  - → `TarifasService.getTarxCos`
  - → `POST /api/v1/tarifas/tarxcom`
  - → `tarifacontroller.consultaTarxCom`
  - → `vauco_tardetalle`
- estado: `implementado_as_is`

### F-TARIFAS-04 — Tarifa por componente general (`POST /api/v1/tarifas/tarxcomgeneral`)

- flujo:
  1. `DetalletarifasGen.vue#actualizaInfoGeneral` invoca `getTarifaxCosto()`.
  2. `getTarifaxCosto()` llama `TarifasService.getTarxCosGeneral(anno, mes)`.
  3. Service ejecuta `axios.post(api_endpoint + "tarifas/tarxcomgeneral", {anno, mes}, {"x-access-token": ...})`.
  4. Backend aplica middleware y ejecuta `tarifacontroller.consultaTarxComGeneral(aps, anno, mes)`.
  5. Controlador consulta `vauco_tardetalle` con join a `auco_apsaseo`.
  6. Service redondea numéricos a 6 decimales (`toFixed(6)`) antes de devolver la respuesta.
- frontend:
  - `front-tarificador/src/views/informesgerenciales/DetalletarifasGen.vue#getTarifaxCosto`
  - `front-tarificador/src/service/TarifasService.js#getTarxCosGeneral`
- backend:
  - `POST /api/v1/tarifas/tarxcomgeneral` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/tarifas/controller.js#consultaTarxComGeneral`
- db:
  - `vauco_tardetalle`
  - `auco_apsaseo`
  - SQL observado: `SELECT A.apsa_nomaps, C.* FROM vauco_tardetalle C INNER JOIN auco_apsaseo A ON (c.APSA_ID = A.apsa_id) WHERE TARI_ANNO = :1 AND TARI_MES = :2`
  - bind observado: `[anno, mes]`
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado de informes gerenciales → `DetalletarifasGen.vue#getTarifaxCosto`
  - → `TarifasService.getTarxCosGeneral`
  - → `POST /api/v1/tarifas/tarxcomgeneral`
  - → `tarifacontroller.consultaTarxComGeneral`
  - → `vauco_tardetalle` + `auco_apsaseo`
- estado: `implementado_as_is`

## endpoints_catalog

Base: `/api/v1/tarifas`

| Método | Path | Auth requerida | Request ejemplo | Response AS-IS | Observaciones |
|---|---|---|---|---|---|
| POST | `/` | Sí (`authJwt.verificarToken`) | `{ "aps": 1015, "anno": 2024, "mes": 2 }` | `res.send(resultado)` (array según `SELECT *`) | Consumido por `Calculo.vue` vía `TarifasService.getTarifa/getchartTarifas`. |
| POST | `/consultageneral` | Sí (`authJwt.verificarToken`) | `{ "aps": 1015, "anno": 2024, "mes": 2 }` | `res.send(resultado)` (array según `SELECT *`) | Sin consumidor FE observado en `front-tarificador/src` (`pendiente_validacion`). |
| POST | `/tarxcom` | Sí (`authJwt.verificarToken`) | `{ "aps": 1015, "anno": 2024, "mes": 2 }` | `res.send(resultado)` (array según `SELECT *`) | FE redondea numéricos a 6 decimales en service. |
| POST | `/tarxcomgeneral` | Sí (`authJwt.verificarToken`) | `{ "anno": 2024, "mes": 2 }` | `res.send(resultado)` (array según `SELECT A.apsa_nomaps, C.*`) | Join a `auco_apsaseo` (dependencia APS). |

## matriz_auth_rutas

| Endpoint in-scope | Middleware en `routes.js` | Resultado |
|---|---|---|
| `POST /` | `[authJwt.verificarToken]` | `ok` |
| `POST /consultageneral` | `[authJwt.verificarToken]` | `ok` |
| `POST /tarxcom` | `[authJwt.verificarToken]` | `ok` |
| `POST /tarxcomgeneral` | `[authJwt.verificarToken]` | `ok` |

Contrato de autenticación observado (referencia cruzada):
- Header requerido: `x-access-token`.
- Sin token: `403 { message: "No existe token de verificacion" }`.
- Token inválido o blacklist (`AUGE_DEADTOKEN`): `401 { message: "No Autorizado!" }`.
- Fuente: `back-tarificador/src/middlewares/authJwt.js`.
- Módulo relacionado: `docs/modulos/auth/funcionalidades/auth-core.md`.

## contratos_as_is_no_normalizar

### C-TAR-01 — `POST /api/v1/tarifas/`
- request_body observado: `{ aps, anno, mes }`
- response observado: `res.send(resultado)`
- sql_as_is:
  ```sql
  SELECT * FROM vauco_tarifa4  WHERE apsa_id = :1 AND tari_anno = :2 AND tari_mes = :3
  ```
- binds_as_is: `[aps, anno, mes]`

### C-TAR-02 — `POST /api/v1/tarifas/consultageneral`
- request_body observado (ruta): `{ aps, anno, mes }`
- response observado: `res.send(resultado)`
- sql_as_is:
  ```sql
  SELECT * FROM vauco_tarifa4  WHERE tari_anno = :2 AND tari_mes = :3
  ```
- binds_as_is: `[anno, mes]`
- nota_as_is: placeholders `:2/:3` con arreglo de 2 posiciones (no normalizar en fase documental).

### C-TAR-03 — `POST /api/v1/tarifas/tarxcom`
- request_body observado: `{ aps, anno, mes }`
- response observado: `res.send(resultado)`
- sql_as_is:
  ```sql
  SELECT * FROM vauco_tardetalle WHERE APSA_ID = :1 AND TARI_ANNO = :2 AND TARI_MES = :3
  ```
- binds_as_is: `[aps, anno, mes]`

### C-TAR-04 — `POST /api/v1/tarifas/tarxcomgeneral`
- request_body observado (service): `{ anno, mes }`
- request_body observado (ruta): `{ aps, anno, mes }`
- response observado: `res.send(resultado)`
- sql_as_is:
  ```sql
  SELECT A.apsa_nomaps, C.* FROM vauco_tardetalle C INNER JOIN auco_apsaseo A ON (c.APSA_ID = A.apsa_id) WHERE TARI_ANNO = :1 AND TARI_MES = :2
  ```
- binds_as_is: `[anno, mes]`

## registro_ddl_modulo

### resumen_estado
#### Objetos directos del módulo
- `TARIFICADOR.vauco_tarifa4`: `validado`
- `TARIFICADOR.vauco_tardetalle`: `validado`
- `TARIFICADOR.auco_apsaseo`: `validado`

#### Tablas base del modelo (dependencias)
- `TARIFICADOR.auco_tarifas`: `validado`
- `TARIFICADOR.auco_clasesuso`: `validado`
- `TARIFICADOR.auge_parametros`: `validado`
- `TARIFICADOR.auco_factproduccion`: `validado`
- `TARIFICADOR.auge_clases`: `validado`

### ddl_recibido

#### `TARIFICADOR.VAUCO_TARIFA4` (VISTA)
```sql
CREATE OR REPLACE FORCE VIEW "TARIFICADOR"."VAUCO_TARIFA4" 
  ("APSA_ID", "TARI_ANNO", "TARI_MES", "TC", "TBL", "TLU", "TRT", "TDF", "TTL", "TA") AS 
  SELECT apsa_id, tari_anno, tari_mes, round(tari_tc,2) as tc, 
         round(tari_tbl,2) as tbl, round(tari_tlu,2) as tlu, 
         round(tari_trt,2) as trt, round(tari_tdf,2) as tdf, 
         round(tari_ttl,2) as ttl, round(tari_ta,2) ta
  FROM auco_tarifas
  WHERE fapr_codigo = 4 AND para_tiptar20012 = 1 
    AND para_ubicacion20016 = 2 AND para_tipfac20014 = 2;
```

#### `TARIFICADOR.VAUCO_TARDETALLE` (VISTA)
```sql
CREATE OR REPLACE FORCE VIEW "TARIFICADOR"."VAUCO_TARDETALLE" 
  ("APSA_ID", "TARI_ANNO", "TARI_MES", "CLAS_CLASE", "CLAS_NOMBRE", 
   "PARA_TIPTAR20012", "PARA_NOMBRE", "TIPO_FACT", "fapr_codigo", 
   "tari_subcont", "TARI_CARGOFIJO", "TARI_CARGOFIJOSC", "TARI_TC", 
   "TARI_TCSC", "TARI_TBL", "TARI_TBLSC", "TARI_TLU", "TARI_TLUSC", 
   "TARI_CVARIABLE", "TARI_CVARIABLESC", "TARI_TRT", "TARI_TRTSC", 
   "TARI_TDT", "TARI_TDTSC", "TARI_TTL", "TARI_TTLSC", "TARI_TA", 
   "TARI_TASC", "TARI_PLENA", "TARI_SUBCON") AS 
  SELECT DISTINCT T.apsa_id, tari_anno, tari_mes, c.clas_clase, 
         trim(c.clas_nombre)||f.fapr_rango as clas_nombre, para_tiptar20012, 
         p.para_nombre, F.para_nombre as factura, t.fapr_codigo, t.tari_subcont,
         tari_cargofijo, tari_cargofijosc, 
         tari_tc, tari_tcsc, tari_tbl, tari_tblsc, tari_tlu, tari_tlusc,
         ROUND(tari_cargovariable,2) as tari_cvariable, 
         ROUND(tari_cargovariablesc,2) as tari_cvariablesc,
         ROUND(tari_trt,2) as tari_trt, ROUND(tari_trtsc,2) as tari_trtsc, 
         ROUND(tari_tdf,2) as tari_tdt, ROUND(tari_tdfsc,2) as tari_tdtsc, 
         ROUND(tari_ttl,2) as tari_ttl, ROUND(tari_ttlsc,2) as tari_ttlsc, 
         ROUND(tari_ta,2) as tari_ta, ROUND(tari_tasc,2) as tari_tasc,
         ROUND((tari_tc + tari_tbl + tari_tlu + tari_trt + tari_tdf + tari_ttl + tari_ta),2) as tari_plena,
         ROUND((tari_tcsc + tari_tblsc + tari_tlusc + tari_trtsc + tari_tdfsc + tari_ttlsc + tari_tasc),2) as tari_subcon
  FROM auco_tarifas T        
       INNER JOIN auco_clasesuso C ON (C.clas_clase = T.clas_clase)
       INNER JOIN auge_parametros P ON (p.para_para = t.para_tiptar20012 AND p.clas_clas = 20012)
       INNER JOIN auge_parametros F ON (F.para_para = t.para_tipfac20014 AND F.clas_clas = 20008)
       INNER JOIN auco_apsaseo A ON (T.apsa_id = A.apsa_id)
       INNER JOIN auco_factproduccion F ON (t.fapr_codigo = f.fapr_codigo AND t.apsa_id = f.apsa_id);
```

#### `TARIFICADOR.AUCO_APSASEO` (TABLA)
```sql
CREATE TABLE "TARIFICADOR"."AUCO_APSASEO" 
   (	"APSA_ID" NUMBER NOT NULL ENABLE, 
	"APSA_NOMAPS" VARCHAR2(30) NOT NULL ENABLE, 
	"APSA_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE, 
	"APSA_PROPIO" NUMBER DEFAULT 1 NOT NULL ENABLE, 
	"APSA_FECHACREACION" DATE DEFAULT sysdate, 
	"USUA_USUA" NUMBER NOT NULL ENABLE, 
	"EMPR_HOMOLOGACION" NUMBER, 
	"APSA_EXISTEET" NUMBER DEFAULT 0 NOT NULL ENABLE, 
	"APSA_TIPOPROGRESIV" NUMBER, 
	"APSA_RESOLUCION" NUMBER, 
	"APSA_VIAT" NUMBER(*,0), 
	"APSA_SOLORELL" NUMBER DEFAULT 0, 
	"APSA_DESCRIPCION" VARCHAR2(200) DEFAULT 0 NOT NULL ENABLE, 
	"APSA_NUAP" VARCHAR2(30), 
	"APSA_IDSUI" VARCHAR2(100), 
	 CONSTRAINT "PK_AUCO_APSASEO" PRIMARY KEY ("APSA_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 COMPUTE STATISTICS 
  STORAGE(INITIAL 65536 NEXT 1048576 MINEXTENTS 1 MAXEXTENTS 2147483645
  PCTINCREASE 0 FREELISTS 1 FREELIST GROUPS 1
  BUFFER_POOL DEFAULT FLASH_CACHE DEFAULT CELL_FLASH_CACHE DEFAULT)
  TABLESPACE "USERS"  ENABLE
   ) SEGMENT CREATION IMMEDIATE 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  STORAGE(INITIAL 65536 NEXT 1048576 MINEXTENTS 1 MAXEXTENTS 2147483645
  PCTINCREASE 0 FREELISTS 1 FREELIST GROUPS 1
  BUFFER_POOL DEFAULT FLASH_CACHE DEFAULT CELL_FLASH_CACHE DEFAULT)
  TABLESPACE "USERS" ;

GRANT UPDATE ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
GRANT SELECT ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
GRANT INSERT ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
GRANT DELETE ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
```

### tablas_base_del_modelo

Tablas físicas subyacentes a las vistas del módulo TARIFAS:

#### `TARIFICADOR.AUCO_TARIFAS` (TABLA)
```sql
CREATE TABLE "TARIFICADOR"."AUCO_TARIFAS" 
   (	"APSA_ID" NUMBER NOT NULL ENABLE, 
	"CLAS_CLASE" NUMBER NOT NULL ENABLE, 
	"TARI_ANNO" NUMBER NOT NULL ENABLE, 
	"TARI_MES" NUMBER NOT NULL ENABLE, 
	"FAPR_CODIGO" NUMBER NOT NULL ENABLE, 
	"PARA_TIPTAR20012" NUMBER NOT NULL ENABLE, 
	"PARA_TIPFAC20014" NUMBER NOT NULL ENABLE, 
	"MULT_MULTI" NUMBER DEFAULT 0 NOT NULL ENABLE, 
	"TARI_COSTOFIJO" NUMBER NOT NULL ENABLE, 
	"TARI_COSTOVARIABLE" NUMBER NOT NULL ENABLE, 
	"TARI_CARGOFIJO" NUMBER NOT NULL ENABLE, 
	"TARI_CARGOFIJOSC" NUMBER NOT NULL ENABLE, 
	"TARI_CARGOVARIABLE" NUMBER NOT NULL ENABLE, 
	"TARI_CARGOVARIABLESC" NUMBER NOT NULL ENABLE, 
	"TARI_CARGOAPV" FLOAT(126) DEFAULT 0, 
	"TARI_CARGOAPVSC" FLOAT(126) DEFAULT 0, 
	"TARI_SUBCONT" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TCSC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TLU" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TLUSC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TBL" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TBLSC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TRT" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TRTSC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TDF" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TDFSC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TTL" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TTLSC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TA" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TASC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TRNA" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TAFNA" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TAFA" FLOAT(126) DEFAULT 0, 
	"TARI_TRA" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TRBL" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TRLU" FLOAT(126) NOT NULL ENABLE, 
	"TARI_TRRA" FLOAT(126) NOT NULL ENABLE, 
	"PARA_UBICACION20016" NUMBER DEFAULT 2 NOT NULL ENABLE, 
	"TARI_CRT" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CDF" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CTL" FLOAT(126) NOT NULL ENABLE, 
	"TARI_VBA" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CP" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CCC" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CLAV" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CLP" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CCEI" FLOAT(126) NOT NULL ENABLE, 
	"TARI_CCEM" FLOAT(126) NOT NULL ENABLE, 
	"TARI_FECHACREACION" DATE DEFAULT sysdate, 
	"USUA_USUA" NUMBER NOT NULL ENABLE, 
	"TARI_QA" FLOAT(126) DEFAULT -1, 
	 CONSTRAINT "PK_AUCO_TARIFAS" PRIMARY KEY ("APSA_ID", "CLAS_CLASE", "TARI_ANNO", "TARI_MES", "FAPR_CODIGO", "PARA_TIPTAR20012", "PARA_TIPFAC20014", "MULT_MULTI", "PARA_UBICACION20016")
  USING INDEX TABLESPACE "USERS" ENABLE
   ) SEGMENT CREATION IMMEDIATE TABLESPACE "USERS";

GRANT SELECT ON "TARIFICADOR"."AUCO_TARIFAS" TO "RELIQ";
```

#### `TARIFICADOR.AUCO_CLASESUSO` (TABLA)
```sql
CREATE TABLE "TARIFICADOR"."AUCO_CLASESUSO" 
   (	"CLAS_CLASE" NUMBER NOT NULL ENABLE, 
	"CLAS_NOMBRE" CHAR(30), 
	"CLAS_DESCRIPCION" CHAR(30), 
	"CLAS_FECHACREACION" DATE DEFAULT sysdate, 
	"USUA_USUA" NUMBER NOT NULL ENABLE, 
	 CONSTRAINT "PK_TAR_CLASESUSO" PRIMARY KEY ("CLAS_CLASE")
  USING INDEX TABLESPACE "USERS" ENABLE
   ) SEGMENT CREATION IMMEDIATE TABLESPACE "USERS";

GRANT SELECT ON "TARIFICADOR"."AUCO_CLASESUSO" TO "RELIQ";
```

#### `TARIFICADOR.AUGE_PARAMETROS` (TABLA)
```sql
CREATE TABLE "TARIFICADOR"."AUGE_PARAMETROS" 
   (	"CLAS_CLAS" NUMBER NOT NULL ENABLE, 
	"PARA_PARA" NUMBER NOT NULL ENABLE, 
	"PARA_NOMBRE" VARCHAR2(50), 
	"PARA_DESCRI" VARCHAR2(255), 
	"PARA_EDITABLE" VARCHAR2(1), 
	"PARA_VALOR1" VARCHAR2(50), 
	"PARA_VALOR2" VARCHAR2(50), 
	"PARA_ESTADO" VARCHAR2(1), 
	"PARA_HOMOLOGACION" NUMBER, 
	 CONSTRAINT "PK_GEN_TPARAMETROS" PRIMARY KEY ("CLAS_CLAS", "PARA_PARA")
  USING INDEX TABLESPACE "USERS" ENABLE
   ) SEGMENT CREATION IMMEDIATE TABLESPACE "USERS";

GRANT UPDATE ON "TARIFICADOR"."AUGE_PARAMETROS" TO "RELIQ";
GRANT SELECT ON "TARIFICADOR"."AUGE_PARAMETROS" TO "RELIQ";
GRANT INSERT ON "TARIFICADOR"."AUGE_PARAMETROS" TO "RELIQ";
GRANT DELETE ON "TARIFICADOR"."AUGE_PARAMETROS" TO "RELIQ";

ALTER TABLE "TARIFICADOR"."AUGE_PARAMETROS" ADD CONSTRAINT "FK_AUGE_PAR_REFERENCE_AUGE_CLA" 
  FOREIGN KEY ("CLAS_CLAS") REFERENCES "TARIFICADOR"."AUGE_CLASES" ("CLAS_CLAS") ENABLE;
```

#### `TARIFICADOR.AUGE_CLASES` (TABLA)
```sql
CREATE TABLE "TARIFICADOR"."AUGE_CLASES" 
   ("CLAS_CLAS" NUMBER NOT NULL ENABLE, 
    "CLAS_NOMBRE" VARCHAR2(50), 
    "CLAS_DESCRIPCION" VARCHAR2(255), 
    "CLAS_EDITABLE" VARCHAR2(1), 
    "CLAS_MODULO" VARCHAR2(6), 
     CONSTRAINT "PK_GEN_TCLASES" PRIMARY KEY ("CLAS_CLAS")
  USING INDEX TABLESPACE "USERS" ENABLE
   ) SEGMENT CREATION IMMEDIATE TABLESPACE "USERS";
```

#### `TARIFICADOR.AUCO_FACTPRODUCCION` (TABLA)
```sql
CREATE TABLE "TARIFICADOR"."AUCO_FACTPRODUCCION" 
   (	"FAPR_CODIGO" NUMBER NOT NULL ENABLE, 
	"FAPR_NOMBRE" CHAR(30), 
	"FAPR_DESCRIPCION" CHAR(300), 
	"FAPR_VALOR" FLOAT(126), 
	"FAPR_FECHACREACION" DATE DEFAULT sysdate, 
	"USUA_USUA" NUMBER NOT NULL ENABLE, 
	"APSA_ID" NUMBER NOT NULL ENABLE, 
	"FAPR_RANGO" CHAR(10) DEFAULT ' ' NOT NULL ENABLE, 
	 CONSTRAINT "PKFAC_PRODUCCION" PRIMARY KEY ("FAPR_CODIGO", "APSA_ID")
  USING INDEX TABLESPACE "USERS" ENABLE
   ) SEGMENT CREATION IMMEDIATE TABLESPACE "USERS";

GRANT UPDATE ON "TARIFICADOR"."AUCO_FACTPRODUCCION" TO "RELIQ";
GRANT SELECT ON "TARIFICADOR"."AUCO_FACTPRODUCCION" TO "RELIQ";
GRANT INSERT ON "TARIFICADOR"."AUCO_FACTPRODUCCION" TO "RELIQ";
GRANT DELETE ON "TARIFICADOR"."AUCO_FACTPRODUCCION" TO "RELIQ";

COMMENT ON TABLE TARIFICADOR.AUCO_FACTPRODUCCION IS 'Valores para los factores de produccion Fu para cada tipo de suscriptor, donde los factores F1 a F6 corresponden respectivamente a los estratos 1 a 6 residenciales; el factor f7 se refiere a PP y el F8 a inmuebles desocupados';
```

### observaciones_ddl
- `VAUCO_TARIFA4` y `VAUCO_TARDETALLE` son vistas (`FORCE VIEW`) sobre `AUCO_TARIFAS`, no tablas físicas.
- `VAUCO_TARIFA4` filtra por `fapr_codigo = 4`, `para_tiptar20012 = 1`, `para_ubicacion20016 = 2`, `para_tipfac20014 = 2`.
- `VAUCO_TARDETALLE` realiza múltiples joins (`auco_clasesuso`, `auge_parametros` x2, `auco_apsaseo`, `auco_factproduccion`) y cálculos de redondeo.
- `AUCO_APSASEO` es tabla física compartida con módulo AUTH (ya documentada en `docs/db/ddl-registro.md#modulo-auth`).
- `AUCO_TARIFAS` tiene PK compuesta por 9 columnas y 43+ campos de tipo `FLOAT(126)`/`NUMBER`.
- `AUGE_PARAMETROS` tiene FK a `TARIFICADOR.AUGE_CLASES` (objeto no proporcionado en este alcance).

Referencia cruzada global DDL: `docs/db/ddl-registro.md`.

## semillas_minimas_db

- No se observaron scripts de seed en el alcance revisado.
- Semillas mínimas inferidas por dependencia de queries (marcadas `pendiente_validacion`):
  - `vauco_tarifa4`: al menos una fila por combinación `apsa_id`, `tari_anno`, `tari_mes`.
  - `vauco_tardetalle`: al menos una fila por combinación `APSA_ID`, `TARI_ANNO`, `TARI_MES`.
  - `auco_apsaseo`: fila relacionada por `apsa_id` para resolver `A.apsa_nomaps` en join.

## plan_pruebas_r

| ID | Verificación requerida | Evidencia esperada | Estado |
|---|---|---|---|
| R-TAR-01 | Existen los 4 endpoints en `routes.js` con middleware auth | `router.post(..., [authJwt.verificarToken], ...)` | `cumple` |
| R-TAR-02 | Cada endpoint tiene trazabilidad Actor → UI → API → Lógica → DB | Secciones F-TARIFAS-01..04 completas | `cumple` |
| R-TAR-03 | Contratos SQL se documentan AS-IS sin normalizar | Bloque `contratos_as_is_no_normalizar` | `cumple` |
| R-TAR-04 | `/consultageneral` queda explicitado sin consumidor FE | Registro en `pendiente_validacion` + catálogo | `cumple` |
| R-TAR-05 | DDL por objeto con estado `pendiente/recibido/validado` | `registro_ddl_modulo` con 3 objetos | `cumple` |

## observado_en_codigo

- El módulo se monta en `back-tarificador/src/app.js` bajo `/api/v1/tarifas`.
- Las 4 rutas usan `authJwt.verificarToken`.
- El controlador usa `sql = ...` sin `let/const` en las 4 funciones.
- `TarifasService.getTarxCos()` y `getTarxCosGeneral()` redondean campos numéricos a 6 decimales en FE.
- `Calculo.vue#getTarifas` consume `getchartTarifas()` y luego `getResumen()` (este último fuera del módulo TARIFAS).
- Rutas FE relacionadas (`/tarifas`, `/gentarifas`, `/calculo`) están con `meta.requiresAuth: true` en `router/index.js`.

## pendiente_validacion

- `[in_scope_endpoint]` `POST /api/v1/tarifas/consultageneral` sin consumidor FE observado en `front-tarificador/src`.
- `[in_scope_endpoint]` En `consultageneral`, SQL usa placeholders `:2/:3` con bind `[anno, mes]` (patrón no convencional, documentado AS-IS).
- `[in_scope_endpoint]` En `tarxcomgeneral`, la ruta recibe `aps` pero el SQL no lo usa; confirmar si es intencional.
- `[dependencia_externa]` `auco_apsaseo` pertenece al dominio APS (ownership funcional fuera de TARIFAS).

## riesgos_y_decisiones

### observado_as_is
- Riesgo de acople a esquema por uso de `SELECT *`.
- Riesgo de mantenimiento por SQL con placeholders no convencionales en `consultageneral`.
- Riesgo de cobertura funcional incompleta por ausencia de consumidor FE para `/consultageneral`.

### decision_to_be
- Mantener documentación literal AS-IS en fase 1; no corregir SQL ni contratos.
- Dejar `/consultageneral` y DDL físico como entradas obligatorias de validación en fase siguiente.
- Mantener referencia explícita de AUTH y APS para evitar pérdida de trazabilidad inter-módulo.

### riesgo_migracion
- Migrar sin validar DDL puede romper paridad de contratos (shape dependiente de DB).
- Reemplazar `SELECT *` en etapas futuras requerirá baseline de columnas por endpoint.
- Si `/consultageneral` tiene consumidor externo no documentado, existe riesgo de regresión al migrar sin inventario completo.

## desviaciones_formales

- `consultageneral` declara parámetros `(aps, anno, mes)` pero usa SQL sin `aps`.
- En `consultageneral`, placeholders de SQL son `:2` y `:3` con bind `[anno, mes]`.
- En `controller.js`, variables `sql` se asignan sin declaración local (`let/const`).

## definicion_de_cierre

- [x] Documento `tarifas-core.md` creado con secciones obligatorias.
- [x] 4 endpoints documentados con trazabilidad completa Actor → UI → API → Lógica → DB.
- [x] `matriz_auth_rutas` incluida y alineada con `authJwt.verificarToken`.
- [x] `contratos_as_is_no_normalizar` incluye SQL y binds AS-IS (sin corregir).
- [x] `registro_ddl_modulo` incluye `vauco_tarifa4`, `vauco_tardetalle`, `auco_apsaseo` con estados.
- [x] Separación explícita entre `observado_en_codigo` y `pendiente_validacion`.
- [x] Dependencias AUTH/APS referenciadas.

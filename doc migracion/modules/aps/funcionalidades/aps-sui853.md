# modulo

- nombre: `aps-sui853`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/sui853/configuracion/{routes.js,controller.js}`
  - Frontend: `front-tarificador/src/sui853/views/configuracion/{apsEmpresa.vue,apsDocumentos.vue,residuosGenerados.vue,informesGenerados.vue,informesGeneradosMes.vue}`, `front-tarificador/src/sui853/services/{configuracionService.js,cvnaService.js}`
  - DB: `SUI.VCFGAPSEMPRESA`, `SUI.VCFGAPSDOCUMENTO`, `SUI.TCFG_APS`

## actores

- **Usuario SUI853 (configuración)**: consulta grillas APS Empresa y APS Documentos.
- **Usuario SUI853 (cargues de configuración)**: solicita catálogo APS (`tcfgAps`) para seleccionar APS en flujos de cargue.

## funcionalidades

### F-APS-SUI-01 — Consulta APS Empresa

- flujo:
  1. Usuario navega a `/apsEmpresa`.
  2. Vista `apsEmpresa.vue` ejecuta `operacionesService.vcfgapsempresa()` en `mounted()`.
  3. FE invoca `POST /api/v1/sui853Configuracion/vcfgapsempresa`.
  4. Backend ejecuta `SELECT * FROM SUI.VCFGAPSEMPRESA` y retorna `{status,data}`.
  5. FE renderiza tabla con columnas observadas (`TCFG_APS_ID`, `NOMAPS`, `NUAP`, `EMPRESA`, `CODSUI`, `DEPARTAMENTO`, `MUNICIPIO`).
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario SUI853 configuración → `sui853/views/configuracion/apsEmpresa.vue` + `sui853/services/configuracionService.js#vcfgapsempresa` → `POST /api/v1/sui853Configuracion/vcfgapsempresa` → `sui853/configuracion/controller.vcfgapsempresa` → `SUI.VCFGAPSEMPRESA`
- estado: `implementado_as_is`

### F-APS-SUI-02 — Consulta APS Documentos

- flujo:
  1. Usuario navega a `/apsDocumentos`.
  2. Vista `apsDocumentos.vue` ejecuta `operacionesService.vcfgapsdocumento()` en `mounted()`.
  3. FE invoca `POST /api/v1/sui853Configuracion/vcfgapsdocumento`.
  4. Backend ejecuta `SELECT * FROM SUI.VCFGAPSDOCUMENTO` y retorna `{status,data}`.
  5. FE renderiza columnas observadas (`NOMAPS`, `SEGMENTO`, `CODFORMATO`, `NOMFORMATO`).
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario SUI853 configuración → `sui853/views/configuracion/apsDocumentos.vue` + `sui853/services/configuracionService.js#vcfgapsdocumento` → `POST /api/v1/sui853Configuracion/vcfgapsdocumento` → `sui853/configuracion/controller.vcfgapsdocumento` → `SUI.VCFGAPSDOCUMENTO`
- estado: `implementado_as_is`

### F-APS-SUI-03 — Catálogo APS para formularios/cargues SUI853

- flujo:
  1. Vistas de configuración SUI853 (`residuosGenerados.vue`, `informesGenerados.vue`, `informesGeneradosMes.vue`) llaman `tcfgAps()` al inicializar selector APS.
  2. FE invoca `POST /api/v1/sui853Configuracion/tcfgAps`.
  3. Backend ejecuta `SELECT TCFG_APS_ID, NOMBRE_APS FROM SUI.TCFG_APS ORDER BY NOMBRE_APS`.
  4. FE mapea respuesta a opciones `{label: NOMBRE_APS, value: TCFG_APS_ID}`.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario SUI853 configuración → `sui853/views/configuracion/residuosGenerados.vue` + `sui853/services/cvnaService.js#tcfgAps` → `POST /api/v1/sui853Configuracion/tcfgAps` → `sui853/configuracion/controller.tcfgAps` → `SUI.TCFG_APS`
- estado: `implementado_as_is`

## endpoints_catalog

Base: `/api/v1/sui853Configuracion`

| Método | Path | Auth requerida | Request ejemplo | Response OK observada | Errores esperados observados | Observaciones AS-IS |
|---|---|---|---|---|---|---|
| POST | `/vcfgapsempresa` | No middleware en ruta | `{}` | `res.send({status:200,data:[...]})` | `res.send({status:500,data:error})` | FE envía `x-access-token` (`jwtToken`) pero ruta no valida token |
| POST | `/vcfgapsdocumento` | No middleware en ruta | `{}` | `res.send({status:200,data:[...]})` | `res.send({status:500,data:error})` | FE consume `response.data.data` |
| POST | `/tcfgAps` | No middleware en ruta | `{}` | `res.status(out.status).send(out)` con `out={status:200,data:[...]}` | `status 500` con `{status:500,data:error}` | Resultado ordenado por `NOMBRE_APS` |

## vistas_sin_ddl

- `SUI.VCFGAPSEMPRESA`
  - Uso observado: consulta completa `SELECT *`.
  - Campos consumidos en FE: `TCFG_APS_ID`, `NOMAPS`, `NUAP`, `EMPRESA`, `CODSUI`, `DEPARTAMENTO`, `MUNICIPIO`.
  - Estado DDL: `pendiente`.
- `SUI.VCFGAPSDOCUMENTO`
  - Uso observado: consulta completa `SELECT *`.
  - Campos consumidos en FE: `NOMAPS`, `SEGMENTO`, `CODFORMATO`, `NOMFORMATO`.
  - Estado DDL: `pendiente`.

## registro_ddl_modulo

### resumen_estado
- `SUI.VCFGAPSEMPRESA`: `pendiente`
- `SUI.VCFGAPSDOCUMENTO`: `pendiente`
- `SUI.TCFG_APS`: `recibido`

### ddl_recibido

#### SUI.TCFG_APS
- estado: `recibido`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "SUI"."TCFG_APS" 
   (	"TCFG_APS_ID" NUMBER(18,0) NOT NULL ENABLE, 
	"TCFG_EMPRESA_ID" NUMBER(18,0) NOT NULL ENABLE, 
	"NUAP" VARCHAR2(50), 
	"NOMBRE_APS" VARCHAR2(200) NOT NULL ENABLE, 
	"MUNICIPIO" VARCHAR2(100) NOT NULL ENABLE, 
	"DEPARTAMENTO" VARCHAR2(100) NOT NULL ENABLE, 
	"ACTO_NUMERO" VARCHAR2(60), 
	"ACTO_FECHA" DATE, 
	"TCAT_ESTADOREGISTRO_CODIGO" VARCHAR2(20) NOT NULL ENABLE, 
	"VEAU_FECINI" DATE NOT NULL ENABLE, 
	"VEAU_FECFIN" DATE, 
	"CODDEPTO" VARCHAR2(3), 
	"CODMPIO" VARCHAR2(3), 
	 CONSTRAINT "CK_TCFG_APS__ID_POS" CHECK (TCFG_APS_ID > 0) ENABLE, 
	 CONSTRAINT "CK_TCFG_APS__FECFIN_GE_FECINI" CHECK (VEAU_FECFIN IS NULL OR VEAU_FECFIN >= VEAU_FECINI) ENABLE, 
	 CONSTRAINT "PK_TCFG_APS" PRIMARY KEY ("TCFG_APS_ID"),
	 CONSTRAINT "UK_TCFG_APS__NUAP" UNIQUE ("NUAP"),
	 CONSTRAINT "UK_TCFG_APS__EMPRESA_NOMBRE" UNIQUE ("TCFG_EMPRESA_ID", "NOMBRE_APS"),
	 CONSTRAINT "FK_TCFG_APS__EMPRESA" FOREIGN KEY ("TCFG_EMPRESA_ID") REFERENCES "SUI"."TCFG_EMPRESA" ("TCFG_EMPRESA_ID") ENABLE,
	 CONSTRAINT "FK_TCFG_APS__EST" FOREIGN KEY ("TCAT_ESTADOREGISTRO_CODIGO") REFERENCES "SUI"."TCAT_ESTADOREGISTRO" ("CODIGO") ENABLE
   );

CREATE INDEX "SUI"."IDX_TCFG_APS__EMPRESA" ON "SUI"."TCFG_APS" ("TCFG_EMPRESA_ID");
CREATE INDEX "SUI"."IDX_TCFG_APS__MUNICIPIO" ON "SUI"."TCFG_APS" ("MUNICIPIO");
```

### ddl_pendiente
- `pendiente_ddl: SUI.VCFGAPSEMPRESA` (vista consultada por backend; sin script DDL localizado en repo)
- `pendiente_ddl: SUI.VCFGAPSDOCUMENTO` (vista consultada por backend; sin script DDL localizado en repo)

## observado_en_codigo

- Router FE define rutas `/apsEmpresa` y `/apsDocumentos` con vistas dedicadas.
- Menú FE referencia ambos accesos (`MenuService.js`).
- Servicios FE de SUI853 usan `jwtToken` en header `x-access-token`.
- Rutas backend `vcfgapsempresa`, `vcfgapsdocumento`, `tcfgAps` no aplican middleware `authJwt` en `routes.js`.
- `tcfgAps` retorna solo `TCFG_APS_ID` y `NOMBRE_APS` desde `SUI.TCFG_APS`.

## pendiente_validacion

- Validar si ausencia de middleware auth en endpoints APS de SUI853 es decisión funcional o deuda técnica.
- DDL de `SUI.VCFGAPSEMPRESA`, `SUI.VCFGAPSDOCUMENTO` no encontrado en repositorio analizado.

## validacion_cruzada_facetas

| Eje | Faceta contraste | Resultado | Evidencia |
|---|---|---|---|
| Límite SUI853 vs Auth | `aps-permisos` | `consistente` | Este documento solo cubre `/api/v1/sui853Configuracion/*`; no usa rutas `/api/v1/auth/*` |
| Límite SUI853 vs APS configuración | `aps-configuracion` | `consistente` | `aps-configuracion` cubre `/api/v1/aps/*`; aquí se mantienen objetos SUI (`VCFG*`, `TCFG_APS`) |
| Política de DDL | `aps-configuracion` + `aps-permisos` | `consistente` | Estado de objetos DB se mantiene por archivo con `pendiente/recibido/validado` |
| Política de riesgos | `aps-configuracion` + `aps-permisos` | `consistente` | Ambigüedades se registran en `pendiente_validacion` y no en `observado_en_codigo` |

## checkpoints_g1_g5

| Gate | Estado | Evidencia observada |
|---|---|---|
| G1 Trazabilidad completa | `cumple` | F-APS-SUI-01..03 incluyen Actor → UI → API → Lógica → DB |
| G2 Evidencia verificable | `cumple` | Referencias a `apsEmpresa.vue`, `apsDocumentos.vue`, `cvnaService.js`, `configuracion/{routes,controller}.js` |
| G3 DDL en archivo | `cumple` | `registro_ddl_modulo` y `vistas_sin_ddl` documentan estado `pendiente` con fuente |
| G4 Riesgos aislados | `cumple` | Falta de middleware y ausencia de scripts DDL quedaron en `pendiente_validacion` |
| G5 Dependencias explícitas | `cumple` | `validacion_cruzada_facetas` define límites APS/Auth/SUI para esta faceta |

## checklist_dod_fase1

- [x] Paridad funcional AS-IS documentada sin inferir DDL no observado
- [x] Trazabilidad completa Actor → UI → API → Lógica → DB
- [x] DDL y vistas del módulo en este archivo con estado explícito
- [x] Riesgos separados en `pendiente_validacion`
- [x] Consistencia cruzada validada contra `aps-configuracion` y `aps-permisos`
- [x] Gates G1–G5 en `cumple`

**handoff_siguiente_fase**: `sdd-verify` (confirmar que pendientes SUI no bloquean publicación AS-IS).

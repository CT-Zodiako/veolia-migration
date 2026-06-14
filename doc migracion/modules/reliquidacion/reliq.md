---
title: "Subsistema: Reliquidación"
description: "Documentación AS-IS completa del subsistema de reliquidación (reliq)"
phase: "Reliquidación"
module: "reliq"
version: "1.0.0"
date: "2026-04-30"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/reliq/routes.js
  - back-tarificador/src/modules/reliq/controller.js
  - back-tarificador/src/modules/reliq/cargue/routes.js
  - back-tarificador/src/modules/reliq/cargue/controller.js
  - back-tarificador/src/modules/reliq/tarificador/routes.js
  - back-tarificador/src/modules/reliq/tarificador/controller.js
  - front-tarificador/src/reliq/views/Crear.vue
  - front-tarificador/src/reliq/views/Cargue.vue
  - front-tarificador/src/reliq/views/CompararCosto.vue
  - front-tarificador/src/reliq/views/CompararTarifas.vue
  - front-tarificador/src/reliq/views/tarificador/Tarificador.vue
  - front-tarificador/src/reliq/services/ReleqService.js
  - front-tarificador/src/reliq/services/cargueReliqService.js
  - front-tarificador/src/reliq/services/tarificadoService.js
  - front-tarificador/src/router/index.js
  - front-tarificador/src/service/MenuService.js
---

# Subsistema: Reliquidación (reliq)

## 1. Resumen Ejecutivo
`reliq` implementa un flujo dedicado de reliquidación con 3 dominios backend (`reliqCrear`, `reliqCargue`, `reliqTarificador`) y frontend propio en `front-tarificador/src/reliq/**`.

- **Cobertura API**: 26 endpoints (5 + 14 + 7).
- **Cobertura auth real**: solo 2 endpoints protegidos en backend.
- **Núcleo Oracle**: `RELIQ.PK_RELI`, `RELIQ.PK_RELIQUIDAR`, `RELIQ.PK_JSONRESUMEN`, `RELIQ.PKREI_UPDTARIFADOR`, `RELIQ.PKREI_APLICARRELIQUIDA`.
- **Estado AS-IS**: hay inconsistencias de contrato route/controller y deuda técnica crítica documentada en sección 9.

---

## 2. Flujo Funcional Principal
1. **Crear reliquidación**: UI `Crear.vue`/`ReliqCrear.vue` llama `reliqCrear/crear`.
2. **Extracción inicial**: backend inserta en `RELQRELIQUIDA`, `FILTRO_COMPARACOSTO` y ejecuta `PK_RELI.freli_extraccion`.
3. **Cargue/ajustes**: UI `Cargue.vue` ejecuta `compararCostosCargue` y habilita edición por bloques (`Usuarios`, `Empresa`, `APS`, `Relleno`, `Adicional`).
4. **Comparación**: UI `CompararCosto.vue` y `CompararTarifas.vue` consulta vistas `VREL_COMPARACOSTOS` y `VREL_COMPARATARIFACOBRO`.
5. **Previsualización y aprobación**: UI `Tarificador.vue` consume `resumen*`, valida estado y ejecuta `aprobarReliquidacion`.

Trazabilidad FE→API→SQL→DB está detallada en secciones 3, 7 y 8.

---

## 3. API Backend

### 3.1 Cobertura de autenticación

| Endpoint | Auth backend |
|---|---|
| `POST /reliqTarificador/aprobarReliquidacion` | Sí (`authJwt.verificarToken`) |
| `POST /reliqTarificador/estadoReliquidacion` | Sí (`authJwt.verificarToken`) |
| 24 endpoints restantes | No |

Evidencia: `back-tarificador/src/modules/reliq/tarificador/routes.js:33,40`; ausencia de middleware en `reliq/routes.js` y `reliq/cargue/routes.js`.

### 3.2 Catálogo completo de endpoints (26)

> Nota de contrato: en `reliqCrear` hay mismatch route/controller para `crear`, `update`, `delete` porque route responde `resultado.response` pero controller retorna `data`.

#### A) Dominio `reliqCrear` (5)

**1) POST `/reliqCrear/crear`**  
Refs: route `reliq/routes.js:6-30`, controller `reliq/controller.js:10-183`
- Body: `apsaid, relqnombre, relqdescrip, relqdesde, relqhasta, relqususolicita, relqestado, relqidatt, relqusuaprueba`
- SQL/PLSQL:
```sql
INSERT INTO RELIQ.RELQRELIQUIDA
(RELQID, APSAID, RELQNOMBRE, RELQDESCRIP, RELQDESDE, RELQHASTA, RELQUSUSOLICITA, RELQESTADO, RELQFECHA, RELQIDATT, RELQUSUAPRUEBA)
VALUES(RELIQ.SRELQRELIQUIDA.NEXTVAL, :1, :2, :3, :4, :5, :6, :7, SYSDATE, :8, :9)
```
```sql
SELECT RELQID FROM RELIQ.RELQRELIQUIDA ... ORDER BY RELQID DESC
```
```sql
INSERT INTO RELIQ.FILTRO_COMPARACOSTO
(RELI_ID, APSA_ID, ANNO_DESDE, MES_DESDE, ANNO_HASTA, MES_HASTA)
VALUES(:1, :2, :3, :4, :5, :6)
```
```sql
BEGIN :ret := RELIQ.PK_RELI.freli_extraccion(:p_apsaid, :p_relqid, :p_usuario, :p_desde, :p_hasta); END;
-- fallback:
BEGIN RELIQ.PK_RELI.freli_extraccion(:p_apsaid,:p_relqid,:p_usuario,:p_desde,:p_hasta,:p_resultado); END;
```
- Response real controller: `{status, data, responseRaw, responseText}` (`controller.js:166-174`)
- Response route: `res.send(resultado.response)` (`routes.js:29`) ⚠️

**2) POST `/reliqCrear/getReliquidaciones`**  
Refs: `reliq/routes.js:32-35`, `reliq/controller.js:187-221`
```sql
SELECT R.RELQID, R.APSAID, AA.APSA_NOMAPS, ...
FROM RELIQ.RELQRELIQUIDA R
JOIN TARIFICADOR.AUCO_APSASEO AA ON (R.APSAID = AA.APSA_ID)
JOIN TARIFICADOR.AUGE_SISUSUARIO AS2 ON (R.RELQUSUSOLICITA = AS2.SISU_ID)
JOIN TARIFICADOR.AUGE_SISUSUARIO AS3 ON (R.RELQUSUAPRUEBA = AS3.SISU_ID)
WHERE R.RELQESTADO IN ('1','2')
ORDER BY R.RELQID DESC
```
- Response: `{status, response:[...]}`.

**3) POST `/reliqCrear/getReliquidacionByAps`**  
Refs: `reliq/routes.js:36-40`, `reliq/controller.js:222-244`
```sql
SELECT * FROM RELIQ.RELQRELIQUIDA
WHERE APSAID = :1 AND RELQESTADO IN ('1','2')
ORDER BY RELQID DESC
```
- Body: `{apsaid}`
- Response: `{status, response:[...]}`.

**4) POST `/reliqCrear/update`**  
Refs: `reliq/routes.js:42-46`, `reliq/controller.js:246-300`
```sql
UPDATE RELIQ.RELQRELIQUIDA
SET RELQNOMBRE=:1, RELQDESCRIP=:2, RELQDESDE=:3, RELQHASTA=:4,
    RELQUSUSOLICITA=:5, RELQESTADO=:6, RELQFECHA=SYSDATE,
    RELQIDATT=:7, RELQUSUAPRUEBA=:8
WHERE RELQID=:9 AND APSAID=:10
```
- Body: `relq* + relqid + apsaid`
- Response controller: `{status, data}`; route devuelve `resultado.response` ⚠️.

**5) POST `/reliqCrear/delete`**  
Refs: `reliq/routes.js:48-52`, `reliq/controller.js:302-320`
```sql
DELETE FROM RELIQ.RELQRELIQUIDA WHERE RELQID=:1
```
- Body: `{relqid}`
- Response controller: `{status, data}`; route devuelve `resultado.response` ⚠️.

#### B) Dominio `reliqCargue` (14)
Routes: `reliq/cargue/routes.js:6-100`

**6) POST `/reliqCargue/resumenCompararTarifas`** (`controller.js:8-36`)
```sql
SELECT reliq.PK_JSONRESUMEN.freli_jsongral(:1,:2,:3,:4) AS json_trna FROM dual
```
Body: `{reliq, aps, anno, mes}` → Response: `{ok:true, result:JSON}`.

**7) POST `/reliqCargue/compararCostosCargue`** (`39-141`)
```sql
BEGIN :ret := RELIQ.PK_RELIQUIDAR.freli_reliquidar(:p_reliq,:p_aps); END;
BEGIN RELIQ.PK_RELIQUIDAR.freli_reliquidar(:p_reliq,:p_aps,:p_out); END;
```
Body: `{reliq, aps}` → Response: `{ok:true, result: outText}`.

**8) POST `/reliqCargue/compararTarifas`** (`143-168`)
```sql
SELECT * FROM reliq.vrel_comparatarifacobro WHERE reli = :1
```
Body: `{reliq}` → 200 array / 404 mensaje.

**9) POST `/reliqCargue/compararCostos`** (`169-245`)
```sql
SELECT CODRELIQ, APSNOM, COSTANNO, COSTMES, ...
FROM RELIQ.VREL_COMPARACOSTOS WHERE CODRELIQ = :1
```
Body: `{reliq}` → 200 array / 404 mensaje.

**10) POST `/reliqCargue/getReliInfoUsuarios`** (`247-277`)
```sql
SELECT ri.IUAE_ID, ri.RELI_ID, ri.APSA_ID, ...
FROM RELIQ.RELI_INFUSUAPSEMPRDIVI ri
JOIN TARIFICADOR.AUCO_CLASESUSO ac ON (...)
JOIN TARIFICADOR.AUGE_PARAMETROS ap ON (...)
JOIN TARIFICADOR.AUCO_FACTPRODUCCION af ON (...)
WHERE RELI_ID = :1
```
Body: `{idReliq}`.

**11) POST `/reliqCargue/getResumenEmpresa`** (`279-298`)
```sql
SELECT RI.*, AE.EMPR_NOMBRE
FROM RELIQ.RELI_INFOEMPRDIVI RI
INNER JOIN TARIFICADOR.AUGE_EMPRESAS AE ON (RI.EMPR_EMPR = AE.EMPR_EMPR)
WHERE RI.RELI_ID = :1
```

**12) POST `/reliqCargue/getResumenAPS`** (`299-318`)
```sql
SELECT RI.*, AE.EMPR_NOMBRE
FROM RELIQ.RELI_INFOAPSEMPRDIVI RI
INNER JOIN TARIFICADOR.AUGE_EMPRESAS AE ON (RI.EMPR_EMPR = AE.EMPR_EMPR)
WHERE RI.RELI_ID = :1
```

**13) POST `/reliqCargue/getResumenRelleno`** (`319-338`)
```sql
SELECT * FROM RELIQ.RELI_INFOAPSRELLENO WHERE RELI_ID = :1
```

**14) POST `/reliqCargue/getReliInfoAdicional`** (`339-366`)
```sql
SELECT CEAD_ID, RELI_ID, CEAD_ANNO, CEAD_MES, CEAD_CDF, CEAD_CTL
FROM RELIQ.RELI_INFOADICIONAL WHERE RELI_ID = :1
```

**15) POST `/reliqCargue/updateReliInfoUsuarios`** (`367-422`)
```sql
UPDATE RELIQ.RELI_INFUSUAPSEMPRDIVI
SET DIVI_DIVI=:1, FAPR_CODIGO=:2, CLAS_CLASEUSO=:3, PARA_TIPTAR20012=:4,
    IUAE_CANTIDAD=:5, IUAE_TONELADAS=:6, PARA_UBICACION20016=:7,
    PARA_TIPFAC20014=:8, USUA_USUA=:9
WHERE IUAE_ID=:10 AND RELI_ID=:11
```
Body: `{data:[...]}`; route fuerza usuario `9` (`routes.js:70`).

**16) POST `/reliqCargue/updateResumenEmpresa`** (`423-487`)
```sql
UPDATE RELIQ.RELI_INFOEMPRDIVI
SET INED_CBLJ=:1, INED_LBLJ=:2, INED_N=:3, INED_M3AGUA=:4, INED_CP=:5,
    INED_M2CCJ=:6, INED_M2LAVJ=:7, INED_TIJ=:8, INED_KLPJ=:9, INED_TMJ=:10,
    INED_CLAVJ=:11, INED_QRTJ=:12, INED_QRSJ=:13, USUA_USUA=:14
WHERE INED_ID=:15 AND RELI_ID=:16
```

**17) POST `/reliqCargue/updateResumenAPS`** (`488-577`)
```sql
UPDATE RELIQ.RELI_INFOAPSEMPRDIVI
SET DIVI_DIVI=:1, IAED_QRTZ=:2, IAED_CPE=:3, IAED_T=:4, IAED_VACRTABC=:5,
    IAED_VACRT=:6, IAED_CRTZ=:6, IAED_QBL=:7, IAED_QLU=:8, IAED_QR=:9,
    IAED_TAFA=:10, IAED_ND=:11, IAED_NA=:12, IAED_QNA=:13, IAED_TAFNA=:14,
    IAED_QA=:15, IAED_APROVECHA=:16, IAED_QALMACEN=:17, IAED_CPEET=:18,
    IAED_QRTET=:19, IAED_CRTCOMP=:20, IAED_CDFCOMP=:21, IAED_QRSCOMP=:22,
    IAED_NAA=:23, IAED_NDA=:24, USUA_USUA=:25
WHERE IAED_ID=:26 AND RELI_ID=:27
```

**18) POST `/reliqCargue/updateResumenRellno`** (`578-640`)
```sql
UPDATE RELIQ.RELI_INFOAPSRELLENO
SET IARE_QRS=:1, IARE_CDFK=:2, IARE_VACDFABC=:3, IARE_VACDF=:4, IARE_VL=:5,
    IARE_CTMLX=:6, IARE_CTLK=:7, IARE_VACTLABC=:8, IARE_VACTL=:9,
    IARE_ESCENARIO=:10, IARE_C=:11, USUA_USUA=:12
WHERE IARE_ID=:13 AND RELI_ID=:14
```

**19) POST `/reliqCargue/updateResumenAdicional`** (`641-683` y redefinido `684-726`)
```sql
UPDATE RELIQ.RELI_INFOADICIONAL
SET CEAD_CDF=:1, CEAD_CTL=:2, USUA_USUA=:3
WHERE CEAD_ID=:4 AND RELI_ID=:5
```
Nota: segunda definición sobrescribe la primera.

#### C) Dominio `reliqTarificador` (7)
Routes: `reliq/tarificador/routes.js:8-44`

**20) POST `/reliqTarificador/resumenUsuarios`** (`controller.js:19-46`)
```sql
SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_iuae(:1) AS resultado FROM dual
```

**21) POST `/reliqTarificador/resumenEmpresa`** (`47-74`)
```sql
SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_ined(:1) AS resultado FROM dual
```

**22) POST `/reliqTarificador/resumenAdicional`** (`75-102`)
```sql
SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_cead(:1) AS resultado FROM dual
```

**23) POST `/reliqTarificador/resumenRelleno`** (`103-130`)
```sql
SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_iare(:1) AS resultado FROM dual
```

**24) POST `/reliqTarificador/resumenAPS`** (`131-158`)
```sql
SELECT reliq.pkrei_updtarifador.fnrei_previsualizar(:1) AS resultado FROM dual
```

**25) POST `/reliqTarificador/aprobarReliquidacion`** (auth) (`160-239`)
Validación previa:
```sql
SELECT RELQESTADO FROM RELIQ.RELQRELIQUIDA WHERE RELQID = :1
```
Aplicación:
```sql
BEGIN
  :resultado := reliq.pkrei_aplicarreliquida.fnrei_aplicartodo(
    pint_reliid => :reliq,
    pint_usuusua => :usuario
  );
END;
```

**26) POST `/reliqTarificador/estadoReliquidacion`** (auth) (`241-273`)
```sql
SELECT RELQESTADO FROM RELIQ.RELQRELIQUIDA WHERE RELQID = :1
```
Response: `{ok, estado, puedeAprobar}`.

---

## 4. Dependencias Oracle (SQL/PLSQL)

| Objeto | Tipo | Evidencia | Estado |
|---|---|---|---|
| `RELIQ.PK_RELI.freli_extraccion` | function/procedure | `reliq/controller.js:106-109,136-140` | Confirmado por llamada |
| `RELIQ.PK_RELIQUIDAR.freli_reliquidar` | function/procedure | `reliq/cargue/controller.js:56,91-95` | Confirmado por llamada |
| `RELIQ.PK_JSONRESUMEN.freli_jsongral` | function | `reliq/cargue/controller.js:11-13` | Confirmado por llamada |
| `RELIQ.PKREI_UPDTARIFADOR.fnrei_previsualizar*` | functions | `reliq/tarificador/controller.js:21,49,77,105,133` | Confirmado por llamada |
| `RELIQ.PKREI_APLICARRELIQUIDA.fnrei_aplicartodo` | function | `reliq/tarificador/controller.js:185-188` | Confirmado por llamada |

---

## 5. Base de Datos (inventario completo)

### 5.1 Objetos RELIQ consumidos por el módulo

| Objeto | Tipo | Uso | Evidencia | DDL |
|---|---|---|---|---|
| `RELIQ.RELQRELIQUIDA` | Tabla | Alta/lista/update/delete y estado | `reliq/controller.js:24-27,47-58,189-207,224-230,260-272,305-307`; `tarificador/controller.js:8-10` | **Inferido** (sin `CREATE TABLE` en repo) |
| `RELIQ.FILTRO_COMPARACOSTO` | Tabla | Filtro de periodo para comparación | `reliq/controller.js:88-91` | **Inferido** |
| `RELIQ.RELI_INFUSUAPSEMPRDIVI` | Tabla | Consulta y update resumen usuario | `cargue/controller.js:255,374-386` | **Inferido** |
| `RELIQ.RELI_INFOEMPRDIVI` | Tabla | Consulta y update resumen empresa | `cargue/controller.js:282,429-446` | **Inferido** |
| `RELIQ.RELI_INFOAPSEMPRDIVI` | Tabla | Consulta y update resumen APS | `cargue/controller.js:302,495-524` | **Inferido** |
| `RELIQ.RELI_INFOAPSRELLENO` | Tabla | Consulta y update resumen relleno | `cargue/controller.js:322,585-601` | **Inferido** |
| `RELIQ.RELI_INFOADICIONAL` | Tabla | Consulta y update adicional | `cargue/controller.js:350,647-653` | **Inferido** |
| `RELIQ.VREL_COMPARATARIFACOBRO` | Vista | Comparación de tarifas | `cargue/controller.js:146` | **Inferido** |
| `RELIQ.VREL_COMPARACOSTOS` | Vista | Comparación de costos | `cargue/controller.js:222-223` | **Inferido** |
| `RELIQ.SRELQRELIQUIDA` | Secuencia | Generación PK cabecera | `reliq/controller.js:26` | **Inferido** |

### 5.2 Joins/objetos TARIFICADOR referenciados

| Objeto | Tipo | Evidencia consumo en reliq | DDL en repo |
|---|---|---|---|
| `TARIFICADOR.AUCO_APSASEO` | Tabla | `reliq/controller.js:198-199` | Sí (`docs/db/ddl-registro.md:357`) |
| `TARIFICADOR.AUGE_SISUSUARIO` | Tabla | `reliq/controller.js:200-203` | Sí (`back-tarificador/DataBase/Scripts/AUGE_SISUSUARIO.sql:3`) |
| `TARIFICADOR.AUCO_CLASESUSO` | Tabla | `cargue/controller.js:256-257` | Sí (`docs/db/ddl-registro.md:202`) |
| `TARIFICADOR.AUGE_PARAMETROS` | Tabla | `cargue/controller.js:258-259` | Sí (`docs/db/ddl-registro.md:222`) |
| `TARIFICADOR.AUCO_FACTPRODUCCION` | Tabla | `cargue/controller.js:260-261` | Sí (`docs/db/ddl-registro.md:252`) |
| `TARIFICADOR.AUGE_EMPRESAS` | Tabla | `cargue/controller.js:282,302` | Sí (`docs/db/ddl-registro.md:64`) |

### 5.3 Señales de tipado (cuando no hay DDL RELIQ)
- IDs y FKs tratados como NUMBER (`Number(...)`/bind NUMBER): `RELQID`, `APSAID`, `RELI_ID`, `IUAE_ID`, `INED_ID`, `IAED_ID`, `IARE_ID`, `CEAD_ID`.
- `RELQDESDE/RELQHASTA` tratados como string `YYYYMM` y luego parseados a año/mes (`reliq/controller.js:82-85`).
- Estado de reliquidación usado como string `'1'/'2'` (`reliq/controller.js:192-194`, `tarificador/controller.js:173`).

---

## 6. Frontend (views, componentes, servicios, rutas)

### 6.1 Rutas y menú
- Rutas Vue:
  - `/crearReliq` → `reliq/views/Crear.vue` (`router/index.js:431-433`)
  - `/cargueReliq` → `reliq/views/Cargue.vue` (`439-441`)
  - `/compararCostos` → `reliq/views/CompararCosto.vue` (`447-449`)
  - `/compararTarifas` → `reliq/views/CompararTarifas.vue` (`455-457`)
  - `/verificacionCambios` → `reliq/views/tarificador/Tarificador.vue` (`666-668`)
- Menú:
  - Procesos: Crear/Cargue/Comparar Costos/Comparar Tarifas (`MenuService.js:380-404`)
  - Tarificador: Verificación de cambios (`MenuService.js:413-418`)

### 6.2 Mapeo de servicios FE → endpoints

| Servicio.método | Endpoint | Payload FE | Retorno esperado en FE |
|---|---|---|---|
| `ReleqService.getReliquidaciones` | `POST reliqCrear/getReliquidaciones` | `{}` | array |
| `ReleqService.getCrearReliquidaciones` | `POST reliqCrear/crear` | objeto reliq | `response.data` |
| `ReleqService.getEditarReliquidaciones` | `POST reliqCrear/update` | objeto reliq | `response.data` |
| `ReleqService.postEliminaReliq` | `POST reliqCrear/delete` | `{relqid}` | `response.data` |
| `ReleqService.getCompararTarifas` | `POST reliqCargue/compararTarifas` | `{reliq}` | array |
| `ReleqService.getCompararCostos` | `POST reliqCargue/compararCostos` | `{reliq}` | array |
| `ReleqService.ResumenCompararTarifas` | `POST reliqCargue/resumenCompararTarifas` | `{reliq,aps,anno,mes}` | `response.data.result` |
| `cargueReliqService.CompararCostosCargue` | `POST reliqCargue/compararCostosCargue` | `{reliq,aps}` | `response.data` |
| `cargueReliqService.get/updateResum*` | `POST reliqCargue/get*` y `update*` | `{idReliq}` / `{data:[...]}` | arrays |
| `tarificadoService.getResum*` | `POST reliqTarificador/resumen*` | `{reliq}` | `response.data.resultado` |
| `tarificadoService.getEstadoReliquidacion` | `POST reliqTarificador/estadoReliquidacion` | `{reliq}` | `{ok,estado,puedeAprobar}` |
| `tarificadoService.postAprobarReliquidacion` | `POST reliqTarificador/aprobarReliquidacion` | `{reliq}` | response completo |

Evidencia: `ReleqService.js`, `cargueReliqService.js`, `tarificadoService.js`.

### 6.3 Vistas/componentes por flujo

| Pantalla | Componentes clave | Integración API |
|---|---|---|
| `Crear.vue` + `components/crear/ReliqCrear.vue` | `ModalCrearReliq`, `SelectorApsXUsuario`, `SelectorCorreoUsua`, `SeletorDesdeHasta`, `SelectorEstadoReliq`, `FechaCrearReliq` | CRUD `reliqCrear/*` |
| `Cargue.vue` | `seleccionReliq`, tabs `ResumUsuario/Empresa/Adicional/Relleno/Aps` | `compararCostosCargue`, `get*`, `update*` |
| `CompararCosto.vue` | `seleccionReliq`, `DataTable` comparativo | `compararCostos` |
| `CompararTarifas.vue` | `seleccionReliq`, `SelectorOnlyYear`, `GenericTable`, `DataTable` | `compararTarifas` + `resumenCompararTarifas` |
| `tarificador/Tarificador.vue` | `Resumen*TablaCambios`, modal resultado aprobación | `resumen*`, `estadoReliquidacion`, `aprobarReliquidacion` |

Componentes utilitarios del módulo: `TablaGenericaReliq.vue`, `TablaScrollHorizontal.vue`, `CompararTarifas/GenericTable.vue`.

---

## 7. Trazabilidad funcional FE → API → SQL → DB

### 7.1 Crear reliquidación
`ReliqCrear.vue` (`consultarData`, `usuarioToken`, submit modal) → `ReleqService.getCrearReliquidaciones` → `POST /reliqCrear/crear` → `INSERT RELQRELIQUIDA` + `INSERT FILTRO_COMPARACOSTO` + `PK_RELI.freli_extraccion` → tablas RELIQ.

### 7.2 Cargue y edición
`Cargue.vue` ejecuta `CompararCostosCargue` y refresca tabs (`$refs.*.get*`) → endpoints `reliqCargue/get*` y `update*` → `SELECT/UPDATE RELI_INFO*`.

### 7.3 Comparación
- `CompararCosto.vue` (watch `stReliq`) → `getCompararCostos` → `SELECT ... VREL_COMPARACOSTOS`.
- `CompararTarifas.vue` (watch `stReliq`) → `getCompararTarifas` + `ResumenCompararTarifas` → `SELECT ... VREL_COMPARATARIFACOBRO` + `PK_JSONRESUMEN`.

### 7.4 Previsualización y aplicación
`Tarificador.vue` (`fetch*`, `validarEstadoReliquidacion`, `compararCostosCargue`) → `reliqTarificador/resumen*`, `estadoReliquidacion`, `aprobarReliquidacion` → `PKREI_UPDTARIFADOR` y `PKREI_APLICARRELIQUIDA`.

---

## 8. Hallazgos críticos (17) con evidencia e impacto

| # | Hallazgo (evidencia file:line) | Impacto | Nota de migración |
|---|---|---|---|
| 1 | Mismatch response en `crear`: route usa `resultado.response` (`reliq/routes.js:29`) vs controller retorna `data` (`reliq/controller.js:166-174`) | Riesgo de `undefined` en FE | Definir contrato único (`data` o `response`) y versionar |
| 2 | Mismatch response en `update`: `routes.js:45` vs `controller.js:290-292` | Integración frágil | Unificar shape y tipado |
| 3 | Mismatch response en `delete`: `routes.js:51` vs `controller.js:310-312` | Borrado sin confirmación consistente | Contrato explícito con código y mensaje |
| 4 | Catch usa variable inexistente `err` (`reliq/controller.js:215-219,294-298,314-317`) | Enmascara error real | Normalizar `catch (error)` |
| 5 | Flujo `crear` no transaccional (múltiples commits parciales) (`reliq/controller.js:29-43,93-97`) | Persistencia parcial ante fallo PL | Migrar a transacción única o compensación |
| 6 | Obtención de RELQID por requery `ORDER BY DESC` (`reliq/controller.js:46-58`) | Race condition concurrente | Usar `RETURNING INTO` |
| 7 | `if (resPlRaw.ret !== "ok") return;` (`reliq/controller.js:164`) | Endpoint puede devolver vacío | Establecer respuesta de error controlada |
| 8 | Log referencia `resPlRaw.ret` no garantizado (`reliq/controller.js:162`) | Diagnóstico engañoso | Loggear `outBinds` robusto |
| 9 | `sql` implícita global en `compararTarifas/compararCostos` (`cargue/controller.js:145,171`) | Efectos laterales/global scope | Declarar `const sql` |
| 10 | Usuario hardcodeado `9` en updates (`cargue/routes.js:70,77,84,91,98`) | Auditoría/seguridad inválida | Usar usuario token |
| 11 | Duplicado `updateResumenAdicional` (`cargue/controller.js:641-683` y `684-726`) | Sobrescritura silenciosa | Mantener una sola definición |
| 12 | Bind sospechoso: `IAED_VACRT=:6` e `IAED_CRTZ=:6` (`cargue/controller.js:502-503`) | Datos APS potencialmente corruptos | Revisar mapping y pruebas de regresión |
| 13 | Typo contractual endpoint `updateResumenRellno` (`cargue/routes.js:87`; `cargueReliqService.js:139`) | Debt de naming FE/BE | Versionar rename con compatibilidad |
| 14 | Componente vacío `ModalEditarReliq.vue` (0 líneas) | Artefacto muerto/confusión | Eliminar o implementar |
| 15 | Semántica estado divergente: FE usa Activo/Inactivo (`SelectorEstadoReliq.vue:22-23`) vs BE Creada/Aplicada (`reliq/controller.js:192-194`) | Errores de negocio en UI | Homologar catálogo estados |
| 16 | Decodificación token sin try/catch (`ReliqCrear.vue:226-231`) | Crash en token malformado | Envolver parseo con fallback seguro |
| 17 | `CompararCosto.vue` asume array directo (`CompararCosto.vue:352-353`) | Fallo runtime ante respuesta no-array | Validación tipo/shape antes de render |

---

## 9. Notas de Migración
1. **Primero contrato API**: estabilizar shape de respuesta y naming (`updateResumenRellno`) antes de migrar FE.
2. **Luego transaccionalidad**: encapsular `crear` (insert cabecera + filtro + extracción) en unidad atómica.
3. **Auth y auditoría**: mover updates de hardcode `9` a usuario real autenticado.
4. **Catálogo de estados**: alinear UI (`Activo/Inactivo`) con backend (`Creada/Aplicada`) para evitar semántica ambigua.
5. **DB RELIQ**: extraer DDL oficial fuera de código (actualmente inferido) para reducir riesgo en TO-BE.

---

## 10. Verificación final contra código vigente

| Sección | Estado | Evidencia |
|---|---|---|
| API (26 endpoints) | ✅ Completa | Sección 3 + referencias `routes/controller` |
| SQL/PLSQL por endpoint | ✅ Completa | Bloques SQL/PLSQL incluidos por endpoint |
| Frontend mapping | ✅ Completa | Sección 6 (rutas, servicios, vistas/componentes) |
| Inventario DB + gaps DDL | ✅ Completa | Sección 5 (confirmado vs inferido) |
| Hallazgos críticos (17) | ✅ Completa | Sección 8 con impacto y migración |

Conteo validado: **26/26 endpoints documentados**.

---

## 11. Archivos relacionados (índice de trazabilidad)
- `back-tarificador/src/modules/reliq/routes.js`
- `back-tarificador/src/modules/reliq/controller.js`
- `back-tarificador/src/modules/reliq/cargue/routes.js`
- `back-tarificador/src/modules/reliq/cargue/controller.js`
- `back-tarificador/src/modules/reliq/tarificador/routes.js`
- `back-tarificador/src/modules/reliq/tarificador/controller.js`
- `front-tarificador/src/reliq/views/Crear.vue`
- `front-tarificador/src/reliq/components/crear/ReliqCrear.vue`
- `front-tarificador/src/reliq/views/Cargue.vue`
- `front-tarificador/src/reliq/views/CompararCosto.vue`
- `front-tarificador/src/reliq/views/CompararTarifas.vue`
- `front-tarificador/src/reliq/views/tarificador/Tarificador.vue`
- `front-tarificador/src/reliq/services/ReleqService.js`
- `front-tarificador/src/reliq/services/cargueReliqService.js`
- `front-tarificador/src/reliq/services/tarificadoService.js`
- `front-tarificador/src/router/index.js`
- `front-tarificador/src/service/MenuService.js`

---
title: "Módulo: Información Gerenciales"
description: "Documentación AS-IS completa del módulo infogerenciales"
phase: "Informes"
module: "infogerenciales"
version: "1.0.0"
date: "2026-04-30"
status: "AS-IS"
sources:
  - back-tarificador/src/app.js
  - back-tarificador/src/modules/infogerenciales/routes.js
  - back-tarificador/src/modules/infogerenciales/controller.js
  - front-tarificador/src/service/InfoGerencialService.js
  - front-tarificador/src/views/informesgerenciales/DetalleSubAporte.vue
  - front-tarificador/src/views/informesgerenciales/DetalleCostos.vue
  - front-tarificador/src/views/informesgerenciales/DashBoard.vue
  - front-tarificador/src/views/informesgerenciales/CostoPoda.vue
  - front-tarificador/src/views/suministros/Verificacion.vue
  - front-tarificador/src/views/suministros/Poda.vue
  - front-tarificador/src/views/pgirs/InformePgirs.vue
---

# Módulo: Información Gerenciales (infogerenciales)

## 1. Resumen Ejecutivo

El módulo `infogerenciales` expone **9 endpoints POST** montados en runtime bajo `/api/v1/infogerencial` (singular) y concentra reportes/insumos gerenciales para costos, subsidios/aportes, verificación operativa APS, dashboard, poda y PGIRS.

- **Cobertura API**: 9 endpoints en `routes.js`.
- **Cobertura auth backend**: **6/9** con `authJwt.verificarToken`; 3 sin auth.
- **Núcleo SQL**: consultas directas sobre vistas/tablas operativas Oracle.
- **Estado AS-IS**: hay defectos críticos de contrato y ejecución (método faltante, bind mismatch, auth inconsistente, manejo de errores FE frágil).

---

## 2. Flujo de Datos

1. Usuario ingresa a vistas de informes/suministros/pgirs en frontend.
2. Cada vista instancia `InfoGerencialService` (o `pgirsService` en `InformePgirs.vue`) y arma payload con período (`anno`, `mes`) y/o `aps`.
3. Service llama endpoints `infogerencial/*` con header `x-access-token`.
4. `app.js` monta el módulo: `app.use(apiv1 + 'infogerencial', require('./modules/infogerenciales/routes'))` (`back-tarificador/src/app.js:26`).
5. `routes.js` delega a `controller.js` y responde `res.send(...)` o `res.status(...).send(...)`.
6. `controller.js` ejecuta `db.open(sql, binds, true)` y retorna arrays Oracle (o error estructurado en dashboard).

Trazabilidad base: **Vue View → InfoGerencialService → /api/v1/infogerencial/* → controller.js → SQL Oracle**.

---

## 3. API Backend (9 endpoints)

Archivo: `back-tarificador/src/modules/infogerenciales/routes.js`.

### 3.1 POST `/api/v1/infogerencial/detcostos`
- **Auth**: Sí (`routes.js:6`)
- **Body**: `{ anno, mes }`
- **Controller**: `detcostos(anno, mes)` (`controller.js:5-13`)
- **SQL**:
```sql
SELECT A.apsa_nomaps, C.* 
FROM vauco_costos C 
     INNER JOIN auco_apsaseo A ON (c.apscosto = A.apsa_id)
WHERE c.annocosto = :1 AND c.mescosto = :2
```
- **Binds**: `[:1=anno, :2=mes]`
- **Response AS-IS**: `res.send(array)`.

### 3.2 POST `/api/v1/infogerencial/detsubaporte`
- **Auth**: Sí (`routes.js:12`)
- **Body**: `{ anno, mes }`
- **Controller**: `detsubaporte(anno, mes)` (`controller.js:15-22`)
- **SQL**:
```sql
SELECT S.*, P.PARA_NOMBRE FROM 
    vauco_subsaport S INNER JOIN AUGE_PARAMETROS P ON(S.PARA_TIPPRED20016 = P.PARA_PARA AND P.CLAS_CLAS = 20016)
WHERE suco_anno = :1 AND suco_mes = :2 AND SUCO_ESTADO = 1
```
- **Binds**: `[:1=anno, :2=mes]`
- **Response**: `res.send(array)`.

### 3.3 POST `/api/v1/infogerencial/infoapsemprdivi`
- **Auth**: Sí (`routes.js:18`)
- **Body**: `{ aps, anno, mes }`
- **Controller**: `infoapsemprdivi(aps, anno, mes)` (`controller.js:24-28`)
- **SQL**:
```sql
SELECT ae.EMPR_NOMBRE, ad.DIVI_NOMBRE, ai.*
FROM AUCO_INFOAPSEMPRDIVI ai
JOIN AUGE_EMPRESAS ae ON ae.EMPR_EMPR = ai.EMPR_EMPR
JOIN AUGE_DIVIPOLI ad ON ad.DIVI_DIVI = ai.DIVI_DIVI
WHERE APSA_ID = :1 AND IAED_ANNO = :3 AND IAED_MES = :4
ORDER BY EMPR_NOMBRE, DIVI_NOMBRE
```
- **Binds enviados**: `[aps, anno, mes]`
- **Defecto AS-IS**: placeholders `:1,:3,:4` no calzan con arreglo de 3 binds (ver hallazgos).
- **Response**: `res.send(array)`.

### 3.4 POST `/api/v1/infogerencial/infoemprdivi`
- **Auth**: Sí (`routes.js:24`)
- **Body**: `{ aps, anno, mes }`
- **Controller**: `infoemprdivi(aps, anno, mes)` (`controller.js:30-34`)
- **SQL**:
```sql
SELECT ae.EMPR_NOMBRE, ai.*
FROM AUCO_INFOEMPRDIVI ai
JOIN AUCO_APSEMPRDIVI aa ON aa.EMPR_EMPR = ai.EMPR_EMPR AND ai.DIVI_DIVI = aa.DIVI_DIVI
JOIN AUGE_EMPRESAS ae ON ae.EMPR_EMPR = ai.EMPR_EMPR
WHERE aa.APSA_ID = :1 AND ai.INED_ANNO =:2 AND ai.INED_MES =:3
ORDER BY ae.EMPR_NOMBRE
```
- **Binds**: `[:1=aps, :2=anno, :3=mes]`
- **Response**: `res.send(array)`.

### 3.5 POST `/api/v1/infogerencial/infoapsrelleno`
- **Auth**: Sí (`routes.js:30`)
- **Body**: `{ aps, anno, mes }`
- **Controller**: `infoapsrelleno(aps, anno, mes)` (`controller.js:36-40`)
- **SQL**:
```sql
SELECT aa.RELL_NOMRELLENO , ai.*
FROM AUCO_INFOAPSRELLENO ai
JOIN AUCO_RELLENOS aa ON ai.RELL_ID = aa.RELL_ID
WHERE RELL_ESTADO = 1 AND ai.APSA_ID = :1 AND ai.IARE_ANNO = :2 AND ai.IARE_MES = :3
ORDER BY aa.RELL_NOMRELLENO
```
- **Binds**: `[:1=aps, :2=anno, :3=mes]`
- **Response**: `res.send(array)`.

### 3.6 POST `/api/v1/infogerencial/getDashBoardGerencial`
- **Auth**: Sí (`routes.js:36`)
- **Body**: `{ anno, mes }` + `usuario=req.SISU_ID`
- **Controller**: `InformacionDashBoard(anno, mes, usuario)` (`controller.js:42-59`)
- **SQL**:
```sql
SELECT A.apsa_id, A.apsa_nomaps, t.tari_fechacreacion, u.sisu_correo
FROM auco_apsaseo A
LEFT JOIN auco_tarifas T ON (a.apsa_id = t.apsa_id AND t.tari_anno = :1 AND t.tari_mes = :2 AND T.fapr_codigo = 4 AND T.para_tiptar20012 = 1 AND T.para_ubicacion20016 = 2 and T.para_tipfac20014 = 2 )
LEFT JOIN auge_sisusuario U ON (t.usua_usua = u.sisu_id)
INNER JOIN auco_apsusuarios AU ON (A.apsa_id = AU.apsa_id AND au.sisu_id = :3 AND au.apsi_estado = 1)
WHERE apsa_estado = 1
ORDER BY a.apsa_nomaps
```
- **Binds**: `[:1=anno, :2=mes, :3=usuario]`
- **Response**: `{status:200,response:[...]}` o `{status:500,response:error}`.

### 3.7 POST `/api/v1/infogerencial/infoPgirs`
- **Auth**: No (`routes.js:44-49`)
- **Body**: `{ aps }`
- **Controller invocado**: `infoPgirs(aps)` (`routes.js:46`)
- **Estado AS-IS**: método **no existe** en `controller.js` (ver hallazgos).
- **SQL**: no observable en módulo por ausencia de implementación.
- **Response esperada por route**: `res.send(resultado)`.

### 3.8 POST `/api/v1/infogerencial/costoPoda`
- **Auth**: No (`routes.js:51-56`)
- **Body**: `{ aps }`
- **Controller**: `costoPoda(aps)` (`controller.js:61-65`)
- **SQL**:
```sql
SELECT * FROM vpoda_reporte WHERE apsa_id = :aps ORDER BY periodo DESC
```
- **Binds enviados**: `[aps]` (placeholder nominal `:aps`).
- **Response**: `res.send(array)`.

### 3.9 POST `/api/v1/infogerencial/informePgirs`
- **Auth**: No (`routes.js:58-63`)
- **Body**: `{ aps }`
- **Controller invocado**: `informePgirs(aps)` (`routes.js:60`)
- **Estado AS-IS**: método **no existe** en `controller.js` (error de runtime garantizado).
- **SQL**: no observable en módulo por ausencia de implementación.
- **Response esperada por route**: `res.send(resultado)`.

---

## 4. Base de Datos (7 objetos)

Inventario de objetos principales referenciados por el módulo (FROM/JOIN en SQL del controller):

| # | Objeto | Tipo | Endpoint(s) | Evidencia |
|---|---|---|---|---|
| 1 | `vauco_costos` | Vista | `detcostos` | `controller.js:8` |
| 2 | `auco_apsaseo` | Tabla | `detcostos`, `getDashBoardGerencial` | `controller.js:9,44` |
| 3 | `vauco_subsaport` | Vista | `detsubaporte` | `controller.js:18` |
| 4 | `auco_infoapsemprdivi` | Tabla/Vista operacional | `infoapsemprdivi` | `controller.js:25` |
| 5 | `auco_infoemprdivi` | Tabla/Vista operacional | `infoemprdivi` | `controller.js:31` |
| 6 | `auco_infoapsrelleno` | Tabla/Vista operacional | `infoapsrelleno` | `controller.js:37` |
| 7 | `vpoda_reporte` | Vista | `costoPoda` | `controller.js:62` |

> Nota AS-IS: existen más objetos auxiliares en JOIN (`AUGE_PARAMETROS`, `AUGE_EMPRESAS`, `AUGE_DIVIPOLI`, `AUCO_APSEMPRDIVI`, `AUCO_RELLENOS`, `AUCO_TARIFAS`, `AUGE_SISUSUARIO`, `AUCO_APSUSUARIOS`), pero el inventario mínimo requerido aquí se fija en 7 objetos principales.

---

## 5. Frontend (7 vistas)

### 5.1 Service principal

`front-tarificador/src/service/InfoGerencialService.js` mapea:
- `detcostos` → `POST infogerencial/detcostos`
- `detsubaporte` → `POST infogerencial/detsubaporte`
- `infoapsemprdivi` → `POST infogerencial/infoapsemprdivi`
- `infoemprdivi` → `POST infogerencial/infoemprdivi`
- `infoapsrelleno` → `POST infogerencial/infoapsrelleno`
- `getDashBoardGerencial` → `POST infogerencial/getDashBoardGerencial`
- `informePgirs` → `POST infogerencial/infoPgirs`
- `getinformePgirs` → `POST infogerencial/informePgirs`
- `getCostoPoda` → `POST infogerencial/costoPoda`

### 5.2 Mapeo vista → service → endpoint

| Vista | Método(s) en vista | Service method | Endpoint |
|---|---|---|---|
| `informesgerenciales/DetalleSubAporte.vue` | `getSubAporte()` | `detsubaporte(annos, meses)` | `/detsubaporte` |
| `informesgerenciales/DetalleCostos.vue` | `getTarifaxCosto()` | `detcostos(annos, meses)` | `/detcostos` |
| `informesgerenciales/DashBoard.vue` | `consultarData()` | `getDashBoardGerencial(annos, meses)` | `/getDashBoardGerencial` |
| `informesgerenciales/CostoPoda.vue` | `consultarData()` | `getCostoPoda(stapsSeleccionado)` | `/costoPoda` |
| `views/suministros/Verificacion.vue` | `actualizaInfoGeneral()` | `infoemprdivi`, `infoapsemprdivi`, `infoapsrelleno` | `/infoemprdivi`, `/infoapsemprdivi`, `/infoapsrelleno` |
| `views/suministros/Poda.vue` | *(No usa InfoGerencialService; usa `SuministrosService`)* | N/A | N/A |
| `views/pgirs/InformePgirs.vue` | `actualizaInfoGeneral()` | *(usa `pgirsService.informePgirs`)* | Contrato PGIRS externo al service gerencial |

Observación AS-IS: aunque `InfoGerencialService` define `informePgirs/getinformePgirs`, `InformePgirs.vue` consume `pgirsService.js` en lugar de ese service.

---

## 6. Hallazgos Críticos

### Hallazgo 1 — Método de controller faltante (runtime error)
- **Evidencia**: ruta `/informePgirs` llama `infogerenciacontroller.informePgirs(aps)` (`routes.js:58-63`), pero `controller.js` no define `informePgirs` (archivo termina en `costoPoda` y `module.exports`, `controller.js:61-69`).
- **Impacto**: al invocar endpoint, Node lanzará `TypeError: infogerenciacontroller.informePgirs is not a function`.

### Hallazgo 2 — Mismatch de binds en `infoapsemprdivi`
- **Evidencia SQL**: `IAED_ANNO = :3 AND IAED_MES = :4` (`controller.js:25`) con binds `[aps, anno, mes]` (`controller.js:26`).
- **Impacto**: `:3` recibe `mes` (no `anno`) y `:4` queda sin bind; riesgo de error ORA o datos incorrectos.

### Hallazgo 3 — Inconsistencia de autenticación
- **Evidencia**: endpoints sin middleware en `routes.js:44-63` (`/infoPgirs`, `/costoPoda`, `/informePgirs`) versus los demás con `[authJwt.verificarToken]`.
- **Impacto**: superficie expuesta sin validación de identidad/autorización en backend.

### Hallazgo 4 — Manejo de errores frágil en frontend
- **Evidencia**: múltiples `catch` con `err.response.status` sin null-guard (`InfoGerencialService.js:25,50,76,102,128,155,178,200,224`).
- **Impacto**: ante fallas de red/CORS/timeout sin `response`, el `catch` puede lanzar excepción secundaria (`Cannot read properties of undefined`).

---

## 7. Notas de Migración

1. **No corregir contratos en caliente** en AS-IS: documentar primero y versionar cambios de API/controller.
2. Priorizar saneamiento de **defectos bloqueantes**:
   - implementar/retirar rutas PGIRS huérfanas (`/infoPgirs`, `/informePgirs`) en concordancia con su controller real;
   - corregir placeholders/binds de `infoapsemprdivi` manteniendo pruebas de regresión por período APS.
3. Unificar política de **auth obligatoria** en los 9 endpoints y validar impacto sobre consumidores históricos.
4. Endurecer manejo de errores FE con guardas (`err?.response?.status`) para evitar crash secundario.
5. Mantener trazabilidad explícita FE→API→SQL→DB para la migración TO-BE, especialmente en vistas compartidas de `suministros` y `pgirs`.

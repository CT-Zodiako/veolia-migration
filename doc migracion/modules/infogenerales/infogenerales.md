---
title: "Módulo: Información Generales"
description: "Documentación AS-IS completa del módulo infogenerales"
phase: "Informes"
module: "infogenerales"
version: "1.0.0"
date: "2026-04-30"
status: "AS-IS"
sources:
  - back-tarificador/src/app.js
  - back-tarificador/src/modules/infogenerales/routes.js
  - back-tarificador/src/modules/infogenerales/controller.js
  - front-tarificador/src/router/index.js
  - front-tarificador/src/views/infogenerales/InformeProyecciones.vue
  - front-tarificador/src/components/infogenerales/seleccionarProyeccion.vue
  - front-tarificador/src/components/infogenerales/Energia.vue
  - front-tarificador/src/components/infogenerales/Acueducto.vue
  - front-tarificador/src/components/infogenerales/Costos.vue
  - front-tarificador/src/components/infogenerales/Tarifas.vue
  - front-tarificador/src/service/InfoGeneralesService.js
  - front-tarificador/src/service/TarifasService.js
---

# Módulo: Información Generales (infogenerales)

## 1. Resumen Ejecutivo

El módulo `infogenerales` expone **6 endpoints POST** bajo `/api/v1/infogenerales` y presenta datos de proyección en una vista tabulada (`/generales`) con 4 pestañas: energía, acueducto, costos y tarifas.

- **Cobertura API**: 6 endpoints documentados (4 funcionales de consulta por proyección + 2 históricos por período).
- **Cobertura auth backend**: **2/6** protegidos con `authJwt.verificarToken`.
- **Núcleo SQL**: consultas directas sobre 6 vistas (`vpro_*`, `vauco_*`) y una tabla de seguridad (`auco_apsusuarios`).
- **Estado AS-IS**: existen hallazgos críticos (auth inconsistente, `sql` global implícita, manejo de error frágil en FE, y llamada a método inexistente).

---

## 2. Flujo Funcional Principal

1. Usuario navega a `/generales` (ruta protegida por `meta.requiresAuth`).
2. `InformeProyecciones.vue` renderiza selector de proyección + tabs `Energia`, `Acueducto`, `Costos`, `Tarifas`.
3. `seleccionarProyeccion.vue` consulta proyecciones por APS y persiste en Vuex: `stProyId`, `stdescProy`, `stdateDesde`, `stdateHasta`, `stProydataTable`.
4. Cada tab ejecuta consulta inicial (`mounted`) y recarga al cambiar `stProyId` (`watch`).
5. Services FE llaman endpoints `/api/v1/infogenerales/*` enviando `{apsaid, proyid}` o `{anno, mes}`.
6. Backend enruta en `routes.js`, delega a `controller.js`, ejecuta `db.open(sql, binds, true)` y retorna array Oracle o `"Error"`.

Trazabilidad base: `front/router` → `view` → `components` → `service` → `routes` → `controller` → `SQL` → `DB`.

---

## 3. API Backend

Prefijo montado: `app.use(apiv1 + 'infogenerales', require('./modules/infogenerales/routes'));` (`back-tarificador/src/app.js:30`).

### 3.1 Cobertura de autenticación

| Endpoint | Auth backend |
|---|---|
| `POST /api/v1/infogenerales/consultaHistorialCertificaciones` | Sí (`[authJwt.verificarToken]`) |
| `POST /api/v1/infogenerales/consultaHistorialProductividad` | Sí (`[authJwt.verificarToken]`) |
| `POST /api/v1/infogenerales/consultaenergia` | No |
| `POST /api/v1/infogenerales/consultaacueducto` | No |
| `POST /api/v1/infogenerales/consultacostos` | No |
| `POST /api/v1/infogenerales/consultatarifas` | No |

Evidencia: `back-tarificador/src/modules/infogenerales/routes.js:7-48`.

### 3.2 Catálogo completo de endpoints (6)

#### 1) POST `/api/v1/infogenerales/consultaenergia`
- **Route/controller refs**: `routes.js:7-12`, `controller.js:53-72`
- **Auth**: No
- **Request body**: `{ apsaid, proyid }`
- **Controller method**: `consultaenergia(apsa_id, proy_id)`
- **Binds**: `[:1=apsaid, :2=proyid]`
- **SQL**:
```sql
SELECT RF.clas_nombre, RF.factor_prod, RF.TipoTar, RF.faen_anno, RF.faen_mes, RF.faen_subcon, RF.faen_usuarios,
RF.faen_tcprop, RF.faen_tcterc, RF.faen_tcapro, RF.faen_tbl, RF.faen_tlu, RF.faen_trt, RF.faen_tdf, RF.faen_tinc, RF.faen_tiat,
RF.faen_ttl, RF.faen_ta, RF.faen_total, RF.faen_totsc, RF.faen_totpropleno, RF.faen_totprosubcon
FROM vpro_resfactene RF
WHERE RF.apsa_id = :1 AND rf.proy_id = :2
```
- **Response AS-IS**: `200 => Array<Row>` (`res.status(resultado.status).send(resultado.data)`), `500 => "Error"`.

#### 2) POST `/api/v1/infogenerales/consultaacueducto`
- **Refs**: `routes.js:14-19`, `controller.js:74-92`
- **Auth**: No
- **Request body**: `{ apsaid, proyid }`
- **Controller**: `consultaacueducto(apsa_id, proy_id)`
- **Binds**: `[:1=apsaid, :2=proyid]`
- **SQL**:
```sql
SELECT RF.clas_nombre, RF.factor_prod, RF.TipoTar, RF.facu_anno, RF.facu_mes, RF.facu_subcon, RF.facu_usuarios,
RF.facu_tcprop, RF.facu_tcterc, RF.facu_tcapro, RF.facu_tbl, RF.facu_tlu, RF.facu_trt, RF.facu_tdf, RF.facu_tinc, RF.facu_tiat,
RF.facu_ttl, RF.facu_ta, RF.facu_total, RF.facu_totsc,  RF.facu_totpropleno, RF.facu_totprosubcon
FROM vpro_resfactacu RF
WHERE RF.apsa_id = :1 AND rf.proy_id = :2
```
- **Response**: `200 => Array<Row>`, `500 => "Error"`.

#### 3) POST `/api/v1/infogenerales/consultacostos`
- **Refs**: `routes.js:21-26`, `controller.js:94-112`
- **Auth**: No
- **Request body**: `{ apsaid, proyid }`
- **Controller**: `consultacostos(apsa_id, proy_id)`
- **Binds**: `[:1=apsaid, :2=proyid]`
- **SQL**:
```sql
SELECT c.tipo_fact, c.cost_anno, c.cost_mes, c.cost_ccs,
c.cost_ccsapro, c.cost_cbl, c.cost_clus, c.cost_crt, c.cost_cdf, c.cost_inc,c.cost_iat, c.cost_ctl,
c.cost_vba
FROM vpro_rescostos c
WHERE c.apsa_id = :1 and c.proy_id = :2
```
- **Response**: `200 => Array<Row>`, `500 => "Error"`.

#### 4) POST `/api/v1/infogenerales/consultatarifas`
- **Refs**: `routes.js:28-33`, `controller.js:115-130`
- **Auth**: No
- **Request body**: `{ apsaid, proyid }`
- **Controller**: `consultatarifas(apsa_id, proy_id)`
- **Binds**: `[:1=apsaid, :2=proyid]`
- **SQL**:
```sql
SELECT DISTINCT t.proy_id, t.apsa_id, t.clas_nombre, t.tipo_tar, t.tipo_fact, t.tari_anno,t.tari_mes, t.tari_subcon, t.tari_tcprop, t.tari_tcterc, t.tari_tcapro, t.tari_tbl,t.tari_tlu, t.tari_trt, t.tari_tdf, t.tari_inc, t.tari_tiat, t.tari_ttl, t.tari_ta, t.tari_total, t.tari_totsc
FROM vpro_restarifas t
WHERE t.apsa_id = :1 and t.proy_id = :2
ORDER BY t.tari_anno, t.tari_mes, t.tipo_fact,t.tipo_tar, t.clas_nombre DESC
```
- **Response**: `200 => Array<Row>`, `500 => "Error"`.

#### 5) POST `/api/v1/infogenerales/consultaHistorialCertificaciones`
- **Refs**: `routes.js:36-41`, `controller.js:28-51`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Request body**: `{ anno, mes }`
- **Contexto token**: `usuario = req.SISU_ID` (`routes.js:38`)
- **Controller**: `consultaHistorialCertificaciones(anno, mes, usuario)`
- **Binds**: `[:1=anno, :2=mes, :3=usuario]`
- **SQL**:
```sql
SELECT
  *
FROM
  vauco_certintarifas
WHERE
  tace_anno = :1
  AND tace_mes = :2
  AND codaps IN (SELECT AU.apsa_id FROM auco_apsusuarios AU WHERE au.sisu_id = :3)
```
- **Response**: `200 => Array<Row>`, `500 => "Error"`.

#### 6) POST `/api/v1/infogenerales/consultaHistorialProductividad`
- **Refs**: `routes.js:43-48`, `controller.js:6-27`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Request body**: `{ anno, mes }`
- **Contexto token**: `usuario = req.SISU_ID` (`routes.js:45`)
- **Controller**: `consultaHistorialProductividad(anno, mes, usuario)`
- **Binds**: `[:1=anno, :2=mes, :3=usuario]`
- **SQL**:
```sql
select *
from vauco_productividad
where pr22_anno = :1 and pr22_mes = :2
  and codaps in (SELECT AU.apsa_id FROM auco_apsusuarios AU WHERE au.sisu_id = :3)
order by 3,5,7
```
- **Response**: `200 => Array<Row>`, `500 => "Error"`.

---

## 4. Base de Datos

### 4.1 Inventario de objetos SQL (7)

| # | Objeto | Tipo | Uso | Evidencia | DDL en repo |
|---|---|---|---|---|---|
| 1 | `vpro_resfactene` | Vista | `consultaenergia` | `controller.js:58-59` | **GAP (inferido)** |
| 2 | `vpro_resfactacu` | Vista | `consultaacueducto` | `controller.js:79-80` | **GAP (inferido)** |
| 3 | `vpro_rescostos` | Vista | `consultacostos` | `controller.js:99-100` | **GAP (inferido)** |
| 4 | `vpro_restarifas` | Vista | `consultatarifas` | `controller.js:117` | **GAP (inferido)** |
| 5 | `vauco_certintarifas` | Vista | `consultaHistorialCertificaciones` | `controller.js:34-38` | **GAP (inferido)** |
| 6 | `vauco_productividad` | Vista | `consultaHistorialProductividad` | `controller.js:10-13` | **GAP (inferido)** |
| 7 | `auco_apsusuarios` | Tabla | filtro de seguridad por `SISU_ID` | `controller.js:12,38` | **GAP (inferido)** |

### 4.2 DDL / definición disponible

En el alcance de fuentes verificadas para este módulo **no se recuperó DDL CREATE VIEW/CREATE TABLE** para estos 7 objetos. Por lo tanto, cada uno queda marcado explícitamente como `inferido` desde SQL ejecutado en runtime.

### 4.3 Reconciliación endpoint ↔ objetos

- `consultaenergia` → `vpro_resfactene`
- `consultaacueducto` → `vpro_resfactacu`
- `consultacostos` → `vpro_rescostos`
- `consultatarifas` → `vpro_restarifas`
- `consultaHistorialCertificaciones` → `vauco_certintarifas` + `auco_apsusuarios`
- `consultaHistorialProductividad` → `vauco_productividad` + `auco_apsusuarios`

Cobertura reconciliada: **6 endpoints / 7 objetos**.

---

## 5. Frontend

### 5.1 Ruta y vista contenedora

- Ruta: `/generales` con `requiresAuth: true` (`front-tarificador/src/router/index.js:348-353`).
- Vista: `InformeProyecciones.vue` (`front-tarificador/src/views/infogenerales/InformeProyecciones.vue:1-69`).
- Composición tabs: `Energia`, `Acueducto`, `Costos`, `Tarifas` (`InformeProyecciones.vue:17-28`).

### 5.2 Selector de proyección y estado

`seleccionarProyeccion.vue`:
- Consulta proyecciones por APS (`ProyService.getProybyAps`) (`seleccionarProyeccion.vue:131-133`, `168-171`).
- Al cambiar proyección actualiza Vuex:
  - `setProyId`, `setdescProy`, `setdateDesde`, `setdateHasta`, `setProydataTable` (`162-167`).
- Trigger reactivo por APS: `watch stapsSeleccionado` (`188-190`).

### 5.3 Servicios HTTP y mapeo a backend

| Service method | Endpoint backend | Body | Ref |
|---|---|---|---|
| `InfoGeneralesService.getenergia` | `POST infogenerales/consultaenergia` | `{apsaid, proyid}` | `InfoGeneralesService.js:7-25` |
| `InfoGeneralesService.getacueducto` | `POST infogenerales/consultaacueducto` | `{apsaid, proyid}` | `InfoGeneralesService.js:31-48` |
| `InfoGeneralesService.getcostos` | `POST infogenerales/consultacostos` | `{apsaid, proyid}` | `InfoGeneralesService.js:54-71` |
| `InfoGeneralesService.gettarifas` | `POST infogenerales/consultatarifas` | `{apsaid, proyid}` | `InfoGeneralesService.js:77-95` |
| `TarifasService.getHistCertificacion` | `POST infogenerales/consultaHistorialCertificaciones` | `{anno, mes}` | `TarifasService.js:132-145` |
| `TarifasService.getHistProductividad` | `POST infogenerales/consultaHistorialProductividad` | `{anno, mes}` | `TarifasService.js:151-164` |

Todos envían header `x-access-token` (`InfoGeneralesService.js:19,42,65,89`; `TarifasService.js:140,159`).

### 5.4 Mapeo tabs/components y triggers

| Componente | Método de carga | Service method | Endpoint | Trigger |
|---|---|---|---|---|
| `Energia.vue` | `getDataTarifas` | `getenergia` | `/consultaenergia` | `mounted` + `watch stProyId` |
| `Acueducto.vue` | `getDataTarifas` | `getacueducto` | `/consultaacueducto` | `mounted` + `watch stProyId` |
| `Costos.vue` | `getDataTarifas` | `getcostos` | `/consultacostos` | `mounted` + `watch stProyId` |
| `Tarifas.vue` | `getDataTarifas` | `gettarifas` | `/consultatarifas` | `mounted` + `watch stProyId` |

Refs:
- `Energia.vue:296-301,307-309,317-319`
- `Acueducto.vue:297-303,308-310,318-320`
- `Costos.vue:182-187,193-195,203-205`
- `Tarifas.vue:258-263,269-271,279-281`

---

## 6. Hallazgos críticos (AS-IS)

### Hallazgo 1 — Cobertura auth inconsistente
- **Evidencia**: `back-tarificador/src/modules/infogenerales/routes.js:7-33` (4 endpoints sin middleware) vs `:36-48` (2 endpoints con middleware).
- **Impacto**: consultas por `apsaid/proyid` sin verificación de identidad en backend.
- **Nota de migración**: no cambiar contrato en caliente; definir estrategia de endurecimiento por versión con validación de impacto FE.

### Hallazgo 2 — `sql` global implícita en controller
- **Evidencia**: asignaciones `sql =` sin `const/let` en `controller.js:8,30,55,76,96,117`.
- **Impacto**: variable mutable compartida a nivel módulo, potencial contaminación entre requests concurrentes.
- **Nota de migración**: reemplazar por `const sql` local por handler, preservando SQL literal y binds actuales.

### Hallazgo 3 — Manejo de error FE frágil
- **Evidencia**: `console.log("algo va mal: " + err.response.status)` en `InfoGeneralesService.js:26,49,72,96`.
- **Impacto**: cuando `err.response` es `undefined` (red/CORS), el `catch` puede lanzar `TypeError` y ocultar el error original.
- **Nota de migración**: introducir null-guard (`err?.response?.status`) sin alterar contrato de retorno.

### Hallazgo 4 — Invocación a método inexistente
- **Evidencia**: `InfoGeneralesService.newLineasdeTiempo(...)` en `Tarifas.vue:244-247`; método no existe en `InfoGeneralesService.js:1-103`.
- **Impacto**: ruta funcional potencialmente rota si `procesarInfo` se ejecuta.
- **Nota de migración**: corregir dependencia al servicio correcto y/o implementar método faltante con contrato explícito.

---

## 7. Notas de migración (sin cambio funcional)

1. Este documento refleja **AS-IS**; no introduce cambios de comportamiento.
2. Mantener contratos HTTP actuales (método `POST`, payload y shape de respuesta) hasta versionar breaking changes.
3. Preservar SQL y orden de binds mientras no exista prueba de regresión funcional en Oracle.
4. Tratar la auth inconsistente como deuda controlada: primero observabilidad/telemetría, luego hardening gradual.
5. Resolver gaps de DDL (`inferido`) antes de rediseños estructurales de BD.
6. Cualquier refactor FE (`catch`, método inexistente) debe mantener compatibilidad con flujo `/generales` y watchers de `stProyId`.

---

## 8. Fuentes y evidencia (`file:line`)

- Montaje API: `back-tarificador/src/app.js:30`
- Rutas backend: `back-tarificador/src/modules/infogenerales/routes.js:7-48`
- SQL/controllers: `back-tarificador/src/modules/infogenerales/controller.js:6-130`
- Ruta frontend `/generales`: `front-tarificador/src/router/index.js:348-353`
- Vista contenedora: `front-tarificador/src/views/infogenerales/InformeProyecciones.vue:17-28`
- Selector y estado Vuex: `front-tarificador/src/components/infogenerales/seleccionarProyeccion.vue:129-167,188-190`
- Tabs y recarga reactiva:
  - `Energia.vue:296-301,317-319`
  - `Acueducto.vue:297-303,318-320`
  - `Costos.vue:182-187,203-205`
  - `Tarifas.vue:258-263,279-281`
- Services FE:
  - `front-tarificador/src/service/InfoGeneralesService.js:7-98`
  - `front-tarificador/src/service/TarifasService.js:132-168`

---

## 9. Final review (completeness gate)

### Checklist de cierre
- [x] Documento único creado (`docs/modulos/infogenerales.md`).
- [x] YAML frontmatter alineado al patrón `subcont/costos/reliq`.
- [x] **6/6 endpoints** documentados con método, path, auth, params, SQL, binds, response y refs.
- [x] Mapeo frontend completo (`/generales`, view, components, services, triggers).
- [x] Inventario BD completo de **7 objetos** con DDL/GAP (`inferido`).
- [x] **4 hallazgos críticos** con evidencia `file:line`, impacto y nota de migración.
- [x] Notas de migración incluidas.

### Métricas finales
- Endpoints documentados: **6**
- Objetos DB inventariados: **7**
- Hallazgos críticos: **4**
- Cobertura auth backend: **2/6 (33.3%)**

**Resultado**: artefacto AS-IS completo y verificable contra código fuente actual.

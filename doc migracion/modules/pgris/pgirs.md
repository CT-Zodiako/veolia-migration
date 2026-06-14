---
title: "Módulo: PGIRS"
description: "Documentación AS-IS completa del módulo pgirs"
phase: "Informes"
module: "pgirs"
version: "1.0.0"
date: "2026-04-30"
status: "AS-IS"
sources:
  - back-tarificador/src/app.js
  - back-tarificador/src/modules/pgirs/routes.js
  - back-tarificador/src/modules/pgirs/controller.js
  - back-tarificador/src/modules/infogerenciales/routes.js
  - back-tarificador/src/modules/infogerenciales/controller.js
  - front-tarificador/src/service/pgirsService.js
  - front-tarificador/src/views/pgirs/InformePgirs.vue
  - front-tarificador/src/views/pgirs/ResumenPgirs.vue
  - front-tarificador/src/views/pgirs/variablesPGRIS.vue
  - front-tarificador/src/components/pgirs/tableVariablesPGRIS.vue
---

# Módulo: PGIRS (pgirs)

## 1. Resumen Ejecutivo

El módulo `pgirs` expone **6 endpoints POST** montados bajo `/api/v1/pgirs` y cubre tres capacidades funcionales: informe PGIRS, barrido de variables y administración de variables (consulta/edición/alta).

- **Cobertura API**: 6 endpoints documentados.
- **Cobertura auth backend**: **5/6** con `authJwt.verificarToken`; `getVariablesPGRIS` queda sin middleware.
- **Núcleo SQL**: 4 vistas y 1 tabla (`PGRI_PARAMETROS`) en Oracle.
- **Estado AS-IS**: existen hallazgos críticos de seguridad, consistencia semántica FE↔BE, y calidad de implementación en controller.

---

## 2. Flujo de Datos

1. Usuario navega a vistas PGIRS (`InformePgirs`, `ResumenPgirs`, `variablesPGRIS`).
2. Las vistas instancian `pgirsService` y envían payload (`aps`, o `aps+anno+mes`, o `datatable`/objeto de alta).
3. `pgirsService` llama endpoints `/api/v1/pgirs/*` con header `x-access-token`.
4. `app.js` monta rutas: `app.use(apiv1 + 'pgirs', require('./modules/pgirs/routes'))` (`back-tarificador/src/app.js:31`).
5. `routes.js` delega en `controller.js`; según endpoint, responde con `res.send(...)` o `res.status(...).send(...)`.
6. `controller.js` ejecuta `db.open(sql, binds, true)` y retorna arrays Oracle u objeto `{status,response|data}`.

Trazabilidad base: **Vue View → pgirsService → /api/v1/pgirs/* → routes.js → controller.js → SQL Oracle**.

---

## 3. API Backend (6 endpoints)

Archivo de rutas: `back-tarificador/src/modules/pgirs/routes.js`.

### 3.1 POST `/api/v1/pgirs/infoPgirs`
- **Route/controller refs**: `routes.js:8-12`, `controller.js:6-10`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Body**: `{ aps }`
- **Controller**: `infoPgirs(aps)`
- **SQL**:
```sql
SELECT * FROM vgirs_informe WHERE apsid = :1
```
- **Binds**: `[:1=aps]`
- **Response AS-IS**: `res.send(array)`
- **Nota FE↔BE (inversión semántica)**: este endpoint lo consume `pgirsService.informePgirs()` (`front-tarificador/src/service/pgirsService.js:9-17`), aunque por nombre debería mapear al “resumen”.

### 3.2 POST `/api/v1/pgirs/informePgirs`
- **Refs**: `routes.js:16-20`, `controller.js:18-22`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Body**: `{ aps }`
- **Controller**: `informePgirs(aps)`
- **SQL**:
```sql
SELECT * FROM vpgir_infvariables
WHERE APSAID = :1
ORDER BY apsa_nomaps, periodo DESC
```
- **Binds**: `[:1=aps]`
- **Response**: `res.send(array)`
- **Nota FE↔BE (inversión semántica)**: este endpoint lo consume `pgirsService.resumenPgirs()` (`front-tarificador/src/service/pgirsService.js:55-63`), invirtiendo intención nominal “informe” vs “resumen”.

### 3.3 POST `/api/v1/pgirs/getVariablesPGRIS`
- **Refs**: `routes.js:23-27`, `controller.js:25-44`
- **Auth**: **No** (sin middleware)
- **Body**: `{ aps, anno, mes }`
- **Controller**: `getVariablesPGRIS(aps, anno, mes)`
- **SQL**:
```sql
SELECt * FROM vpirg_parametros
WHERE APSAID = :1 AND PGRIANNO = :2 AND PGRIMES = :3
```
- **Binds**: `[:1=aps, :2=anno, :3=mes]`
- **Response**: `200 => resResumen`, `500 => error` vía `res.status(resultado.status).send(resultado.response)`

### 3.4 POST `/api/v1/pgirs/editarVariablesPGIRS`
- **Refs**: `routes.js:30-37`, `controller.js:46-66`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Body**: `{ datatable }`
- **Controller**: `editarVariablesPGIRS(datatable)`
- **SQL**:
```sql
UPDATE TARIFICADOR.PGRI_PARAMETROS
SET PGRIVALOR = :1,
    PGRIFRECUENCIA = :2,
    PGRIFECHA = sysdate,
    PGRIUSUARIO = :3,
    pgringreso = 'MANUAL'
WHERE APSAID = :4
  AND PGRIANNO = :5
  AND PGRIMES = :6
  AND PGRIVARIABLE = :7
```
- **Binds**: `[:1=PGRIVALOR, :2=PGRIFRECUENCIA, :3=PGRIUSUARIO, :4=APSAID, :5=PGRIANNO, :6=PGRIMES, :7=PGRIVARIABLE]`
- **Response**: `200 => resultado`, `500 => "Error"`

### 3.5 POST `/api/v1/pgirs/nuevoVariablesPGRIS`
- **Refs**: `routes.js:41-45`, `controller.js:68-165`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Body**: objeto con variables `LBL,CESPED,PODA,LAVADO,PLAYAS,INSCESTAS,MANCESTAS`, selectores de frecuencia, `aps,anno,mes`
- **Controller**: `nuevoVariablesPGRIS(data, req.SISU_ID)`
- **SQL base (ejecutada 7 veces, una por variable)**:
```sql
INSERT INTO TARIFICADOR.PGRI_PARAMETROS
  (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIFECHA, PGRIUSUARIO)
VALUES
  (:1, :2, :3, :4, :5, :6, SYSDATE, :7)
```
- **Binds**: `[:1=aps, :2=anno, :3=mes, :4=codVariable, :5=valor, :6=frecuencia, :7=SISU_ID]`
- **Códigos variable**: `11(LBL), 21(CESPED), 22(PODA), 23(LAVADO), 24(PLAYAS), 25(INSCESTAS), 26(MANCESTAS)`
- **Response**: `200 => data: consultaSQL`, `500 => "Error"`

### 3.6 POST `/api/v1/pgirs/barridoVariablesPgirs`
- **Refs**: `routes.js:49-53`, `controller.js:12-16`
- **Auth**: Sí (`[authJwt.verificarToken]`)
- **Body**: `{ aps }`
- **Controller**: `barridoVariablesPgirs(aps)`
- **SQL**:
```sql
SELECT * FROM VGIRS_INFORMELBL WHERE apsid = :1
```
- **Binds**: `[:1=aps]`
- **Response**: `res.send(array)`

---

## 4. Base de Datos (5 objetos)

| # | Objeto | Tipo | Uso principal | Evidencia |
|---|---|---|---|---|
| 1 | `vgirs_informe` | Vista | `/infoPgirs` | `controller.js:7` |
| 2 | `VGIRS_INFORMELBL` | Vista | `/barridoVariablesPgirs` | `controller.js:13` |
| 3 | `vpgir_infvariables` | Vista | `/informePgirs` | `controller.js:19` |
| 4 | `vpirg_parametros` | Vista | `/getVariablesPGRIS` | `controller.js:28` |
| 5 | `TARIFICADOR.PGRI_PARAMETROS` | Tabla | `/editarVariablesPGIRS`, `/nuevoVariablesPGRIS` | `controller.js:51,71` |

> Nota AS-IS: en el alcance verificado no se encontró DDL `CREATE VIEW/CREATE TABLE`; inventario inferido desde SQL runtime del controller.

---

## 5. Frontend

### 5.1 Service `pgirsService.js` → endpoints

| Service method | Endpoint backend | Body | Ref |
|---|---|---|---|
| `informePgirs(aps)` | `POST pgirs/infoPgirs` | `{aps}` | `pgirsService.js:9-24` |
| `getBarridoVariablesPgirs(aps)` | `POST pgirs/barridoVariablesPgirs` | `{aps}` | `pgirsService.js:32-47` |
| `resumenPgirs(aps)` | `POST pgirs/informePgirs` | `{aps}` | `pgirsService.js:55-70` |
| `dataVariablesPGRIS(aps,anno,mes)` | `POST pgirs/getVariablesPGRIS` | `{aps,anno,mes}` | `pgirsService.js:77-95` |
| `nuevoVariablesPGRIS(data)` | `POST pgirs/nuevoVariablesPGRIS` | objeto completo variables+frecuencias+periodo | `pgirsService.js:103-115` |
| `upEditarVariablesPGIRS(datatable)` | `POST pgirs/editarVariablesPGIRS` | `{datatable}` | `pgirsService.js:123-139` |

**Inversión semántica FE↔BE explícita**:
- `pgirsService.informePgirs()` llama `pgirs/infoPgirs` (`pgirsService.js:16`).
- `pgirsService.resumenPgirs()` llama `pgirs/informePgirs` (`pgirsService.js:61`).

### 5.2 Vistas PGIRS y consumo real

| Archivo Vue | Método(s) clave | Service method consumido | Endpoint efectivo |
|---|---|---|---|
| `views/pgirs/InformePgirs.vue` | `actualizaInfoGeneral()` | `informePgirs`, `getBarridoVariablesPgirs` | `/infoPgirs`, `/barridoVariablesPgirs` |
| `views/pgirs/ResumenPgirs.vue` | `actualizaInfoGeneral()` | `resumenPgirs` | `/informePgirs` |
| `views/pgirs/variablesPGRIS.vue` | Wrapper/composición | `tableVariablesPGRIS` (delegado) | N/A directo |
| `components/pgirs/tableVariablesPGRIS.vue` | `consultarData()`, `guardar()`, `guardarNuevoElemento()` | `dataVariablesPGRIS`, `upEditarVariablesPGIRS`, `nuevoVariablesPGRIS` | `/getVariablesPGRIS`, `/editarVariablesPGIRS`, `/nuevoVariablesPGRIS` |
| `service/pgirsService.js` | capa HTTP | N/A | N/A |

---

## 6. Dependencias Cruzadas entre Módulos

### infogerenciales → PGIRS (dependencia rota)

`infogerenciales/routes.js` define endpoints PGIRS-like:
- `POST /api/v1/infogerencial/infoPgirs` (`infogerenciales/routes.js:44-49`)
- `POST /api/v1/infogerencial/informePgirs` (`infogerenciales/routes.js:58-63`)

Ambos invocan métodos en `infogerenciacontroller`:
- `infogerenciacontroller.infoPgirs(aps)` (`routes.js:46`)
- `infogerenciacontroller.informePgirs(aps)` (`routes.js:60`)

Pero en `infogerenciales/controller.js` esos métodos **no existen**; solo está `costoPoda` al final (`controller.js:61-65`, export en `:69`).

**Impacto AS-IS**: dependencia inter-módulo inconsistente; rutas activas con llamadas a funciones inexistentes, generando error de runtime (`TypeError ... is not a function`) si se invocan.

---

## 7. Hallazgos Críticos

### Hallazgo 1 — Endpoint sin auth middleware
- **Evidencia**: `/getVariablesPGRIS` no usa `[authJwt.verificarToken]` (`back-tarificador/src/modules/pgirs/routes.js:23-27`).
- **Contraste**: resto de endpoints del módulo sí tienen middleware (`routes.js:8,16,31,41,49`).
- **Impacto**: consulta de variables por APS/año/mes expuesta sin verificación backend.

### Hallazgo 2 — Variables globales implícitas en controller
- **Evidencia**: asignaciones `sql = ...` y `resultado = ...` sin `let/const` (`back-tarificador/src/modules/pgirs/controller.js:49,53`).
- **Impacto**: contaminación de scope global del módulo y riesgo de efectos colaterales concurrentes.

### Hallazgo 3 — Inversión semántica FE↔BE
- **Evidencia**:
  - `pgirsService.informePgirs()` → `pgirs/infoPgirs` (`front-tarificador/src/service/pgirsService.js:9-17`)
  - `pgirsService.resumenPgirs()` → `pgirs/informePgirs` (`front-tarificador/src/service/pgirsService.js:55-63`)
- **Impacto**: contrato nominal confuso; alto riesgo de errores en migración/refactor por expectativas invertidas.

### Hallazgo 4 — Dependencia cruzada rota en infogerenciales
- **Evidencia**: rutas `infogerencial/infoPgirs` y `infogerencial/informePgirs` llaman métodos inexistentes (`back-tarificador/src/modules/infogerenciales/routes.js:46,60`; `controller.js` sin implementación hasta `:69`).
- **Impacto**: error de runtime al consumir esas rutas; deuda técnica entre módulos.

### Hallazgo 5 — Manejo de errores FE frágil
- **Evidencia**: `catch` usa `err.response.status` sin guardas (`front-tarificador/src/service/pgirsService.js:26,49,71,97,117,140`).
- **Impacto**: ante timeout/CORS/falla de red puede explotar un error secundario (`Cannot read properties of undefined`).

---

## 8. Notas de Migración

1. Mantener contratos AS-IS en primera fase (sin cambios de endpoint) y normalizar semántica `informe/resumen` en versión controlada.
2. Endurecer seguridad: agregar middleware auth a `/getVariablesPGRIS` y validar impacto en consumidores existentes.
3. Eliminar globals implícitas (`sql`, `resultado`) con variables locales por request para evitar contaminación de estado.
4. Resolver dependencia cruzada infogerenciales↔pgirs: o implementar métodos faltantes en `infogerenciales/controller.js` o retirar rutas huérfanas.
5. Estandarizar responses backend (`send` vs `status(...).send`) y robustecer `catch` frontend con `err?.response?.status`.

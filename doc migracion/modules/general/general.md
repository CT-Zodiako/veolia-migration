---
title: "Módulo: General"
description: "Documentación AS-IS del módulo general (catálogos y parámetros)"
phase: "Maestros"
module: "general"
version: "1.0.0"
date: "2026-04-30"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/general/routes.js
  - back-tarificador/src/modules/general/controller.js
  - front-tarificador/src/service/GeneralService.js
  - front-tarificador/src/router/index.js
---

# Módulo: General (general)

## 1. Resumen Ejecutivo

El módulo `general` es un **servicio de catálogos** que expone **4 endpoints GET** bajo `/api/v1/general`. Proporciona listas de parámetros operativos consumidos por múltiples vistas del sistema: clases de uso, índices CRA, y parámetros de costos.

- **Cobertura API**: 4 endpoints (3 operativos + 1 placeholder).
- **Cobertura auth backend**: **4/4** con `authJwt.verificarToken` (100%).
- **Núcleo SQL**: consultas directas sobre `AUCO_CLASESUSO` y `AUGE_PARAMETROS`.
- **Estado AS-IS**: módulo estable como servicio de catálogo; endpoint `GET /:id` es placeholder.

---

## 2. Flujo de Datos

1. Vistas del sistema instancian `GeneralService` cuando necesitan cargar catálogos.
2. Service llama endpoints `/api/v1/general/*` con header `x-access-token`.
3. Backend monta rutas en `app.js`.
4. `routes.js` delega a `controller.js`.
5. `controller.js` ejecuta SQL de consulta y retorna arrays.

Trazabilidad base: **Vue View → GeneralService → /api/v1/general/* → controller.js → SQL Oracle**.

---

## 3. API Backend (4 endpoints)

Archivo de rutas: `back-tarificador/src/modules/general/routes.js`.

### 3.1 GET `/api/v1/general/consultauso`
- **Auth**: Sí (`routes.js:6`)
- **Controller**: `consuluso()` (`controller.js:6-12`)
- **SQL**:
```sql
SELECT * FROM auco_clasesuso
```
- **Binds**: `[]`
- **Response**: `res.send(array)`.

### 3.2 GET `/api/v1/general/paraindices`
- **Auth**: Sí (`routes.js:11`)
- **Controller**: `consulindices()` (`controller.js:14-20`)
- **SQL**:
```sql
SELECT para_para, para_nombre, para_descri 
FROM auge_parametros 
WHERE clas_clas = 20011 AND para_estado = 'A'
```
- **Binds**: `[]`
- **Response**: `res.send(array)`.

### 3.3 GET `/api/v1/general/paracostos`
- **Auth**: Sí (`routes.js:16`)
- **Controller**: `consultacostos()` (`controller.js:22-26`)
- **SQL**:
```sql
SELECT PARA_PARA, PARA_NOMBRE 
FROM AUGE_PARAMETROS 
WHERE CLAS_CLAS = 20010 AND PARA_ESTADO = 'A' 
ORDER BY PARA_NOMBRE
```
- **Binds**: `[]`
- **Response**: `res.send(array)`.

### 3.4 GET `/api/v1/general/:id`
- **Auth**: Sí (`routes.js:22`)
- **Estado AS-IS**: **TODO placeholder** — no implementado.
- **Response**: `res.send("mostar un registro especifico  ...")`.

---

## 4. Base de Datos

| # | Objeto | Tipo | Rol | Evidencia |
|---|---|---|---|---|
| 1 | `AUCO_CLASESUSO` | Tabla | Catálogo de clases de uso | `controller.js:7` |
| 2 | `AUGE_PARAMETROS` | Tabla | Catálogo general de parámetros | `controller.js:15,23` |

---

## 5. Frontend

### 5.1 Service principal

`front-tarificador/src/service/GeneralService.js` mapea:
- `getParaIndices()` → `GET general/paraindices`
- `getParaClases()` → `GET general/consultauso`
- `getParaCostos()` → `GET general/paracostos`

### 5.2 Consumidores (vistas que usan GeneralService)

| Vista | Método usado | Propósito |
|---|---|---|
| `suministros/Cra.vue` | `getParaIndices()` | Cargar nombres de índices para dropdown |
| `suministros/Descuentos.vue` | `getParaCostos()` | Cargar parámetros de costos |
| `suministros/DescuentosDos.vue` | `getParaCostos()` | Cargar parámetros de costos |
| `suministros/SubCon.vue` | `GeneralService` (instanciado) | Catálogos de subsidios |
| `proyecciones/SubsidiosContribuciones.vue` | `GeneralService` (instanciado) | Catálogos de proyección |

---

## 6. Hallazgos Críticos

### Hallazgo 1 — Variable global implícita
- **Evidencia**: `sql = ...` sin `let`/`const` en `consuluso()` (`controller.js:7`) y `consulindices()` (`controller.js:15`).
- **Impacto**: contaminación de scope global del módulo.

### Hallazgo 2 — Endpoint placeholder
- **Evidencia**: `GET /:id` devuelve string hardcodeado (`routes.js:23`).
- **Impacto**: superficie de API con contrato no operativo.

### Hallazgo 3 — Manejo de errores FE frágil
- **Evidencia**: `catch` con `AuthControl.verificarStatusCode(err)` sin guardas (`GeneralService.js:17,32,49`).
- **Impacto**: error secundario ante fallas de red/CORS/timeout.

---

## 7. Notas de Migración

1. Mantener `general` como servicio de catálogo transversal; no acoplar lógica de negocio.
2. Completar o retirar `GET /:id` según requerimiento real.
3. Declarar variables locales (`let sql = ...`) en controller.
4. Endurecer manejo de errores FE con guardas (`err?.response?.status`).

---

## 8. Métricas de Cierre

| Métrica | Valor |
|---|---|
| Endpoints documentados | 4/4 |
| Objetos DB inventariados | 2/2 |
| Hallazgos críticos documentados | 3 |
| Cobertura auth | 4/4 (100%) |
| Vistas consumidoras mapeadas | 5+ |
| Líneas de documentación | ~180 |

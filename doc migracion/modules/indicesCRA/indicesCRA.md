---
title: "Módulo: Índices CRA"
description: "Documentación AS-IS del módulo indicesCRA"
phase: "Maestros"
module: "indicesCRA"
version: "1.0.0"
date: "2026-04-30"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/indicesCRA/routes.js
  - back-tarificador/src/modules/indicesCRA/controller.js
  - front-tarificador/src/views/suministros/Cra.vue
  - front-tarificador/src/service/IndicesCraService.js
  - front-tarificador/src/router/index.js
---

# Módulo: Índices CRA (indicesCRA)

## 1. Resumen Ejecutivo

El módulo `indicesCRA` administra los **índices publicados por la Comisión de Regulación de Agua (CRA)** para el cálculo tarifario. Expone **6 endpoints** bajo `/api/v1/indices` y permite consultar, crear, editar y eliminar índices mensuales (IPC, SMLV, IPCC, IOEXP).

- **Cobertura API**: 6 endpoints.
- **Cobertura auth backend**: **6/6** con `authJwt.verificarToken` (100%).
- **Núcleo SQL**: consultas directas sobre tabla `AUCO_INDICESCRA` con secuencia `SAUCO_INDICESCRA`.
- **Estado AS-IS**: 3 endpoints son TODO placeholders o incompletos; hay defectos críticos de implementación en controller.

---

## 2. Flujo de Datos

1. Usuario accede a ruta `/cra` en frontend.
2. Vista `Cra.vue` instancia `IndicesCraService` y consulta índices por período.
3. Service llama endpoints `/api/v1/indices/*` con header `x-access-token`.
4. Backend monta rutas en `app.js`: `app.use(apiv1 + 'indices', require('./modules/indicesCRA/routes'))`.
5. `routes.js` delega a `controller.js`.
6. `controller.js` ejecuta SQL contra `AUCO_INDICESCRA`.

Trazabilidad base: **Cra.vue → IndicesCraService → /api/v1/indices/* → controller.js → AUCO_INDICESCRA**.

---

## 3. API Backend (6 endpoints)

Archivo de rutas: `back-tarificador/src/modules/indicesCRA/routes.js`.

### 3.1 POST `/api/v1/indices/consulta`
- **Auth**: Sí (`routes.js:6`)
- **Body**: `{ anno, mes }`
- **Controller**: `consulta(anno, mes)` (`controller.js:25-32`)
- **SQL**:
```sql
SELECT INDI_ID, PARA_INDICE20011, INDI_ANNO, INDI_MES, INDI_ESTADO, 
       TO_CHAR(INDI_VALOR) AS INDI_VALOR, TO_CHAR(INDI_MITADVALOR) AS INDI_MITADVALOR, 
       INDI_FECHACREACION, USUA_USUA 
FROM auco_indicescra 
WHERE indi_anno = :1 AND indi_mes = :2 AND indi_estado = 1
```
- **Binds**: `[:1=anno, :2=mes]`
- **Response**: `res.send(array)`.

### 3.2 GET `/api/v1/indices/:id`
- **Auth**: Sí (`routes.js:12`)
- **Estado AS-IS**: **TODO placeholder** — no implementado.
- **Controller**: No tiene función dedicada.
- **Response**: `res.send("mostar un registro especifico  ...")`.

### 3.3 GET `/api/v1/indices/`
- **Auth**: Sí (`routes.js:17`)
- **Controller**: `listar()` (`controller.js:34-40`)
- **SQL**:
```sql
SELECT * FROM auco_indicescra WHERE indi_estado = 1
```
- **Binds**: `[]`
- **Response**: `res.send(array)`.

### 3.4 POST `/api/v1/indices/crear`
- **Auth**: Sí (`routes.js:22`)
- **Body**: `{ anno, mes, val: [{id, val}, ...] }`
- **Controller**: `registro(anno, mes, valores, usuario)` (`controller.js:5-23`)
- **SQL** (por cada valor en loop):
```sql
INSERT INTO auco_indicescra 
VALUES (sauco_indicescra.nextval, :1, :2, :3, :4, :5, :6/2, sysdate, :7)
```
- **Binds por iteración**: `[:1=id, :2=anno, :3=mes, :4=estado(1), :5=valor, :6=valor, :7=usuario]`
- **Defecto AS-IS**: `db.open()` llamado **sin `await`** — retorna Promise, no resultado.
- **Response**: `res.send(resultado)`.

### 3.5 PUT `/api/v1/indices/editar`
- **Auth**: Sí (`routes.js:36`)
- **Body**: `{ anno, mes, val: [{id, val}, ...] }`
- **Controller**: `modificar(anno, mes, valores)` (`controller.js:42-52`)
- **SQL** (por cada valor en loop):
```sql
UPDATE auco_indicescra 
SET INDI_VALOR = :1, INDI_MITADVALOR = :2/2 
WHERE para_indice20011 = :3 AND indi_anno = :4 AND indi_mes = :5
```
- **Binds por iteración**: `[:1=valor.val, :2=valor.val, :3=valor.id, :4=anno, :5=mes]`
- **Defecto AS-IS**: `db.open()` llamado **sin `await`**.
- **Response**: `res.send(resultado)`.

### 3.6 DELETE `/api/v1/indices/eliminar/:id`
- **Auth**: Sí (`routes.js:45`)
- **Body**: `{ anno, mes }`
- **Params**: `:id` (indice)
- **Controller**: `eliminar(indice, anno, mes)` (`controller.js:54-60`)
- **SQL**:
```sql
UPDATE auco_indicescra SET indi_estado = 0 
WHERE para_indice20011 = :1 AND indi_anno = :2 AND indi_mes = :3 )
```
- **Defecto AS-IS**: **sintaxis SQL rota** — paréntesis de cierre extra al final.
- **Binds**: `[:1=indice, :2=anno, :3=mes]`
- **Defecto AS-IS adicional**: `db.open()` llamado **sin `await`**.
- **Response**: `res.send(resultado)`.

---

## 4. Base de Datos

| # | Objeto | Tipo | Rol | Evidencia |
|---|---|---|---|---|
| 1 | `AUCO_INDICESCRA` | Tabla | Almacena índices CRA por período | `controller.js:9,27,35,46,56` |
| 2 | `SAUCO_INDICESCRA` | Secuencia | Genera PK para nuevos registros | `controller.js:9` |

### DDL inferido (AUCO_INDICESCRA)
```sql
CREATE TABLE "TARIFICADOR"."AUCO_INDICESCRA" (
  "INDI_ID" NUMBER NOT NULL,
  "PARA_INDICE20011" NUMBER NOT NULL,
  "INDI_ANNO" NUMBER,
  "INDI_MES" NUMBER,
  "INDI_ESTADO" NUMBER DEFAULT 1,
  "INDI_VALOR" NUMBER,
  "INDI_MITADVALOR" NUMBER,
  "INDI_FECHACREACION" DATE DEFAULT SYSDATE,
  "USUA_USUA" NUMBER
);
```

---

## 5. Frontend

### 5.1 Service principal

`front-tarificador/src/service/IndicesCraService.js` mapea:
- `getIndices(anno, mes)` → `POST indices/consulta`
- `setIndices(anno, mes, valores)` → `POST indices/crear`
- `uptIndices(anno, mes, valores)` → `PUT indices/editar`

### 5.2 Vista principal

| Vista | Ruta | Métodos | Service | Descripción |
|---|---|---|---|---|
| `Cra.vue` | `/cra` | `actualizaInfo()`, `makeOperation()`, `onChangeDate()` | `IndicesCraService` | Gestión de índices CRA mensuales |

### 5.3 Flujo de operaciones

1. **Consulta**: Al montar vista o cambiar fecha, `actualizaInfo()` llama `getIndices(anno, mes)`.
2. **Decisión crear/editar**: Si hay datos → muestra botón "Editar"; si no → "Agregar".
3. **Modal**: `openBasic(isNew)` abre diálogo con campos IPC, SMLV, IPCC, IOEXP.
4. **Guardar**: `makeOperation()` llama `setIndices()` (nuevo) o `uptIndices()` (edición).

---

## 6. Hallazgos Críticos

### Hallazgo 1 — Falta de await en operaciones de escritura
- **Evidencia**: `registro()` (`controller.js:12`), `modificar()` (`controller.js:48`), `eliminar()` (`controller.js:57`) llaman `db.open()` sin `await`.
- **Impacto**: las operaciones retornan Promises sin resolver; el frontend recibe objetos Promise en lugar de resultados de BD.

### Hallazgo 2 — Sintaxis SQL rota en eliminar
- **Evidencia**: `UPDATE ... AND indi_mes = :3 )` (`controller.js:56`) — paréntesis de cierre extra.
- **Impacto**: error de sintaxis Oracle al ejecutar DELETE.

### Hallazgo 3 — Variable global implícita en loop
- **Evidencia**: `for (valor of valores)` sin `let`/`const` (`controller.js:8`, `controller.js:45`).
- **Impacto**: `valor` se vuelve global del módulo; riesgo de efectos colaterales en ejecuciones concurrentes.

### Hallazgo 4 — Endpoints TODO sin implementar
- **Evidencia**:
  - `GET /:id` devuelve string hardcodeado (`routes.js:13-15`).
  - `PUT /editar` tiene comentario `//TODO preguntar por implementacion` (`routes.js:37`).
  - `DELETE /eliminar/:id` tiene comentario `//TODO pendiente por verificar` (`routes.js:46`).
- **Impacto**: superficie de API con contratos no operativos.

### Hallazgo 5 — console.log en producción
- **Evidencia**: `console.log(resultado)` (`controller.js:30`).
- **Impacto**: información de BD potencialmente expuesta en logs de servidor.

### Hallazgo 6 — Frontend: falta de guarda en catch
- **Evidencia**: `AuthControl.verificarStatusCode(err)` sin validar que `err.response` exista (`IndicesCraService.js:21,41,61`).
- **Impacto**: error secundario si la petición falla por timeout/CORS.

---

## 7. Notas de Migración

1. **Corregir await**: agregar `await` a todas las llamadas `db.open()` en `controller.js` para garantizar resolución de Promises.
2. **Corregir SQL**: eliminar paréntesis extra en `eliminar` (`controller.js:56`).
3. **Declarar variables locales**: usar `for (let valor of valores)` o `for (const valor of valores)` en loops.
4. **Completar o retirar endpoints TODO**: implementar `GET /:id`, `PUT /editar` y `DELETE /eliminar/:id` según requerimiento real, o eliminar rutas si no se usan.
5. **Eliminar console.log**: remover logs de producción en controller.
6. **Endurecer manejo de errores FE**: agregar guardas `err?.response?.status` en service.
7. **Mantener auth**: la cobertura 100% es positiva; preservar en migración.

---

## 8. Métricas de Cierre

| Métrica | Valor |
|---|---|
| Endpoints documentados | 6/6 |
| Objetos DB inventariados | 2/2 |
| Hallazgos críticos documentados | 6 |
| Cobertura auth | 6/6 (100%) |
| Líneas de documentación | ~250 |

---
title: "Módulo: Rellenos Sanitarios"
description: "Documentación AS-IS del módulo maestro de rellenos sanitarios"
phase: "Maestros"
module: "rellenos"
version: "1.0.0"
date: "2026-04-29"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/rellenos/routes.js
  - back-tarificador/src/modules/rellenos/controller.js
  - front-tarificador/src/views/configuracion/Rellenos.vue
  - front-tarificador/src/components/rellConf/rellGrid.vue
  - front-tarificador/src/components/rellConf/formRell.vue
  - front-tarificador/src/service/RellenoService.js
  - TARIFICADOR.AUCO_RELLENOS
  - TARIFICADOR.AUCO_INFOAPSRELLENO
  - TARIFICADOR.SAUCO_RELLENOS
---

# Módulo: Rellenos Sanitarios

## 1. Resumen Ejecutivo
El módulo **Rellenos** administra el catálogo maestro de rellenos sanitarios usados en el cálculo tarifario de aseo. Un relleno puede marcarse como **propio o de terceros**, y **regional o no regional**. Adicionalmente, el módulo se conecta con información operativa mensual por APS y período en `AUCO_INFOAPSRELLENO` (QRS, costos, volúmenes, activos y escenario de lixiviados).

**Impacto funcional AS-IS:**
- **Fase 1 (Cargue/Certificación):** validaciones de existencia de información por APS/período.
- **Fase 3 (Integración SUI):** consistencia con formularios F35/F36 para disposición final y lixiviados.

---

## 2. Base de Datos

### 2.1 AUCO_RELLENOS (maestro)

| Campo | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| RELL_ID | NUMBER | NOT NULL | — | PK del relleno |
| RELL_NOMRELLENO | VARCHAR2(20) | NULL | — | Nombre corto del relleno |
| RELL_DESCRIPCION | CLOB | NOT NULL | — | Descripción detallada |
| RELL_ESTADO | NUMBER | NOT NULL | 1 | Estado lógico (1=Activo, 2=Inactivo) |
| RELL_PROPIO | NUMBER | NOT NULL | 1 | Tipo de propiedad (1=Propio, 0=Terceros) |
| RELL_FECHACREACION | DATE | NULL | SYSDATE | Fecha de creación |
| RELL_REGIONAL | NUMBER | NOT NULL | 0 | Marca regional (1=Sí, 0=No) |
| USUA_USUA | NUMBER | NOT NULL | 0 | Usuario creador |
| RELL_NUSD | VARCHAR2(30) | NULL | — | Código NUSD del relleno |

### 2.2 AUCO_INFOAPSRELLENO (operativo)

| Campo | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| IARE_ID | NUMBER | NOT NULL | — | PK del registro operativo |
| APSA_ID | NUMBER | NOT NULL | — | APS asociada |
| RELL_ID | NUMBER | NOT NULL | — | FK al relleno |
| IARE_ANNO | NUMBER | NOT NULL | — | Año del período |
| IARE_MES | NUMBER | NOT NULL | — | Mes del período |
| IARE_QRS | FLOAT | NOT NULL | — | Promedio mensual de residuos sólidos recibidos (ton) |
| IARE_CDFK | FLOAT | NOT NULL | 0 | Costo de disposición final (prestador diferente al propio) |
| IARE_VACDFABC | FLOAT | NOT NULL | 0 | Activos aportados para DF a precios dic-2014 |
| IARE_VACDF | FLOAT | NOT NULL | 0 | Activos totales en DF a precios dic-2014 |
| IARE_VL | FLOAT | NOT NULL | 0 | Volumen promedio mensual de lixiviados tratados (m³/mes) |
| IARE_CTMLX | FLOAT | NOT NULL | 0 | Costo tasa ambiental por vertimiento de lixiviados ($/m³-mes) |
| IARE_CTLK | FLOAT | NOT NULL | 0 | Costo de tratamiento de lixiviados para terceros |
| IARE_VACTLABC | FLOAT | NOT NULL | 0 | Activos aportados para TL a precios dic-2014 |
| IARE_VACTL | FLOAT | NOT NULL | 0 | Activos totales para TL a precios dic-2014 |
| IARE_ESCENARIO | NUMBER | NOT NULL | 0 | Escenario de remoción de contaminantes (1-5) |
| IARE_FECHACREACION | DATE | NULL | SYSDATE | Fecha de creación |
| USUA_USUA | NUMBER | NOT NULL | 0 | Usuario creador |
| IARE_C | FLOAT | NOT NULL | 0 | Promedio toneladas mensuales de RS regional (INCrellreg) |

> Confirmación AS-IS: `AUCO_INFOAPSRELLENO` tiene **18 campos** (no 19).

### 2.3 Secuencias y Constraints

| Tipo | Nombre | Definición |
|---|---|---|
| Secuencia | SAUCO_RELLENOS | Genera `RELL_ID` con `NEXTVAL` |
| PK | PK_AUCO_RELLENOS | `AUCO_RELLENOS(RELL_ID)` |
| PK | PK_AUCO_INFOAPSRELLENO | `AUCO_INFOAPSRELLENO(IARE_ID)` |
| UK | IXAUCO_INFOAPSRELLENO01 | `AUCO_INFOAPSRELLENO(APSA_ID, RELL_ID, IARE_ANNO, IARE_MES)` |
| FK | AUCO_APSRELLENO_APSA_RELL_FKEY | `AUCO_INFOAPSRELLENO(APSA_ID, RELL_ID)` → `AUCO_APSRELLENO(APSA_ID, RELL_ID)` |

**Grants:**
- `SELECT, INSERT, UPDATE, DELETE` sobre `AUCO_INFOAPSRELLENO` al rol `RELIQ`.

### 2.4 Catálogos de Valores

**RELL_ESTADO**

| Valor | Significado |
|---|---|
| 1 | Activo |
| 2 | Inactivo |

**RELL_PROPIO**

| Valor | Significado |
|---|---|
| 1 | Propio |
| 0 | De terceros |

**RELL_REGIONAL**

| Valor | Significado |
|---|---|
| 1 | Regional |
| 0 | No regional |

**IARE_ESCENARIO**

| Valor | Significado |
|---|---|
| 1-4 | Objetivos de calidad de remoción de contaminantes |
| 5 | Sin planta de tratamiento; aplica costo máximo por recirculación |

---

## 3. API Backend

### 3.1 GET /rellenos
**Descripción:** Lista todos los rellenos ordenados por nombre.

**Auth:** Requiere `authJwt`.

**Request:** Sin body.

**Response:** Array de rellenos.

**SQL exacto:**
```sql
SELECT * FROM auco_rellenos ORDER BY RELL_NOMRELLENO
```

### 3.2 POST /rellenos/consultarrelleno
**Descripción:** Consulta un relleno por ID.

**Auth:** Requiere `authJwt`.

**Request Body:**

| Campo | Tipo | Requerido |
|---|---|---|
| RELL_ID | number | Sí |

**Response:** Objeto relleno.

**SQL exacto:**
```sql
SELECT * FROM auco_rellenos WHERE rell_id = :RELL_ID
```

### 3.3 POST /rellenos/crear
**Descripción:** Crea un relleno sanitario.

**Auth:** Requiere `authJwt`.

**Request Body:**

| Campo | Tipo | Requerido | Origen |
|---|---|---|---|
| RELL_NOMRELLENO | string | Sí | Formulario |
| RELL_DESCRIPCION | string | Sí | Formulario |
| RELL_ESTADO | number | Sí | Formulario |
| RELL_PROPIO | number | Sí | Formulario |
| RELL_REGIONAL | number | Sí | Formulario |
| RELL_NUSD | string | No | Formulario |
| SISU_ID | number | Sí | Sesión (`req.SISU_ID`) |

**Response:** `{ message: "Creado correctamente" }`

**SQL exacto:**
```sql
INSERT INTO AUCO_RELLENOS (RELL_ID, RELL_NOMRELLENO, RELL_DESCRIPCION, RELL_ESTADO, RELL_PROPIO, RELL_REGIONAL, USUA_USUA, RELL_NUSD)
VALUES (SAUCO_RELLENOS.nextval, :NOMRELLENO, :DESCRIPCION, :ESTADO, :PROPIO, :REGIONAL, :USUA, :NUSD)
```

**Lógica:** `USUA_USUA = req.SISU_ID`.

### 3.4 PUT /rellenos/editar/:id (⚠️ CRÍTICO)
**Descripción:** Actualiza un relleno existente.

**Auth:** Requiere `authJwt`.

**URL Params:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | number | `RELL_ID` a editar |

**Request Body:** mismos campos de crear (excepto `SISU_ID`).

**Response:** `{ message: "Actualizado correctamente" }`

**SQL exacto:**
```sql
UPDATE AUCO_RELLENOS 
SET RELL_NOMRELLENO = :1, 
    RELL_DESCRIPCION = :2, 
    RELL_ESTADO = :3, 
    RELL_PROPIO = :4, 
    RELL_REGIONAL = :5, 
    RELL_NUSD = :6
WHERE rell_id = :1
```

⚠️ **CRÍTICO:** el `WHERE` usa `:1` (bind de `RELL_NOMRELLENO`) en lugar del `id` de URL. Riesgo de no actualización o actualización incorrecta.

### 3.5 DELETE /rellenos/eliminar/:id (⚠️ CRÍTICO)
**Descripción:** Borrado lógico de un relleno.

**Auth:** Requiere `authJwt`.

**URL Params:**

| Campo | Tipo | Descripción |
|---|---|---|
| id | number | `RELL_ID` a eliminar |

**Response:** `{ message: "Eliminado correctamente" }`

**SQL exacto:**
```sql
UPDATE AUCO_RELLENOS SET empr_estado = 2 WHERE rell_id = :id
```

⚠️ **CRÍTICO:** usa `empr_estado` en vez de `RELL_ESTADO`; la actualización lógica falla por columna incorrecta.

---

## 4. Frontend

### 4.1 Ruta y Navegación

| Elemento | Valor |
|---|---|
| Ruta | `/rellenos` |
| Menú | Configuración → Rellenos |
| Protección | Sí, requiere sesión/autorización |

### 4.2 Componentes Vue

| Componente | Rol | Props/Estado | Métodos/Eventos |
|---|---|---|---|
| `Rellenos.vue` | Vista contenedora | Estado de modal crear/editar | Renderiza grilla + formulario; orquesta apertura/cierre |
| `rellGrid.vue` | Grilla/listado | Lista de rellenos | `getRellenos()`, `openEdit(relleno)`; emite evento de edición |
| `formRell.vue` | Formulario modal | Modo crear/editar + datos del relleno | `guardar()`; decide `newRell` vs `updtRell` |

**Campos de formulario AS-IS:**
- `RELL_NOMRELLENO`
- `RELL_DESCRIPCION`
- `RELL_ESTADO`
- `RELL_PROPIO`
- `RELL_REGIONAL`
- `RELL_NUSD`

### 4.3 Servicios

| Método | HTTP | Endpoint | Descripción |
|---|---|---|---|
| `getRellenos()` | GET | `/rellenos` | Lista rellenos |
| `getRellbyId(id)` | POST | `/rellenos/consultarrelleno` | Consulta por ID |
| `newRell(data)` | POST | `/rellenos/crear` | Crea relleno |
| `updtRell(id, data)` | PUT | `/rellenos/editar/:id` | Edita relleno |
| `delRell(id)` | DELETE | `/rellenos/eliminar/:id` | Elimina relleno (lógico) |

---

## 5. Dependencias Funcionales

### 5.1 Validación: fauco_existerelleno
- **Ubicación:** `PK_VALGRAL.fauco_existerelleno(aps, anno, mes)`.
- **Propósito:** valida existencia de información de relleno para APS/período en certificación.
- **Consumo:** `Validaciones.js` + `validaciones/controller.js`.

### 5.2 Información Gerencial: infoapsrelleno
- **Fuente de datos:** `AUCO_INFOAPSRELLENO` + `AUCO_RELLENOS`.
- **Propósito:** consulta operativa mensual (QRS, costos DF/TL, volúmenes, activos).
- **Consumo:** `InfoGerencialService.js` + `infogerenciales/controller.js`.

### 5.3 SUI: F35/F36
- **F35 (Disposición final):** depende de `QRS`, `CDFK`, `VACDF`.
- **F36 (Lixiviados):** depende de `VL`, `CTMLX`, `CTLK`, `VACTL`, `ESCENARIO`.

---

## 6. Flujo de Datos (Trazabilidad Completa)

| Actor | Acción | Componente Vue | Service | HTTP | Endpoint | Controller | SQL/PLSQL | BD |
|---|---|---|---|---|---|---|---|---|
| Usuario Configuración | Listar rellenos | `rellGrid.vue` | `getRellenos()` | GET | `/rellenos` | `rellenos/controller.getRellenos` | `SELECT * FROM auco_rellenos ORDER BY RELL_NOMRELLENO` | `AUCO_RELLENOS` |
| Usuario Configuración | Consultar relleno por ID | `formRell.vue` (modo edición) | `getRellbyId(id)` | POST | `/rellenos/consultarrelleno` | `rellenos/controller.consultarRelleno` | `SELECT * FROM auco_rellenos WHERE rell_id = :RELL_ID` | `AUCO_RELLENOS` |
| Usuario Configuración | Crear relleno | `formRell.vue` | `newRell(data)` | POST | `/rellenos/crear` | `rellenos/controller.crear` | `INSERT INTO AUCO_RELLENOS (...) VALUES (SAUCO_RELLENOS.nextval, ...)` | `AUCO_RELLENOS`, `SAUCO_RELLENOS` |
| Usuario Configuración | Editar relleno | `rellGrid.vue` + `formRell.vue` | `updtRell(id,data)` | PUT | `/rellenos/editar/:id` | `rellenos/controller.modificar` | `UPDATE AUCO_RELLENOS ... WHERE rell_id = :1` ⚠️ | `AUCO_RELLENOS` |
| Usuario Configuración | Eliminar lógico relleno | `rellGrid.vue` | (acción delete del módulo) | DELETE | `/rellenos/eliminar/:id` | `rellenos/controller.eliminar` | `UPDATE AUCO_RELLENOS SET empr_estado = 2 WHERE rell_id = :id` ⚠️ | `AUCO_RELLENOS` |
| Sistema Certificación | Validar existencia de info relleno | `Validaciones.js` | `certificarfauco_existerelleno` | POST | `/validaciones/certificarfauco_existerelleno` | `validaciones/controller` | `PK_VALGRAL.fauco_existerelleno(aps, anno, mes)` | `AUCO_INFOAPSRELLENO` |
| Usuario/Analista | Consulta gerencial por APS/período | `InfoGerencial` (vista) | `InfoGerencialService` | POST/GET (según endpoint) | `infoapsrelleno` | `infogerenciales/controller` | Consulta sobre QRS/CDFK/VL/CTLK/... | `AUCO_INFOAPSRELLENO`, `AUCO_RELLENOS` |

---

## 7. Hallazgos Críticos para Migración

| # | Riesgo | Severidad | Evidencia AS-IS | Recomendación para migración |
|---|---|---|---|---|
| 1 | `PUT /editar/:id` usa bind incorrecto en WHERE | CRÍTICO | `WHERE rell_id = :1` con `:1 = RELL_NOMRELLENO` | En .NET usar `WHERE RELL_ID = @id` tipado y testeado |
| 2 | `DELETE /eliminar/:id` usa columna incorrecta | CRÍTICO | `empr_estado` no pertenece a `AUCO_RELLENOS` | Cambiar a `RELL_ESTADO` en borrado lógico |
| 3 | Rutas mutantes sin `await` explícito | ALTO | Riesgo de responder antes de persistir | Asegurar async/await y manejo transaccional |
| 4 | Autorización inconsistente en dependencias | MEDIO | Endpoints de validaciones pueden no exponer auth homogéneo | Estandarizar política auth por endpoint |
| 5 | Relación APS-Relleno no evidente en capa API | MEDIO | Relación fuerte está en `AUCO_INFOAPSRELLENO`/FK a `AUCO_APSRELLENO` | Documentar y modelar explícitamente relación en dominio |

---

## 8. Notas de Migración a .NET/Angular

### Backend (.NET + EF Core)
- Modelar entidades `Relleno` e `InfoApsRelleno` con PK/UK/FK equivalentes.
- Mapear secuencia `SAUCO_RELLENOS` con strategy de secuencia (`HasSequence` / HiLo según decisión del equipo).
- Mapear `RELL_DESCRIPCION` como `CLOB` en Oracle provider.
- Corregir en implementación target:
  - `PUT`: filtrar por `RELL_ID` real.
  - `DELETE`: actualizar `RELL_ESTADO`.
- Asegurar `await` en operaciones mutantes y manejo de errores de integridad.

### Frontend (Angular)
- Separar en container/presentational:
  - `RellenosComponent` (contenedor)
  - `RellGridComponent` (grilla)
  - `RellFormComponent` (form modal)
- Migrar servicio a `HttpClient` con métodos equivalentes a `RellenoService`.
- Implementar `Reactive Forms` con validaciones mínimas de nombre/descripcion.
- Normalizar estados/catálogos (`ESTADO`, `PROPIO`, `REGIONAL`, `ESCENARIO`) en constantes compartidas.

### Base de Datos
- Mantener estructura actual para migración AS-IS.
- Revisar índice/estrategia de acceso si crece volumen en `AUCO_INFOAPSRELLENO`.

---

## 9. Archivos Relacionados

### Backend
- `back-tarificador/src/modules/rellenos/routes.js`
- `back-tarificador/src/modules/rellenos/controller.js`
- `back-tarificador/src/modules/validaciones/routes.js`
- `back-tarificador/src/modules/validaciones/controller.js`
- `back-tarificador/src/modules/infogerenciales/routes.js`
- `back-tarificador/src/modules/infogerenciales/controller.js`

### Frontend
- `front-tarificador/src/views/configuracion/Rellenos.vue`
- `front-tarificador/src/components/rellConf/rellGrid.vue`
- `front-tarificador/src/components/rellConf/formRell.vue`
- `front-tarificador/src/service/RellenoService.js`
- `front-tarificador/src/service/Validaciones.js`
- `front-tarificador/src/service/InfoGerencialService.js`

### Base de Datos
- `TARIFICADOR.AUCO_RELLENOS`
- `TARIFICADOR.AUCO_INFOAPSRELLENO`
- `TARIFICADOR.SAUCO_RELLENOS`
- `PK_VALGRAL.fauco_existerelleno`

---
title: "Módulo: Kilómetros"
description: "Documentación AS-IS del módulo insumo de kilómetros (LBL)"
phase: "Insumos"
module: "kilometros"
version: "1.0.0"
date: "2026-04-29"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/kilometros/routes.js
  - back-tarificador/src/modules/kilometros/controller.js
  - front-tarificador/src/service/KilometrosService.js
  - front-tarificador/src/views/procesos/Calculo.vue
  - TARIFICADOR.VAUCO_LBL
---

# Módulo: Kilómetros (LBL)

## 1. Resumen Ejecutivo
El módulo **kilometros** funciona AS-IS como **insumo de Fase 2 (cálculo de tarifas)**. Su responsabilidad es consultar y entregar serie histórica LBL para un `aps` y período (`anno`, `mes`) y alimentar visualización en `Calculo.vue`.

El flujo vigente está implementado con **servicio dedicado** (`KilometrosService.js`), endpoint backend específico (`POST /api/v1/kilometros/lbl`) y fuente de datos Oracle `VAUCO_LBL`.

## 2. Base de Datos

### 2.1 VAUCO_LBL (vista)
Vista Oracle consumida por el endpoint LBL.

**Columnas (7):**
1. `APS`
2. `EMPRESA`
3. `MPIO`
4. `ANNO`
5. `MES`
6. `VALOR`
7. `ESTADO`

La vista se define en `TARIFICADOR.VAUCO_LBL` y se construye desde `AUCO_APSEMPRDIVI` + `AUCO_INFOEMPRDIVI`.

**Nota AS-IS:** aunque la vista tiene 7 columnas, el endpoint proyecta 5 (`aps, empresa, mpio, mes, valor`) y filtra `estado = 1`.

## 3. API Backend
Base path: `/api/v1/kilometros` (método `POST`, protegido por token JWT via `x-access-token`).

### 3.1 POST /api/v1/kilometros/lbl
Obtiene serie LBL para una ventana temporal fija.

**Request body:**
```json
{ "aps": "number|string", "anno": "number", "mes": "number" }
```

**SQL exacto:**
```sql
SELECT aps, empresa, mpio, mes, valor
  FROM vauco_lbl
 WHERE aps = :1
   AND estado = 1
   AND anno*12+mes BETWEEN (:2*12+:3)-6 AND :2*12+:3
```

**Binds exactos:**
- `:1 = aps`
- `:2 = anno`
- `:3 = mes`

**Regla funcional crítica (hardcode):**
- Ventana temporal fija de **6 meses hacia atrás** hasta el período consultado.
- Fórmula actual: `anno*12+mes BETWEEN (:2*12+:3)-6 AND :2*12+:3`.

## 4. Frontend

### 4.1 KilometrosService.js
Servicio dedicado del módulo (a diferencia de toneladas, que usa servicio transversal).

Responsabilidades AS-IS:
- `getConsultalbl(aps, anno, mes)`: hace `POST` a `kilometros/lbl` con header `x-access-token`.
- `getChartKilometros(...)`: transforma respuesta Oracle a estructura Chart.js:
  - `labels` ← `nombreMes(MES)`
  - `datasets[].data` ← `VALOR`

### 4.2 Calculo.vue (orquestación)
En el flujo de Fase 2, `actualizaInfoGeneral()` ejecuta carga paralela con `Promise.all` e incluye kilómetros.

Integración AS-IS:
- Invoca método de carga de kilómetros.
- Asigna resultado transformado a `chartLbl`.
- Renderiza panel **Kilómetros / LBL** con **Chart.js tipo `horizontalBar`**.

## 5. Flujo de Datos (Trazabilidad)
1. **Actor/UI**: usuario en pantalla de cálculo tarifario (`Calculo.vue`).
2. **Frontend Service**: `KilometrosService.getConsultalbl(aps, anno, mes)`.
3. **HTTP**: `POST /api/v1/kilometros/lbl` con `{ aps, anno, mes }` y `x-access-token`.
4. **Route/Middleware**: `routes.js` aplica verificación JWT.
5. **Controller**: `controller.js` ejecuta SQL con binds `[:1,:2,:3]`.
6. **Base de datos**: consulta `TARIFICADOR.VAUCO_LBL` con filtro `estado = 1` y ventana `-6` meses.
7. **Adaptación frontend**: `getChartKilometros()` mapea `MES/VALOR` a `labels/data`.
8. **Visualización**: `Calculo.vue` renderiza chart `horizontalBar` en `chartLbl`.

## 6. Hallazgos Críticos
1. **Ventana temporal hardcodeada**: lógica `-6` embebida en SQL, sin parametrización.
2. **Acoplamiento a contrato Oracle**: frontend depende de shape/casing de columnas del driver.
3. **Manejo de errores mejorable**: riesgo de fallas silenciosas en carga/render de gráfico.
4. **Dependencia de vista legacy**: reglas de negocio apoyadas en `VAUCO_LBL` y esquema TARIFICADOR.

## 7. Notas de Migración
- Mantener paridad funcional inicial: mismo endpoint, mismos binds, misma ventana temporal y mismo shape consumido por frontend.
- Registrar deuda técnica para fase TO-BE:
  1. Parametrizar ventana temporal (evitar `-6` hardcodeado).
  2. Normalizar contrato de salida backend (DTO explícito, casing consistente).
  3. Robustecer manejo de errores en frontend.
  4. Mantener explícito que kilometros es **insumo** de Fase 2.

## 8. Archivos Relacionados
- `back-tarificador/src/modules/kilometros/routes.js` — rutas y middleware JWT del módulo.
- `back-tarificador/src/modules/kilometros/controller.js` — SQL y ejecución de consulta LBL.
- `front-tarificador/src/service/KilometrosService.js` — cliente HTTP y adaptación a Chart.js.
- `front-tarificador/src/views/procesos/Calculo.vue` — orquestación Fase 2 y render de `chartLbl`.
- `TARIFICADOR.VAUCO_LBL` — vista Oracle origen de datos.

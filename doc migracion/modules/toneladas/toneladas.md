---
title: "Módulo: Toneladas"
description: "Documentación AS-IS del módulo insumo de toneladas para cálculo de tarifas"
phase: "Insumos"
module: "toneladas"
version: "1.0.0"
date: "2026-04-29"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/toneladas/routes.js
  - back-tarificador/src/modules/toneladas/controller.js
  - front-tarificador/src/service/CostoService.js
  - front-tarificador/src/views/procesos/Calculo.vue
  - TARIFICADOR.VAUCO_TONELADAS
  - TARIFICADOR.AUCO_INFOAPSEMPRDIVI
  - TARIFICADOR.AUCO_APSEMPRDIVI
---

# Módulo: Toneladas

## 1. Resumen Ejecutivo
El módulo **toneladas** en el AS-IS funciona como **insumo de Fase 2 (Cálculo de tarifas)** y no como módulo maestro autónomo. Su responsabilidad actual es exponer datos agregados/detallados de toneladas por `aps`, `anno` y `mes` para alimentar visualizaciones y cálculos de la pantalla `Calculo.vue`.

El flujo operativo vigente está acoplado al servicio transversal `CostoService.js` (no existe `ToneladasService` dedicado), con tres endpoints backend bajo `/api/v1/toneladas`: `qrt`, `qa` y `detalle`.

## 2. Base de Datos

### 2.1 VAUCO_TONELADAS (vista)
Vista base consumida por los endpoints de toneladas.

**Columnas (7):**
1. `APS`
2. `EMPRESA`
3. `MPIO`
4. `ANNO`
5. `MES`
6. `TIPO`
7. `VALOR`

**Tipos de toneladas modelados en la vista (5):**
- `QBL`
- `QLU`
- `QNA`
- `QA`
- `TAFNA`

La vista se construye por `UNION` de proyecciones sobre tablas base de tarificador y consolida esos 5 tipos bajo el campo `TIPO`.

### 2.2 Tablas Base
Origen principal de datos de la vista:

- `TARIFICADOR.AUCO_INFOAPSEMPRDIVI` (**32 columnas**): contiene métricas de negocio por APS/empresa/división, incluyendo campos fuente de toneladas (`IAED_QBL`, `IAED_QLU`, `IAED_QNA`, `IAED_QA`, `IAED_TAFNA`, entre otros).
- `TARIFICADOR.AUCO_APSEMPRDIVI` (**7 columnas**): relación APS-empresa-división y estado operativo.

Relación funcional relevante AS-IS: join con condición de vigencia `APEM_ESTADO = 1` para materializar la vista consumida por el módulo.

### 2.3 Matriz de Tipos

| Tipo | Presencia | Uso en `/qrt` | Uso en `/qa` | Uso en `/detalle` |
|---|---|---|---|---|
| QBL | Sí (VAUCO_TONELADAS) | Incluido (`NOT IN ('QA','TAFNA')`) | Excluido (`IN ('QA')`) | Incluido (`NOT IN ('TAFNA')`) |
| QLU | Sí (VAUCO_TONELADAS) | Incluido (`NOT IN ('QA','TAFNA')`) | Excluido (`IN ('QA')`) | Incluido (`NOT IN ('TAFNA')`) |
| QNA | Sí (VAUCO_TONELADAS) | Incluido (`NOT IN ('QA','TAFNA')`) | Excluido (`IN ('QA')`) | Incluido (`NOT IN ('TAFNA')`) |
| QA | Sí (VAUCO_TONELADAS) | Excluido (`NOT IN ('QA','TAFNA')`) | Incluido (exclusivo) | Incluido (`NOT IN ('TAFNA')`) |
| TAFNA | Sí (VAUCO_TONELADAS) | Excluido (`NOT IN ('QA','TAFNA')`) | Excluido (`IN ('QA')`) | Excluido (`NOT IN ('TAFNA')`) |

## 3. API Backend
Base path: `/api/v1/toneladas` (métodos `POST`, protegido por middleware de token).
Payload común: `{ aps, anno, mes }`.

### 3.1 POST /api/v1/toneladas/qrt
Obtiene agregado para QRT, excluyendo `QA` y `TAFNA`, con ventana temporal móvil.

**SQL exacto:**
```sql
SELECT aps, empresa, tipo, ROUND(SUM(valor)/6,4) AS VALOR
FROM vauco_toneladas QRT
WHERE tipo NOT IN ('QA','TAFNA') AND aps = :1 AND anno*12+mes BETWEEN  (:2*12+:3)-6 AND :2*12+:3
GROUP BY aps, empresa, tipo
ORDER BY aps, empresa, tipo
```

**Respuesta esperada (shape):**
- `APS`
- `EMPRESA`
- `TIPO`
- `VALOR`

### 3.2 POST /api/v1/toneladas/qa
Obtiene serie de QA para la misma ventana temporal.

**SQL exacto:**
```sql
SELECT aps, empresa, anno, mes, valor
FROM vauco_toneladas QA
WHERE tipo IN ('QA') AND aps = :1 AND anno*12+mes BETWEEN (:2*12+:3)-6 AND :2*12+:3
```

**Respuesta esperada (shape):**
- `APS`
- `EMPRESA`
- `ANNO`
- `MES`
- `VALOR`

### 3.3 POST /api/v1/toneladas/detalle (⚠️ SELECT *)
Retorna detalle transversal de toneladas (excepto `TAFNA`) para la misma ventana temporal.

**SQL exacto:**
```sql
SELECT *
FROM vauco_toneladas QA
WHERE tipo NOT IN ('TAFNA') AND aps = :1 AND anno*12+mes BETWEEN (:2*12+:3)-6 AND :2*12+:3
```

⚠️ **Riesgo explícito AS-IS**: uso de `SELECT *` acopla el contrato API al esquema físico de la vista y aumenta fragilidad ante cambios de columnas.

## 4. Frontend

### 4.1 CostoService.js
El consumo frontend de toneladas está acoplado a `front-tarificador/src/service/CostoService.js`:

- `getQrt()` → llama `/toneladas/qrt`.
- `getQa()` → llama `/toneladas/qa`.
- `getQrtChart()` → adapta respuesta a doughnut (`labels <- TIPO`, `data <- VALOR`).
- `getQachart()` → adapta respuesta a bar (`labels <- nombreMes(MES)`, `data <- VALOR`).

**Nota de arquitectura AS-IS:** no existe `ToneladasService`; toneladas comparte servicio con otros dominios de costo.

### 4.2 Calculo.vue (orquestación)
En `front-tarificador/src/views/procesos/Calculo.vue`, la función `actualizaInfoGeneral()` orquesta llamadas paralelas de insumos de Fase 2, incluyendo toneladas.

Para toneladas:
- dispara `getQrt()` y `getQa()` dentro de la carga general,
- consume/adapta datasets,
- renderiza `chartQrt` y `chartQa`.

Rol funcional: toneladas participa como **insumo** dentro del proceso de cálculo, no como flujo independiente de negocio.

## 5. Flujo de Datos (Trazabilidad)
Trazabilidad AS-IS extremo a extremo:

1. **Actor**: usuario operativo en pantalla de cálculo tarifario.
2. **Frontend Vista**: `Calculo.vue` inicia `actualizaInfoGeneral()`.
3. **Frontend Servicio**: `CostoService` (`getQrt`, `getQa`, `getQrtChart`, `getQachart`).
4. **HTTP**: `POST /api/v1/toneladas/{qrt|qa|detalle}` con `{ aps, anno, mes }`.
5. **Endpoint Backend**: rutas/controlador de toneladas (`routes.js`/`controller.js`).
6. **SQL**: ejecución de queries sobre `VAUCO_TONELADAS` (filtros por tipo + ventana `(:2*12+:3)-6 ... :2*12+:3`).
7. **BD**: vista `TARIFICADOR.VAUCO_TONELADAS` y tablas base `AUCO_INFOAPSEMPRDIVI` + `AUCO_APSEMPRDIVI`.

## 6. Hallazgos Críticos
1. **Promedio potencialmente inconsistente en QRT**: ventana de 7 periodos (`-6..0`, incluyente) con división fija por 6 (`SUM(valor)/6`).
2. **Contrato frágil en `/detalle`**: `SELECT *` expone cambios de esquema directamente al consumidor.
3. **Acoplamiento en servicio transversal**: toneladas depende de `CostoService` compartido, reduciendo aislamiento evolutivo.
4. **Endpoint `/detalle` sin trazabilidad de uso UI tan explícita como `/qrt` y `/qa`**: riesgo de consumidor externo no inventariado o contrato huérfano.
5. **Dependencia fuerte de DDL/vista legacy**: reglas de negocio embebidas en la vista y tablas base del esquema TARIFICADOR dificultan refactor incremental.

## 7. Notas de Migración
- Mantener **paridad funcional AS-IS** en primera iteración: mismos filtros por tipo, misma ventana temporal y mismo shape esperado por frontend.
- Backend .NET: reemplazar `SELECT *` por DTO explícito en iteraciones posteriores, preservando comportamiento observado inicialmente.
- Frontend Angular: separar cliente HTTP de adaptadores de chart para testabilidad, pero sin romper contrato (`TIPO`, `VALOR`, `MES`) al migrar.
- Registrar deuda técnica de arquitectura: extracción futura de `ToneladasService` dedicado tras estabilizar Fase 2.
- Tratar toneladas explícitamente como **insumo** en documentación y diseño de migración (no como maestro).

## 8. Archivos Relacionados
- `back-tarificador/src/modules/toneladas/routes.js` — define rutas `/qrt`, `/qa`, `/detalle` y middleware de seguridad.
- `back-tarificador/src/modules/toneladas/controller.js` — contiene SQL y ejecución de consultas.
- `front-tarificador/src/service/CostoService.js` — cliente HTTP y transformaciones de datos para charts.
- `front-tarificador/src/views/procesos/Calculo.vue` — orquestación de carga en Fase 2 y render de visualizaciones.
- `TARIFICADOR.VAUCO_TONELADAS` — vista consolidada de toneladas usada por API.
- `TARIFICADOR.AUCO_INFOAPSEMPRDIVI` — tabla fuente principal de métricas de toneladas.
- `TARIFICADOR.AUCO_APSEMPRDIVI` — tabla de relación APS/empresa/división con estado activo.

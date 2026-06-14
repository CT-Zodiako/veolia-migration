---
modulo: fase2-calculo-tarifas
fase: 2
version: v1
estado: implementado_as_is
estado_ddl: parcial
fuentes:
  - sdd/flujo-tarifas/fase2/ddl
  - back-tarificador/src/modules/costos/controller.js
  - back-tarificador/src/modules/costos/routes.js
trazabilidad:
  - actor: Operador tarifas
  - frontend: Calculo.vue
  - endpoint: /api/v1/costos/calculartarifas
  - backend: costos/controller.js
  - db: PK_LIQUIDAR.fauco_calculartarifas
---

# Cálculo de tarifas — Los 6 pasos

## Paso a paso del cálculo (`fauco_calculartarifas`)

| Paso | Descripción AS-IS | Lectura | Escritura | Dependencias | Transaccionalidad | Estado evidencia |
|---|---|---|---|---|---|---|
| 1 | Verificar existencia de tarifas previas para APS/período. | `AUCO_TARIFAS` | — | Directa: `PK_LIQUIDAR` | Si existe cálculo previo, se rechaza recálculo. | `ddl` |
| 2 | Borrar datos previos de costos para recalcular limpio. | `costosempredivi`, `costaddccs`, `costosapsempredivi`, `costosapsrelleno` | mismas tablas (DELETE) | Directa: `PK_LIQUIDAR` | Limpieza previa al recálculo. | `pendiente_ddl` |
| 3 | Ejecutar actualización de costos base. | objetos internos del package | costos base del período | **Indirecta**: `pk_actualizacostos.fauco_actualizacostos` | Continúa pipeline de cálculo. | `dependencia_no_ddl` |
| 4 | Generar JSON de información general y clúster. | datos de costos/tarifas | estructuras JSON (referencia funcional `json_json`) | **Indirectas**: `pk_json.fjson_infogral`, `pk_json.fjson_clus` | Salida intermedia para consulta/reportes. | `dependencia_no_ddl` |
| 5 | Calcular resumen de tarifas + F19/F23 SUI. | variables/costos/insumos | resultados de resumen + salida SUI | **Indirectas**: `pk_resumen.fauco_resumentarifas`, `pk_resumen.fauco_resumenvariables`, `pk_sui.fsui_f19`, `pk_sui.fsui_f23` | **Sólo aplica si `APS != 1031`**. | `dependencia_no_ddl` |
| 6 | Actualizar subsidios/contribuciones para mes siguiente. | `auco_infoapsdescost`, `auco_apssubscont` | `auco_apssubscont` (insert/update período siguiente) | Directa: `fauco_actudescsubcon` | Maneja `DUP_VAL_ON_INDEX` con rollback interno del bloque. | `ddl` + `pendiente_ddl` |

## Excepción obligatoria: APS 1031 (San Pedro)

| Condición | Comportamiento |
|---|---|
| `APS = 1031` | Se ejecutan pasos 1,2,3,4,6 y **se omite paso 5** (sin `pk_resumen` ni `pk_sui`). |

## Transaccionalidad observada

| Capa | Comportamiento AS-IS |
|---|---|
| Node (`costos/controller`) | Ejecuta llamada al package y maneja respuesta/errores HTTP; se observa boundary de confirmación desde backend para operación principal. |
| Oracle `fauco_calculartarifas` | Pipeline secuencial de 6 pasos dentro del package. |
| Oracle `fauco_actudescsubcon` | Captura `DUP_VAL_ON_INDEX` y ejecuta rollback controlado del bloque de actualización de subsidios/contribuciones. |
---
modulo: fase3-integracion-sui
fase: 3
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase3/ddl
  - back-tarificador/src/modules/sui/controller.js
trazabilidad: actor-frontend-endpoint-backend-db
---

# Orquestación `PK_SUI.fsui_fejecutasui`

## Secuencia técnica obligatoria

| Orden | Acción | Detalle |
|---|---|---|
| 1 | Limpiar estado | Borra `sui_estado` para APS/año/mes en ejecución |
| 2 | Evaluar condición APS | Verifica `apsa_solorell` (solo relleno vs no solo relleno) |
| 3 | Ejecutar/NO APLICA por formato | Aplica reglas para F19/F23/F24/F35/F36 |
| 4 | Cierre transaccional | `COMMIT` único del ciclo |

## Matriz de orquestación por regla de negocio

| Regla | Condición | F19 | F23 | F24 | F35 | F36 |
|---|---|---|---|---|---|---|
| R1 | NO solo relleno | Ejecuta | Ejecuta | Ejecuta | Depende relleno propio | Depende relleno propio |
| R2 | Relleno propio | n/a | n/a | n/a | Ejecuta | Ejecuta |
| R3 | NO relleno propio | n/a | n/a | n/a | NO APLICA | NO APLICA |
| R4 | SOLO relleno | NO APLICA | NO APLICA | NO APLICA | Ejecuta | Ejecuta |

## Dependencias ocultas de ejecución

| Package | Función | Invocador | Propósito |
|---|---|---|---|
| `PK_GENERAL720` | (dependencia funcional) | `PK_SUI` | Datos/reglas base para consolidación de formatos |
| `PK_COSTOS` | (dependencia funcional) | `PK_SUI` | Variables/costos previos usados por formatos |
| `PK_SUI` | `fsui_acumulacostos` | `fsui_fejecutasui` | Acumular costos en ciclo SUI |
| `PK_SUI` | `fsui_indexavalor` | `fsui_fejecutasui` | Indexación de valores |
| `PK_SUI` | `fsui_aplicaprod` | `fsui_fejecutasui` | Aplicar productividad |

## Cobertura de funciones PK_SUI (10/10)

| # | Función | Estado |
|---|---|---|
| 1 | `fsui_f19` | ✅ |
| 2 | `fsui_f23` | ✅ |
| 3 | `fsui_f24` | ✅ |
| 4 | `fsui_f35` | ✅ |
| 5 | `fsui_f36` | ✅ |
| 6 | `fsui_acumulacostos` | ✅ |
| 7 | `fsui_indexavalor` | ✅ |
| 8 | `fsui_aplicaprod` | ✅ |
| 9 | `fsui_fejecutasui` | ✅ |
| 10 | `fsui_estado` | ✅ |

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
  - actor: DBA / Documentador
  - frontend: N/A (DB layer)
  - service: N/A (DB layer)
  - endpoint: N/A (DB layer)
  - backend: PL/SQL Packages
  - db: TARIFICADOR schema
---

# Tablas y vistas — Fase 2

## Objetos DDL base

| Objeto | Tipo | Estado | Detalle relevante |
|---|---|---|---|
| `PK_LIQUIDAR` | Package | `validado` | Contiene `fauco_calculartarifas` y `fauco_actudescsubcon`. |
| `AUCO_TARIFAS` | Tabla | `validado` | PK de 8 columnas + ~30 campos de tarifas calculadas. |
| `VAUCO_COSTOS` | Vista | `validado` | Unión de 6 bloques de costos + `auge_parametros`. |
| `VAUCO_ANTESLIQUIDAR` | Vista | `validado` | Exposición de validaciones previas del proceso. |

## Vista `VAUCO_COSTOS` (consumo endpoint `/costos/consultar`)

| Campo de filtro | Uso |
|---|---|
| `APSCOSTO` | Filtra por APS |
| `ANNOCOSTO` | Filtra por año |
| `MESCOSTO` | Filtra por mes |

**Nota AS-IS:** la vista consolida costos desde 6 fuentes/uniones. La documentación mantiene esta estructura como evidencia sin re-modelar.

## Vista `VAUCO_ANTESLIQUIDAR` (consumo endpoint `/costos/validapreactualiza`)

| Campo | Origen | Uso |
|---|---|---|
| `VALI_ID` | `auco_validacion` | ID de validación |
| `APSA_ID` | `auco_validacion` | APS |
| `EMPR_EMPR` | `auco_validacion` | Empresa |
| `VALI_ANNO` | `auco_validacion` | Año |
| `VALI_MES` | `auco_validacion` | Mes |
| `VALI_GRUPO` | `auco_validacion` | Grupo de validación |
| `VALI_VAR` | `auco_validacion` | Variable validada |
| `VALI_VALOR` | `auco_validacion` | Resultado de validación |
| `APSA_NOMAPS` | `auco_apsaseo` | Nombre APS |
| `EMPR_NOMBRE` | `auge_empresas` | Nombre empresa |
| `EMPR_PROPIA` | `auge_empresas` | Indicador empresa propia |

## Checklist DDL (gaps explícitos)

| Objeto | Estado |
|---|---|
| `PK_LIQUIDAR` | ✅ |
| `AUCO_TARIFAS` | ✅ |
| `VAUCO_COSTOS` | ✅ |
| `VAUCO_ANTESLIQUIDAR` | ✅ |
| `costosempredivi` | `pendiente_ddl` |
| `costaddccs` | `pendiente_ddl` |
| `costosapsempredivi` | `pendiente_ddl` |
| `costosapsrelleno` | `pendiente_ddl` |
| `auco_infoapsdescost` | `pendiente_ddl` |
| `auco_apssubscont` | `pendiente_ddl` |
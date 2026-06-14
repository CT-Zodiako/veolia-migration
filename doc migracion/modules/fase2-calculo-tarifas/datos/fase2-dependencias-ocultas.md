---
modulo: fase2-calculo-tarifas
fase: 2
version: v1
estado: implementado_as_is
estado_ddl: parcial
fuentes:
  - back-tarificador/src/modules/costos/controller.js
  - back-tarificador/src/modules/costos/routes.js
  - sdd/flujo-tarifas/fase2/ddl
trazabilidad:
  - actor: DBA / Arquitecto
  - frontend: N/A (DB layer)
  - service: N/A (DB layer)
  - endpoint: N/A (DB layer)
  - backend: PL/SQL Packages
  - db: Dependencias indirectas
---

# Dependencias ocultas (fuera del DDL entregado)

## Dependencias de `pk_liquidar.fauco_calculartarifas`

| Dependencia | Invocador | Momento del flujo | Efecto funcional | Estado |
|---|---|---|---|---|
| `pk_actualizacostos.fauco_actualizacostos` | `pk_liquidar.fauco_calculartarifas` | Paso 3 | Recalcula/actualiza base de costos del APS-período. | `dependencia_no_ddl` |
| `pk_json.fjson_infogral` | `pk_liquidar.fauco_calculartarifas` | Paso 4 | Genera JSON general del cálculo. | `dependencia_no_ddl` |
| `pk_json.fjson_clus` | `pk_liquidar.fauco_calculartarifas` | Paso 4 | Genera JSON por clúster/capas de costos. | `dependencia_no_ddl` |
| `pk_resumen.fauco_resumentarifas` | `pk_liquidar.fauco_calculartarifas` | Paso 5 (si `APS != 1031`) | Cálculo/resumen de tarifas finales. | `dependencia_no_ddl` |
| `pk_resumen.fauco_resumenvariables` | `pk_liquidar.fauco_calculartarifas` | Paso 5 (si `APS != 1031`) | Consolidación de variables del resumen. | `dependencia_no_ddl` |
| `pk_sui.fsui_f19` | `pk_liquidar.fauco_calculartarifas` | Paso 5 (si `APS != 1031`) | Generación de salida/regla SUI F19. | `dependencia_no_ddl` |
| `pk_sui.fsui_f23` | `pk_liquidar.fauco_calculartarifas` | Paso 5 (si `APS != 1031`) | Generación de salida/regla SUI F23. | `dependencia_no_ddl` |

## Prechecks funcionales obligatorios antes de calcular

| Check | Endpoint | Package Oracle | Estado DDL |
|---|---|---|---|
| Existencia de tarifas ya calculadas | `/api/v1/suministros/cenrtificarEditar` | `PK_VALGRAL.fauco_existarifa` | `dependencia_no_ddl` |
| Consistencia SUI vs facturación | `/api/v1/validaciones/certificarFauco_cpsuivsfact` | `PK_VALGRAL.fauco_cpsuivsfact` | `dependencia_no_ddl` |
| Consistencia productividad | `/api/v1/validaciones/certificarFauco_cpproductividad` | `PK_VALGRAL.fauco_cpproductividad` | `dependencia_no_ddl` |
| Consistencia enero | `/api/v1/validaciones/certificarFauco_cpenero` | `PK_VALGRAL.fauco_cpenero` | `dependencia_no_ddl` |

## Regla crítica de negocio

- **APS 1031 (San Pedro):** el flujo AS-IS **omite completamente el Paso 5** (`pk_resumen` + `pk_sui`) y continúa con el Paso 6.

## Trazabilidad de falla por dependencia faltante

Cuando fallan dependencias ocultas, el proceso puede:
1. Fallar en precheck (`PK_VALGRAL.*`), o
2. Fallar dentro de `pk_liquidar` / dependencia oculta.

En ambos casos, la causa queda como falla técnica/funcional del período APS-mes-año.
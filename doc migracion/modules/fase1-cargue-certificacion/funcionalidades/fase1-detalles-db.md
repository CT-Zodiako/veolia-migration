---
modulo: fase1-cargue-certificacion
fase: 1
version: v1
estado: implementado_as_is
estado_ddl: validado
fuentes:
  - DDL: PK_CERTIFICACION (spec + body)
  - DDL: AUCO_TARICERTIFICADA
  - DDL: AUCO_CARGUECOMERCIAL
  - DDL: AUCO_INFOEMPRDIVI
  - DDL: AUCO_INFOAPSEMPRDIVI
  - DDL: AUCO_INFOAPSRELLENO
  - DDL: AUCO_INFUSUAPSEMPRDIVI
  - DDL: AUCO_CERTADICIONAL
  - DDL: AUCO_PODATECHO
trazabilidad:
  - actor: DBA / Documentador
  - frontend: N/A (DB layer)
  - service: N/A (DB layer)
  - endpoint: N/A (DB layer)
  - backend: PL/SQL Packages
  - db: TARIFICADOR schema (8 tables + 2 sequences + PK_CERTIFICACION)
---

# Detalles DB y PL/SQL

## `PK_CERTIFICACION` — Inventario de 11 funciones (DDL)

> Nota AS-IS: en código Node sólo se observan invocaciones directas a `fauco_certificar` y `fauco_certificarsem`. El inventario completo de 11 funciones proviene del DDL entregado para Fase 1.

| # | Función | Invocación observada desde endpoint | Estado de certeza |
|---|---|---|---|
| 1 | `fauco_certificar` | `POST /suministros/Certificar` | `observado_en_codigo + observado_en_ddl` |
| 2 | `fauco_certificarsem` | `POST /suministros/Certificarsemestral` | `observado_en_codigo + observado_en_ddl` |
| 3 | `fauco_certemprdivi` | `sin_invocacion_directa` | `observado_en_ddl` |
| 4 | `fauco_certapsemprdivi` | `sin_invocacion_directa` | `observado_en_ddl` |
| 5 | `fauco_certapsrelleno` | `sin_invocacion_directa` | `observado_en_ddl` |
| 6 | `fauco_certusuarios` | `sin_invocacion_directa` | `observado_en_ddl` |
| 7 | `fauco_certercero` | `sin_invocacion_directa` | `observado_en_ddl` |
| 8 | `fauco_certsempropia` | `sin_invocacion_directa` | `observado_en_ddl` |
| 9 | `fauco_certsempropianueva` | `sin_invocacion_directa` | `observado_en_ddl` |
| 10 | `fauco_certsempropianueva2024` | `sin_invocacion_directa` | `observado_en_ddl` |
| 11 | `fauco_certarifas` | `sin_invocacion_directa` | `observado_en_ddl` |

## Tablas de Fase 1 (DDL parte 1 + parte 2)

| Tabla | Tipo | Uso AS-IS en flujo |
|---|---|---|
| `AUCO_TARICERTIFICADA` | Registro | Certificación tarifaria registrada en flujo de costos (dependencia de cierre). |
| `AUCO_CARGUECOMERCIAL` | Registro | Cargue comercial mensual (`filecarguecomercial`). |
| `AUCO_INFOEMPRDIVI` | Productiva | Relación empresa/división para datos de soporte certificación. |
| `AUCO_INFOAPSEMPRDIVI` | Productiva | Relación APS↔empresa/división usada por procesos operativos. |
| `AUCO_INFOAPSRELLENO` | Productiva | Datos de relleno requeridos para validaciones/certificación. |
| `AUCO_INFUSUAPSEMPRDIVI` | Productiva | Vínculo usuario-operación APS/empresa/división. |
| `AUCO_CERTADICIONAL` | Productiva | Datos adicionales de certificación. |
| `AUCO_PODATECHO` | Productiva | Poda/techo operacional (`getPoda`, `postPoda`, `registrarPoda`). |

## Secuencias Fase 1

| Secuencia | Uso |
|---|---|
| `SPROY_INFOEMPRDIVI` | Generación de PK en estructuras proyectivas de empresa/división (DDL parte 2). |
| `SPROY_INFOAPSRELLENO` | Generación de PK en estructuras proyectivas de APS/relleno (DDL parte 2). |

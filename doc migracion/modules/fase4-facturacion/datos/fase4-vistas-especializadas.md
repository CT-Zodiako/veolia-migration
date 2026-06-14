---
modulo: fase4-facturacion
fase: 4
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase4/ddl
  - sdd/flujo-tarifas/fase4/spec
  - sdd/flujo-tarifas/fase4/design
trazabilidad: actor-frontend-endpoint-backend-db
---

# Vistas especializadas y dependencias ocultas

## VACUO_FACTURACIONCLUS

**Propósito AS-IS**
Exponer versión clusterizada de facturación con componentes descompuestos para análisis clus/subsidio.

**Componentes principales**
- `TCP`
- `TCCC`
- `TCLAV`
- (más componentes clus/subsidio definidos en vista)

**Filtro operativo**
- `APSA_ID`, `TARI_ANNO`, `TARI_MES`

## VACUO_FACTURACIONDINC

**Propósito AS-IS**
Calcular/desplegar facturación con descuentos/incentivos (DINC).

**Características técnicas relevantes**
- Uso de `LEFT JOIN` para conservar filas con información parcial.
- Dependencia de funciones de `PK_TARIFACOMPONENTE`.

**Campos principales documentados**
- `dinc_valor`
- `tdf`
- `tiat`
- `tincen`

**Dependencias ocultas críticas**
- `PK_TARIFACOMPONENTE.fauco_tadinc`
- `PK_TARIFACOMPONENTE.fauco_tdfsolo`
- `PK_TARIFACOMPONENTE.fauco_tiat`
- `PK_TARIFACOMPONENTE.fauco_tincen`
- `PK_TARIFACOMPONENTE.fauco_tincenfactelec`

**Filtro operativo**
- `APSA_ID`, `TARI_ANNO`, `TARI_MES`

## VAUCO_FATELECTRONICA

**Propósito AS-IS**
Consolidar componentes para facturación electrónica del período.

**Características técnicas relevantes**
- Construcción con CTEs.
- Usa dependencia funcional compartida con `PK_TARIFACOMPONENTE`.

**Componentes principales documentados**
- `tcaprov`
- `tcaprovprop`
- `tcaprovterc`
- Combinación `tdf - tincen`

**Filtro operativo**
- `codaps`, `anno`, `mes`

## Matriz dependencia oculta → impacto

| Dependencia | Vista impactada | Impacto |
|---|---|---|
| `fauco_tadinc` | `VACUO_FACTURACIONDINC` | cálculo DINC |
| `fauco_tdfsolo` | `VACUO_FACTURACIONDINC` | componente TDF |
| `fauco_tiat` | `VACUO_FACTURACIONDINC` | componente TIAT |
| `fauco_tincen` | `VACUO_FACTURACIONDINC` | incentivos |
| `fauco_tincenfactelec` | `VAUCO_FATELECTRONICA` | incentivos en electrónica |

## Checklist cobertura (especializadas)

| Vista | Joins/CTE | Campos clave | Dependencias ocultas |
|---|---|---|---|
| `VACUO_FACTURACIONCLUS` | ✅ | ✅ | N/A |
| `VACUO_FACTURACIONDINC` | ✅ | ✅ | ✅ |
| `VAUCO_FATELECTRONICA` | ✅ | ✅ | ✅ |

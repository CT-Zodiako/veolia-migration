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

# Vistas base de facturación

## VACUO_FACTURACION (vista base)

**Propósito AS-IS**
Concentrar la base de facturación por APS/período para el reporte comercial principal.

**Tablas base y joins (lógico-funcional)**
- `auco_tarifas`
- `auco_clasesuso`
- `auge_parametros`
- `auco_apsaseo`
- `factproduccion`

**Campos principales documentados**
- `tarifaPlena`
- `tarifaSyC`
- Componentes: `TC`, `TBL`, `TLU`, `TRT`, `TDF`, `TTL`, `TA`

**Filtro operativo**
- `APSA_ID`, `TARI_ANNO`, `TARI_MES`

## VACUO_DETAFACTURACION (vista detalle)

**Propósito AS-IS**
Desglosar variables de resumen para análisis complementario del valor facturable.

**Tablas base y joins (lógico-funcional)**
- `auco_resumtarifas`
- `auge_parametros`

**Campos principales documentados**
- `reta_variable`
- `reta_valormes`
- `reta_valorprom`

**Filtro operativo**
- `APSA_ID`, `RETA_ANNO`, `RETA_MES`

## Checklist cobertura (base)

| Vista | Joins | Campos clave | Filtros |
|---|---|---|---|
| `VACUO_FACTURACION` | ✅ | ✅ | ✅ |
| `VACUO_DETAFACTURACION` | ✅ | ✅ | ✅ |

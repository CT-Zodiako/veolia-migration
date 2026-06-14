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

# Formato F23 (Limpieza urbana)

| Ítem | Valor |
|---|---|
| Endpoint FE/BE | `SuiService.getSuiconsultaf23` → `POST /api/v1/sui/consuformu23` |
| Backend | `sui.controller.consuformu23` |
| Tabla | `TARIFICADOR.SUI_F23` |
| Generación Oracle | `PK_SUI.fsui_f23` |

## Campos principales (22)

`ID`, `NUAP`, `N`, `CP`, `CCC`, `m2CCJ`, `CLAVJ`, `m3aguaj`, `m2LAVJ`, `CLPJ`, `kLPJ`, `CCEI`, `TIJ`, `CCEMJ`, `TMJ`, `CLUS`, `CBLJ`, `LBLJ`, `CBLS`, `faCBLCLUS`, `ABC` + identificadores APS/período.

## Regla de ejecución

- Se ejecuta cuando **NO es solo relleno**.
- Si APS es **solo relleno**, queda en estado **NO APLICA**.

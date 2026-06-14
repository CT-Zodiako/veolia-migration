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

# Formato F24 (Recolección y transporte)

| Ítem | Valor |
|---|---|
| Endpoint FE/BE | `SuiService.getSuiconsultaf24` → `POST /api/v1/sui/consuforma24` |
| Backend | `sui.controller.consuforma24` |
| Tabla | `TARIFICADOR.SUI_F24` |
| Generación Oracle | `PK_SUI.fsui_f24` |
| Complemento asociado | `POST /api/v1/sui/setCargueInfComplemento` → `SUI_COMPLEMENTO` |

## Campos principales (24)

`NUAP`, `NUSD`, `centroide`, `QRT`, `F1`, `F2`, `CPE`, `PRTz`, `DET`, `F1ET`, `CPEET`, `PRTZET`, `CEG`, `CRTP`, `salinidad`, `VACRTabc`, `VACRT`, `FCK`, `T`, `CRTz`, `CRT`, `FacCRT`, `FacCCS` + identificadores APS/período.

## Regla de ejecución

- Se ejecuta cuando **NO es solo relleno**.
- Si APS es **solo relleno**, queda en estado **NO APLICA**.

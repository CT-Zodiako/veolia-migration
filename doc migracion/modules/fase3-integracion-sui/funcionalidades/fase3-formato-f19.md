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

# Formato F19 (Aprovechamiento)

| Ítem | Valor |
|---|---|
| Endpoint FE/BE | `SuiService.getSuiconsultaf19` → `POST /api/v1/sui/consuformu19` |
| Backend | `sui.controller.consuformu19` |
| Tabla | `TARIFICADOR.SUI_F19` |
| Generación Oracle | `PK_SUI.fsui_f19` |

## Campos principales (12)

`NJ`, `NDJ`, `CRTJ`, `CDFJ`, `QRTJ`, `QRJ`, `QBLJ`, `QLUJ`, `QNAZ`, `QAJ` + identificadores de período/APS.

## Regla de ejecución

- Se ejecuta cuando **NO es solo relleno**.
- Si APS es **solo relleno**, queda en estado **NO APLICA**.

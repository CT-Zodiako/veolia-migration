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

# Formato F35 (Disposición final)

| Ítem | Valor |
|---|---|
| Endpoint FE/BE | `SuiService.getSuiconsultaf35` → `POST /api/v1/sui/consuforma35` |
| Backend | `sui.controller.consuforma35` |
| Tabla | `TARIFICADOR.SUI_F35` |
| Generación Oracle | `PK_SUI.fsui_f35` |
| Complemento asociado | `setCargueInfComplemento` → `SUI_COMPLEMENTO` |

## Campos principales (28)

`NUSD`, `NomDF`, `CaMReRS`, `QRSMES`, `QRSPROM`, `CDFVU`, `PERADDT`, `CDFPC`, `INCENTIVO`, `DispAlt9`, `IncCDFalt9`, `VACDFabc`, `VACDF`, `PrCTcrrCP`, `CDF`, `CDFP`, `FACCDF`, `V0`, `Vm`, `MCRS`, `ICRSm`, `ICCRS`, `Frein`, `CAPREMDF` + identificadores APS/período.

## Regla de ejecución

- Si hay **relleno propio**: se ejecuta.
- Si **no hay relleno propio**: estado **NO APLICA**.
- Si APS es **solo relleno**: se ejecuta (junto con F36).

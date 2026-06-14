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

# Formato F36 (Tratamiento de lixiviados)

| Ítem | Valor |
|---|---|
| Endpoint FE/BE | `SuiService.getSuiconsultaf36` → `POST /api/v1/sui/consuforma36` |
| Backend | `sui.controller.consuforma36` |
| Tabla | `TARIFICADOR.SUI_F36` |
| Generación Oracle | `PK_SUI.fsui_f36` |
| Complemento asociado | `setCargueInfComplemento` → `SUI_COMPLEMENTO` |

## Campos principales (21)

`NUSD`, `NomDPTO`, `NomMPIO`, `NomDF`, `VLMES`, `VLMPROM`, `ESCENA`, `CTLMVU`, `ANNOPOSCLA`, `CTLMPC`, `CTLM`, `CTLMX`, `VACTLabc`, `VACTL`, `FCKCTL`, `QRS`, `CTL`, `FACCTL` + identificadores APS/período.

## Regla de ejecución

- Si hay **relleno propio**: se ejecuta.
- Si **no hay relleno propio**: estado **NO APLICA**.
- Si APS es **solo relleno**: se ejecuta (junto con F35).

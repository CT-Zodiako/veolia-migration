---
title: "Módulo: SUI853 - CFT"
description: "Documentación AS-IS del módulo CFT (SUI853), capturada desde respuestas reales del backend legacy en vivo"
phase: "SUI853"
module: "cft"
version: "1.0.0"
date: "2026-07-28"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/sui853/CFT/{routes.js,controller.js}
  - front-tarificador/src/sui853/views/CFT/*.vue
  - front-tarificador/src/sui853/components/TablaScrollHorizontal.vue
  - SUI.f_render_formato2 (función PL/SQL, capturada en vivo — no hay SQL legible del lado Node)
---

# Módulo: SUI853 / CFT

## 1. Resumen Ejecutivo

Los 12 endpoints de este módulo (más `cssAprovechamiento5000`, vista huérfana sin
ruta activa, y `crtSEG2`/`crtSEG3`, endpoints huérfanos sin ninguna vista que los
consuma — ninguno de estos 3 se documenta acá) **no tienen SQL propio**: todos
ejecutan `SELECT SUI.f_render_formato2(:codigo) AS json FROM dual`, una función
PL/SQL genérica en el schema `SUI` que arma dinámicamente el JSON completo
(columnas, formato, colores, datos) según un código de formato regulatorio SUI.

**El usuario Oracle de desarrollo (`TARIFICADOR`, ADB Cloud) NO tiene acceso al
schema `SUI`.** Esta documentación se generó conectando en vivo al Oracle legacy
real (instancia interna, ver `back-tarificador/src/database/keys.js`) y
capturando la respuesta real de cada uno de los 12 códigos de formato — no es
una lista de columnas inferida ni fabricada, es la respuesta real observada.
Los valores de fila mostrados abajo son ilustrativos (1 fila de ejemplo por
endpoint), no se documentan datos completos de negocio.

**SEG1/SEG2/SEG3** no son segmentos de negocio — son tabs de la misma pantalla,
cada uno con su propio código de formato SUI (formatos regulatorios numerados
por la Superintendencia para el mismo trámite).

## 2. Contrato por pantalla

### cft.vue — `/cft` (SEG1)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cft` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S105`
- **menuId Oracle real**: `7011`
- **Título legacy**: `SG1 - CFT`
- **Filas observadas en captura**: 4

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | ANNO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| CCS | CCS | numero | 6 | der | G | False |
| CRLUS | CRLUS | numero | 6 | der | G | False |
| CBLS | CBLS | numero | 6 | der | G | False |
| CFT | CFT | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2025",
  "APS": "SALAMINA",
  "EMPRESA": "EMS EMPRESA MIXTA by Veolia",
  "CCS": 3996.88749,
  "CRLUS": 0,
  "CBLS": 6245.285803,
  "CFT": 10242.173293
}
```

---

### cft.vue — `/cft` (SEG2)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cftSEG2` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S209`
- **menuId Oracle real**: `7011`
- **Título legacy**: `SG2 - CFT`
- **Filas observadas en captura**: 32

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | ANNO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| CCS | CCS | numero | 6 | der | G | False |
| CBLUS | CBLUS ADOP | numero | 6 | der | G | False |
| CFT | CFT | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2024",
  "APS": "SAN JOSÉ",
  "EMPRESA": "EMPRESA METROPOLITANA DE ASEO S.A. E.S.P.",
  "CCS": 2182.85,
  "CBLUS": 7854.8,
  "CFT": 10037.65
}
```

---

### cft.vue — `/cft` (SEG3)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cftSEG3` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S306`
- **menuId Oracle real**: `7011`
- **Título legacy**: `SG3 - CFT`
- **Filas observadas en captura**: 42

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | ANNO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| CCS | CCS | numero | 6 | der | G | False |
| CBICS | CBICS | numero | 6 | der | G | False |
| CFT | CFT | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2023",
  "APS": "SAN FELIX",
  "EMPRESA": "EMS EMPRESA MIXTA by Veolia",
  "CCS": 1601.554863,
  "CBICS": 3491.82,
  "CFT": 5093.374863
}
```

---

### cssAprovechamientoC.vue — `/cssaprovechamiento` (SEG1)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cssAprovechamiento` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853001`
- **menuId Oracle real**: `7001`
- **Título legacy**: `SG1 - CCS APROVECHAMIENTO`
- **Filas observadas en captura**: 4

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| SERVICIO | SERVICIO | texto |  | centro | G | False |
| CCSACU | CCSACU IND | numero | 2 | der | G | False |
| CCSENE | CCSENE IND | numero | 2 | der | G | False |
| NFCACU | NFC ACU | numero | 6 | der | G | False |
| NFCENE | NFC ENE | numero | 6 | der | G | False |
| ADOPTADP | CCS ADOPT | numero | 6 | der | G | False |
| CCSMINACU | CCS ADO-18 | numero | 6 | der | G | False |
| CCSAPROV | CCSAPROV | texto |  | izq | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2025",
  "APS": "SALAMINA",
  "EMPRESA": "EMS EMPRESA MIXTA by Veolia",
  "SERVICIO": "ACU|ENE",
  "CCSACU": 2091.73,
  "CCSENE": 2711.55,
  "NFCACU": 4.666667,
  "NFCENE": 4168.916667,
  "ADOPTADP": 3996.88749,
  "CCSMINACU": 2710.856952,
  "CCSAPROV": null
}
```

---

### cssAprovechamientoC.vue — `/cssaprovechamiento` (SEG2)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cssAprovechamientoSEG2` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S201`
- **menuId Oracle real**: `7001`
- **Título legacy**: `SG2 - CCS - APROVECHAMIENTO`
- **Filas observadas en captura**: 32

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| NFC_ACU | NFC ACUED | numero | 6 | der | G | False |
| NFC_ENE | NFC ENERGIA | numero | 6 | der | G | False |
| CCS_PESOS2018 | CCS MAX18 | numero | 2 | der | G | False |
| PER_COSTO_A | PER COSTO A | numero | 6 | der | G | False |
| PER_PORC_B | PER PORC B | porcentaje | 2 | der | G | False |
| PER_PROP_I | PER PROP I | numero | 6 | der | G | False |
| EQU_COSTO_A | EQU COSTO A | numero | 6 | der | G | False |
| EQU_PORC_B | EQU PORC B | porcentaje | 2 | der | G | False |
| EQU_PROP_II | EQU PROP II | numero | 6 | der | G | False |
| HER_COSTO_A | HER COSTO A | numero | 6 | der | G | False |
| HER_PORC_B | HER PORC B | porcentaje | 2 | der | G | False |
| HER_PROP_III | HER PROP III | numero | 6 | der | G | False |
| GG_COSTO_A | GG COSTO A | numero | 6 | der | G | False |
| GG_PORC_B | GG PORC B | porcentaje | 2 | der | G | False |
| GG_PROP_IV | GG PROP IV | numero | 6 | der | G | False |
| TOTAL_C | TOTAL C | numero | 6 | der | G | False |
| SUSC_APS_D | N PROMEDIO | numero | 6 | der | G | False |
| CCS_MES_SUSC | CCS SUS/MES | numero | 6 | der | G | False |
| CCS_MIN_ENE | CCS MIN ADO | numero | 6 | der | G | False |
| CCS_APROV | CCS APROV | texto |  | izq | G | False |
| CCS_ADOP_CORR | CCS ADOCRR | numero | 6 | der | G | False |
| SERVICIO_FC | SERVICIO FC | texto |  | izq | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2024",
  "APS": "SAN JOSÉ",
  "EMPRESA": "EMPRESA METROPOLITANA DE ASEO S.A. E.S.P.",
  "NFC_ACU": 1,
  "NFC_ENE": 622,
  "CCS_PESOS2018": 2181.76,
  "PER_COSTO_A": 7725384.24,
  "PER_PORC_B": 1,
  "PER_PROP_I": 7725384.24,
  "EQU_COSTO_A": 10271981.04,
  "EQU_PORC_B": 0.0038,
  "EQU_PROP_II": 39033.53,
  "HER_COSTO_A": 11970839.04,
  "HER_PORC_B": 1,
  "HER_PROP_III": 11970839.04,
  "GG_COSTO_A": 6741653.04,
  "GG_PORC_B": 1,
  "GG_PROP_IV": 6741653.04,
  "TOTAL_C": 27195047.04,
  "SUSC_APS_D": 622,
  "CCS_MES_SUSC": 3643.5,
  "CCS_MIN_ENE": 2530.96,
  "CCS_APROV": "NO",
  "CCS_ADOP_CORR": 3306.24,
  "SERVICIO_FC": "ACU|ENE"
}
```

---

### cssAprovechamientoC.vue — `/cssaprovechamiento` (SEG3)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cssAprovechamientoSEG3` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S301`
- **menuId Oracle real**: `7001`
- **Título legacy**: `SG3 - CCS - APROVECHAMIENTO`
- **Filas observadas en captura**: 39

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| CCS_ADOP18 | CCS ADOCRR | numero | 6 | der | G | False |
| CCSACUMAX2018 | CCSACU MX18 | numero | 2 | der | G | False |
| CCSENEMAX2018 | CCS MX18 | numero | 6 | der | G | False |
| PER_COSTO_A | PER COSTO A | numero | 6 | der | G | False |
| PER_PORC_B | PER PORC B | porcentaje |  | der | G | False |
| PER_PROP_I | PER PROP I | numero | 6 | der | G | False |
| EQU_COSTO_A | EQU COSTO A | numero | 6 | der | G | False |
| EQU_PORC_B | EQU PORC B | porcentaje |  | der | G | False |
| EQU_PROP_II | EQU PROP II | numero | 6 | der | G | False |
| HER_COSTO_A | COSTO IMP A | numero | 6 | der | G | False |
| HER_PORC_B | COSTO IMP B | porcentaje |  | der | G | False |
| HER_PROP_III | COSTO IMP III | numero | 6 | der | G | False |
| GG_COSTO_A | GG COSTO A | numero | 6 | der | G | False |
| GG_PORC_B | GG PORC B | porcentaje | 2 | der | G | False |
| GG_PROP_IV | GG PROP IV | numero | 6 | der | G | False |
| TOTAL_C | TOTAL C | numero | 6 | der | G | False |
| SUSC_APS_D | SUSC APS D | numero | 6 | der | G | False |
| CBICS_MES_SUSC | CCS SUS MES | numero | 6 | der | G | False |
| CBICS_PESOS2018 | CCS MIN18 | numero | 6 | der | G | False |
| NFC_ACU | NFC_ACU | numero | 6 | der | G | False |
| NFC_ENE | NFC_ENE | numero | 6 | der | G | False |
| SERVICIO_FC | SERVICIO FC | texto |  | izq | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2023",
  "APS": "MANIZALES",
  "EMPRESA": "EMPRESA METROPOLITANA DE ASEO S.A. E.S.P.",
  "CCS_ADOP18": 869.61,
  "CCSACUMAX2018": 1503.66,
  "CCSENEMAX2018": 1631.810797,
  "PER_COSTO_A": 9558474.195441,
  "PER_PORC_B": 1,
  "PER_PROP_I": 9558474.195441,
  "EQU_COSTO_A": 0,
  "EQU_PORC_B": 0,
  "EQU_PROP_II": 0,
  "HER_COSTO_A": 2934890,
  "HER_PORC_B": 1,
  "HER_PROP_III": 2934890,
  "GG_COSTO_A": 363546628,
  "GG_PORC_B": 0.0154,
  "GG_PROP_IV": 5598618.0712,
  "TOTAL_C": 18578656.589614,
  "SUSC_APS_D": 2454.75,
  "CBICS_MES_SUSC": 630.704301,
  "CBICS_PESOS2018": 521.798931,
  "NFC_ACU": 1991.583333,
  "NFC_ENE": 463.166667,
  "SERVICIO_FC": null
}
```

---

### crlus.vue — `/crlus`

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/crlus` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853002`
- **menuId Oracle real**: `7002`
- **Título legacy**: `SG1 - CRLUS`
- **Filas observadas en captura**: 4

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| PER_COSTOTAL | PER TOTAL | numero | 6 | der | G | False |
| PER_PORCTIEMPO | PER PORCENT | porcentaje |  | der | G | False |
| PER_PORCION | PER PORCION | numero | 6 | der | G | False |
| EQU_COSTOTAL | EQU TOTAL | numero | 6 | der | G | False |
| EQU_PORCTIEMPO | EQU PORCEN | porcentaje |  | der | G | False |
| EQU_PORCION | EQU PORCIO | numero | 6 | der | G | False |
| HER_COSTOTAL | HRR TOTAL | numero | 6 | der | G | False |
| HER_PORCTIEMPO | HRR PORCEN | porcentaje |  | der | G | False |
| HER_PORCION | HRR PORCIO | numero | 6 | der | G | False |
| GAS_COSTOTAL | GST TOTAL | numero | 6 | der | G | False |
| GAS_PORCTIEMPO | GST PORCENT | porcentaje |  | der | G | False |
| GAS_PORCION | GST PORCION | numero | 6 | der | G | False |
| TOTAL | TOTAL | numero | 6 | der | G | False |
| SUSCRIPTORES | SUSCRIPT | numero | 6 | der | G | False |
| CRLUSXSUSC | CRLUSXSUSC | numero | 6 | der | G | False |
| CRLUSPESOS | CRLUSPES18 | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2025",
  "APS": "SALAMINA",
  "EMPRESA": "EMS EMPRESA MIXTA by Veolia",
  "PER_COSTOTAL": 0,
  "PER_PORCTIEMPO": 0,
  "PER_PORCION": 0,
  "EQU_COSTOTAL": 0,
  "EQU_PORCTIEMPO": 0,
  "EQU_PORCION": 0,
  "HER_COSTOTAL": 0,
  "HER_PORCTIEMPO": 0,
  "HER_PORCION": 0,
  "GAS_COSTOTAL": 0,
  "GAS_PORCTIEMPO": 0,
  "GAS_PORCION": 0,
  "TOTAL": 0,
  "SUSCRIPTORES": 4173.583333,
  "CRLUSXSUSC": 0,
  "CRLUSPESOS": 0
}
```

---

### cbls.vue — `/cbls`

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cbls` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853003`
- **menuId Oracle real**: `7003`
- **Título legacy**: `SG1 - CBLS`
- **Filas observadas en captura**: 4

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| CBLJ | CBLJ | numero | 6 | der | G | False |
| LBLJ | LBLJ | numero | 6 | der | G | False |
| CBLS | CBLS | numero | 6 | der | G | False |
| N | N | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2025",
  "APS": "SALAMINA",
  "EMPRESA": "EMS EMPRESA MIXTA by Veolia",
  "CBLJ": 41718.148,
  "LBLJ": 624.793333,
  "CBLS": 6245.285803,
  "N": 4173.583333
}
```

---

### cblusMinimo.vue — `/cblusMinimo`

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cblusMinimoSEG2` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S202`
- **menuId Oracle real**: `7004`
- **Título legacy**: `SG2 - CBLUS MINIMO`
- **Filas observadas en captura**: 33

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | ANNO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| PER_COSTO_A | PER COSTO A | numero | 6 | der | G | False |
| PER_PORC_B | PER PORC B | porcentaje |  | der | G | False |
| PER_PROP_I | PER PROP I | numero | 6 | der | G | False |
| EQU_COSTO_A | EQU COSTO A | numero | 6 | der | G | False |
| EQU_PORC_B | EQU PORC B | porcentaje |  | der | G | False |
| EQU_PROP_II | EQU PROP II | numero | 6 | der | G | False |
| HER_COSTO_A | HER COSTO A | numero | 6 | der | G | False |
| HER_PORC_B | HER PORC B | porcentaje |  | der | G | False |
| HER_PROP_III | HER PROP III | numero | 6 | der | G | False |
| GG_COSTO_A | GG COSTO A | numero | 6 | der | G | False |
| GG_PORC_B | GG PORC B | porcentaje |  | der | G | False |
| GG_PROP_IV | GG PROP IV | numero | 6 | der | G | False |
| TOTAL_C | TOTAL C | numero | 6 | der | G | False |
| SUSC_APS_D | SUSC APS D | numero | 6 | der | G | False |
| CBLUS_MES_SUSC | CBLUS M SUS | numero | 6 | der | G | False |
| CBLUS_PESOS18 | CBLUS PES18 | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2024",
  "APS": "SAN JOSÉ",
  "EMPRESA": "EMPRESA METROPOLITANA DE ASEO S.A. E.S.P.",
  "PER_COSTO_A": 24402141.24,
  "PER_PORC_B": 1,
  "PER_PROP_I": 24402141.24,
  "EQU_COSTO_A": 80000.04,
  "EQU_PORC_B": 1,
  "EQU_PROP_II": 80000.04,
  "HER_COSTO_A": 342000,
  "HER_PORC_B": 1,
  "HER_PROP_III": 342000,
  "GG_COSTO_A": 656832,
  "GG_PORC_B": 1,
  "GG_PROP_IV": 656832,
  "TOTAL_C": 29272430.104008,
  "SUSC_APS_D": 622,
  "CBLUS_MES_SUSC": 3921.815394,
  "CBLUS_PESOS18": 2724.29
}
```

---

### cblusMaximo.vue — `/cblusMaximo`

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cblusMaximoSEG2` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S203`
- **menuId Oracle real**: `7005`
- **Título legacy**: `SG2 - CBLUS MAXIMO`
- **Filas observadas en captura**: 31

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| PER_COSTO_A | PER COSTO A | numero | 6 | der | G | False |
| PER_PORC_B | PER PORC B | porcentaje |  | der | G | False |
| PER_PROP_I | PER PROP I | numero | 6 | der | G | False |
| EQU_COSTO_A | EQU COSTO A | numero | 6 | der | G | False |
| EQU_PORC_B | EQU PORC B | porcentaje |  | der | G | False |
| EQU_PROP_II | EQU PROP II | numero | 6 | der | G | False |
| HER_COSTO_A | HER COSTO A | numero | 6 | der | G | False |
| HER_PORC_B | HER PORC B | porcentaje |  | der | G | False |
| HER_PROP_III | HER PROP III | numero | 6 | der | G | False |
| GG_COSTO_A | GG COSTO A | numero | 6 | der | G | False |
| GG_PORC_B | GG PORC B | porcentaje |  | der | G | False |
| GG_PROP_IV | GG PROP IV | numero | 6 | der | G | False |
| TOTAL_C | TOTAL C | numero | 6 | der | G | False |
| SUSC_APS_D | SUSC APS D | numero | 6 | der | G | False |
| CBLUS_MES_SUSC | CLUS M SUS | numero | 6 | der | G | False |
| CBLUS_PESOS18 | CLUS MAX18 | numero | 2 | der | G | False |
| CBLJ | CBLJ | numero | 0 | der | G | False |
| LBLJ | LBLJ | numero | 6 | der | G | False |
| NJ | NJ | numero | 6 | der | G | False |
| CBLUSJ_MAX2018 | CBLUS MAX18 | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2024",
  "APS": "SAN JOSÉ",
  "EMPRESA": "EMPRESA METROPOLITANA DE ASEO S.A. E.S.P.",
  "PER_COSTO_A": 0,
  "PER_PORC_B": 0,
  "PER_PROP_I": 0,
  "EQU_COSTO_A": 0,
  "EQU_PORC_B": 0,
  "EQU_PROP_II": 0,
  "HER_COSTO_A": 0,
  "HER_PORC_B": 0,
  "HER_PROP_III": 0,
  "GG_COSTO_A": 0,
  "GG_PORC_B": 0,
  "GG_PROP_IV": 0,
  "TOTAL_C": 0,
  "SUSC_APS_D": 622,
  "CBLUS_MES_SUSC": 0,
  "CBLUS_PESOS18": 0,
  "CBLJ": 33006.93,
  "LBLJ": 148.02,
  "NJ": 622,
  "CBLUSJ_MAX2018": null
}
```

---

### cblus.vue — `/cblus`

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cblusSEG2` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S204`
- **menuId Oracle real**: `7006`
- **Título legacy**: `SG2 - CBLUS`
- **Filas observadas en captura**: 31

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

_(sin columnas — solo trae SIN_MOVIMIENTO, tabla de un solo bloque)_

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2022",
  "APS": "BELALCAZAR",
  "EMPRESA": "EMAS CHINCHINA ESP"
}
```

---

### cbicsmaxmin.vue — `/cbicsmaxmin` (SEG3)

- **Endpoint nuevo propuesto**: `POST /api/v1/cft/cbicsmaxmin` (path exacto a definir en implementación)
- **Código de formato SUI**: `F853S208`
- **menuId Oracle real**: `7010`
- **Título legacy**: `SG3 - CBICS MINIMO Y MAXIMO`
- **Filas observadas en captura**: 39

**Columnas fijas (`SIN_MOVIMIENTO` — "Filtros"): todas con filtro**

| field | header | formato | alineación | color | filtro |
|---|---|---|---|---|---|
| ANNO | AÑO | texto | centro | G | True |
| APS | APS | texto | izq | G | True |
| EMPRESA | EMPRESA | texto | izq | G | True |

**Columnas scrolleables (`CON_MOVIMIENTO` — "Detalle")**

| field | header | formato | decimal | alineación | color | filtro |
|---|---|---|---|---|---|---|
| PER_COSTO_A | PER COST A | numero | 6 | der | G | False |
| PER_PORC_B | PER PORC B | porcentaje |  | der | G | False |
| PER_PROP_I | PER PROP I | numero | 6 | der | G | False |
| EQU_COSTO_A | EQU COST A | numero | 6 | der | G | False |
| EQU_PORC_B | EQU PORC B | porcentaje |  | der | G | False |
| EQU_PROP_II | EQU PR II | numero | 6 | der | G | False |
| HER_COSTO_A | HER COST A | numero | 6 | der | G | False |
| HER_PORC_B | HER PORC B | porcentaje |  | der | G | False |
| HER_PROP_III | HER PR III | numero | 6 | der | G | False |
| GG_COSTO_A | GG COST A | numero | 6 | der | G | False |
| GG_PORC_B | GG PORC B | porcentaje |  | der | G | False |
| GG_PROP_IV | GG PROP IV | numero | 6 | der | G | False |
| TOTAL_C | TOTAL C | numero | 6 | der | G | False |
| SUSC_PROM_D | SUSC PROM D | numero | 6 | der | G | False |
| CBICS_MES_E | CBICS MES E | numero | 6 | der | G | False |
| CBICS_PESOS18 | CBICS PES18 | numero | 6 | der | G | False |
| COSTO_BLVAP | CBL | numero | 0 | der | G | False |
| PRECIO_MAX_CE | CCEI | numero | 0 | der | G | False |
| NUM_CESTAS_INST | CIN | numero | 6 | der | G | False |
| PRECIO_MAX_CE_M | CCEM | numero | 0 | der | G | False |
| NUM_CESTAS_OBJ | CM | numero | 6 | der | G | False |
| LONG_BARRIDO_APS | LBL | numero | 6 | der | G | False |
| LONG_BARR_CPR | N | numero | 6 | der | G | False |
| AREA_BARR_APS | CBICS | numero | 6 | der | G | False |

**Fila de ejemplo** (1 sola, ilustrativa):
```json
{
  "ANNO": "2023",
  "APS": "SAN FELIX",
  "EMPRESA": "EMS EMPRESA MIXTA by Veolia",
  "PER_COSTO_A": 18486300,
  "PER_PORC_B": 0.75,
  "PER_PROP_I": 13864725,
  "EQU_COSTO_A": 0,
  "EQU_PORC_B": 1,
  "EQU_PROP_II": 0,
  "HER_COSTO_A": 319200,
  "HER_PORC_B": 1,
  "HER_PROP_III": 319200,
  "GG_COSTO_A": 864000,
  "GG_PORC_B": 0.1,
  "GG_PROP_IV": 86400,
  "TOTAL_C": 16393749.36,
  "SUSC_PROM_D": 493.083333,
  "CBICS_MES_E": 2770.61845,
  "CBICS_PESOS18": 3491.82,
  "COSTO_BLVAP": 21781,
  "PRECIO_MAX_CE": 7824,
  "NUM_CESTAS_INST": 0,
  "PRECIO_MAX_CE_M": 711,
  "NUM_CESTAS_OBJ": 0,
  "LONG_BARRIDO_APS": 129.75,
  "LONG_BARR_CPR": 493.083333,
  "AREA_BARR_APS": 5731.454626
}
```

---

## 3. Notas de implementación

- **Formato de valores**: `-1` se muestra como `"NA"`. `porcentaje` con
  `abs(valor) <= 1` se multiplica por 100 antes de mostrar. Ver
  `TablaScrollHorizontal.vue` (`formatValue`/`displayValue`) para la lógica
  completa a replicar vía `[cellTemplate]` de `app-tabla-avanzada`.
- **`cbicsmaxminSEG3` usa el MISMO código que un hipotético `cbicsmaxminSEG2`**
  (`F853S208`) — el tab SEG2 de `cbicsmaxmin.vue` está comentado/inactivo en el
  legacy, así que en la práctica solo se consume una vez. No se migra un
  endpoint "SEG2" separado porque no hay ninguna vista que lo use.
- **`crtSEG2`/`crtSEG3`** (códigos F853S211/F853S307) son endpoints legacy sin
  ninguna vista que los consuma (huérfanos, confirmado por grep) — no migrar.
- **`cssAprovechamiento5000`** (`SELECT * FROM TARIFICADOR.AUCO_TARIFAS WHERE
  ROWNUM <= 5001`) alimenta `cssAprovechamiento.vue` (sin "C"), una vista de
  debug/diagnóstico SIN ruta activa en el router legacy — fuera de alcance
  salvo que el negocio confirme que se usa.
- **Modal de detalle "Ver"**: cada fila de `CON_MOVIMIENTO` tiene un botón que
  abre un modal con TODOS los campos de la fila (no solo las columnas
  visibles) — replicar vía `[accionesTemplate]`.
- **Export CSV**: ya lo trae `app-tabla-avanzada` de fábrica.


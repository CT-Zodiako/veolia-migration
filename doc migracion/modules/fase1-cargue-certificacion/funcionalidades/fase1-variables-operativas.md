---
modulo: fase1-cargue-certificacion
fase: 1
version: v1
estado: implementado_as_is
estado_ddl: validado
fuentes:
  - back-tarificador/src/modules/suministros/routes.js
  - back-tarificador/src/modules/suministros/controller.js
  - front-tarificador/src/service/CargueService.js
trazabilidad:
  - actor: Usuario operativo
  - frontend: Cargue.vue / CargueSem.vue
  - service: CargueService
  - endpoint: /api/v1/suministros/*
  - backend: suministros/controller.js
  - db: AUCO_CARGUETERCERO / PORD_PROPIA / PK_GIRS
---

# Variables operativas (precondición de certificación)

## Endpoints de variables

| Endpoint | Auth en ruta | Propósito | Tabla/objeto principal |
|---|---|---|---|
| `POST /suministros/setTerceros` | Sí | Guarda CDF/CTL/Incentivo de terceros por APS/período | `AUCO_CARGUETERCERO` |
| `POST /suministros/guardarProductividad` | No | Carga masiva productividad propia/terceros | `PORD_PROPIA`, `PORD_TERCERO` |
| `POST /suministros/cargueProductividad` | No | Recupera dataset filtrado por año/mes desde hoja | Drive helper |
| `POST /suministros/guardarQRTRural` | Sí | Persiste QRT rural semestral | `AUCO_CARGUERURAL` |
| `POST /suministros/certificarMensual` | No | Ejecuta validación/certificación PGIRS mensual | `PK_GIRS.fpgirs_mensual` |
| `POST /suministros/plcertificarSemestral` | No | Ejecuta validación/certificación PGIRS semestral | `PK_GIRS.fpgirs_semestral` |

## Integración Google Sheets

El módulo de suministros tiene una **integración con Google Sheets API v4** para leer datos de productividad desde hojas de cálculo externas.

### Helper: `drivehelper.js`

**Ubicación**: `back-tarificador/src/helpers/drivehelper.js`

**Funciones disponibles:**

| Función | Parámetros | Retorna | Uso en el sistema |
|---|---|---|---|
| `consultararchivo(idFile, sheet)` | `idFile`: ID del spreadsheet<br>`sheet`: Nombre de la hoja | `{ values: [...], range: string }` | Lee una hoja completa. Usado en cargue de productividad. |
| `consultarRango(idFile, rangeA1)` | `idFile`: ID del spreadsheet<br>`rangeA1`: Rango (ej: `A1:D10`) | `{ values: [...], range: string }` | Lee un rango específico. |
| `getSheetRowCount(idFile, sheetTitle)` | `idFile`: ID del spreadsheet<br>`sheetTitle`: Nombre de la hoja | `{ rowCount, colCount }` | Cuenta filas/columnas. |
| `listarHojas(idFile)` | `idFile`: ID del spreadsheet | `[{ sheetId, title, index, rowCount, columnCount }]` | Lista hojas disponibles. |

### Autenticación

- **Método**: Service Account (cuenta de servicio de Google Cloud)
- **Scopes**: `https://www.googleapis.com/auth/spreadsheets.readonly` (solo lectura)
- **Credenciales requeridas**: Archivo JSON con:
  - `type`: `service_account`
  - `project_id`: ID del proyecto GCP
  - `private_key_id`: ID de la clave privada
  - `private_key`: Clave privada RSA (PEM format)
  - `client_email`: Email de la cuenta de servicio
  - `client_id`: ID del cliente
  - `auth_uri`: `https://accounts.google.com/o/oauth2/auth`
  - `token_uri`: `https://oauth2.googleapis.com/token`

### ⚠️ Nota de Seguridad (AS-IS)

**ESTADO ACTUAL**: Las credenciales están hardcodeadas en:
- `back-tarificador/src/helpers/gsec.json`
- Referenciadas en `drivehelper.js` con ruta relativa: `./src/helpers/gsec.json`

**RIESGO**: Credenciales en repositorio = exposición potencial de claves privadas.

**RECOMENDACIÓN PARA MIGRACIÓN**:
1. Mover credenciales a variables de entorno o secret manager
2. No commitear `gsec.json` al repo (agregar a `.gitignore`)
3. Usar `dotenv` o similar para injectar en runtime
4. Rotar las credenciales actuales si fueron expuestas

### Uso en Fase 1

En `suministros/controller.js`:
```javascript
const drivehelper = require("../../helpers/drivehelper");

// Cargue de productividad:
const resultadoPropia = await drivehelper.consultararchivo(sheetId, sheetName);
const resultadoTerceros = await drivehelper.consultararchivo(sheetId, sheetName);
```

El frontend (`CargueProductividad.vue`) tiene un botón "Cargar desde Drive" que dispara esta lectura.

---

## Reglas AS-IS observadas

- `filecarguecomercial` limpia e inserta (`DELETE` + `INSERT`) para recargue de período.
- `setTerceros` también reemplaza datos del período (`DELETE` previo).
- `guardarProductividad` devuelve `400` si no hay payload útil.
- En certificados PGIRS se parsea JSON de salida de package y se adapta respuesta para frontend.

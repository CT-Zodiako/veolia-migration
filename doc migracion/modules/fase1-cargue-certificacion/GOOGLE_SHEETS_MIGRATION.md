# Configuración de Google Sheets - Guía de Migración

## Estado actual (AS-IS)

El sistema usa una cuenta de servicio de Google Cloud para leer datos de Google Sheets (productividad). Actualmente las credenciales están hardcodeadas en:

- `back-tarificador/src/helpers/gsec.json`
- Referenciadas en: `back-tarificador/src/helpers/drivehelper.js`

## ⚠️ Riesgo de seguridad

**CRÍTICO**: El archivo `gsec.json` contiene una clave privada RSA completa commiteada en el repositorio. Esto permite que cualquier persona con acceso al código pueda autenticarse como la cuenta de servicio.

## Migración recomendada

### Paso 1: Variables de entorno

Crear archivo `.env` en `back-tarificador/` (NO commitear):

```bash
# Google Sheets API - Service Account
GOOGLE_PROJECT_ID=tu-project-id
GOOGLE_PRIVATE_KEY_ID=tu-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=tu-service@tu-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=tu-client-id
```

### Paso 2: Actualizar drivehelper.js

```javascript
const { google } = require("googleapis");

// Cargar credenciales desde variables de entorno
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
};

const drivehelper = {}

async function authSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  return { auth, authClient, sheets };
}

// ... resto de funciones iguales
```

### Paso 3: Agregar a .gitignore

```gitignore
# Credentials
src/helpers/gsec.json
.env
.env.local
.env.*.local
```

### Paso 4: Rotar credenciales (urgente)

Si el repositorio es/fue público, rotar inmediatamente:
1. Ir a Google Cloud Console → IAM → Service Accounts
2. Encontrar la cuenta: `driveveolia@driveveolia.iam.gserviceaccount.com`
3. Eliminar la clave actual (ID: `6b47ed8d...`)
4. Crear nueva clave
5. Actualizar variables de entorno (NO commitear)

### Paso 5: Secret Manager (opcional pero recomendado)

Para producción, usar un secret manager:

**AWS Secrets Manager:**
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getCredentials() {
  const secret = await secretsManager.getSecretValue({
    SecretId: 'prod/tarificador/google-sheets'
  }).promise();
  return JSON.parse(secret.SecretString);
}
```

**GCP Secret Manager:**
```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

async function getCredentials() {
  const [version] = await client.accessSecretVersion({
    name: 'projects/tu-project/secrets/google-sheets-credentials/versions/latest'
  });
  return JSON.parse(version.payload.data.toString());
}
```

## Permisos necesarios en Google Cloud

La cuenta de servicio necesita:
- **Rol**: `roles/editor` o `roles/viewer` (mínimo para Sheets API)
- **APIs habilitadas**:
  - Google Sheets API
  - Google Drive API (para listar hojas)

## Compartir spreadsheets

Para que la cuenta de servicio pueda leer un spreadsheet, debe ser compartida con el email de la cuenta:

```
driveveolia@driveveolia.iam.gserviceaccount.com
```

Con permiso de **Lector** (Viewer).

## Verificación

Para verificar que la conexión funciona:

```bash
curl -X POST http://localhost:3000/api/v1/suministros/cargueProductividad \
  -H "Content-Type: application/json" \
  -d '{"sheetId": "TU_SHEET_ID", "sheetName": "Hoja1"}'
```

## Referencias

- [Google Sheets API v4](https://developers.google.com/sheets/api)
- [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Node.js Google Auth](https://github.com/googleapis/google-auth-library-nodejs)
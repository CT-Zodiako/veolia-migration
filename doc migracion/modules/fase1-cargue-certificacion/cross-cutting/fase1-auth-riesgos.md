---
modulo: fase1-cargue-certificacion
fase: 1
version: v1
estado: implementado_as_is
estado_ddl: validado
fuentes:
  - back-tarificador/src/modules/suministros/routes.js
  - back-tarificador/src/modules/validaciones/routes.js
  - back-tarificador/src/modules/auth/*.js
  - front-tarificador/src/service/MenuService.js
trazabilidad:
  - actor: Usuario operativo / Admin
  - frontend: Login → Selector APS/Periodo → Menú
  - service: AuthService / MenuService
  - endpoint: /api/v1/auth/* / /api/v1/validaciones/*
  - backend: auth/controller.js / middleware/authJwt.js
  - db: AUGE_DEADTOKEN / AUGE_USUAMENU / AUGE_MENU
---

# Cross-cutting: auth, contratos heterogéneos y riesgos

## Matriz de autenticación AS-IS

| Endpoint | Middleware `authJwt.verificarToken` | Observación |
|---|---|---|
| `/suministros/filecarguecomercial` | Sí | Flujo principal mensual protegido. |
| `/suministros/filecarguecomercialsemestral` | Sí | Flujo principal semestral protegido. |
| `/suministros/setCargueInfPropia*` | Sí | Protegido en variantes mensual/semestral. |
| `/suministros/setCargueInfCompetidor*` | Sí | Protegido en variantes mensual/semestral. |
| `/suministros/setTerceros` | Sí | Protegido. |
| `/suministros/guardarQRTRural` | Sí | Protegido. |
| `/suministros/getcanCertificate*` | Sí | Prevalidaciones protegidas. |
| `/suministros/Certificar` | Sí | Certificación mensual principal protegida. |
| `/suministros/Certificarsemestral` | Sí | Certificación semestral principal protegida. |
| `/suministros/guardarProductividad` | No | Ruta sin middleware en código actual. |
| `/suministros/cargueProductividad` | No | Ruta sin middleware en código actual. |
| `/suministros/certificarMensual` | No | Variante PGIRS sin middleware. |
| `/suministros/plcertificarSemestral` | No | Variante PGIRS sin middleware. |
| `/suministros/cenrtificarEditar` | No | Typo preservado y sin middleware. |

## Contratos heterogéneos preservados

- Respuestas mixtas: `res.send(...)` vs `res.status(...).send(...)`.
- Certificación devuelve formas distintas (`response.res`, JSON parseado, string formateada).
- Alias funcionales para certificación mensual/semestral (`Certificar` vs `certificarMensual`, `Certificarsemestral` vs `plcertificarSemestral`).
- Typo expuesto en API: `cenrtificarEditar`.

## Riesgos AS-IS

| Riesgo | Nivel | Evidencia | Mitigación documental |
|---|---|---|---|
| Endpoints críticos sin auth | High | `routes.js` sin middleware en rutas PGIRS y productividad | Señalados explícitamente en matriz auth. |
| Dependencia fuerte de packages Oracle | High | Invocaciones directas `pk_certificacion`, `PK_GIRS`, `PK_VALGRAL` | Trazabilidad endpoint→PL/SQL en docs. |
| Contratos de respuesta no uniformes | Medium | Múltiples patrones de `response` | Se documentan AS-IS sin normalizar. |
| Discrepancias de naming/typo | Medium | `cenrtificarEditar`, aliases de certificación | Se preservan literal con nota de riesgo. |
| **Credenciales hardcodeadas en repo** | **CRITICAL** | `gsec.json` (Google service account key) commiteado en `src/helpers/` | Documentado con guía de migración a variables de entorno/secrets manager. Ver detalle abajo. |

---

## 🔐 Riesgo CRÍTICO: Credenciales en repositorio

### Estado actual (AS-IS)
- **Archivo**: `back-tarificador/src/helpers/gsec.json`
- **Contenido**: Clave privada RSA + client_email de cuenta de servicio Google Cloud
- **Uso**: Autenticación contra Google Sheets API para lectura de productividad
- **Riesgo**: Exposición de claves privadas en control de versiones

### Recomendación para migración
1. **Inmediato**: Agregar `gsec.json` a `.gitignore`
2. **Corto plazo**: Mover credenciales a variables de entorno
3. **Mediano plazo**: Implementar secret manager (AWS Secrets Manager, GCP Secret Manager, o HashiCorp Vault)
4. **Rotación**: Rotar las credenciales actuales si el repo es/fue público

### Configuración segura (template)
```bash
# .env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=your-project-id
```

```javascript
// drivehelper.js (versión segura)
const creds = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
};
```

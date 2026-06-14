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
  - front-tarificador/src/views/suministros/Cargue.vue
  - front-tarificador/src/views/suministros/CargueSem.vue
trazabilidad:
  - actor: Usuario operativo
  - frontend: Cargue.vue / CargueSem.vue
  - service: CargueService
  - endpoint: /api/v1/suministros/*
  - backend: suministros/controller.js
  - db: PK_CERTIFICACION / AUCO_* tables
---

# Core funcional — Cargue y Certificación

## Escenarios operativos (spec)

1. Cargue mensual normal y recargue.
2. Cargue semestral normal y bloqueo por datos incompletos.
3. Certificación mensual exitosa y error por periodo inválido.
4. Certificación semestral exitosa/parcial.
5. Variables operativas como precondición.
6. **Archivo corrupto / formato inválido**: El sistema recibe un archivo plano con estructura incorrecta o datos malformados. El backend debe rechazar el cargue y notificar al usuario sin persistir datos parciales (rollback implícito por no insertar).

## Matriz Actor → Frontend → Endpoint → Backend → DB

| Flujo | Actor | Frontend | Endpoint | Backend | DB/PLSQL |
|---|---|---|---|---|---|
| Cargue comercial mensual | Operativo | `setCargueMasivoComercial` | `POST /suministros/filecarguecomercial` | `filecarguecomercial` | `AUCO_CARGUECOMERCIAL`, `AUCO_RESCOMERCIAL` |
| Cargue comercial semestral | Operativo | `setCargueMasivoComercialSem` | `POST /suministros/filecarguecomercialsemestral` | `filecarguecomercialsemestral` | `AUCO_CARGUEUSUSEM` |
| Cargue info propia mensual | Operativo | `setCargueInfPropia` | `POST /suministros/setCargueInfPropia` | `setCargueInfPropia` | `AUCO_CARGUEPROPIO` |
| Cargue info propia semestral | Operativo | `setCargueInfPropiaSem` | `POST /suministros/setCargueInfPropiaSem` | `setCargueInfPropiaSem` | `AUCO_CARGUEPROPIOSEM` |
| Cargue info competidor mensual | Operativo | `setCargueInfCompe` | `POST /suministros/setCargueInfCompetidor` | `setCargueInfCompetidor` | `AUCO_CARGUECOMPE` |
| Cargue info competidor semestral | Operativo | `setCargueInfCompeSem` | `POST /suministros/setCargueInfCompetidorSemestral` | `setCargueInfCompetidorSemestral` | `AUCO_CARGUECOMPESEM` |
| Terceros | Operativo | `setCargueTerceros` | `POST /suministros/setTerceros` | `setTerceros` | `AUCO_CARGUETERCERO` |
| Productividad (guardar) | Operativo | carga planilla/UI | `POST /suministros/guardarProductividad` | `guardarProductividad` | `PORD_PROPIA`, `PORD_TERCERO` |
| Productividad (consulta archivo) | Operativo | `cargueProductividad` | `POST /suministros/cargueProductividad` | `cargueProductividad` | Google Drive helper + dataset filtrado |
| QRT rural | Operativo | `setCargueRural` | `POST /suministros/guardarQRTRural` | `guardarQRTRural` | `AUCO_CARGUERURAL` |
| Precheck mensual | Operativo | `getcanCertificate` | `POST /suministros/getcanCertificate` | `getcanCertificate` | `auco_tarifas` |
| Precheck semestral | Operativo | `getcanCertificateSemestral` | `POST /suministros/getcanCertificateSemestral` | `getcanCertificateSemestral` | `auco_tarifas` |
| Certificación mensual principal | Operativo | `getCertificar` | `POST /suministros/Certificar` | `Certificar` | `pk_certificacion.fauco_certificar` |
| Certificación semestral principal | Operativo | `getCertificarsemestral` | `POST /suministros/Certificarsemestral` | `Certificarsemestral` | `pk_certificacion.fauco_certificarsem` |
| Certificación mensual PGIRS | Operativo | `getCertificarMensual` | `POST /suministros/certificarMensual` | `certificarMensual` | `PK_GIRS.fpgirs_mensual` |
| Certificación semestral PGIRS | Operativo | `getPlcertificarSemestral` | `POST /suministros/plcertificarSemestral` | `plcertificarSemestral` | `PK_GIRS.fpgirs_semestral` |
| Validación edición poda (typo) | Operativo/Cálculo | `cenrtificarEditar` indirecto | `POST /suministros/cenrtificarEditar` | `certificarEdicionPODA` | `PK_VALGRAL.fauco_existarifa` |

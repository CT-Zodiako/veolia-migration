---
modulo: fase3-integracion-sui
fase: 3
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase3/explore
  - sdd/flujo-tarifas/fase3/proposal
  - sdd/flujo-tarifas/fase3/spec
  - sdd/flujo-tarifas/fase3/design
  - sdd/flujo-tarifas/fase3/tasks
  - sdd/flujo-tarifas/fase3/ddl
trazabilidad: actor-frontend-endpoint-backend-db
---

# Fase 3 — Integración SUI (AS-IS)

## Alcance

Documentación AS-IS del flujo **consulta → validación previa → procesamiento SUI → estado**, incluyendo cargue complementario, orquestación Oracle de `PK_SUI.fsui_fejecutasui`, reglas de negocio, riesgos de contrato y dependencias ocultas.

## Documentos de la fase

- `funcionalidades/fase3-consulta-validacion-proceso.md`
- `funcionalidades/fase3-orquestacion-sui.md`
- `funcionalidades/fase3-formato-f19.md`
- `funcionalidades/fase3-formato-f23.md`
- `funcionalidades/fase3-formato-f24.md`
- `funcionalidades/fase3-formato-f35.md`
- `funcionalidades/fase3-formato-f36.md`
- `funcionalidades/fase3-reglas-negocio.md`
- `cross-cutting/fase3-auth-riesgos.md`

## Trazabilidad macro

Actor Operativo SUI → `Suisui.vue` / `CargueComp.vue` → `SuiService.js` + `Validaciones.js` → `/api/v1/sui/*` + `/api/v1/validaciones/certificarfauco_existarifa` → `modules/sui/{routes.js,controller.js}` + `modules/validaciones/controller.js` → `PK_SUI` + `PK_VALGRAL` + (`PK_GENERAL720`, `PK_COSTOS`) → `SUI_F19/F23/F24/F35/F36` + `SUI_COMPLEMENTO`.

## Endpoints SUI de la fase (8)

| Endpoint | Método | Uso |
|---|---|---|
| `/api/v1/sui/Procesar` | POST | Ejecuta `Pk_sui.FSUI_FEJECUTASUI` |
| `/api/v1/sui/getcanCertificate` | POST | Verifica existencia de certificados/archivos del período |
| `/api/v1/sui/setCargueInfComplemento` | POST | Persiste complemento F24/F35/F36 en `SUI_COMPLEMENTO` |
| `/api/v1/sui/consuformu19` | POST | Consulta dataset F19 |
| `/api/v1/sui/consuformu23` | POST | Consulta dataset F23 |
| `/api/v1/sui/consuforma24` | POST | Consulta dataset F24 |
| `/api/v1/sui/consuforma35` | POST | Consulta dataset F35 |
| `/api/v1/sui/consuforma36` | POST | Consulta dataset F36 |

## Tracker DDL obligatorio (COMPLETO ✅)

| Tipo | Objeto | Estado |
|---|---|---|
| Package | `PK_SUI` (10 funciones) | ✅ validado |
| Tabla | `SUI_F19` | ✅ validado |
| Tabla | `SUI_F23` | ✅ validado |
| Tabla | `SUI_F24` | ✅ validado |
| Tabla | `SUI_F35` | ✅ validado |
| Tabla | `SUI_F36` | ✅ validado |
| Tabla | `SUI_COMPLEMENTO` | ✅ validado |

## Dependencias inter-fase

- Fase 1: `docs/modulos/fase1-cargue-certificacion/_index.md`
- Fase 2: `docs/modulos/fase2-calculo-tarifas/_index.md`

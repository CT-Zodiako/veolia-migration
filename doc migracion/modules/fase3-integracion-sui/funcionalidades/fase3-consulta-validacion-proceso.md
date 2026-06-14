---
modulo: fase3-integracion-sui
fase: 3
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - front-tarificador/src/views/sui/Suisui.vue
  - front-tarificador/src/views/sui/CargueComp.vue
  - front-tarificador/src/service/SuiService.js
  - front-tarificador/src/service/Validaciones.js
  - back-tarificador/src/modules/sui/routes.js
  - back-tarificador/src/modules/sui/controller.js
  - back-tarificador/src/modules/validaciones/controller.js
trazabilidad:
  - actor: Operador SUI
  - frontend: Suisui.vue / CargueComp.vue
  - endpoint: /api/v1/sui/* + /api/v1/validaciones/certificarfauco_existarifa
  - backend: sui + validaciones controllers
  - db: PK_SUI + PK_VALGRAL + SUI_F* + SUI_COMPLEMENTO
---

# Flujo core — Consulta, Validación y Proceso SUI

## Matriz Actor → Frontend → Endpoint → Backend → DB

| Paso | Actor | Frontend/Service | Endpoint | Backend | DB/PLSQL |
|---|---|---|---|---|---|
| Consulta F19 | Operador SUI | `actualizaInfoGeneral()` → `getSuiconsultaf19` | `POST /api/v1/sui/consuformu19` | `sui.controller.consuformu19` | `SELECT TARIFICADOR.SUI_F19` |
| Consulta F23 | Operador SUI | `getSuiconsultaf23` | `POST /api/v1/sui/consuformu23` | `sui.controller.consuformu23` | `SELECT TARIFICADOR.SUI_F23` |
| Consulta F24 | Operador SUI | `getSuiconsultaf24` | `POST /api/v1/sui/consuforma24` | `sui.controller.consuforma24` | `SELECT TARIFICADOR.SUI_F24` |
| Consulta F35 | Operador SUI | `getSuiconsultaf35` | `POST /api/v1/sui/consuforma35` | `sui.controller.consuforma35` | `SELECT TARIFICADOR.SUI_F35` |
| Consulta F36 | Operador SUI | `getSuiconsultaf36` | `POST /api/v1/sui/consuforma36` | `sui.controller.consuforma36` | `SELECT TARIFICADOR.SUI_F36` |
| Prevalidación | Operador SUI | `launchProcesar()` → `Validaciones.certificarfauco_existarifa` | `POST /api/v1/validaciones/certificarfauco_existarifa` | `validaciones.controller.certificarfauco_existarifa` | `PK_VALGRAL.fauco_generasui(aps,anno,mes)` |
| Proceso SUI | Operador SUI | `launchProcesar()` → `SuiService.Procesar` | `POST /api/v1/sui/Procesar` | `sui.controller.Procesar` | `PK_SUI.fsui_fejecutasui` + COMMIT |
| Cargue complemento | Operador SUI | `CargueComp.vue` | `POST /api/v1/sui/getcanCertificate` + `POST /api/v1/sui/setCargueInfComplemento` | `sui.controller.getcanCertificate` + `setCargueInfComplemento` | `SUI_F24` + `DELETE/INSERT SUI_COMPLEMENTO` |

## Secuencia operacional (3 pasos)

1. **Consulta de formatos**: actor selecciona APS/período, el frontend consulta 5 formatos (`F19,F23,F24,F35,F36`) y refresca resumen.
2. **Validación previa**: al presionar PROCESAR se llama `certificarfauco_existarifa`; el retorno debe ser `1` para continuar.
3. **Procesamiento**: si retorna `1`, se ejecuta `sui/Procesar` que dispara `fsui_fejecutasui` y cierra con COMMIT.

## Condición crítica de habilitación

| Resultado `fauco_generasui` | Acción UI | Acción backend |
|---|---|---|
| `1` | Habilita ejecución | Llama `PK_SUI.fsui_fejecutasui` |
| `!= 1` | Bloquea proceso y muestra mensaje | No se ejecuta SUI |

## Referencias cruzadas

- Precondiciones de cargue/certificación: `../../fase1-cargue-certificacion/funcionalidades/fase1-cargue-certificacion-core.md`
- Dependencias de cálculo que alimentan SUI: `../../fase2-calculo-tarifas/funcionalidades/fase2-verificar-calcular-certificar-core.md`

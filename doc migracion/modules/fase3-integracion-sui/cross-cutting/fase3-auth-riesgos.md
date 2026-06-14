---
modulo: fase3-integracion-sui
fase: 3
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - back-tarificador/src/modules/sui/routes.js
  - back-tarificador/src/modules/validaciones/routes.js
  - front-tarificador/src/service/SuiService.js
  - front-tarificador/src/views/sui/CargueComp.vue
trazabilidad: actor-frontend-endpoint-backend-db
---

# Auth, contratos y riesgos AS-IS

## Matriz de auth por ruta

| Ruta | Middleware | Riesgo |
|---|---|---|
| `/api/v1/sui/*` (8 endpoints) | `authJwt.verificarToken` | Bajo en capa ruta |
| `/api/v1/validaciones/certificarfauco_existarifa` | No explícito en ruta | Gap de protección para prevalidación crítica |

## Riesgo 1 — Mismatch GET/POST

| Evidencia FE | Evidencia BE | Impacto migración |
|---|---|---|
| `SuiService.getResumenVariables` usa `GET sui/getResumenVariables` | Backend expone `POST` | Posible falla por método HTTP incompatible si se migra “tal cual” |

## Riesgo 2 — Método potencialmente inexistente

| Evidencia llamada | Evidencia servicio | Impacto migración |
|---|---|---|
| `CargueComp.vue` invoca `this.cargueServ.getCertificar` | No confirmado en `SuiService.js` observado | Riesgo de runtime al ejecutar flujo de cargue complementario |

## Dependencias ocultas

| Dependencia | Uso en fase |
|---|---|
| `PK_GENERAL720` | Dependencia funcional dentro de la cadena de cálculo/insumos SUI |
| `PK_COSTOS` | Dependencia funcional para variables/costos previos consumidos por SUI |

## Referencias cruzadas

- Fase 1 auth/riesgos: `../../fase1-cargue-certificacion/cross-cutting/fase1-auth-riesgos.md`
- Fase 2 auth/riesgos: `../../fase2-calculo-tarifas/cross-cutting/fase2-auth-transacciones-riesgos.md`

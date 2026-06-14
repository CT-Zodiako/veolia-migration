---
modulo: fase4-facturacion
fase: 4
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase4/explore
  - sdd/flujo-tarifas/fase4/spec
  - sdd/flujo-tarifas/fase4/design
trazabilidad: actor-frontend-endpoint-backend-db
---

# Cross-cutting — Auth, riesgos y reglas

## Matriz de autenticación AS-IS

| Capa | Evidencia | Lectura AS-IS |
|---|---|---|
| Frontend | `FacturaService` envía `x-access-token` | El cliente intenta autenticación por header. |
| Backend rutas facturación | endpoints `/api/v1/facturacion/*` | No se evidencia middleware auth explícito por ruta en módulo documentado. |

## Regla de negocio #1 — Mes anterior

La consulta en FE usa período del **mes anterior** (`stDate - 1`).

| Fecha operativa (`stDate`) | Payload esperado |
|---|---|
| `2025-05-10` | `{ "anno": 2025, "mes": 4 }` |
| `2025-01-15` | `{ "anno": 2024, "mes": 12 }` |

Impacto: aplica a las 5 consultas de la fase.

## Regla de negocio #2 — Validación cruzada SUI vs facturación

Compuerta inter-fase:

- Endpoint: `POST /api/v1/validaciones/certificarFauco_cpsuivsfact`
- Oracle: `PK_VALGRAL.fauco_cpsuivsfact(:aps,:anno,:mes)`

Si detecta divergencia entre datos SUI y facturación, se usa como señal de alerta/bloqueo aguas arriba del cierre.

## Riesgos priorizados

| Riesgo | Nivel | Evidencia |
|---|---|---|
| Auth no explícita en rutas de facturación | High | Módulo documentado sin middleware por ruta |
| Dependencia rígida de 5 vistas Oracle | High | Endpoints basados en `SELECT *` directo sobre vistas |
| Regla temporal implícita | High | Si no se respeta mes anterior, consulta apunta a período incorrecto |
| Dependencias ocultas `PK_TARIFACOMPONENTE` | High | Afectan DINC y electrónica sin estar en contrato HTTP |

## Referencias cruzadas

- Fase 1: `../../fase1-cargue-certificacion/_index.md`
- Fase 2: `../../fase2-calculo-tarifas/_index.md`
- Fase 3: `../../fase3-integracion-sui/_index.md`
- Índice Fase 4: `../_index.md`

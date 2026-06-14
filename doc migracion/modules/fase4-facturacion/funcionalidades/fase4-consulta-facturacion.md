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

# Flujo de consulta de facturación (5 vistas)

## Secuencia funcional

1. Actor entra por **Informes Comerciales → Detallado Facturación** (`/facturacion`).
2. `Detallefacturacion.vue` calcula período operativo con regla temporal (mes anterior).
3. `FacturaService.js` envía body común `{ aps, anno, mes }` con `x-access-token`.
4. Backend recibe en `/api/v1/facturacion/*` y delega a `facturacion/controller.js`.
5. Controller ejecuta `SELECT *` sobre 5 vistas filtrando por APS/año/mes.

## Llamadas frontend (mismo período)

| Orden | Método FE | Endpoint | Filtro backend |
|---|---|---|---|
| 1 | `getFacturacion()` | `/api/v1/facturacion/facturacion` | `APSA_ID, TARI_ANNO, TARI_MES` |
| 2 | `getDetalleFacturacion()` | `/api/v1/facturacion/detafacturacion` | `APSA_ID, RETA_ANNO, RETA_MES` |
| 3 | `getFacturacionClus()` | `/api/v1/facturacion/facturacionclus` | `APSA_ID, TARI_ANNO, TARI_MES` |
| 4 | `getFacturacionDinc()` | `/api/v1/facturacion/facturaciondinc` | `APSA_ID, TARI_ANNO, TARI_MES` |
| 5 | `getFacturacionElectronica()` | `/api/v1/facturacion/facturacionelectronica` | `codaps, anno, mes` |

## Payload de contrato

```json
{ "aps": 1033, "anno": 2025, "mes": 4 }
```

## Regla temporal AS-IS (mes anterior)

- Ejemplo normal: `stDate = 2025-05-10` → payload `anno=2025`, `mes=4`.
- Caso borde enero: `stDate = 2025-01-15` → payload `anno=2024`, `mes=12`.

## Validación cruzada con Fase 3

Antes de tomar Fase 4 como consistente a nivel proceso, existe compuerta en validaciones:

- `POST /api/v1/validaciones/certificarFauco_cpsuivsfact`
- Oracle: `PK_VALGRAL.fauco_cpsuivsfact(:aps,:anno,:mes)`

Esta validación conecta integración SUI (Fase 3) con consistencia de facturación (Fase 4).

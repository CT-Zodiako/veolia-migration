---
modulo: fase3-integracion-sui
fase: 3
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase3/spec
  - sdd/flujo-tarifas/fase3/design
  - sdd/flujo-tarifas/fase3/ddl
trazabilidad: actor-frontend-endpoint-backend-db
---

# Reglas de negocio — `fsui_fejecutasui`

## R1 — NO solo relleno

| Condición | Resultado | Evidencia |
|---|---|---|
| `apsa_solorell = 0` | Ejecuta `F19`, `F24`, `F23` | `PK_SUI.fsui_fejecutasui` |

## R2 — Relleno propio

| Condición | Resultado | Evidencia |
|---|---|---|
| APS con relleno propio | Ejecuta `F35` y `F36` | `PK_SUI.fsui_fejecutasui` |

## R3 — NO relleno propio

| Condición | Resultado | Evidencia |
|---|---|---|
| APS sin relleno propio | `F35/F36 = NO APLICA` | `PK_SUI.fsui_fejecutasui` + `PK_SUI.fsui_estado` |

## R4 — SOLO relleno

| Condición | Resultado | Evidencia |
|---|---|---|
| `apsa_solorell = 1` | `F19/F23/F24 = NO APLICA`; ejecuta `F35/F36` | `PK_SUI.fsui_fejecutasui` + `PK_SUI.fsui_estado` |

## Tipo de estado final

`PK_SUI.fsui_estado` retorna `typ_suiresult` con detalle `typ_suidetresult` para representar estado por formato (`formato`, `estado`, `mensaje`) y su visualización final en frontend.

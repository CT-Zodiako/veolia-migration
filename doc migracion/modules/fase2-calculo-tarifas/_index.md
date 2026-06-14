---
modulo: fase2-calculo-tarifas
fase: 2
version: v1
estado: implementado_as_is
estado_ddl: parcial
fuentes:
  - sdd/flujo-tarifas/fase2/explore
  - sdd/flujo-tarifas/fase2/proposal
  - sdd/flujo-tarifas/fase2/spec
  - sdd/flujo-tarifas/fase2/design
  - sdd/flujo-tarifas/fase2/tasks
  - sdd/flujo-tarifas/fase2/ddl
trazabilidad: actor-frontend-endpoint-backend-db
---

# Fase 2 — Cálculo de Tarifas (AS-IS)

## Alcance

Documentación AS-IS del flujo **VERIFICAR → CALCULAR → CERTIFICAR** del módulo costos, incluyendo validaciones previas, dependencias Oracle directas/ocultas, transaccionalidad observada y checklist DDL parcial.

## Documentos de la fase

- `funcionalidades/fase2-verificar-calcular-certificar-core.md` — Flujo E2E y matriz trazabilidad
- `funcionalidades/fase2-calculo-6pasos.md` — Detalle de los 6 pasos y excepción APS 1031
- `datos/fase2-tablas-vistas.md` — AUCO_TARIFAS, VAUCO_COSTOS, VAUCO_ANTESLIQUIDAR + auxiliares
- `datos/fase2-dependencias-ocultas.md` — Paquetes fuera de DDL y estado evidencia
- `cross-cutting/fase2-auth-transacciones-riesgos.md` — Auth, commit/rollback, riesgos y gaps

## Precondiciones heredadas de Fase 1

- Origen de cargues y variables operativas: `docs/modulos/fase1-cargue-certificacion/funcionalidades/fase1-variables-operativas.md`
- Contexto de certificaciones/cargues previos: `docs/modulos/fase1-cargue-certificacion/funcionalidades/fase1-cargue-certificacion-core.md`

## Trazabilidad macro

Operador tarifas → `Calculo.vue` → `CostoService.js` / `Validaciones.js` → `/api/v1/costos/*` + `/api/v1/validaciones/*` + `/api/v1/suministros/cenrtificarEditar` + `/api/v1/{toneladas,kilometros,subcon}/*` → controladores Node (`costos`, `validaciones`, `suministros`, `toneladas`, `kilometros`, `subcont`) → Oracle PL/SQL (`pk_validaciones`, `pk_liquidar`, `PK_VALGRAL`, dependencias ocultas) → tablas/vistas de costos/tarifas.

## Tracker DDL obligatorio (parcial)

| Tipo | Objeto | Estado | Observación |
|---|---|---|---|
| Package | `PK_LIQUIDAR` | `validado` | Incluye `fauco_calculartarifas` (6 pasos) y `fauco_actudescsubcon`. |
| Tabla | `AUCO_TARIFAS` | `validado` | PK compuesta de 8 columnas y ~30 campos de tarifas calculadas. |
| Vista | `VAUCO_COSTOS` | `validado` | Unión de 6 bloques/fuentes de costos. |
| Vista | `VAUCO_ANTESLIQUIDAR` | `validado` | Validaciones previas de cálculo. |
| Tabla | `AUCO_TARICERTIFICADA` | `pendiente_ddl` | Referenciada por endpoint `certificarTarifas` (insert). |
| Tabla | `costosempredivi` | `pendiente_ddl` | Limpieza Paso 2. |
| Tabla | `costaddccs` | `pendiente_ddl` | Limpieza Paso 2. |
| Tabla | `costosapsempredivi` | `pendiente_ddl` | Limpieza Paso 2. |
| Tabla | `costosapsrelleno` | `pendiente_ddl` | Limpieza Paso 2. |
| Tabla | `auco_infoapsdescost` | `pendiente_ddl` | Consumida por `fauco_actudescsubcon`. |
| Tabla | `auco_apssubscont` | `pendiente_ddl` | Consumida por `fauco_actudescsubcon` y `/subcon/consulta`. |
| Tabla/Vista | `json_json` (referencia funcional) | `pendiente_ddl` | Vinculada a salida `pk_json.fjson_clus`. |

## Dependencias no incluidas en DDL (dependencia_no_ddl)

- `pk_actualizacostos.fauco_actualizacostos`
- `pk_resumen.fauco_resumentarifas`
- `pk_resumen.fauco_resumenvariables`
- `pk_json.fjson_infogral`
- `pk_json.fjson_clus`
- `pk_sui.fsui_f19`
- `pk_sui.fsui_f23`

## Checklist de cierre (spec/design/tasks)

| Criterio | Resultado |
|---|---|
| Flujo VERIFICAR documentado con endpoint + PL/SQL + vista | ✅ |
| Flujo CALCULAR documentado con 6 pasos completos | ✅ |
| Excepción `APS=1031` (San Pedro) documentada | ✅ |
| Flujo CERTIFICAR documentado con `INSERT` y trazabilidad usuario/fecha | ✅ |
| Endpoints de soporte (`costos`, `validaciones`, `suministros`, `toneladas`, `kilometros`, `subcon`) incluidos | ✅ |
| Dependencias ocultas marcadas `dependencia_no_ddl` | ✅ |
| Gaps DDL marcados `pendiente_ddl` | ✅ |
| Transaccionalidad COMMIT/ROLLBACK documentada | ✅ |

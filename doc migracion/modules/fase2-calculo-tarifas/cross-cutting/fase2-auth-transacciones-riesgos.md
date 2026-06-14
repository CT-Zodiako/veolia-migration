---
modulo: fase2-calculo-tarifas
fase: 2
version: v1
estado: implementado_as_is
estado_ddl: parcial
fuentes:
  - back-tarificador/src/modules/costos/routes.js
  - back-tarificador/src/modules/validaciones/routes.js
  - back-tarificador/src/modules/suministros/routes.js
  - back-tarificador/src/middlewares/authJwt.js
trazabilidad:
  - actor: Operador tarifas
  - frontend: Calculo.vue
  - service: CostoService / Validaciones
  - endpoint: costos/validaciones/suministros
  - backend: routes + controllers
  - db: AUGE_DEADTOKEN + objetos costos/tarifas
---

# Cross-cutting — Auth, transacciones y riesgos

## Matriz de autenticación AS-IS

| Endpoint | Middleware `authJwt.verificarToken` | Observación |
|---|---|---|
| `/api/v1/costos/validapreactualiza` | Sí | Verificación previa protegida. |
| `/api/v1/costos/calculartarifas` | Sí | Ejecución principal protegida. |
| `/api/v1/costos/certificarTarifas` | Sí | Certificación protegida. |
| `/api/v1/costos/consultar` | Sí | Consulta de costos protegida. |
| `/api/v1/toneladas/qrt` | Sí | Insumo protegido. |
| `/api/v1/toneladas/qa` | Sí | Insumo protegido. |
| `/api/v1/kilometros/lbl` | Sí | Insumo protegido. |
| `/api/v1/subcon/consulta` | Sí | Insumo protegido (módulo `subcont`). |
| `/api/v1/validaciones/certificarFauco_cpsuivsfact` | No | Precheck expuesto sin middleware en ruta observada. |
| `/api/v1/validaciones/certificarFauco_cpproductividad` | No | Precheck expuesto sin middleware. |
| `/api/v1/validaciones/certificarFauco_cpenero` | No | Precheck expuesto sin middleware. |
| `/api/v1/suministros/cenrtificarEditar` | No | Endpoint con typo histórico y sin middleware. |

## Boundary transaccional (COMMIT / ROLLBACK)

| Componente | Comportamiento observado |
|---|---|
| Llamada Node a `pk_liquidar.fauco_calculartarifas` | Ejecuta flujo completo APS/período y devuelve estado HTTP (200/500). |
| `PK_LIQUIDAR.fauco_calculartarifas` | Orquesta 6 pasos secuenciales; controla ramas por regla de negocio (`APS != 1031`). |
| `PK_LIQUIDAR.fauco_actudescsubcon` | Maneja `DUP_VAL_ON_INDEX`; ante conflicto realiza rollback controlado del bloque de subsidios/contribuciones y retorna error controlado. |

**Lectura AS-IS:** existe coordinación transaccional entre capa Node y PL/SQL, con control de rollback explícito en el paso 6 para colisiones de índice único.

## Riesgos críticos del módulo

| Riesgo | Nivel | Evidencia | Mitigación documental |
|---|---|---|---|
| Prechecks sin auth | High | Rutas `validaciones/*` y `suministros/cenrtificarEditar` sin middleware observado | Matriz auth explícita para migración/control de exposición. |
| Dependencias Oracle no incluidas en DDL | High | `pk_actualizacostos`, `pk_resumen`, `pk_json`, `pk_sui` | Marcadas como `dependencia_no_ddl` en documentos de fase. |
| DDL incompleto de tablas auxiliares | High | Tablas de limpieza/subsidios sin script fuente en artefacto | Marcadas `pendiente_ddl` en checklist global. |
| Contratos heterogéneos/typos | Medium | `cenrtificarEditar`, respuestas mix `send/status` | Preservado literal en AS-IS para evitar pérdida de trazabilidad. |
| Excepción APS 1031 no visible en capa FE | Medium | Regla vive dentro de package | Documentada como condición obligatoria del flujo de cálculo. |

## Referencias cruzadas

- Flujo core: `../funcionalidades/fase2-calculo-core.md`
- Insumos y dependencias: `../funcionalidades/fase2-insumos-dependencias.md`
- Detalle DB/6 pasos: `../funcionalidades/fase2-detalles-db.md`
- Contexto fase previa: `../../fase1-cargue-certificacion/_index.md`

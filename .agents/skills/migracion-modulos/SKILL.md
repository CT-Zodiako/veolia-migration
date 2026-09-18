---
name: migracion-modulos
description: "Trigger: migrar módulo, migrar componente, revisar legacy, Node/Vue a Angular/.NET. Migra por paridad funcional desde el proyecto legacy hacia el nuevo, trazando Frontend → API → backend → Oracle."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
---

## Activation Contract

Usar cuando se migre, revise o planifique un módulo/componente del sistema legacy Node/Express + Vue 2 hacia Angular + .NET, manteniendo el comportamiento observable.

## Hard Rules

- Fuente primaria legacy: `/Users/zodiako/DEV/oracle/` (`front-tarificador/` y `back-tarificador/`).
- Fuente secundaria: `doc migracion/modules/` y los contratos/tests existentes del repositorio nuevo.
- Leer primero el componente Vue, sus hijos, servicio Axios, router/store y backend Express (`routes.js`, `controller.js`, helpers y SQL).
- No inventar reglas: separar `observado_as_is`, `decision_to_be` y `riesgo_migracion`.
- Preservar contratos, nombres de campos, estados, validaciones, errores, permisos, ordenamientos y efectos laterales, salvo corrección explícita aprobada.
- Toda operación de escritura debe tener equivalente identificable en el backend nuevo y prueba de regresión.
- No tocar la base legacy ni ejecutar mutaciones contra ella durante el análisis.

## Decision Gates

| Situación | Acción |
|---|---|
| Existe documentación AS-IS | Validarla contra código legacy; el código gana ante contradicción documentada. |
| Falta contrato o DDL | Marcar `pendiente-validacion`; no asumir tipos, nullability ni catálogos. |
| Módulo con varios componentes | Migrar en orden: contrato/API, repositorio, endpoint, servicio Angular, componente/presentación. |
| Dependencia compartida | Identificarla y aislarla antes de duplicar lógica. |

## Execution Steps

1. Definir alcance con rutas concretas de `front-tarificador` y `back-tarificador`.
2. Construir matriz Actor → Vue/componentes → servicio → endpoint → controller/SQL → tabla/vista/package Oracle.
3. Registrar comportamiento: inputs, outputs, loading, errores, permisos, validaciones, paginación, exportación y navegación.
4. Mapear a Angular/.NET: componente, modelos, servicio HTTP, controller, DTOs, repository y consultas/procedures.
5. Implementar por capas, preservando primero el contrato legacy; reutilizar patrones existentes del nuevo frontend.
6. Crear pruebas de contrato, casos felices, errores, permisos y regresión de datos.
7. Comparar manualmente o automáticamente respuestas legacy/nuevo cuando sea posible.
8. Reportar bloqueantes, diferencias intencionales y criterio de aceptación antes de cerrar.

## Output Contract

Entregar por funcionalidad:
- `id`, `nombre`, `rutas_legacy`, `componentes_legacy`, `endpoints_legacy`.
- `observado_as_is`, `mapeo_to_be`, `invariantes`, `componentes_nuevos`.
- `riesgos`, `pendientes`, `pruebas_regresion`, `criterio_aceptacion`, `estado`.

A nivel módulo incluir dependencias, secuencia de migración, diferencias aprobadas y rollback.

## References

- `doc migracion/modules/` — documentación AS-IS y trazabilidad.
- `/Users/zodiako/DEV/oracle/front-tarificador/` — Vue 2 legacy.
- `/Users/zodiako/DEV/oracle/back-tarificador/` — Node/Express legacy.
- `.agents/skills/veolia-migration-review/SKILL.md` — auditoría de paridad.
- `.claude/skills/veolia-ui-style/SKILL.md` — convenciones Angular.

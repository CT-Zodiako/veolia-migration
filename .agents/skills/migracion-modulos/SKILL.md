---
name: migracion-modulos
description: >
  Construye una guía de migración por módulo a partir del markdown AS-IS,
  manteniendo trazabilidad funcional completa Actor → Frontend → Endpoint → Lógica backend → Base de datos.
  Trigger: cuando el usuario pida migrar un módulo desde el .md documentado,
  convertir extracción AS-IS en plan de migración, o preparar implementación TO-BE sin perder comportamiento.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Cuándo usar
- Cuando ya existe un `.md` de módulo (extracción AS-IS) y se necesita plan de migración.
- Cuando hay que transformar funcionalidades actuales en contratos TO-BE implementables.
- Cuando se requiere priorizar, secuenciar y mitigar riesgos por módulo.

## Patrones críticos (obligatorios)
1. **Fuente única: el `.md` del módulo**
   - No inventar comportamientos fuera de evidencia en el markdown y código trazado.
2. **Paridad funcional primero**
   - Migrar sin cambiar reglas de negocio ni contratos externos en primera fase.
3. **Trazabilidad inquebrantable**
   - Cada decisión TO-BE debe mapearse a una evidencia AS-IS (línea/endpoint/objeto DB).
4. **DDL como gate de salida**
   - Si hay `pendiente_ddl`, el diseño queda `pendiente-validacion` hasta resolverlo.
5. **Separar claramente**
   - `observado_as_is` vs `decision_to_be` vs `riesgo_migracion`.
6. **Sin big-bang**
   - Definir estrategia incremental por capacidades (feature flags, strangler, coexistencia).

## Flujo de trabajo
1. Leer el `.md` del módulo y detectar:
   - funcionalidades, endpoints, reglas, tablas/objetos, pendientes DDL.
2. Para cada funcionalidad, crear ficha de migración:
   - contrato actual, invariantes, cambios permitidos, riesgos, pruebas de regresión.
3. Consolidar dependencias técnicas:
   - frontend, backend, DB, integraciones externas, autenticación/autorización.
4. Diseñar estrategia por fases:
   - Fase 0 (baseline + tests)
   - Fase 1 (paridad funcional)
   - Fase 2 (hardening/performance)
5. Definir plan de verificación:
   - casos críticos, contratos API, validaciones DB, criterios de rollback.
6. Emitir salida final con estado:
   - `listo-para-implementar` o `pendiente-validacion`.

## Formato de salida (obligatorio)
Por cada funcionalidad del módulo:
- `id_funcionalidad`
- `nombre`
- `observado_as_is`
- `contrato_migracion_to_be`
- `invariantes_negocio` (no negociables)
- `componentes_afectados` (FE/BE/DB)
- `riesgos_migracion`
- `plan_pruebas_regresion`
- `criterio_aceptacion`
- `estado` (`listo-para-implementar` | `pendiente-validacion`)

Y a nivel módulo:
- `resumen_dependencias`
- `secuencia_fases_migracion`
- `bloqueantes` (incluyendo `pendiente_ddl`)
- `estrategia_rollback`

## Checklist de calidad
- [ ] Toda funcionalidad AS-IS tiene contrato TO-BE
- [ ] Se preservan invariantes de negocio
- [ ] Endpoints y contratos de respuesta están cubiertos
- [ ] Objetos DB están trazados y con estado DDL explícito
- [ ] Riesgos y mitigaciones definidos
- [ ] Existe estrategia de rollback por fase

## Comandos
```bash
# Buscar módulos documentados
glob "docs/modulos/**/funcionalidades/*.md"

# Localizar pendientes DDL
grep "pendiente_ddl|registro_ddl_modulo" docs/modulos -n
```

## Recursos
- **Referencia base**: `/.agents/skills/modulos/SKILL.md`
- **Fuente funcional**: `docs/modulos/<modulo>/funcionalidades/<archivo>.md`

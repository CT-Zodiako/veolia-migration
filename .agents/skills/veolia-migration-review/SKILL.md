---
name: veolia-migration-review
description: Checklist para revisar/terminar la migración de un módulo específico (legacy Vue+Express+Oracle -> Angular+.NET+Oracle), garantizando paridad funcional sin pérdida de información. Usar SIEMPRE que el usuario pida "revisar", "terminar" o "auditar" un módulo/opción de la migración, antes de tocar código.
---

# Revisión de migración de módulo — Veolia

Metodología que encontró 4 bugs reales en el módulo Rellenos (2 de catálogo,
1 de constraint NOT NULL, y 1 CRÍTICO de serialización JSON que afecta a
**toda la app**, no solo a ese módulo). No es un chequeo visual: el objetivo
es garantizar que no se pierda ni se corrompa información real de negocio.

## Paso 0 — Ubicar las tres fuentes

1. **Legacy AS-IS**, en `/Users/zodiakomac/DEV/oracle/`:
   - Frontend: `front-tarificador/src/views/...` y sus componentes hijos.
   - Backend: `back-tarificador/src/modules/<modulo>/{routes.js,controller.js}`.
2. **Doc de migración**, si existe: `doc migracion/modules/<modulo>/*.md`.
   Suele traer la tabla de columnas con tipos/nullability, catálogo de valores,
   y una sección `## 7. Hallazgos Críticos para Migración` con bugs AS-IS ya
   detectados — leer esa sección PRIMERO, dice qué se supone que hay que
   corregir (no replicar) en la migración.
3. **Implementación nueva**: `backend/Veolia.Api/{Controllers,Infrastructure/Data}/<Modulo>*.cs`
   y `frontend/src/app/components/<modulo>/*`.

Si no existe doc de migración para el módulo, reconstruir el AS-IS leyendo
directamente `routes.js`/`controller.js`/el `.vue` — no asumir nada.

## Paso 1 — Contrato de endpoints: AS-IS vs nuevo

Para cada endpoint legacy, confirmar que el nuevo backend tiene un equivalente
con la MISMA firma de campos (nombres exactos de columna Oracle, mayúsculas).
Prestar atención especial a los `⚠️ CRÍTICO` marcados en la doc AS-IS — son
bugs conocidos del sistema viejo; la migración debe CORREGIRLOS, no copiarlos
(ver ejemplo real: legacy `DELETE /eliminar/:id` escribía en la columna
equivocada; el nuevo repo lo corrigió, pero introdujo un valor de catálogo
distinto al documentado — ver Paso 2).

## Paso 2 — Catálogos de valores (el gotcha más común)

Nunca asumir que un campo "estado" es binario 0/1. Buscar en la doc AS-IS
la tabla de catálogo real (ej. `RELL_ESTADO`: 1=Activo, 2=Inactivo — NO 0/1).
Verificar que:
- El backend nuevo escribe el valor correcto del catálogo real al togglear/eliminar.
- El frontend nuevo (checkbox/switch) emite el valor correcto del catálogo real.
- Las queries de listado NO filtran por estado si el AS-IS no filtraba
  (comparar el `SELECT` legacy literal contra el nuevo) — filtrar de más hace
  que una fila "inactiva" desaparezca de la tabla en vez de mostrar un badge.

## Paso 3 — Constraints de base de datos vs validación de formulario

Cruzar cada columna `NOT NULL` de la doc AS-IS (o del DDL) contra el formulario
Angular: si el campo puede quedar vacío en el form pero es `NOT NULL` en Oracle,
un alta rompe con un error crudo de base de datos. Agregar `required` +
guard en el submit.

## Paso 4 — Bugs "enmascarados" por lógica ternaria

Cualquier celda que renderiza con un ternario (`item.X === 1 ? 'A' : 'B'`)
SIEMPRE muestra algo plausible, incluso si `item.X` está `undefined` por un
bug de binding — por eso estas celdas ocultan bugs reales que las celdas de
interpolación directa (`{{ item.X }}`, sin fallback) sí delatan (se ven en
blanco). No confiar en que una columna "se ve bien" solo porque no está vacía;
verificar el dato real, no la apariencia.

## Paso 5 — CRÍTICO: verificar el JSON real del backend, no solo mocks

`Program.cs` **NO** tiene (ni debe tener) una `PropertyNamingPolicy` global.
Es una decisión correcta y deliberada: la app mezcla DOS convenciones de DTO
distintas, y una policy global solo puede servir a una de las dos a la vez.

- **Filas dinámicas de Dapper** (`connection.QueryAsync(sql)` sin tipo
  genérico — así responden Empresas, APS, Usuarios y la mayoría del catálogo
  de módulos): el nombre de columna Oracle pasa tal cual al JSON, **no
  afectado por ninguna policy**. Estos nunca necesitan tocarse.
- **DTOs fuertemente tipados con nombre de columna Oracle en mayúsculas**
  (ej. `RellenoResponse` con `RELL_ID`): necesitan `[JsonPropertyName("RELL_ID")]`
  explícito en CADA propiedad, porque el default de ASP.NET Core
  (`JsonNamingPolicy.CamelCase`) los mangla (`RELL_ID` -> `relL_ID`, no
  `rell_id`). Fijar esto por atributo en el DTO puntual — **nunca** cambiando
  la policy global (eso rompe la tercera categoría).
- **DTOs fuertemente tipados en PascalCase limpio** (ej. `ProyeccionDetail`
  con `ProyId`, `ApiEnvelopeResponse<T>` con `Status/Data/Message`): son la
  mayoría de los módulos de negocio (Proyecciones, Reliquidación, Costos,
  SUI, Facturación, Toneladas, Kilómetros, Índices, InfoGenerales,
  InfoGerencial, SubCont, Reversiones-histórico). Estos YA dependen del
  camelCase automático de ASP.NET Core (`ProyId` -> `proyId`) porque el
  frontend fue escrito esperando ese casing — **no tocar, no agregarles
  `[JsonPropertyName]` innecesario**.

**Regla al revisar un módulo nuevo**: mirar el DTO de respuesta real (no
asumir). Si sus propiedades C# son `ALL_CAPS_CON_GUION_BAJO`, necesita
`[JsonPropertyName]` explícito por propiedad. Si son PascalCase limpio,
confiar en el camelCase automático — no tocarlo. Si el repositorio devuelve
`dynamic`/sin tipo genérico, no hay nada que hacer, ya funciona.

- **No confiar en tests de Playwright con `context.route()` mockeado** para
  esta verificación — un mock escrito con el casing correcto nunca va a
  exponer un bug de este tipo. Para confirmar de verdad, replicar la
  serialización real en un mini programa C# standalone usando
  `new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }`
  (así es como responde `AddControllers()` sin overrides — NO el default
  "pelado" de `JsonSerializer.Serialize(obj)`, que es distinto y engañoso).
- **Antecedente real**: en la revisión de Rellenos se detectó que
  `RellenoResponse` estaba mal serializado, y se "arregló" con una policy
  global en `Program.cs` — lo cual efectivamente arregló Rellenos pero rompió
  en silencio ~9 módulos que dependían del camelCase automático (Proyecciones,
  Reliquidación, Costos, SUI, Facturación, Toneladas, Kilómetros, Índices,
  Reversiones-histórico). Se revirtió la policy global y se corrigió
  `RellenoResponse` puntualmente con atributos. Moraleja: un fix de
  serialización JSON casi nunca es "global" en este backend — es por DTO.

## Paso 6 — Estilo

Una vez resuelta la funcionalidad, aplicar el skill `veolia-ui-style` para la
pasada visual (tabla, modal, confirm dialog, búsqueda).

## Paso 7 — Antes de arreglar bugs que excedan estilo, preguntar

Si la revisión encuentra bugs funcionales (no solo visuales), resumirlos
brevemente y preguntar si se corrigen junto con el estilo o se dejan para
después — no asumir. (Así se hizo con Rellenos: se listaron los 3 bugs
encontrados y se preguntó antes de tocar backend.)

## Checklist resumen

- [ ] Leída la doc AS-IS del módulo (o reconstruida desde legacy si no existe)
- [ ] Contrato de cada endpoint comparado 1:1 (campos, no solo status code)
- [ ] Catálogos de valores verificados contra la doc, no asumidos 0/1
- [ ] Filtros de listado comparados contra el `SELECT` legacy literal
- [ ] Constraints `NOT NULL` cruzados contra validación del form
- [ ] Columnas con ternario re-verificadas con dato real, no solo apariencia
- [ ] DTO de respuesta real revisado: dynamic-Dapper (ok tal cual) / ALL_CAPS con `[JsonPropertyName]` / PascalCase limpio (ok tal cual) — nunca tocar la policy global
- [ ] Estilo aplicado vía `veolia-ui-style`
- [ ] Bugs funcionales listados y confirmados con el usuario antes de tocarlos

# Documentación del sistema (Centro de documentación)
Reemplaza el contenido simulado de /documentacion por documentación real de cómo funciona todo el sistema
(VEO-Regulator, Reliquidaciones, SUI 853), un artículo por pantalla, verificado contra el código.

## Specs
- S1: "puedes dcouemntar todo llena el documentacion la diea es ocmo funcnoan el sistema todo" — every screen reachable from the sidebar route catalog (`SidebarMenuService.routeCatalog`) has at least one documentation article whose `ruta` is that path.
- S2: Articles explain how the system works, written for the end user in Spanish (voseo, same tone as the app UI): what the screen is for, step by step, things to keep in mind. Content must be derived from the real code (frontend component + service/endpoint behavior); no invented features. Remove the "Contenido simulado" notices.
- S3: Article model supports `ruta` (link "Ir a la pantalla"), `sistema`, `secciones`, `pasos`, `notas`; `contenido` stays as the 1–2 sentence summary used by search and FAQ.
- S4: Categories (exact, in this order): Primeros pasos, Configuración, Cálculo de Tarifas, Suministros, Reversiones, Informes, Proyecciones, Reliquidaciones, SUI 853, PGIRS, Preguntas frecuentes. Every slug is unique.
- S5: Existing page behavior (design 02-centro-pagina: search, popular chips, module cards, FAQ, support card, ?articulo= deep link, back) keeps working.

## Tasks
- T1 [S3,S4,S5] inline+worker — article model + page rendering + data split into `frontend/src/app/services/documentacion/*.docs.ts` + integrity/coverage tests — DONE (17 tests green, full coverage test skipped until T3–T6 publish) — commit: not yet (user reviewing)
- T2 [S1,S2] worker — Primeros pasos + Configuración + general FAQ → `general.docs.ts` — DONE, published (21 articles) — commit: not yet (user reviewing)
- T3 [S1,S2] worker (DEFERRED by L3: content written, NOT published in index.ts) — Cálculo de Tarifas + Suministros → `tarifas-suministros.docs.ts` — commit: pending
- T4 [S1,S2] worker (DEFERRED by L3: content written, NOT published in index.ts) — Reversiones + PGIRS + Informes (generales/gerenciales) → `reversiones-pgirs-informes.docs.ts` — commit: pending
- T5 [S1,S2] worker (DEFERRED by L3: content written, NOT published in index.ts) — Reliquidaciones + Proyecciones → `reliquidaciones-proyecciones.docs.ts` — commit: pending
- T6 [S1,S2] worker (DEFERRED by L3: content written, NOT published in index.ts) — SUI 853 → `sui853.docs.ts` — commit: pending
- T7 [S1-S5] inline — publish T3–T6 in index.ts, un-skip full coverage test, full suite, commit — DEFERRED by L3

## Log
- L1: "puedes dcouemntar todo llena el documentacion la diea es ocmo funcnoan el sistema todo"
- L2: Builds on the uncommitted /documentacion page (design/documentacion-ayuda/02-centro-pagina.html, implemented in the previous turn). Unrelated uncommitted user changes (dashboard/*, personalizar-inicio-dialog*, layout.component.spec.ts, backend appsettings.json, part of layout.component.ts) must never be staged.
- L3: "solo implenta el t2 la otras als dejamos para depseus la idea es saber y ver como queda"
- L4: A concurrent session (login work) reverted ayuda.service.ts to HEAD and removed the floating help button (ayuda-flotante now only hosts the support menu; its .css staged as deleted). Parent re-applied only the documentation part of ayuda.service.ts and the '/documentacion' title in layout.component.ts; the other session's changes were left untouched.
- L5: Evidence: documentacion page + content specs 17 passed, 1 skipped (full coverage, until T3–T6). Full suite: 21 failures in unrelated specs (facturacion, sui-integracion, sui-reversiones, verificacion-aps, reliq-tarificador) that pass in isolation (53/53) — load flakiness, not caused by this change.
- L6: "no voe nada en docuentacon y ese boton de contato a soporte quitalo quita todo ese de srpote" — Cause of empty page: dev server on :4200 never picked up the worker's write to general.docs.ts (served `var DOCS_GENERAL = []`); touching the file rebuilt it. Support card and the "escribile a Soporte Directo" hint removed from /documentacion (test pins: no `.doc-soporte`, no "soporte" text). 17 passed, 1 skipped.

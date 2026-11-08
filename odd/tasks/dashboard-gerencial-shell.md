# Feature: dashboard-gerencial-shell (new Dashboard gerencial + new app shell)

Redesign `/gerencial/dashboard` and the whole app shell (sidebar + top bar) after the user's mockup `/Users/zodiako/Downloads/dashboard gerencial.html` (static HTML, no scripts). Branch `fixes-generales`.
Visual reference committed in repo: `odd/tasks/assets/dashboard-gerencial-mockup.png` (1440 px, full page) and `odd/tasks/assets/dashboard-gerencial-mockup-sidebar.png`.

## Specs

- **S1** — Scope (user, verbatim): "quiero que cambies el diseno de http://localhost:4200/gerencial/dashboard como esta '/Users/zodiako/Downloads/dashboard gerencial.html'". Scope decision (user choice): "Dashboard + shell nuevo" — also change the sidebar/top bar of the whole app to the mockup style, replacing the red solid-header menu just deployed.
- **S2** — Dashboard page (mockup content area, top to bottom):
  - Filter card with AÑO and MES (existing anno/mes selectors). The mockup note "Las cifras de las tarjetas y del gráfico salen de los 10 primeros APS de la tabla (ejemplo de la maqueta)" is a mockup artifact: real figures are computed from ALL rows of the period; do not render that note.
  - KPI card "APS CALCULADOS": big number of calculated APS, "de N" total, green progress bar, "NN % con cálculo".
  - KPI card "PENDIENTES": big number in amber/brown, one amber chip per pending APS name (e.g. "Chinchiná"); when there are many, show the first few and "+N".
  - KPI card "ÚLTIMO CÁLCULO": latest calculation date dd/MM/yyyy, and the APS name below.
  - Card "Cálculos por fecha" / "Cuántos APS se calcularon cada día": one horizontal bar per calculation day (label dd/MM, bar length proportional to the max, count at the right) in ascending date order, plus a last "Pendiente" row with an amber bar.
  - Card "Estado de cálculo por APS": filter chips "Todos · N", "Calculados · N", "Pendientes · N" (active chip filled), table columns ID, APS, Estado del cálculo, Usuario; the estado cell is a pill "● Calculado" (green) followed by the date, or "● Pendiente" (amber) followed by "Sin cálculo"; pending rows have a soft amber row background; Usuario shows "—" when empty. Keep "Ver columnas" and "Exportar" (existing app-tabla-avanzada toolbar) and pagination of 10 rows.
  - Data source unchanged: `InfoGerencialService.getDashBoardGerencial(anno, mes)` with `periodoAnterior` (legacy DashBoard.vue), fields APSA_ID, APSA_NOMAPS, TARI_FECHACREACION, SISU_CORREO.
- **S3** — App shell (mockup left and top):
  - Sidebar dark navy (`#0B1F3A`-like) in light and dark mode, white/light text; brand block at top (keep the Veolia logo asset and system name, adapted to the dark background).
  - Menu groups organised under section headings in small caps: "OPERACIÓN" (Suministros, Procesos, Cargue de Información, Reversiones), "INFORMES" (Informes Comerciales, Informes Gerencia, Sui, PGIRS), "PLANEACIÓN" (Proyecciones, Informes proyecciones), "SISTEMA" (Configuración). "Inicio" sits alone at the top without heading. Groups whose label is not in this map go into a final unlabeled block in their original order; sections with no groups are not rendered. Matching is by normalized label (case/accents-insensitive). Menu data still comes from the DB per system (sidebar-menu.service); only presentation changes.
  - Parent rows: line icon, label, chevron (› collapsed, ˅ expanded). The parent of the active option: lighter navy background with a red left bar (mockup "Informes Gerencia"); children are bulleted with small dots; the active child has a red dot, bold white text and lighter navy background. Keep current behaviour: parent of the active route highlighted and auto-expanded, query string ignored (layout.component isActive/isGroupActive).
  - User card at the bottom of the sidebar: avatar circle with initial, user name, "Sesión activa".
  - Top bar: small breadcrumb line with the parent group label above the page title (e.g. "Informes Gerencia" over "Dashboard"); right side keeps theme toggle, system switcher (building icon + system name + chevron) and user pill (avatar initial + name + chevron).
  - Collapsed sidebar keeps working (icons only, active parent still marked).
- **S4** — Must keep: dark mode (`app-dark`) for the content area via tokens, existing menu permissions/system switching/profile/support panel behaviour, all existing tests passing (update tests that pin removed markup), design tokens from `design/system.md` for content; new navy shell colours are added as CSS custom properties, not scattered hex.

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S1, S3, S4 | New app shell (layout component + shell tokens) | worker | 17505f0 |
| T2 | S1, S2, S4 | New Dashboard gerencial page | worker | 8e87d1c |
| T3 | S1-S4 | Browser check in ego-lite (light/dark, collapsed), full suites, commit | inline | done (L4) |

## Log

- **L1** — User request (verbatim): "quiero que cambies el diseno de http://localhost:4200/gerencial/dashboard como esta '/Users/zodiako/Downloads/dashboard gerencial.html'"
- **L2** — User scope choice (verbatim option): "Dashboard + shell nuevo — Además cambio el sidebar/barra superior de toda la app al estilo del mockup. Cambio grande que afecta todas las pantallas y reemplaza el menú rojo recién desplegado."
- **L3** — Mockup evidence (rendered in ego-lite at 1440 px): text and structure as in S2/S3; colours measured: Calculado pill text `rgb(14,122,79)` on `rgb(228,245,236)`; Pendiente chip text `rgb(138,82,0)` on `rgb(255,241,214)`; active filter chip `rgb(11,31,58)` with white text; progress bar green; date bars navy, Pendiente bar amber; Exportar button red. Current page: `frontend/src/app/components/infogerenciales/dashboard-gerencial.component.*` (tabla-avanzada with cellClass green/red).
- **L4** — Verification: suites backend 1150/1150, frontend 777/777. Ego-lite at 1440 px: /gerencial/dashboard matches the mockup in light and dark (real data 2026-09: 21 de 29, 8 pendientes, bars by day + Pendiente, chips and pills, pending rows tinted); /reliquidacion/comparar-costo shows breadcrumb "Procesos" over the title, active parent with red bar and active child with red dot; collapsed sidebar keeps the active icon marked. Fix during check: top-bar title wrapped to two lines (heading did not grow) -> flex:1 + single line ellipsis, included in the T1 commit. Known: routes outside the current system's menu show no breadcrumb; systems 2/3 parents not in the section map land in the final unlabeled block; design/system.md still describes the old red sidebar.

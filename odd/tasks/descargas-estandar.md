# Feature: descargas-estandar (one standard download button for every file download)

Implement design/descargas-estandar/01-boton-secundario.html as a shared Angular component and apply it to every file-download affordance in the inventory (not the table "Exportar"). Branch fixes-generales.

## Specs

- **S1** — User request (verbatim): "para esos compoentes que tien la posibilida de descargar archivos [screenshot: '⚡ Explicación formatos y formularios' link in SUI › Formatos y Formularios] hagmaos un standart para todos tambien proponme disenos". The user chose artboard 01 "Botón secundario con ícono de archivo" (tradeoff: "Visible justo donde se usa y fácil de implementar en un componente; ocupa la barra de acciones y no escala más allá de 2 archivos juntos").
- **S2** — Component spec (artboard 01 "Especificación", verbatim rules): outlined container (border = selector border, radius 10 px, min height 44 px, no brand fill); decorative file-type icon 24×28 with the extension written on its band (green for spreadsheets XLSX/CSV, gray for the rest: PDF, DOCX, ZIP), aria-hidden; label 13.5 px / 600 "verbo + objeto" in sentence case («Descargar plantilla», «Descargar explicación de formatos»), no emoji, no ALL CAPS, never the extension/size in the label; meta line 12 px --color-text-secondary with "EXTENSIÓN · tamaño" (KB integer "224 KB", MB one decimal with comma "1,4 MB", "< 1 KB"; optional third datum e.g. "13 columnas"), linked via aria-describedby; static files use `<a href download="<real file name>">` (no fake progress); "Descargando…" state only for API/blob downloads taking > 300 ms (aria-disabled, no double click), "Descargado" confirmation 2 s; error shown next to the control with role="alert", naming the file and offering «Reintentar» (no disappearing toast). Placement: in the action bar of the card the file belongs to, right-aligned after the primary action; in the guided upload, in step 1 body (and repeated in step 2 error); never in the top bar or inside a title; max 2 download buttons together. Vocabulary: "plantilla" for plano guía CSV templates, "guía" for explanatory documents. Reserve the download icon for downloads only.
- **S3** — Apply to the 10 inventory items (artboard 01 table): SUI Formatos y Formularios /sui/integracion, SUI Resumen formatos, SUI Reversiones ("Explicación formatos y formularios" .xlsx); SUI Cargue Complementario (guía/plantilla); Suministros Cargue Mensual: Inf. Propia, Inf. Competidor, Usuarios (comercial); Cargue Semestral: Inf. Propia, Inf. Competidor, Usuarios (plano_*.csv templates); plus the shared guided upload component if it renders the template link.

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S1, S2 | Shared download button component + tests | worker | done, uncommitted |
| T2 | S2, S3 | Apply to the 10 inventory items + update their tests | worker (same) | done, uncommitted |
| T3 | S1-S3 | Browser check light/dark, full suite | inline | done (L4) |

## Log

- **L1** — User request (verbatim): "para esos compoentes que tien la posibilida de descargar archivos [Image#18]  hagmaos un standart para todos tambien proponme disenos"
- **L2** — Choice: implement design/descargas-estandar/01-boton-secundario.html. File sizes must come from the published file (stat the files under frontend public/assets/layout/planos at implementation time), not computed in the browser.
- **L3** — Verification: full frontend suite 854/854 (worker). Ego-lite: SUI Formatos y Formularios shows the button right of Procesar, href/download/aria-describedby correct, light and dark OK; file served (HTTP 200). The cargue screens could not be checked visually: Oracle 192.168.13.35:1521 became unreachable (APS list stuck on "Cargando APS…"), so the guided-upload hosts never rendered. Pending: visual check of the 9 other hosts when the DB is reachable.
- **L4** — After the VPN came back (Oracle OK): all 10 hosts verified in ego-lite. Cargue Complementario (sui_complemento.csv, 21 col), Resumen Formatos and SUI Reversiones (xlsx, every tab), Cargue Mensual with Diciembre 2026 (Inf. Propia 13 col, Inf. Competidor 12, Inf. Usuarios 12; Inf. Terceros has no template, as before), Cargue Semestral Semestre 2 (Propia 20, Competidor 16, Usuarios 22). Mensual for Septiembre is blocked by "Ya existen tarifas calculadas" (legacy rule), not a regression. Guided upload step 1 matches the artboard.

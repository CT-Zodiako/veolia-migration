# Feature: Shared guided file upload (Pasos 1 → 2 → 3) for every CSV upload screen

Replace the browser-native `<input type="file">` in the 7 upload screens with one shared component implementing `design/cargue-archivos/03-pasos-guiados.html` (01, 02 are alternatives). Behavior of each screen (parsing, preview table, confirm dialog, save endpoint, period rules) must stay the same.
Branch: `fixes-generales` (local commits only).

## Specs

- **S1** — User (verbatim): "quiero un diseño para todos los lugares donde se cargan archivos ejemplo [screenshot] ya que es el default y se ve feo". Chosen artboard: 03-pasos-guiados.html ("C · Pasos 1 → 2 → 3").
- **S2** — Screens (all accept only .csv): `sui-cargue-complementario`; `suministros/cargue-mensual/{cargue-comercial,inf-competidor,inf-propia}`; `suministros/cargue-semestral/{cargue-comercial-sem,inf-competidor-sem,inf-propia-sem}`.
- **S3** — Steps per artboard: 1 Descargar plano guía (the screen's existing plano URL; icon, no emoji) → 2 Seleccionar archivo (button/label for a hidden input, drag & drop, keyboard accessible; file chip with name, size, change/remove) → 3 Revisar y cargar (rows/columns detected and destination period; the screen's existing Cancelar + Guardar/confirm flow). States: empty, drag-over, validating, ready, error, saving, saved, disabled.
- **S4** — Decisions taken by the parent (L2, user did not answer the open questions): add client checks the native input lacked — non-.csv extension and empty file show an error state with a link to the Plano Guía; column-vs-Plano-Guía check only where the screen already knows its expected columns (no new business rules). Screens that require Empresa first show step 2 disabled with "Seleccioná una empresa primero" (today the input is disabled until then).
- **S5** — Preserve existing behavior and tests of each screen (parsing, preview, errors list, confirm dialog, save calls, previous-month/semester rules, clearing after save).

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S1, S3, S4 | Shared component `frontend/src/app/components/shared/cargue-archivo-pasos.component.*` + spec | worker | |
| T2 | S2-S5 | Adopt in sui-cargue-complementario | worker | |
| T3 | S2-S5 | Adopt in the 3 cargue-mensual screens | worker | |
| T4 | S2-S5 | Adopt in the 3 cargue-semestral screens | worker | |
| T5 | S1-S5 | Verify | verify | |

## Log

- **L1** — User selected artboard design/cargue-archivos/03-pasos-guiados.html for implementation via the canvas handoff ("Implement the design artboard design/cargue-archivos/03-pasos-guiados.html").
- **L2** — Open questions from the design report (extra validations; Empresa-first disabled state) were not answered; parent decided S4 as the conservative default. User can override.

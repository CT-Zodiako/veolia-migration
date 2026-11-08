# Feature: Suministros screens fixes (Índices CRA, Subsidios y Contribuciones, Ajuste productividad, Descuento, Cargue productividad)

Fix the five Suministros screens the user reported, keeping legacy parity (legacy read-only: `/Users/zodiako/DEV/oracle/{front-tarificador,back-tarificador}`).
Branch: `ci/check-server-node-version` (local commits only, no push).

## Specs

- **S1** — Índices CRA (user, verbatim): "ERROR AL GUARDA Y AL EDITAR UN VALOR". Saving a new índice and editing a value must succeed.
- **S2** — Subsidios y Contribuciones (user, verbatim): "MEJORAR LA PANTALLA, DEBERIA SER LABEL AL FRENTE EL VALOR". Each value is shown with its label beside it (label: value), not stacked.
- **S3** — Ajuste por productividad (user, verbatim): "NO TIENE COMO INGRESAR NO SE ACTIVA EL BOTON". The user can enter an ajuste; the button becomes enabled when the inputs allow it.
- **S4** — Descuento (user, verbatim): "NO TIEN COMO INGRESAR DESCUENTOS Y EDITARLOS MIENTRAS NO SE CALCULEN TARIFAS". Descuentos can be entered and edited while tarifas have not been calculated.
- **S5** — Cargue productividad (user, verbatim): "GENERA ERROR AL DARLE EN EL BOTON CARGAR DEBERIA CARGAR SOLO CON CAMBIAR EL SELECTOR". No error; data loads when the selector changes, without pressing Cargar.

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S1-S5 | Explore legacy vs new for the five screens (root causes) | explore | done (L2) |
| T2 | S1 | Índices CRA save/edit | worker | 9abd24a |
| T3 | S2 | Subsidios y Contribuciones layout | inline | f9348dc |
| T4 | S3 | Ajuste productividad entry/button | worker | f4bd1d4 |
| T5 | S4 | Descuento entry/edit before tarifas | worker | 9e90d3a |
| T6 | S5 | Cargue productividad auto-load, no error | worker | 5bcca74 |
| T7 | S1-S5 | Verify | verify | |

## Log

- **L1** — User request (verbatim): "vmaos arreglar eso SUMINISTROS / INDICES CRA / ERROR AL GUARDA Y AL EDITAR UN VALOR / SUBSIDIOS Y CONTRIBUCIONES / MEJORAR LA PANTALLA, DEBERIA SER LABEL AL FRENTE EL VALOR / AJUSTE POR PRODUCTIVIDAD / NO TIENE COMO INGRESAR NO SE ACTIVA EL BOTON / DESCUENTO / NO TIEN COMO INGRESAR DESCUENTOS Y EDITARLOS MIENTRAS NO SE CALCULEN TARIFAS / CARGUE PRODUCTIVIDAD / GENERA ERROR AL DARLE EN EL BOTON CARGAR DEBERIA CARGAR SOLO CON CAMBIAR EL SELECTOR"
- **L2** — T1 findings (explore): S1 IndicesRepository.CrearAsync/EditarAsync call BeginTransaction on a closed connection (IndicesRepository.cs:120-121, :153-154) → 500; fix with OpenConnectionAsync like TafnaRepository. S2 the stacked layout is the Agregar/Editar dialog (.valor-editor flex-direction column, subcont-page.component.css:34-39); legacy SubCon.vue also stacked, so inline label+value is a UX improvement. S3 no disabled binding: the edit action only appears after a successful consulta; a failed consulta (possible decimal overflow reading PROD_VALOR into decimal) hides it; legacy Productividad.vue always shows Agregar (value 0) or Editar. S4 menu 304 (DescuentosCostosComponent) is display-only, same as legacy DescuentosDos.vue; add/edit exists only in 605 (legacy Descuentos.vue); no tarifa check anywhere. Making 304 editable is a deviation from legacy 304, requested by the user (S4). S5 Cargar → POST suministros/cargueProductividad → GoogleSheetsService needs Credentials/gsec.json, which is missing in backend/Veolia.Api (secret, the user must provide it); controller swallows the error as {data:"Error"}; legacy only loaded on the button, auto-load on selector change is the user's request.
- **L3** — T3 change was committed by the concurrent agent as f9348dc (same diff). S5 data still needs backend/Veolia.Api/Credentials/gsec.json from the user (secret). Slice boundary: commits 9abd24a..5bcca74 form one review slice (over ~400 lines because of the shared descuentos dialog and copied test fakes).

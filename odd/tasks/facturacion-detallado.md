# Facturación tab: detailed dashboard
On /facturacion, the "Facturación" tab gets the summary cards and charts of the user's design; the other tabs stay as they are.
Design reference (user download, copied into the repo): design/facturacion-detallado/01-detallado-facturacion.html. Branch: fixes-generales.

## Specs
- S1: User request (verbatim): "quieor que en http://localhost:4200/facturacion solo la tab de facturacion  que qeude aca '/Users/zodiako/Downloads/detallado de facturacion.html'". Only the Facturación tab changes; Facturación Electrónica, Det Facturación, Det Facturación CLUS and Det Facturación DINC keep their current look and behavior.
- S2: Layout of the Facturación tab follows the design reference, in this order: the existing filters (APS, Año, Mes) plus the design's "Tipo de factura" and "Tipo de tarifa" selectors; the note "Tarjetas y gráficas se calculan con las filas que ya devuelve la tabla."; four summary cards; three charts; then the existing tabs with the Facturación table.
- S3: Everything in the cards and charts is computed in the frontend from the rows the Facturación table already returns (design note verbatim: "Tarjetas y gráficas se calculan con las filas que ya devuelve la tabla."). No backend change. "Tipo de factura" (e.g. "Acueducto") and "Tipo de tarifa" (e.g. "Aforo Ordinario") select which rows feed the cards and charts; their options come from the distinct values in the rows.
- S4: Cards, as in the design (example values from the design, Cartagena, septiembre): "Estrato 4 · tarifa plena 238.594,26 — Sin subsidio ni contribución"; "Estrato 1 paga 71.578,28 — −70 % frente a la tarifa plena"; "Estrato 6 paga 823.150,19 — +245 % frente a la tarifa plena"; "Brecha estrato 6 / estrato 1 — 11,5 veces". Also the design's line "Lo que paga cada uno · TAFNA · residuos no aprovechables 3.364,61 Toneladas. Igual para todas las filas".
- S5: Charts, as in the design: (a) "Tarifa plena y lo que paga cada clase" — per clase de uso (ESTRATO 1..6, COMERCIAL and its Rang. 1-3, INDUSTRIAL and its Rang. 1-3, OFICIAL and its Rang. 1-3), tarifa plena vs what it pays, colored "Paga menos (subsidio)" / "Paga más (contribución)", subtitle "<Tipo de tarifa> · <Tipo de factura>"; (b) "De qué se compone la tarifa plena" — "Estrato 4 · parte de cada componente" with the percentage of each component (TRT, TDF, TBL, TLU, TTL, TC, TA); (c) "Lo que paga según el tipo de tarifa" — "Estratos 1, 4 y 6 · <Tipo de factura>", one row per tipo de tarifa (Aforo Ordinario, Aforo Permanente, Sin Aforo, No Rec. PaP, Desocupado) with what Estrato 1, 4 and 6 pay.
- S6: Number format Colombian (thousands ".", decimals ","), as in the design. Light and dark mode follow the app's existing tokens (veolia-ui-style skill); charts use the chart library already in the app (chart.js).
- S7: Empty/missing data: while loading or with no rows, cards and charts show an empty state instead of wrong numbers; a missing estrato/component shows "—" rather than 0.

## Tasks
- T1 S1-S7 implement dashboard in the Facturación tab — worker — commit: 1c10c31
- T2 S1-S7 verify + ego-lite with real data — inline — done (Cartagena sep 2026 reproduces the design numbers)

## Log
- L1: "quieor que en http://localhost:4200/facturacion solo la tab de facturacion  que qeude aca '/Users/zodiako/Downloads/detallado de facturacion.html'"
- L2: Assumption (not confirmed by the user): the extra filters, cards and charts are shown only while the Facturación tab is active; switching to another tab shows that tab exactly as today.
- L3: "no los unas con los otros lo que haz es eso nuevo que se metio en un depslgable paraque encapusel esto" — the new filters, cards and charts go inside one collapsible block ("Resumen de tarifas") on the Facturación tab; not merged with APS/Año/Mes. Decision: starts collapsed; the last open/closed choice is remembered in localStorage.

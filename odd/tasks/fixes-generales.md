# Feature: fixes-generales (shared APS selection, verification dialog tabs, Índices CRA decimals)

Three UI fixes reported by the user on branch `fixes-generales` (from `main` 12c4fe9). Legacy read-only: `/Users/zodiako/DEV/oracle/front-tarificador`.
Frontend only unless a task says otherwise.

## Specs

- **S1** — Shared selectors (user, verbatim): "en todos los selctores te das cuenta que e repite aps y mcuhas de eso selectores en todas las patnalals esa iformaicon dbe pasar para los otros es decir debe mantenr el estado elsotre". Once the user picks an APS (and the other repeated selectors) on one screen, every other screen starts with that same selection.
- **S2** — Verification dialog tabs (user, verbatim): "los tabs no funcioan aqui" (screenshot: VERIFICACION DE VARIABLES dialog, tabs VEOLIA ASEO PALMIRA S.A. E.S.P / SERVI AMBIENTALES VALLE S.A. E.S.P.). Clicking a company tab shows that company's rows.
- **S3** — Índices CRA decimals (user, verbatim): "en indicees CRA debe dejar intriucir muhcos demasaidos decimales es alg contable". The índice inputs accept many decimals, not 4.

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S1 | Map every APS/año/mes selector and the 7851ebd persistence pattern | explore (background) | done (L4) |
| T2 | S2 | Verification dialog: stable tabs + selected tab state | inline | df3feff |
| T3 | S3 | Índices CRA: raise maxFractionDigits on the five inputs | inline | 4535703 |
| T4 | S1 | Shared APS across screens per L4 design: aps-selector validates saved APS against the user's list and persists inputs; costos-calculo-page and sui-integracion-page drop their private aps/anno/mes keys; proyecciones form selector does not persist | worker | 175c9fe |
| T5 | S1-S3 | Full frontend suite + manual check notes | inline | done (L5) |

## Log

- **L1** — User request (verbatim): "no hagmaos otros , vmaos hacerun arreglo lo que pasa es que en todos los selctores te das cuenta que e repite aps y mcuhas de eso selectores en todas las patnalals esa iformaicon dbe pasar para los otros es decir debe mantenr el estado elsotre, [Image#2] los tabs no funcioan aqui , y en indicees CRA debe dejar intriucir muhcos demasaidos decimales es alg  contable"
- **L2** — S2 root cause: `verificacion-dialog.component.ts:26-31,78` `tabs` is a getter rebuilding new objects every change detection and `[value]="tabs[0].key"` re-selects the first tab on every cycle.
- **L3** — S3 evidence: inputs `maxFractionDigits=4` (`indices-cra.component.html:33,66,70,74,78`); legacy `Cra.vue:79-124` used free `InputText`; `AUCO_INDICESCRA.INDI_VALOR` is `FLOAT(126)` and stored values already reach 12 decimals. Decision: allow 15 decimals (JS double precision limit).
- **L4** — T1 findings: shared state already exists, `services/parametros-consulta-state.service.ts` (key `parametros-consulta:${SISU_ID}:${sistemaId}`, fields aps/anno/mes/proyeccion/reliquidacion); `shared/aps-selector.component.ts:56-63` restores, `:99-104` saves only on user pick; anno/mes selectors same pattern. APS fails to carry over because: (i) `costos-calculo-page.component.ts:190-191,432-443` uses private key `costos-calculo-filtros` and `sui-integracion-page.component.ts:203,383-394` uses `sui-integracion-state` (plus URL params); (ii) values arriving by input/URL are never saved (`costo-clus.component.ts:356-366`); (iii) a saved APS is emitted before `getApsAsignadas` returns, unvalidated; (iv) `proyecciones-page.component.html:81` APS inside a form writes the shared state. Out of scope: sui853 screens and cargue-residuos/informes-generados (TCFG_APS_ID, different id space), validaciones (CVA/CVNA, not APS), reliq-crear (form field).
- **L5** — Verification: frontend suite 643/643 (worker run). Browser check in ego-lite (user logged in): S1 Palmira picked in Cálculo appears in SUI integración and Suministros descuentos; Barrancabermeja picked in Descuentos appears in SUI (`?aps=1024`). S3 Índices CRA add modal keeps `4.123456789012` (not saved). S2 not checked in the browser: user asked to skip Cálculo de tarifas ("np pruebsclculo de tarifas preuba las demas"); Palmira Oct/Nov returned no verification rows; covered by the unit test (click second tab -> aria-selected and rows of that company).

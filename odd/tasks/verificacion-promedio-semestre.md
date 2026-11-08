# Feature: Verificación — Promedio semestre anterior (fauco_getvariablesaps)

Suministros > Verificación (menu 307, `VerificacionApsComponent`) gets an on-demand "Promedio Semestre Anterior" section fed by the new Oracle function `pk_ocigral720.fauco_getvariablesaps(aps, anno, mes)`. Not in legacy (new function).
Design: `design/verificacion-promedio-lblj/05-grupos-en-tarjetas.html` (chosen artboard; 01-04, 06, 07 are alternatives). Branch: `ci/check-server-node-version` (local commits only).

## Specs

- **S1** — User (verbatim): "quiero que apres todo lo deo proedio de semtre cuandoejecutemos esto SELECT pk_ocigral720.fauco_getvariablesaps(1011, 2026, 8) FROM dual; agrega tnato en el front y back pra que lo haga". Backend endpoint executes `SELECT pk_ocigral720.fauco_getvariablesaps(:aps, :anno, :mes) FROM dual` with the selected APS/año/mes and returns its variables.
- **S2** — Function contract (observed against real Oracle, L2): returns CLOB JSON `{"aps":1011,"anno":2026,"mes":8,"variables":{"c":0,"cdf":62578.22,"crt":285055.5,"lbl":164265.7867,"n":365504.5,"na":1518,"naa":0,"nd":2404.83,"qa":1142.36,"qbl":1447.37,"qlu":377.5633,"qna":15082.1667,"qr":46.2917,"qrs":0,"qrsmunrecp":0,"qrt":39125.6383,"tafna":3364.6055,"vl":0}}`. Arguments: APS NUMBER, ANNO NUMBER, MES NUMBER; return CLOB.
- **S3** — Design comment abshny2a (verbatim): "esto cambialo por un botón el cual va a traer toda la información de abajo la de toneladas suscriptores, es decir sol ose acicia cuando lo presiones consultara y traer y mostrara los datos". The data loads only when the button is pressed (Consultar → Consultando… → Actualizar); changing APS/Año/Mes clears it back to the one-line empty state.
- **S4** — Layout per artboard 05 (comment andrb0q7 verbatim: "dejalo como estaba antes como el primero que me diste"; ejdutw8o: "asi esta bien"): groups Toneladas (QRT=qrt, QBL=qbl, QLU=qlu, QR=qr, QNA=qna, Qa=qa, QRS=qrs, QRSmun=qrsmunrecp, C=c, TAFNA=tafna), Suscriptores (N=n, Na=na, Naa=naa, Nd=nd), Otros (Lbl=lbl, VL=vl), Costos (CRTcomp=crt, CDFcomp=cdf); tiles with code chip and right-aligned value; comma decimals like the artboard.

## Tasks

| ID | Specs | Task | Route | Commit |
|---|---|---|---|---|
| T1 | S1-S2 | Backend endpoint + tests | worker | f549bf3 |
| T2 | S3-S4 | Frontend section in verificacion-aps + tests | worker (same unit as T1) | f549bf3 |
| T3 | S1-S4 | Verify | inline + real Oracle probe | L4 |

## Log

- **L1** — User request (verbatim): "quiero que apres todo lo deo proedio de semtre cuandoejecutemos esto SELECT pk_ocigral720.fauco_getvariablesaps(1011, 2026, 8) FROM dual; agrega tnato en el front y back  pra que lo haga" — then "pudes hacerlo tu y probarlo e implentrlo ?".
- **L2** — Probed read-only against real Oracle through the API's own connection factory (temporary test, deleted): output in S2.
- **L3** — Design `design/verificacion-promedio-lblj/`, chosen artboard 05-grupos-en-tarjetas.html; 01-04, 06, 07 are alternatives.
- **L4** — Verified: the new repository against real Oracle (temporary probe, deleted) returned the same 18 values as S2 for 1011/2026/8; backend suite 1094 passed; frontend 659/661 with 2 reliquidación timeouts that pass alone (unrelated files). Not checked in a browser. Without a token the route answers 403 (AuthJwtParityMiddleware, same as siblings).

-- Fase 4 · Facturación
-- Crea/actualiza vistas base requeridas por la API.
-- Regla funcional: SIEMPRE consultar el período anterior (mes/anno ajustados en backend).
--
-- Origen: estas 5 vistas ya existen y están en producción en el esquema Oracle
-- real (usuario TARIFICADOR, ADB Cloud). El legacy Node (back-tarificador,
-- modules/facturacion/controller.js) NUNCA contuvo el SQL de estas vistas —
-- solo ejecuta `SELECT * FROM <vista> WHERE ...`; el join/lógica de negocio
-- vive exclusivamente en la definición de la vista dentro de Oracle. Este
-- archivo se generó capturando el DDL real vía
-- `SELECT text FROM user_views WHERE view_name = '...'` (conectado como
-- TARIFICADOR) para que el esquema quede versionado en el repo y sea
-- reproducible/documentado.
--
-- IMPORTANTE: el esquema real que posee estas vistas y sus tablas base
-- (AUCO_TARIFAS, AUCO_CLASESUSO, AUGE_PARAMETROS, AUCO_APSASEO,
-- AUCO_FACTPRODUCCION, AUCO_INFODINC, AUCO_RESUMTARIFAS) es TARIFICADOR, NO
-- "VEOLIA_APP" (ese usuario/esquema no existe en la instancia real — se
-- verificó contra ALL_USERS). El stub anterior calificaba las vistas como
-- `VEOLIA_APP.<vista>`, lo cual habría fallado (ORA-01917) si se hubiera
-- ejecutado contra la base real. Se deja sin prefijo de esquema, igual que el
-- resto de los scripts de vistas del repo (Fase2/support-views-ddl.sql,
-- Toneladas/create-view.sql, Kilometros/create-view.sql), asumiendo que el
-- script se ejecuta conectado como el owner (TARIFICADOR).
--
-- Verificado contra Oracle real (2026-07-27):
--   - Los 5 `CREATE OR REPLACE VIEW` compilan sin error.
--   - Las 5 tablas base + el paquete PL/SQL PK_TARIFACOMPONENTE (usado por
--     VACUO_FACTURACIONDINC y VAUCO_FATELECTRONICA) existen y son propiedad de
--     TARIFICADOR (confirmado vía ALL_OBJECTS).
--   - VACUO_DETAFACTURACION devolvió filas reales y coherentes para
--     apsa_id=1004, reta_anno=2026, reta_mes=5 (auco_resumtarifas tiene datos
--     de prueba en el ambiente ADB usado).
--   - VACUO_FACTURACION, VACUO_FACTURACIONCLUS, VACUO_FACTURACIONDINC y
--     VAUCO_FATELECTRONICA ejecutaron sin ORA-00904 (columnas de filtro
--     correctas), pero devolvieron 0 filas porque AUCO_TARIFAS está
--     completamente vacía (0 filas) en este ambiente — no hay ningún
--     apsa_id/anno/mes con datos para probar "filas coherentes" end-to-end
--     hasta que se cargue AUCO_TARIFAS en este ambiente.

CREATE OR REPLACE VIEW VACUO_FACTURACION AS
SELECT  t.apsa_id, t.tari_anno, t.tari_mes,
        a.apsa_nomaps, F.para_nombre as factura, trim(c.clas_nombre)||f.fapr_rango as clas_nombre, p.para_nombre, f.fapr_nombre, f.fapr_valor,  tari_subcont  ,
        tari_tc  as tc , tari_tbl  , tari_tlu  , tari_trt  , tari_tdf  , tari_ttl  , tari_ta  ,
        (tari_tc   + tari_tbl  + tari_tlu  + tari_trt  + tari_tdf  + tari_ttl  + tari_ta) as tarifaPlena,
        tari_tcsc as tcsc,    tari_tblsc  , tari_tlusc  ,   tari_trtsc  ,   tari_tdfsc  ,    tari_ttlsc  ,    tari_tasc  ,
        (tari_tcsc  + tari_tlusc + tari_tblsc + tari_trtsc + tari_tdfsc + tari_ttlsc + tari_tasc) as tarifaSyC,
        tari_trna  ,  tari_tafna  ,  tari_tafa  ,  tari_tra  ,  tari_trbl  ,  tari_trlu  ,  tari_trra  ,
        tari_crt  ,  tari_cdf  ,  tari_ctl  ,  tari_vba  ,
        tari_cp  , tari_ccc  ,  tari_clav  ,  tari_clp  ,  tari_ccei  ,  tari_ccem
  from auco_tarifas T
       INNER JOIN auco_clasesuso C ON (C.clas_clase = T.clas_clase)
       INNER JOIN auge_parametros P ON (p.para_para = t.para_tiptar20012 AND p.clas_clas = 20012)
       INNER JOIN auge_parametros F ON (F.para_para = t.para_tipfac20014 AND F.clas_clas = 20008)
       INNER JOIN auco_apsaseo A ON (T.apsa_id = A.apsa_id)
       INNER JOIN auco_factproduccion F ON (t.fapr_codigo = f.fapr_codigo AND t.apsa_id = f.apsa_id);

CREATE OR REPLACE VIEW VACUO_DETAFACTURACION AS
SELECT rt.apsa_id, rt.reta_anno, rt.reta_mes, p.para_nombre, rt.reta_variable, rt.reta_valormes, rt.reta_valorprom
  FROM auco_resumtarifas RT
       INNER JOIN auge_parametros P ON (rt.para_grupresum20017 = p.para_para AND p.clas_clas = 20017);

CREATE OR REPLACE VIEW VACUO_FACTURACIONCLUS AS
SELECT  t.apsa_id, t.tari_anno, t.tari_mes,  a.apsa_nomaps, F.para_nombre as factura, c.clas_nombre, p.para_nombre, f.fapr_nombre, f.fapr_valor,  tari_subcont  ,
        tari_tc  , tari_tbl  , tari_tlu  , tari_cp as tcp , tari_ccc as tccc,  tari_clav as tclav,  tari_clp as tclp,  tari_ccei as tccei ,  tari_ccem as tccem,
        tari_trt  , tari_tdf  , tari_ttl  , tari_ta  ,
        (tari_tc  + tari_tbl  + tari_tlu  + tari_trt  + tari_tdf  + tari_ttl  + tari_ta) as tarifaPlena,
        tari_tcsc,    tari_tblsc  , tari_tlusc  ,   tari_trtsc  ,   tari_tdfsc  ,    tari_ttlsc  ,    tari_tasc  ,
        (tari_tcsc + tari_tlusc + tari_tblsc + tari_trtsc + tari_tdfsc + tari_ttlsc + tari_tasc) as tarifaSyC,
        tari_trna  ,  tari_tafna  ,  tari_tafa  ,  tari_tra  ,  tari_trbl  ,  tari_trlu  ,  tari_trra  ,
        tari_crt  ,  tari_cdf  ,  tari_ctl  ,  tari_vba
  from auco_tarifas T
       INNER JOIN auco_clasesuso C ON (C.clas_clase = T.clas_clase)
       INNER JOIN auge_parametros P ON (p.para_para = t.para_tiptar20012 AND p.clas_clas = 20012)
       INNER JOIN auge_parametros F ON (F.para_para = t.para_tipfac20014 AND F.clas_clas = 20008)
       INNER JOIN auco_apsaseo A ON (T.apsa_id = A.apsa_id)
       INNER JOIN auco_factproduccion F ON (t.fapr_codigo = f.fapr_codigo AND t.apsa_id = f.apsa_id);

CREATE OR REPLACE VIEW VACUO_FACTURACIONDINC AS
SELECT t.apsa_id, t.tari_anno, t.tari_mes,  a.apsa_nomaps, F.para_nombre as factura, c.clas_nombre, p.para_nombre, f.fapr_nombre, f.fapr_valor,  tari_subcont  ,  d.dinc_valor,
        tari_tc  , tari_tbl  , tari_tlu  ,         tari_trt  , tari_tdf  , tari_ttl  , pk_tarifacomponente.fauco_tadinc(T.apsa_id, t.para_tiptar20012, tari_mes, tari_anno) as ta  ,
        (tari_tc  + tari_tbl  + tari_tlu  + tari_trt  + tari_tdf  + tari_ttl  + pk_tarifacomponente.fauco_tadinc(T.apsa_id, t.para_tiptar20012, tari_mes, tari_anno) ) as tarifaPlena,
        tari_tcsc,    tari_tblsc  , tari_tlusc  ,   tari_trtsc  ,   tari_tdfsc  ,    tari_ttlsc  ,   (pk_tarifacomponente.fauco_tadinc(T.apsa_id, t.para_tiptar20012, tari_mes, tari_anno) * (1 + tari_subcont)) as tasc  ,
        (tari_tcsc + tari_tlusc + tari_tblsc + tari_trtsc + tari_tdfsc + tari_ttlsc + (pk_tarifacomponente.fauco_tadinc(T.apsa_id, t.para_tiptar20012, tari_mes, tari_anno) * (1 + tari_subcont)) ) as tarifaSyC,
        tari_trna  ,  tari_tafna  ,  tari_tafa  ,  tari_tra  ,  tari_trbl  ,  tari_trlu  ,  tari_trra  ,
        tari_crt  ,  tari_cdf  ,  tari_ctl  ,  tari_vba  ,
        tari_cp  , tari_ccc  ,  tari_clav  ,  tari_clp  ,  tari_ccei  ,  tari_ccem
  from auco_tarifas T
       INNER JOIN auco_clasesuso C ON (C.clas_clase = T.clas_clase)
       INNER JOIN auge_parametros P ON (p.para_para = t.para_tiptar20012 AND p.clas_clas = 20012)
       INNER JOIN auge_parametros F ON (F.para_para = t.para_tipfac20014 AND F.clas_clas = 20008)
       INNER JOIN auco_apsaseo A ON (T.apsa_id = A.apsa_id)
       INNER JOIN auco_factproduccion F ON (t.fapr_codigo = f.fapr_codigo AND t.apsa_id = f.apsa_id)
       LEFT JOIN  auco_infodinc D ON (t.apsa_id = D.apsa_id AND t.tari_anno = d.dinc_anno AND t.tari_mes = d.dinc_mes);

CREATE OR REPLACE VIEW VAUCO_FATELECTRONICA AS
WITH funciones_base AS (
  SELECT
    t.*,
    ROUND(PK_TARIFACOMPONENTE.fauco_tdfsolo(t.apsa_id, t.fapr_codigo, t.para_tiptar20012, 1, t.tari_mes, t.tari_anno), 2) AS tdf,
    NVL(ROUND(PK_TARIFACOMPONENTE.fauco_tiat(t.apsa_id, t.fapr_codigo, t.para_tiptar20012, 1, t.tari_mes, t.tari_anno, 1), 2),0) AS tiat,
    ROUND(PK_TARIFACOMPONENTE.fauco_tincen(t.apsa_id, t.fapr_codigo, t.para_tiptar20012, 1, t.tari_mes, t.tari_anno, 1), 2) tincen,
    ROUND(PK_TARIFACOMPONENTE.fauco_tincenfactelec(t.apsa_id, t.fapr_codigo, t.para_tiptar20012, 1, t.tari_mes, t.tari_anno, 1), 2) tincenFE
  FROM auco_tarifas t
),
funciones AS (
  SELECT
    fb.*,
    ROUND(fb.tdf * (1 + fb.tari_subcont), 2) AS tdfsc,
    ROUND(fb.tiat * (1 + fb.tari_subcont), 2) AS tiatsc,
    ROUND(fb.tincen * (1 + fb.tari_subcont), 2) AS tincensc,
    ROUND(fb.tincenFE * (1 + fb.tari_subcont), 2) AS tincenscFE
  FROM funciones_base fb
)
SELECT
        t.apsa_id codaps,
        t.tari_anno anno,
        t.tari_mes mes,
        a.apsa_nomaps nomaps,
        pF.para_nombre as servfactura,
        trim(c.clas_nombre)||f.fapr_rango as Claseuso,
        p.para_nombre tipotarifa,
        f.fapr_nombre factor,
        f.fapr_valor valorfactor,
        tari_subcont porcsubcont,
        ROUND(tari_tc - tari_cargoapv,2)       AS tc,
        ROUND(tari_cargoapv,2)                 AS tcaprov,
        ROUND((tari_cargoapv * 0.186 ),2)      AS tcaprovprop,
        ROUND((tari_cargoapv * 0.114 ),2)      AS tcaprovterc,
        ROUND(tari_tbl,2)                      AS tbl,
        ROUND(tari_tlu,2)                      AS tlu,
        ROUND(tari_trt,2)                      AS trt,
        (tdf-tincen) tdf,
        tiat,
        CASE WHEN tincen = 0 THEN tincenFE ELSE tincen END AS tincen,
        ROUND(tari_ttl,2)   AS ttl,
        ROUND(tari_ta,2)    AS ta,
        ROUND( (tari_tc + tari_tbl + tari_tlu + tari_trt + (tdf-tincen) + tiat + tincen + tari_ttl + tari_ta), 2) AS tarifaPlena,
        ROUND(tari_tcsc - tari_cargoapvsc,2)   AS tcsc,
        ROUND(tari_cargoapvsc,2)               AS tcaprovsc,
        ROUND((tari_cargoapvsc * 0.186),2)     AS tcaprovpropsc,
        ROUND((tari_cargoapvsc * 0.114),2)     AS tcaprovtercsc,
        ROUND(tari_tblsc,2)     AS tblsc,
        ROUND(tari_tlusc,2)     AS tlusc,
        ROUND(tari_trtsc,2)     AS trtsc,
        (tdfsc-tincensc) AS tdfsc,
        tiatsc,
        CASE WHEN tincensc = 0 THEN tincensc ELSE tincenscFE END AS tincensc,
        ROUND(tari_ttlsc,2) AS ttlsc,
        ROUND(tari_tasc,2)  AS tasc,
        ROUND((tari_tcsc  + tari_tlusc + tari_tblsc + tari_trtsc + (tdfsc-tincensc) + tiatsc + tincensc + tari_ttlsc + tari_tasc),2) AS tarifaSyC,
        tari_trna  AS trna,
        tari_tafna AS tafna,
        tari_tafa  AS tafa,
        tari_tra   AS tra,
        tari_trbl  AS trbl,
        tari_trlu  AS trlu,
        tari_trra  AS trra,
        tari_crt   AS crt,
        tari_cdf   AS cdf,
        tiat       AS costiat,
        CASE WHEN tincen = 0 THEN tincenFE ELSE tincen END AS costincen,
        tari_ctl   AS ctl,
        tari_vba   AS vba,
        tari_cp    AS cp,
        tari_ccc   AS ccc,
        tari_clav  AS clav,
        tari_clp   AS clp,
        tari_ccei  AS ccei,
        tari_ccem  AS ccem
FROM funciones t
JOIN auco_clasesuso c ON c.clas_clase = t.clas_clase
JOIN auge_parametros p ON p.para_para = t.para_tiptar20012 AND p.clas_clas = 20012
JOIN auge_parametros pF ON pF.para_para = t.para_tipfac20014 AND pF.clas_clas = 20008
JOIN auco_apsaseo a ON t.apsa_id = a.apsa_id
JOIN auco_factproduccion F ON t.fapr_codigo = F.fapr_codigo AND t.apsa_id = F.apsa_id;

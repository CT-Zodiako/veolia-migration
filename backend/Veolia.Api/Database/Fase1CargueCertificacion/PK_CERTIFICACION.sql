CREATE OR REPLACE PACKAGE PK_CERTIFICACION AS
   FUNCTION fauco_certemprdivi(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certapsemprdivi(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certapsrelleno(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certificar(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certusuarios(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certercero(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certificarsem(aps integer, semestre integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certsempropia(aps integer, semestre integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certsempropianueva2024(aps integer, semestre integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certsempropianueva(aps integer, semestre integer, anno integer, usuario integer) RETURN integer;
   FUNCTION fauco_certarifas(aps integer, mes integer, anno integer, usuario integer) RETURN integer;
END PK_CERTIFICACION;
/

CREATE OR REPLACE PACKAGE BODY PK_CERTIFICACION AS

FUNCTION fauco_certemprdivi(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps       PK_GENERAL720.tind_emprdivirell;
  lint_empresa      integer;
  lint_mpio         integer;
  lint_relleno      integer;
  ldbl_resultado    integer;
  lint_afectadas    integer;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 1;

  DELETE FROM AUCO_INFOEMPRDIVI
  WHERE divi_divi = lint_mpio AND empr_empr = lint_empresa AND ined_anno = anno AND ined_mes = mes;

  INSERT INTO AUCO_INFOEMPRDIVI (INED_ID, EMPR_EMPR, DIVI_DIVI, INED_ANNO, INED_MES, INED_CBLJ, INED_LBLJ, INED_N, INED_M3AGUA, INED_CP, INED_M2CCJ, INED_M2LAVJ, INED_TIJ, INED_KLPJ, INED_TMJ, INED_CLAVJ, INED_QRTJ, INED_QRSJ, INED_FECHACREACION, USUA_USUA)
  SELECT SAUCO_INFOEMPRDIVI.NEXTVAL, empr_empr, lint_mpio, prop_anno, prop_mes, prop_cblj, prop_lbl, 0, prop_mt3agua, prop_cp, prop_m2cc, prop_m2lav, prop_ti, prop_klp, prop_tm, 0, prop_qrt, prop_qrs, sysdate, usua_usuario
  FROM auco_carguepropio
  WHERE apsa_id = aps AND empr_empr = lint_empresa AND prop_anno = anno AND prop_mes = mes;

  lint_afectadas := SQL%rowcount;
  IF lint_afectadas = 0 THEN
    ldbl_resultado := 0;
    RETURN ldbl_resultado;
  END IF;

  FOR lrec_EMPRESAS IN (SELECT empr_empr FROM auco_carguecompe WHERE apsa_id = aps AND comp_anno = anno AND comp_mes = mes) LOOP
    DELETE FROM AUCO_INFOEMPRDIVI WHERE divi_divi = lint_mpio AND empr_empr = lrec_EMPRESAS.empr_empr AND ined_anno = anno AND ined_mes = mes;

    INSERT INTO AUCO_INFOEMPRDIVI (INED_ID, EMPR_EMPR, DIVI_DIVI, INED_ANNO, INED_MES, INED_CBLJ, INED_LBLJ, INED_N, INED_M3AGUA, INED_CP, INED_M2CCJ, INED_M2LAVJ, INED_TIJ, INED_KLPJ, INED_TMJ, INED_CLAVJ, INED_QRTJ, INED_QRSJ, INED_FECHACREACION, USUA_USUA)
    SELECT SAUCO_INFOEMPRDIVI.NEXTVAL, empr_empr, lint_mpio, comp_anno, comp_mes, comp_cblj, comp_lblcom, comp_n, comp_mt3agua, comp_cp, comp_m2cc, comp_m2lav, comp_ti, comp_klp, comp_tm, 0, comp_qrt, comp_qrs, sysdate, usua_usuario
    FROM auco_carguecompe
    WHERE apsa_id = aps AND empr_empr = lrec_EMPRESAS.empr_empr AND comp_anno = anno AND comp_mes = mes;

    lint_afectadas := SQL%rowcount;
    IF lint_afectadas = 0 THEN
      ldbl_resultado := 0;
      RETURN ldbl_resultado;
    END IF;
  END LOOP;

  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certapsemprdivi(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps    PK_GENERAL720.tind_emprdivirell;
  lint_empresa   integer;
  lint_mpio      integer;
  lint_relleno   integer;
  ldbl_resultado integer;
  lint_afectadas INTEGER;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 1;

  DELETE FROM AUCO_INFOAPSEMPRDIVI WHERE apsa_id = aps AND empr_empr = lint_empresa AND iaed_anno = anno AND iaed_mes = mes;

  INSERT INTO AUCO_INFOAPSEMPRDIVI (IAED_ID, APSA_ID, EMPR_EMPR, DIVI_DIVI, IAED_ANNO, IAED_MES, IAED_QRTZ, IAED_CPE, IAED_T, IAED_VACRTABC, IAED_VACRT, IAED_CRTZ, IAED_QBL, IAED_QLU, IAED_QR, IAED_TAFA, IAED_ND, IAED_NA, IAED_QNA, IAED_TAFNA, IAED_QA, IAED_FECHACREACION, USUA_USUA)
  SELECT SAUCO_INFOAPSEMPRDIVI.NEXTVAL, apsa_id, empr_empr, lint_mpio, prop_anno, prop_mes, prop_qrt, prop_cpe, prop_t, prop_vacrtabc, prop_vacrt, 0, prop_qbl, prop_qlu, prop_qr, prop_tafa, 0, 0, (prop_qrt - prop_qbl - prop_qlu), 0, prop_qa, sysdate, usua_usuario
  FROM auco_carguepropio
  WHERE apsa_id = aps AND empr_empr = lint_empresa AND prop_anno = anno AND prop_mes = mes;

  lint_afectadas := SQL%rowcount;
  IF lint_afectadas = 0 THEN
    ldbl_resultado := 0;
    RETURN ldbl_resultado;
  END IF;

  FOR lrec_EMPRESAS IN (SELECT empr_empr FROM auco_carguecompe WHERE apsa_id = aps AND comp_anno = anno AND comp_mes = mes) LOOP
    DELETE FROM AUCO_INFOAPSEMPRDIVI WHERE apsa_id = aps AND empr_empr = lrec_EMPRESAS.empr_empr AND iaed_anno = anno AND iaed_mes = mes;

    INSERT INTO AUCO_INFOAPSEMPRDIVI (IAED_ID, APSA_ID, EMPR_EMPR, DIVI_DIVI, IAED_ANNO, IAED_MES, IAED_QRTZ, IAED_CPE, IAED_T, IAED_VACRTABC, IAED_VACRT, IAED_CRTZ, IAED_QBL, IAED_QLU, IAED_QR, IAED_TAFA, IAED_ND, IAED_NA, IAED_QNA, IAED_TAFNA, IAED_QA, IAED_FECHACREACION, USUA_USUA)
    SELECT SAUCO_INFOAPSEMPRDIVI.NEXTVAL, apsa_id, empr_empr, lint_mpio, comp_anno, comp_mes, comp_qrt, 0, 0, 0, 0, 0, comp_qbl, comp_qlu, comp_qr, comp_tafa, comp_nda, comp_naa, (comp_qrt - comp_qbl - comp_qlu), comp_tafna, comp_qa, sysdate, usua_usuario
    FROM auco_carguecompe
    WHERE apsa_id = aps AND empr_empr = lrec_EMPRESAS.empr_empr AND comp_anno = anno AND comp_mes = mes;

    lint_afectadas := SQL%rowcount;
    IF lint_afectadas = 0 THEN
      ldbl_resultado := 0;
      RETURN ldbl_resultado;
    END IF;
  END LOOP;

  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certapsrelleno(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps    PK_GENERAL720.tind_emprdivirell;
  lint_empresa   integer;
  lint_mpio      integer;
  lint_relleno   integer;
  ldbl_resultado integer;
  lint_afectadas INTEGER;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 1;

  DELETE FROM AUCO_INFOAPSRELLENO WHERE apsa_id = aps AND rell_id = lint_relleno AND iare_anno = anno AND iare_mes = mes;

  INSERT INTO AUCO_INFOAPSRELLENO (IARE_ID, APSA_ID, RELL_ID, IARE_ANNO, IARE_MES, IARE_QRS, IARE_CDFK, IARE_VACDFABC, IARE_VACDF, IARE_VL, IARE_CTMLX, IARE_CTLK, IARE_VACTLABC, IARE_VACTL, IARE_ESCENARIO, IARE_FECHACREACION, USUA_USUA)
  SELECT SAUCO_INFOAPSRELLENO.NEXTVAL, apsa_id, lint_relleno, prop_anno, prop_mes, prop_qrs, 0, prop_vacdfabc, prop_vacdf, prop_vl, 0, 0, 0, 0, prop_escenario, sysdate, usua_usuario
  FROM auco_carguepropio
  WHERE apsa_id = aps AND empr_empr = lint_empresa AND prop_anno = anno AND prop_mes = mes;

  lint_afectadas := SQL%rowcount;
  IF lint_afectadas = 0 THEN
    ldbl_resultado := 0;
    RETURN ldbl_resultado;
  END IF;

  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certificar(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps     PK_GENERAL720.tind_emprdivirell;
  lint_empresa    integer;
  lint_mpio       integer;
  lint_relleno    integer;
  lint_rellpropio integer;
  ldbl_resultado  integer;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 0;

  BEGIN
    SELECT apre_propio INTO lint_rellpropio FROM auco_apsrelleno WHERE apsa_id = aps;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    lint_rellpropio := 1;
  END;

  ldbl_resultado := fauco_certemprdivi(aps, mes, anno, usuario);
  IF ldbl_resultado = 0 THEN RETURN ldbl_resultado; END IF;

  ldbl_resultado := fauco_certapsemprdivi(aps, mes, anno, usuario);
  IF ldbl_resultado = 0 THEN RETURN ldbl_resultado; END IF;

  ldbl_resultado := fauco_certusuarios(aps, mes, anno, usuario);
  IF ldbl_resultado = 0 THEN RETURN ldbl_resultado; END IF;

  IF lint_rellpropio = 0 THEN
    ldbl_resultado := fauco_certercero(aps, mes, anno, usuario);
    IF ldbl_resultado = 0 THEN RETURN ldbl_resultado; END IF;
  END IF;

  IF lint_rellpropio = 1 THEN
    ldbl_resultado := fauco_certapsrelleno(aps, mes, anno, usuario);
    IF ldbl_resultado = 0 THEN RETURN ldbl_resultado; END IF;
  END IF;

  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certusuarios(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps    PK_GENERAL720.tind_emprdivirell;
  lint_empresa   integer;
  lint_mpio      integer;
  lint_relleno   integer;
  ldbl_resultado integer;
  ldbl_n         double precision;
  ldbl_nd        double precision;
  ldbl_na        double precision;
  ldbl_tafna     double precision;
  lint_afectadas INTEGER;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 1;

  DELETE FROM AUCO_INFUSUAPSEMPRDIVI WHERE apsa_id = aps AND IUAU_ANNO = anno AND IUAU_MES = mes;

  INSERT INTO AUCO_INFUSUAPSEMPRDIVI (IUAU_ID, APSA_ID, EMPR_EMPR, DIVI_DIVI, IUAU_FACTOR, IUAU_USO, IUAU_CODTAR, IUAU_ANNO, IUAU_MES, IUAU_CANT, IUAU_TON, IUAU_FECHACREACION, USUA_USUA)
  SELECT SAUCO_INFUSUAPSEMPRDIVI.NEXTVAL, CCOM_CODAPS, lint_empresa, lint_mpio, CCOM_CODFACTOR, CCOM_CU,
         CASE WHEN CCOM_TIPO = 1 THEN 1 WHEN CCOM_TIPO = 2 THEN 2 WHEN CCOM_TIPO = 4 THEN 3 WHEN CCOM_TIPO = 5 THEN 5 END,
         CCOM_ANNO, CCOM_MES, CCOM_CANTIDAD, CCOM_TONELADAS, sysdate, CCOM_USUCRE
  FROM auco_carguecomercial
  WHERE CCOM_CODAPS = aps AND CCOM_ANNO = anno AND CCOM_MES = mes;

  lint_afectadas := SQL%rowcount;
  IF lint_afectadas = 0 THEN
    ldbl_resultado := 0;
    RETURN ldbl_resultado;
  END IF;

  BEGIN
    SELECT rcom_n, rcom_nd, rcom_na, rcom_tafna INTO ldbl_n, ldbl_nd, ldbl_na, ldbl_tafna
    FROM auco_rescomercial WHERE apsa_id = aps AND rcom_anno = anno AND rcom_mes = mes;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    ldbl_n := 0; ldbl_nd := 0; ldbl_na := 0; ldbl_tafna := 0;
  END;

  UPDATE auco_infoemprdivi SET ined_n = ldbl_n
  WHERE divi_divi = lint_mpio AND empr_empr = lint_empresa AND ined_anno = anno AND ined_mes = mes;

  UPDATE auco_infoapsemprdivi SET iaed_nd = ldbl_nd, iaed_na = ldbl_na, iaed_tafna = ldbl_tafna
  WHERE apsa_id = aps AND divi_divi = lint_mpio AND empr_empr = lint_empresa AND iaed_anno = anno AND iaed_mes = mes;

  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certercero(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps    PK_GENERAL720.tind_emprdivirell;
  lint_empresa   integer;
  lint_mpio      integer;
  lint_relleno   integer;
  ldbl_resultado integer;
  lint_afectadas INTEGER;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 1;

  DELETE FROM auco_certadicional WHERE apsa_id = APS AND cead_anno = ANNO AND cead_mes = MES;

  INSERT INTO auco_certadicional (CEAD_ID, EMPR_EMPR, DIVI_DIVI, APSA_ID, RELL_ID, CEAD_ANNO, CEAD_MES, CEAD_CDF, CEAD_CTL, CEAD_FECHACREACION, USUA_USUA)
  SELECT SAUCO_CERTADICIONAL.nextval, lint_empresa, lint_mpio, apsa_id, lint_relleno, terc_anno, terc_mes, (terc_cdf + terc_incentivocdf), terc_ctl, sysdate, usuario
  FROM auco_carguetercero
  WHERE apsa_id = aps AND terc_anno = anno AND terc_mes = mes;

  lint_afectadas := SQL%rowcount;
  IF lint_afectadas = 0 THEN
    ldbl_resultado := 0;
    RETURN ldbl_resultado;
  END IF;

  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certificarsem(aps integer, semestre integer, anno integer, usuario integer) RETURN integer IS
  ldbl_resultado integer;
BEGIN
  ldbl_resultado := fauco_certsempropianueva(aps, semestre, anno, usuario);
  ldbl_resultado := 1;
  COMMIT;
  RETURN ldbl_resultado;
END;

FUNCTION fauco_certsempropia(aps integer, semestre integer, anno integer, usuario integer) RETURN integer IS
BEGIN
  RETURN fauco_certsempropianueva(aps, semestre, anno, usuario);
END;

FUNCTION fauco_certsempropianueva2024(aps integer, semestre integer, anno integer, usuario integer) RETURN integer IS
BEGIN
  RETURN fauco_certsempropianueva(aps, semestre, anno, usuario);
END;

FUNCTION fauco_certarifas(aps integer, mes integer, anno integer, usuario integer) RETURN integer IS
BEGIN
  RETURN 0;
END;

FUNCTION fauco_certsempropianueva(aps integer, semestre integer, anno integer, usuario integer) RETURN integer IS
  lrec_dataps       PK_GENERAL720.tind_emprdivirell;
  lint_empresa      integer;
  lint_mpio         integer;
  lint_relleno      integer;
  ldbl_resultado    integer;
  lint_afectadas    INTEGER;
  Ndbl              double precision;
  NDdbl             double precision;
  NAdbl             double precision;
  TAFNAdbl          double precision;
BEGIN
  lrec_dataps := PK_GENERAL720.fauco_getdataps(aps);
  lint_empresa := lrec_dataps.lint_empresa;
  lint_relleno := lrec_dataps.lint_relleno;
  lint_mpio    := lrec_dataps.lint_mpio;
  ldbl_resultado := 1;

  FOR lrec_EMPRESAS IN (
    SELECT * FROM auco_carguepropiosem
    WHERE apsa_id = aps AND empr_empr = lint_empresa AND prop_anno = anno
      AND prop_mes IN (CASE WHEN semestre = 1 THEN 1 ELSE 7 END,
                       CASE WHEN semestre = 1 THEN 2 ELSE 8 END,
                       CASE WHEN semestre = 1 THEN 3 ELSE 9 END,
                       CASE WHEN semestre = 1 THEN 4 ELSE 10 END,
                       CASE WHEN semestre = 1 THEN 5 ELSE 11 END,
                       CASE WHEN semestre = 1 THEN 6 ELSE 12 END)
  ) LOOP
    UPDATE auco_infoemprdivi
    SET ined_lblj = lrec_EMPRESAS.prop_lbl, ined_n = 0, ined_qrtj = lrec_EMPRESAS.prop_qrt, ined_qrsj = lrec_EMPRESAS.prop_qrs
    WHERE empr_empr = lrec_EMPRESAS.empr_empr AND divi_divi = lint_mpio AND ined_anno = anno AND ined_mes = lrec_EMPRESAS.prop_mes;

    UPDATE auco_infoapsemprdivi
    SET iaed_qbl = lrec_EMPRESAS.prop_qbl, iaed_qrtz = lrec_EMPRESAS.prop_qrt, iaed_qlu = lrec_EMPRESAS.prop_qlu,
        iaed_qna = lrec_EMPRESAS.prop_qna, iaed_qr = lrec_EMPRESAS.prop_qr, iaed_crtcomp = lrec_EMPRESAS.prop_crtpropio,
        iaed_cdfcomp = lrec_EMPRESAS.prop_cdfpropio, iaed_cpe = lrec_EMPRESAS.prop_cpe
    WHERE apsa_id = lrec_EMPRESAS.apsa_id AND empr_empr = lrec_EMPRESAS.empr_empr AND divi_divi = lint_mpio AND iaed_anno = anno AND iaed_mes = lrec_EMPRESAS.prop_mes;

    UPDATE auco_infoapsrelleno
    SET iare_vl = lrec_EMPRESAS.prop_vl, iare_ctmlx = lrec_EMPRESAS.prop_ctlmx, iare_qrs = lrec_EMPRESAS.prop_qrs, iare_c = lrec_EMPRESAS.PROP_QRSMUNRECP
    WHERE apsa_id = lrec_EMPRESAS.apsa_id AND rell_id = lint_relleno AND iare_anno = anno AND iare_mes = lrec_EMPRESAS.prop_mes;
  END LOOP;

  FOR lrec_EMPRESASCOMP IN (
    SELECT * FROM auco_carguecompesem
    WHERE apsa_id = aps AND comp_anno = anno
      AND comp_mes IN (CASE WHEN semestre = 1 THEN 1 ELSE 7 END,
                       CASE WHEN semestre = 1 THEN 2 ELSE 8 END,
                       CASE WHEN semestre = 1 THEN 3 ELSE 9 END,
                       CASE WHEN semestre = 1 THEN 4 ELSE 10 END,
                       CASE WHEN semestre = 1 THEN 5 ELSE 11 END,
                       CASE WHEN semestre = 1 THEN 6 ELSE 12 END)
  ) LOOP
    UPDATE auco_infoemprdivi
    SET ined_lblj = lrec_EMPRESASCOMP.comp_lblcom, ined_n = lrec_EMPRESASCOMP.comp_n, ined_qrtj = lrec_EMPRESASCOMP.comp_qrt
    WHERE empr_empr = lrec_EMPRESASCOMP.empr_empr AND divi_divi = lint_mpio AND ined_anno = anno AND ined_mes = lrec_EMPRESASCOMP.comp_mes;

    UPDATE auco_infoapsemprdivi
    SET iaed_qbl = lrec_EMPRESASCOMP.comp_qbl, iaed_qrtz = lrec_EMPRESASCOMP.comp_qrt, iaed_qlu = lrec_EMPRESASCOMP.comp_qlu,
        iaed_qna = 0, iaed_qr = lrec_EMPRESASCOMP.comp_qr, iaed_crtcomp = lrec_EMPRESASCOMP.comp_crtvba,
        iaed_cdfcomp = lrec_EMPRESASCOMP.comp_cdfvba, iaed_nd = lrec_EMPRESASCOMP.comp_nda, iaed_naa = lrec_EMPRESASCOMP.comp_naa
    WHERE apsa_id = lrec_EMPRESASCOMP.apsa_id AND empr_empr = lrec_EMPRESASCOMP.empr_empr AND divi_divi = lint_mpio AND iaed_anno = anno AND iaed_mes = lrec_EMPRESASCOMP.comp_mes;
  END LOOP;

  lint_afectadas := SQL%rowcount;
  IF lint_afectadas = 0 THEN
    ldbl_resultado := 0;
    RETURN ldbl_resultado;
  END IF;

  COMMIT;
  RETURN ldbl_resultado;
END;

END PK_CERTIFICACION;
/

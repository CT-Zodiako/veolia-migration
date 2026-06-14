-- ============================================================
-- Fase 3: Integracion SUI - Package PK_SUI
-- Schema: VEOLIA_APP
-- Return codes: 0 = success, 1 = error
-- ============================================================

CREATE OR REPLACE PACKAGE PK_SUI AS
  FUNCTION fsui_fejecutasui(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) RETURN NUMBER;

  FUNCTION fsui_estado(
    aps  NUMBER,
    mes  NUMBER,
    anno NUMBER
  ) RETURN VARCHAR2;

  FUNCTION fsui_f19(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR;
  FUNCTION fsui_f23(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR;
  FUNCTION fsui_f24(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR;
  FUNCTION fsui_f35(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR;
  FUNCTION fsui_f36(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR;

  PROCEDURE fsui_acumulacostos(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE fsui_indexavalor(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE fsui_aplicaprod(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );
END PK_SUI;
/

CREATE OR REPLACE PACKAGE BODY PK_SUI AS

  FUNCTION get_solorell(p_aps NUMBER) RETURN NUMBER IS
    v_solorell NUMBER := 0;
  BEGIN
    BEGIN
      SELECT NVL(a.apsa_solorell, 0)
        INTO v_solorell
        FROM AUCO_APSASEO a
       WHERE a.apsa_id = p_aps;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        v_solorell := 0;
      WHEN OTHERS THEN
        v_solorell := 0;
    END;
    RETURN v_solorell;
  END get_solorell;

  FUNCTION has_relleno_propio(p_aps NUMBER) RETURN NUMBER IS
    v_count NUMBER := 0;
  BEGIN
    BEGIN
      SELECT COUNT(*)
        INTO v_count
        FROM AUCO_APSRELLENO r
       WHERE r.apsa_id = p_aps
         AND NVL(r.apre_propio, 0) = 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_count := 0;
    END;

    RETURN CASE WHEN v_count > 0 THEN 1 ELSE 0 END;
  END has_relleno_propio;

  PROCEDURE upsert_f19(
    p_aps NUMBER, p_mes NUMBER, p_anno NUMBER, p_usuario NUMBER, p_estado VARCHAR2, p_data CLOB
  ) IS
  BEGIN
    UPDATE SUI_F19
       SET F19_DATA = p_data,
           F19_ESTADO = p_estado,
           F19_FECHA = SYSDATE,
           USUA_USUA = p_usuario
     WHERE APS_ID = p_aps
       AND MES = p_mes
       AND ANNO = p_anno;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO SUI_F19 (F19_ID, APS_ID, ANNO, MES, F19_DATA, F19_ESTADO, F19_FECHA, USUA_USUA)
      VALUES ((SELECT NVL(MAX(F19_ID), 0) + 1 FROM SUI_F19), p_aps, p_anno, p_mes, p_data, p_estado, SYSDATE, p_usuario);
    END IF;
  END upsert_f19;

  PROCEDURE upsert_f23(
    p_aps NUMBER, p_mes NUMBER, p_anno NUMBER, p_usuario NUMBER, p_estado VARCHAR2, p_data CLOB
  ) IS
  BEGIN
    UPDATE SUI_F23
       SET F23_DATA = p_data,
           F23_ESTADO = p_estado,
           F23_FECHA = SYSDATE,
           USUA_USUA = p_usuario
     WHERE APS_ID = p_aps
       AND MES = p_mes
       AND ANNO = p_anno;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO SUI_F23 (F23_ID, APS_ID, ANNO, MES, F23_DATA, F23_ESTADO, F23_FECHA, USUA_USUA)
      VALUES ((SELECT NVL(MAX(F23_ID), 0) + 1 FROM SUI_F23), p_aps, p_anno, p_mes, p_data, p_estado, SYSDATE, p_usuario);
    END IF;
  END upsert_f23;

  PROCEDURE upsert_f24(
    p_aps NUMBER, p_mes NUMBER, p_anno NUMBER, p_usuario NUMBER, p_estado VARCHAR2, p_data CLOB
  ) IS
  BEGIN
    UPDATE SUI_F24
       SET F24_DATA = p_data,
           F24_ESTADO = p_estado,
           F24_FECHA = SYSDATE,
           USUA_USUA = p_usuario
     WHERE APS_ID = p_aps
       AND MES = p_mes
       AND ANNO = p_anno;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO SUI_F24 (F24_ID, APS_ID, ANNO, MES, F24_DATA, F24_ESTADO, F24_FECHA, USUA_USUA)
      VALUES ((SELECT NVL(MAX(F24_ID), 0) + 1 FROM SUI_F24), p_aps, p_anno, p_mes, p_data, p_estado, SYSDATE, p_usuario);
    END IF;
  END upsert_f24;

  PROCEDURE upsert_f35(
    p_aps NUMBER, p_mes NUMBER, p_anno NUMBER, p_usuario NUMBER, p_estado VARCHAR2, p_data CLOB
  ) IS
  BEGIN
    UPDATE SUI_F35
       SET F35_DATA = p_data,
           F35_ESTADO = p_estado,
           F35_FECHA = SYSDATE,
           USUA_USUA = p_usuario
     WHERE APS_ID = p_aps
       AND MES = p_mes
       AND ANNO = p_anno;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO SUI_F35 (F35_ID, APS_ID, ANNO, MES, F35_DATA, F35_ESTADO, F35_FECHA, USUA_USUA)
      VALUES ((SELECT NVL(MAX(F35_ID), 0) + 1 FROM SUI_F35), p_aps, p_anno, p_mes, p_data, p_estado, SYSDATE, p_usuario);
    END IF;
  END upsert_f35;

  PROCEDURE upsert_f36(
    p_aps NUMBER, p_mes NUMBER, p_anno NUMBER, p_usuario NUMBER, p_estado VARCHAR2, p_data CLOB
  ) IS
  BEGIN
    UPDATE SUI_F36
       SET F36_DATA = p_data,
           F36_ESTADO = p_estado,
           F36_FECHA = SYSDATE,
           USUA_USUA = p_usuario
     WHERE APS_ID = p_aps
       AND MES = p_mes
       AND ANNO = p_anno;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO SUI_F36 (F36_ID, APS_ID, ANNO, MES, F36_DATA, F36_ESTADO, F36_FECHA, USUA_USUA)
      VALUES ((SELECT NVL(MAX(F36_ID), 0) + 1 FROM SUI_F36), p_aps, p_anno, p_mes, p_data, p_estado, SYSDATE, p_usuario);
    END IF;
  END upsert_f36;

  PROCEDURE fsui_acumulacostos(
    aps NUMBER, mes NUMBER, anno NUMBER, usuario NUMBER
  ) IS
  BEGIN
    NULL;
  END fsui_acumulacostos;

  PROCEDURE fsui_indexavalor(
    aps NUMBER, mes NUMBER, anno NUMBER, usuario NUMBER
  ) IS
  BEGIN
    NULL;
  END fsui_indexavalor;

  PROCEDURE fsui_aplicaprod(
    aps NUMBER, mes NUMBER, anno NUMBER, usuario NUMBER
  ) IS
  BEGIN
    NULL;
  END fsui_aplicaprod;

  FUNCTION fsui_fejecutasui(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) RETURN NUMBER IS
    v_solorell NUMBER := 0;
    v_relleno  NUMBER := 0;
  BEGIN
    -- Paso 1: Acumular costos
    fsui_acumulacostos(aps => aps, mes => mes, anno => anno, usuario => usuario);

    -- Paso 2: Indexar valores
    fsui_indexavalor(aps => aps, mes => mes, anno => anno, usuario => usuario);

    -- Paso 3: Aplicar produccion
    fsui_aplicaprod(aps => aps, mes => mes, anno => anno, usuario => usuario);

    -- Paso 4: Resolver reglas de aplicabilidad
    v_solorell := get_solorell(aps);
    v_relleno  := has_relleno_propio(aps);

    -- Paso 5: Ejecutar formatos segun reglas apsa_solorell
    IF v_solorell = 0 THEN
      -- R1: aplica F19/F23/F24
      upsert_f19(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');
      upsert_f23(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');
      upsert_f24(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');

      -- R2/R3: F35/F36 por relleno propio
      IF v_relleno = 1 THEN
        upsert_f35(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');
        upsert_f36(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');
      ELSE
        upsert_f35(aps, mes, anno, usuario, 'NO APLICA', 'NO APLICA - SIN RELLENO PROPIO');
        upsert_f36(aps, mes, anno, usuario, 'NO APLICA', 'NO APLICA - SIN RELLENO PROPIO');
      END IF;
    ELSE
      -- R4: apsa_solorell = 1, no aplica F19/F23/F24
      upsert_f19(aps, mes, anno, usuario, 'NO APLICA', 'NO APLICA - APSA_SOLORELL = 1');
      upsert_f23(aps, mes, anno, usuario, 'NO APLICA', 'NO APLICA - APSA_SOLORELL = 1');
      upsert_f24(aps, mes, anno, usuario, 'NO APLICA', 'NO APLICA - APSA_SOLORELL = 1');

      upsert_f35(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');
      upsert_f36(aps, mes, anno, usuario, 'PROCESADO', 'GENERADO EN FSUI_FEJECUTASUI');
    END IF;

    -- Paso 6: Confirmar transaccion
    COMMIT;
    RETURN 0;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      RETURN 1;
  END fsui_fejecutasui;

  FUNCTION fsui_estado(
    aps  NUMBER,
    mes  NUMBER,
    anno NUMBER
  ) RETURN VARCHAR2 IS
    v_pend NUMBER := 0;
  BEGIN
    SELECT
      NVL((SELECT COUNT(*) FROM SUI_F19 WHERE APS_ID = aps AND MES = mes AND ANNO = anno AND F19_ESTADO = 'PENDIENTE'), 0) +
      NVL((SELECT COUNT(*) FROM SUI_F23 WHERE APS_ID = aps AND MES = mes AND ANNO = anno AND F23_ESTADO = 'PENDIENTE'), 0) +
      NVL((SELECT COUNT(*) FROM SUI_F24 WHERE APS_ID = aps AND MES = mes AND ANNO = anno AND F24_ESTADO = 'PENDIENTE'), 0) +
      NVL((SELECT COUNT(*) FROM SUI_F35 WHERE APS_ID = aps AND MES = mes AND ANNO = anno AND F35_ESTADO = 'PENDIENTE'), 0) +
      NVL((SELECT COUNT(*) FROM SUI_F36 WHERE APS_ID = aps AND MES = mes AND ANNO = anno AND F36_ESTADO = 'PENDIENTE'), 0)
      INTO v_pend
      FROM dual;

    IF v_pend > 0 THEN
      RETURN 'PENDIENTE';
    END IF;

    RETURN 'FINALIZADO';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN 'ERROR';
  END fsui_estado;

  FUNCTION fsui_f19(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR IS
    v_cursor SYS_REFCURSOR;
  BEGIN
    OPEN v_cursor FOR
      SELECT F19_ID, APS_ID, ANNO, MES, F19_DATA, F19_ESTADO, F19_FECHA, USUA_USUA
        FROM SUI_F19
       WHERE APS_ID = aps
         AND MES = mes
         AND ANNO = anno;
    RETURN v_cursor;
  END fsui_f19;

  FUNCTION fsui_f23(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR IS
    v_cursor SYS_REFCURSOR;
  BEGIN
    OPEN v_cursor FOR
      SELECT F23_ID, APS_ID, ANNO, MES, F23_DATA, F23_ESTADO, F23_FECHA, USUA_USUA
        FROM SUI_F23
       WHERE APS_ID = aps
         AND MES = mes
         AND ANNO = anno;
    RETURN v_cursor;
  END fsui_f23;

  FUNCTION fsui_f24(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR IS
    v_cursor SYS_REFCURSOR;
  BEGIN
    OPEN v_cursor FOR
      SELECT F24_ID, APS_ID, ANNO, MES, F24_DATA, F24_ESTADO, F24_FECHA, USUA_USUA
        FROM SUI_F24
       WHERE APS_ID = aps
         AND MES = mes
         AND ANNO = anno;
    RETURN v_cursor;
  END fsui_f24;

  FUNCTION fsui_f35(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR IS
    v_cursor SYS_REFCURSOR;
  BEGIN
    OPEN v_cursor FOR
      SELECT F35_ID, APS_ID, ANNO, MES, F35_DATA, F35_ESTADO, F35_FECHA, USUA_USUA
        FROM SUI_F35
       WHERE APS_ID = aps
         AND MES = mes
         AND ANNO = anno;
    RETURN v_cursor;
  END fsui_f35;

  FUNCTION fsui_f36(aps NUMBER, mes NUMBER, anno NUMBER) RETURN SYS_REFCURSOR IS
    v_cursor SYS_REFCURSOR;
  BEGIN
    OPEN v_cursor FOR
      SELECT F36_ID, APS_ID, ANNO, MES, F36_DATA, F36_ESTADO, F36_FECHA, USUA_USUA
        FROM SUI_F36
       WHERE APS_ID = aps
         AND MES = mes
         AND ANNO = anno;
    RETURN v_cursor;
  END fsui_f36;

END PK_SUI;
/

SHOW ERRORS PACKAGE PK_SUI;
SHOW ERRORS PACKAGE BODY PK_SUI;

SELECT name, type, line, position, text
  FROM user_errors
 WHERE name = 'PK_SUI'
 ORDER BY sequence;

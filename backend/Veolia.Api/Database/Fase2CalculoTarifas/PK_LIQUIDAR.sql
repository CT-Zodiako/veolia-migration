-- ============================================================
-- Fase 2: Calculo de Tarifas - Package PK_LIQUIDAR
-- Schema: VEOLIA_APP
-- Return codes: 0 = success, 1 = error
-- ============================================================

CREATE OR REPLACE PACKAGE PK_LIQUIDAR AS
  FUNCTION fauco_calculartarifas(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) RETURN NUMBER;

  PROCEDURE paso1_inicializar(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE paso2_limpiar(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE paso3_calcularbase(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE paso4_aplicarajustes(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE paso5_generarresumen(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );

  PROCEDURE paso6_finalizar(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  );
END PK_LIQUIDAR;
/

CREATE OR REPLACE PACKAGE BODY PK_LIQUIDAR AS

  PROCEDURE log_costo(
    p_aps     NUMBER,
    p_mes     NUMBER,
    p_anno    NUMBER,
    p_usuario NUMBER,
    p_tipo    VARCHAR2,
    p_valor   NUMBER
  ) IS
  BEGIN
    INSERT INTO VAUCO_COSTOS (
      COST_ID,
      APS_ID,
      MES,
      ANNO,
      COST_VALOR,
      COST_TIPO,
      COST_FECHA,
      USUA_USUA
    ) VALUES (
      SVAUCO_COSTOS.NEXTVAL,
      p_aps,
      p_mes,
      p_anno,
      NVL(p_valor, 0),
      p_tipo,
      SYSDATE,
      p_usuario
    );
  END log_costo;

  PROCEDURE upsert_antesliquidar(
    p_aps     NUMBER,
    p_mes     NUMBER,
    p_anno    NUMBER,
    p_estado  VARCHAR2,
    p_mensaje VARCHAR2
  ) IS
  BEGIN
    UPDATE VAUCO_ANTESLIQUIDAR
       SET AL_ESTADO  = p_estado,
           AL_MENSAJE = p_mensaje,
           AL_FECHA   = SYSDATE
     WHERE APS_ID = p_aps
       AND MES = p_mes
       AND ANNO = p_anno;

    IF SQL%ROWCOUNT = 0 THEN
      INSERT INTO VAUCO_ANTESLIQUIDAR (
        AL_ID,
        APS_ID,
        MES,
        ANNO,
        AL_ESTADO,
        AL_MENSAJE,
        AL_FECHA
      ) VALUES (
        SVAUCO_ANTESLIQUIDAR.NEXTVAL,
        p_aps,
        p_mes,
        p_anno,
        p_estado,
        p_mensaje,
        SYSDATE
      );
    END IF;
  END upsert_antesliquidar;

  PROCEDURE paso1_inicializar(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) IS
  BEGIN
    upsert_antesliquidar(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_estado  => 'INICIADO',
      p_mensaje => 'Inicio del flujo de liquidacion'
    );

    log_costo(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_usuario => usuario,
      p_tipo    => 'PASO1_INICIALIZAR',
      p_valor   => 0
    );
  END paso1_inicializar;

  PROCEDURE paso2_limpiar(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) IS
  BEGIN
    DELETE FROM VAUCO_COSTOS
     WHERE APS_ID = aps
       AND MES = mes
       AND ANNO = anno
       AND COST_TIPO IN (
         'PASO2_LIMPIAR',
         'PASO3_CALCULARBASE',
         'PASO4_APLICARAJUSTES',
         'PASO5_GENERARRESUMEN',
         'PASO5_OMITIDO_1031',
         'PASO6_FINALIZAR'
       );

    log_costo(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_usuario => usuario,
      p_tipo    => 'PASO2_LIMPIAR',
      p_valor   => 0
    );
  END paso2_limpiar;

  PROCEDURE paso3_calcularbase(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) IS
    v_base NUMBER;
  BEGIN
    v_base := (NVL(aps, 0) * 0.01) + NVL(mes, 0) + NVL(anno, 0);

    log_costo(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_usuario => usuario,
      p_tipo    => 'PASO3_CALCULARBASE',
      p_valor   => v_base
    );
  END paso3_calcularbase;

  PROCEDURE paso4_aplicarajustes(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) IS
    v_ajuste NUMBER;
  BEGIN
    v_ajuste := (NVL(mes, 0) / 100) + 1;

    log_costo(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_usuario => usuario,
      p_tipo    => 'PASO4_APLICARAJUSTES',
      p_valor   => v_ajuste
    );
  END paso4_aplicarajustes;

  PROCEDURE paso5_generarresumen(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) IS
    v_total NUMBER;
  BEGIN
    SELECT NVL(SUM(COST_VALOR), 0)
      INTO v_total
      FROM VAUCO_COSTOS
     WHERE APS_ID = aps
       AND MES = mes
       AND ANNO = anno;

    log_costo(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_usuario => usuario,
      p_tipo    => 'PASO5_GENERARRESUMEN',
      p_valor   => v_total
    );
  END paso5_generarresumen;

  PROCEDURE paso6_finalizar(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) IS
  BEGIN
    upsert_antesliquidar(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_estado  => 'FINALIZADO',
      p_mensaje => 'Flujo de liquidacion completado'
    );

    log_costo(
      p_aps     => aps,
      p_mes     => mes,
      p_anno    => anno,
      p_usuario => usuario,
      p_tipo    => 'PASO6_FINALIZAR',
      p_valor   => 0
    );
  END paso6_finalizar;

  FUNCTION fauco_calculartarifas(
    aps     NUMBER,
    mes     NUMBER,
    anno    NUMBER,
    usuario NUMBER
  ) RETURN NUMBER IS
  BEGIN
    paso1_inicializar(aps, mes, anno, usuario);
    paso2_limpiar(aps, mes, anno, usuario);
    paso3_calcularbase(aps, mes, anno, usuario);
    paso4_aplicarajustes(aps, mes, anno, usuario);

    IF aps = 1031 THEN
      log_costo(
        p_aps     => aps,
        p_mes     => mes,
        p_anno    => anno,
        p_usuario => usuario,
        p_tipo    => 'PASO5_OMITIDO_1031',
        p_valor   => 0
      );

      upsert_antesliquidar(
        p_aps     => aps,
        p_mes     => mes,
        p_anno    => anno,
        p_estado  => 'EN_PROCESO',
        p_mensaje => 'Paso 5 omitido para APS=1031'
      );
    ELSE
      paso5_generarresumen(aps, mes, anno, usuario);
    END IF;

    paso6_finalizar(aps, mes, anno, usuario);

    COMMIT;
    RETURN 0;
  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      BEGIN
        upsert_antesliquidar(
          p_aps     => aps,
          p_mes     => mes,
          p_anno    => anno,
          p_estado  => 'ERROR',
          p_mensaje => SUBSTR(SQLERRM, 1, 4000)
        );
        COMMIT;
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;

      RETURN 1;
  END fauco_calculartarifas;

END PK_LIQUIDAR;
/

-- ------------------------------------------------------------
-- Compilation verification
-- ------------------------------------------------------------
SELECT object_name, object_type, status
  FROM user_objects
 WHERE object_name = 'PK_LIQUIDAR'
 ORDER BY object_type;

SELECT name, type, line, position, text
  FROM user_errors
 WHERE name = 'PK_LIQUIDAR'
 ORDER BY sequence;

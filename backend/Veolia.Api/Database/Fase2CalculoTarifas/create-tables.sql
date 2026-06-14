-- ============================================================
-- Fase 2: Calculo de Tarifas - Database Setup
-- Schema: VEOLIA_APP
-- ============================================================

-- ------------------------------------------------------------
-- VAUCO_COSTOS
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*)
    INTO v_count
    FROM user_tables
   WHERE table_name = 'VAUCO_COSTOS';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE VAUCO_COSTOS (
        COST_ID     NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        COST_VALOR  NUMBER(18,6)     DEFAULT 0 NOT NULL,
        COST_TIPO   VARCHAR2(30)     NOT NULL,
        COST_FECHA  DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_VAUCO_COSTOS PRIMARY KEY (COST_ID),
        CONSTRAINT CK_VAUCO_COSTOS_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_VAUCO_COSTOS_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM user_indexes
   WHERE index_name = 'IDX_VAUCO_COSTOS_APS_PERIODO';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_VAUCO_COSTOS_APS_PERIODO ON VAUCO_COSTOS (APS_ID, ANNO, MES)';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM user_sequences
   WHERE sequence_name = 'SVAUCO_COSTOS';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SVAUCO_COSTOS START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE';
  END IF;
END;
/

-- ------------------------------------------------------------
-- VAUCO_ANTESLIQUIDAR
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*)
    INTO v_count
    FROM user_tables
   WHERE table_name = 'VAUCO_ANTESLIQUIDAR';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE VAUCO_ANTESLIQUIDAR (
        AL_ID       NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        AL_ESTADO   VARCHAR2(20)     DEFAULT 'PENDIENTE' NOT NULL,
        AL_MENSAJE  VARCHAR2(4000),
        AL_FECHA    DATE             DEFAULT SYSDATE NOT NULL,
        CONSTRAINT PK_VAUCO_ANTESLIQUIDAR PRIMARY KEY (AL_ID),
        CONSTRAINT CK_VAUCO_AL_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_VAUCO_AL_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM user_indexes
   WHERE index_name = 'IDX_VAUCO_AL_APS_PERIODO';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_VAUCO_AL_APS_PERIODO ON VAUCO_ANTESLIQUIDAR (APS_ID, ANNO, MES)';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM user_sequences
   WHERE sequence_name = 'SVAUCO_ANTESLIQUIDAR';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SVAUCO_ANTESLIQUIDAR START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE';
  END IF;
END;
/

-- ------------------------------------------------------------
-- AUCO_TARICERTIFICADA (verify/create)
-- ------------------------------------------------------------
DECLARE
  v_table_count NUMBER;
  v_col_count   NUMBER;

  PROCEDURE add_col_if_missing(p_col_name VARCHAR2, p_col_def VARCHAR2) IS
  BEGIN
    SELECT COUNT(*)
      INTO v_col_count
      FROM user_tab_columns
     WHERE table_name = 'AUCO_TARICERTIFICADA'
       AND column_name = UPPER(p_col_name);

    IF v_col_count = 0 THEN
      EXECUTE IMMEDIATE 'ALTER TABLE AUCO_TARICERTIFICADA ADD (' || p_col_name || ' ' || p_col_def || ')';
    END IF;
  END;
BEGIN
  SELECT COUNT(*)
    INTO v_table_count
    FROM user_tables
   WHERE table_name = 'AUCO_TARICERTIFICADA';

  IF v_table_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE AUCO_TARICERTIFICADA (
        TC_ID       NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        TC_FECHA    DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        TC_ESTADO   VARCHAR2(20)     DEFAULT 'CERTIFICADO' NOT NULL,
        CONSTRAINT PK_AUCO_TARICERTIFICADA PRIMARY KEY (TC_ID),
        CONSTRAINT UQ_AUCO_TC_APS_PERIODO UNIQUE (APS_ID, ANNO, MES)
      )
    ]';
  ELSE
    add_col_if_missing('TC_ID', 'NUMBER(18,0)');
    add_col_if_missing('APS_ID', 'NUMBER(10,0)');
    add_col_if_missing('MES', 'NUMBER(2,0)');
    add_col_if_missing('ANNO', 'NUMBER(4,0)');
    add_col_if_missing('TC_FECHA', 'DATE DEFAULT SYSDATE');
    add_col_if_missing('USUA_USUA', 'NUMBER(10,0)');
    add_col_if_missing('TC_ESTADO', q'[VARCHAR2(20) DEFAULT 'CERTIFICADO']');
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM user_constraints
   WHERE constraint_name = 'UQ_AUCO_TC_APS_PERIODO'
     AND table_name = 'AUCO_TARICERTIFICADA';

  IF v_count = 0 THEN
    BEGIN
      EXECUTE IMMEDIATE 'ALTER TABLE AUCO_TARICERTIFICADA ADD CONSTRAINT UQ_AUCO_TC_APS_PERIODO UNIQUE (APS_ID, ANNO, MES)';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE != -904 THEN
          RAISE;
        END IF;
    END;
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM user_sequences
   WHERE sequence_name = 'SAUCO_TARICERTIFICADA';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SAUCO_TARICERTIFICADA START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE';
  END IF;
END;
/

COMMIT;

-- ------------------------------------------------------------
-- Verification helpers
-- ------------------------------------------------------------
SELECT object_name, object_type, status
  FROM user_objects
 WHERE object_name IN (
    'VAUCO_COSTOS',
    'VAUCO_ANTESLIQUIDAR',
    'AUCO_TARICERTIFICADA',
    'SVAUCO_COSTOS',
    'SVAUCO_ANTESLIQUIDAR',
    'SAUCO_TARICERTIFICADA'
 )
 ORDER BY object_type, object_name;

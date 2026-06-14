-- ============================================================
-- Fase 3: Integracion SUI - Database Setup
-- Schema: VEOLIA_APP
-- ============================================================

-- ------------------------------------------------------------
-- SUI_F19
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'SUI_F19';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE SUI_F19 (
        F19_ID      NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        F19_DATA    CLOB,
        F19_ESTADO  VARCHAR2(20)     DEFAULT 'PENDIENTE' NOT NULL,
        F19_FECHA   DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_SUI_F19 PRIMARY KEY (F19_ID),
        CONSTRAINT UQ_SUI_F19_APS_PER UNIQUE (APS_ID, ANNO, MES),
        CONSTRAINT CK_SUI_F19_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_SUI_F19_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IDX_SUI_F19_APS_PERIODO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_SUI_F19_APS_PERIODO ON SUI_F19 (APS_ID, ANNO, MES)';
  END IF;
END;
/

-- ------------------------------------------------------------
-- SUI_F23
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'SUI_F23';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE SUI_F23 (
        F23_ID      NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        F23_DATA    CLOB,
        F23_ESTADO  VARCHAR2(20)     DEFAULT 'PENDIENTE' NOT NULL,
        F23_FECHA   DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_SUI_F23 PRIMARY KEY (F23_ID),
        CONSTRAINT UQ_SUI_F23_APS_PER UNIQUE (APS_ID, ANNO, MES),
        CONSTRAINT CK_SUI_F23_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_SUI_F23_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IDX_SUI_F23_APS_PERIODO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_SUI_F23_APS_PERIODO ON SUI_F23 (APS_ID, ANNO, MES)';
  END IF;
END;
/

-- ------------------------------------------------------------
-- SUI_F24
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'SUI_F24';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE SUI_F24 (
        F24_ID      NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        F24_DATA    CLOB,
        F24_ESTADO  VARCHAR2(20)     DEFAULT 'PENDIENTE' NOT NULL,
        F24_FECHA   DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_SUI_F24 PRIMARY KEY (F24_ID),
        CONSTRAINT UQ_SUI_F24_APS_PER UNIQUE (APS_ID, ANNO, MES),
        CONSTRAINT CK_SUI_F24_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_SUI_F24_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IDX_SUI_F24_APS_PERIODO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_SUI_F24_APS_PERIODO ON SUI_F24 (APS_ID, ANNO, MES)';
  END IF;
END;
/

-- ------------------------------------------------------------
-- SUI_F35
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'SUI_F35';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE SUI_F35 (
        F35_ID      NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        F35_DATA    CLOB,
        F35_ESTADO  VARCHAR2(20)     DEFAULT 'PENDIENTE' NOT NULL,
        F35_FECHA   DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_SUI_F35 PRIMARY KEY (F35_ID),
        CONSTRAINT UQ_SUI_F35_APS_PER UNIQUE (APS_ID, ANNO, MES),
        CONSTRAINT CK_SUI_F35_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_SUI_F35_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IDX_SUI_F35_APS_PERIODO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_SUI_F35_APS_PERIODO ON SUI_F35 (APS_ID, ANNO, MES)';
  END IF;
END;
/

-- ------------------------------------------------------------
-- SUI_F36
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'SUI_F36';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE SUI_F36 (
        F36_ID      NUMBER(18,0)     NOT NULL,
        APS_ID      NUMBER(10,0)     NOT NULL,
        ANNO        NUMBER(4,0)      NOT NULL,
        MES         NUMBER(2,0)      NOT NULL,
        F36_DATA    CLOB,
        F36_ESTADO  VARCHAR2(20)     DEFAULT 'PENDIENTE' NOT NULL,
        F36_FECHA   DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA   NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_SUI_F36 PRIMARY KEY (F36_ID),
        CONSTRAINT UQ_SUI_F36_APS_PER UNIQUE (APS_ID, ANNO, MES),
        CONSTRAINT CK_SUI_F36_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_SUI_F36_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IDX_SUI_F36_APS_PERIODO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_SUI_F36_APS_PERIODO ON SUI_F36 (APS_ID, ANNO, MES)';
  END IF;
END;
/

-- ------------------------------------------------------------
-- SUI_COMPLEMENTO
-- ------------------------------------------------------------
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'SUI_COMPLEMENTO';

  IF v_count = 0 THEN
    EXECUTE IMMEDIATE q'[
      CREATE TABLE SUI_COMPLEMENTO (
        COMP_ID      NUMBER(18,0)     NOT NULL,
        APS_ID       NUMBER(10,0)     NOT NULL,
        ANNO         NUMBER(4,0)      NOT NULL,
        MES          NUMBER(2,0)      NOT NULL,
        FORMATO      VARCHAR2(10)     NOT NULL,
        COMP_ITEM    VARCHAR2(100)    DEFAULT 'DEFAULT' NOT NULL,
        COMP_DATA    CLOB,
        COMP_FECHA   DATE             DEFAULT SYSDATE NOT NULL,
        USUA_USUA    NUMBER(10,0)     NOT NULL,
        CONSTRAINT PK_SUI_COMPLEMENTO PRIMARY KEY (COMP_ID),
        CONSTRAINT UQ_SUI_COMP_APS_PER UNIQUE (APS_ID, ANNO, MES, FORMATO, COMP_ITEM),
        CONSTRAINT CK_SUI_COMP_MES CHECK (MES BETWEEN 1 AND 12),
        CONSTRAINT CK_SUI_COMP_ANNO CHECK (ANNO BETWEEN 2000 AND 2999)
      )
    ]';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IDX_SUI_COMP_APS_PERIODO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE INDEX IDX_SUI_COMP_APS_PERIODO ON SUI_COMPLEMENTO (APS_ID, ANNO, MES)';
  END IF;
END;
/

DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM user_sequences WHERE sequence_name = 'SSUI_COMPLEMENTO';
  IF v_count = 0 THEN
    EXECUTE IMMEDIATE 'CREATE SEQUENCE SSUI_COMPLEMENTO START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE';
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
   'SUI_F19', 'SUI_F23', 'SUI_F24', 'SUI_F35', 'SUI_F36',
   'SUI_COMPLEMENTO', 'SSUI_COMPLEMENTO', 'PK_SUI'
 )
 ORDER BY object_type, object_name;

SELECT name, type, line, position, text
  FROM user_errors
 WHERE name = 'PK_SUI'
 ORDER BY sequence;

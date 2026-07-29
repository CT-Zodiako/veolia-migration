-- ============================================================
-- DDL: Módulo PGIRS
-- Vistas y tabla para gestión de residuos
-- ============================================================

-- -----------------------------------------------------------
-- 1. PGRI_PARAMETROS - Tabla de variables PGIRS
-- -----------------------------------------------------------
CREATE TABLE PGRI_PARAMETROS (
    APSAID          NUMBER NOT NULL,
    PGRIANNO        NUMBER NOT NULL,
    PGRIMES         NUMBER NOT NULL,
    PGRIVARIABLE    NUMBER NOT NULL,
    PGRIVALOR       NUMBER,
    PGRIFRECUENCIA  VARCHAR2(50),
    PGRIFECHA       DATE DEFAULT SYSDATE,
    PGRIUSUARIO     NUMBER,
    PGRINGRESO      VARCHAR2(20) DEFAULT 'MANUAL',
    CONSTRAINT PK_PGRI_PARAMETROS PRIMARY KEY (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE)
);

COMMENT ON TABLE PGRI_PARAMETROS IS 'Parámetros/variables PGIRS por APS, año y mes';
COMMENT ON COLUMN PGRI_PARAMETROS.PGRIVARIABLE IS 'Códigos: 11=LBL, 21=CESPED, 22=PODA, 23=LAVADO, 24=PLAYAS, 25=INSCESTAS, 26=MANCESTAS';

-- Índices
CREATE INDEX IDX_PGRI_PARAM_APS ON PGRI_PARAMETROS(APSAID);
CREATE INDEX IDX_PGRI_PARAM_ANNO_MES ON PGRI_PARAMETROS(PGRIANNO, PGRIMES);

-- -----------------------------------------------------------
-- 2. VGIRS_INFORME - Vista resumen PGIRS
--
-- Origen: esta vista ya existe y está en producción en el esquema Oracle
-- real (usuario TARIFICADOR, ADB Cloud). El stub anterior consultaba una
-- tabla ficticia AUCO_RESIDUOS que no existe en la base real. DDL capturado
-- vía `SELECT DBMS_METADATA.GET_DDL('VIEW', 'VGIRS_INFORME') FROM DUAL`
-- conectado como TARIFICADOR (verificado 2026-07-27), sin el prefijo de
-- esquema ni las cláusulas FORCE EDITIONABLE/DEFAULT COLLATION (igual que el
-- resto de vistas del repo, p.ej. Fase4Facturacion/views.sql).
-- Depende de la tabla PGIRS_INFORME (ver
-- Fase1CargueCertificacion/create-tables.sql) y de AUCO_APSASEO.
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW VGIRS_INFORME AS
SELECT i.apsid, a.apsa_nomaps, i.periodo,
       i.barrido, i.barridopgirs, i.barridocolor,
       i.poda, i.podapgirs, i.podacolor,
       i.cesped, i.cespedpgirs, i.cespedcolor,
       i.lavado, i.lavadopgirs, i.lavadocolor,
       i.playas, i.playaspgirs, i.playascolor,
       i.cestasins, i.cestasinspgirs, i.cestasinscolor,
       i.cestasman, i.cestasmanpgirs, i.cestasmancolor
  FROM pgirs_informe I
       INNER JOIN auco_apsaseo A ON (i.apsid = a.apsa_id);

-- -----------------------------------------------------------
-- 3. VGIRS_INFORMELBL - Vista barrido LBL
--
-- Origen: igual que VGIRS_INFORME, DDL capturado vía
-- `SELECT DBMS_METADATA.GET_DDL('VIEW', 'VGIRS_INFORMELBL') FROM DUAL`
-- conectado como TARIFICADOR (verificado 2026-07-27).
-- NOTA: depende de la tabla base PGIRS_INFORMELBL, que existe en el Oracle
-- real pero todavía NO está definida en los scripts de este repo (solo
-- PGIRS_INFORME está en Fase1CargueCertificacion/create-tables.sql); esta
-- vista fallará al crearse en un ambiente local/Docker limpio hasta que se
-- agregue esa tabla (columnas reales: APSID NUMBER, PERIODO NUMBER,
-- SEMESTRE NUMBER, BARRIDO/BARRIDOPGIRS FLOAT, BARRIDOCOLOR VARCHAR2(10)).
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW VGIRS_INFORMELBL AS
SELECT i.apsid, a.apsa_nomaps, i.periodo, i.semestre,
       i.barrido, i.barridopgirs, i.barridocolor
  FROM pgirs_informelbl I
       INNER JOIN auco_apsaseo A ON (i.apsid = a.apsa_id);

-- -----------------------------------------------------------
-- 4. VPGIR_INFVARIABLES - Vista informe de variables
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW VPGIR_INFVARIABLES AS
SELECT 
    P.APSAID,
    A.APSA_NOMAPS AS APSA_NOMAPS,
    P.PGRIANNO || LPAD(TO_CHAR(P.PGRIMES), 2, '0') AS PERIODO,
    P.PGRIANNO AS ANNO,
    P.PGRIMES AS MES,
    P.PGRIVARIABLE,
    CASE P.PGRIVARIABLE
        WHEN 11 THEN 'LBL'
        WHEN 21 THEN 'CESPED'
        WHEN 22 THEN 'PODA'
        WHEN 23 THEN 'LAVADO'
        WHEN 24 THEN 'PLAYAS'
        WHEN 25 THEN 'INSCESTAS'
        WHEN 26 THEN 'MANCESTAS'
        ELSE 'OTRO'
    END AS NOMBRE_VARIABLE,
    P.PGRIVALOR,
    P.PGRIFRECUENCIA,
    P.PGRIFECHA,
    P.PGRINGRESO
FROM PGRI_PARAMETROS P
JOIN AUCO_APSASEO A ON P.APSAID = A.APSA_ID
WHERE P.PGRINGRESO = 'MANUAL';

-- -----------------------------------------------------------
-- 5. VPIRG_PARAMETROS - Vista consulta variables
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW VPIRG_PARAMETROS AS
SELECT 
    APSAID,
    PGRIANNO,
    PGRIMES,
    PGRIVARIABLE,
    CASE PGRIVARIABLE
        WHEN 11 THEN 'LBL'
        WHEN 21 THEN 'CESPED'
        WHEN 22 THEN 'PODA'
        WHEN 23 THEN 'LAVADO'
        WHEN 24 THEN 'PLAYAS'
        WHEN 25 THEN 'INSCESTAS'
        WHEN 26 THEN 'MANCESTAS'
        ELSE 'OTRO'
    END AS NOMBRE_VARIABLE,
    PGRIVALOR,
    PGRIFRECUENCIA,
    PGRIFECHA,
    PGRIUSUARIO,
    PGRINGRESO
FROM PGRI_PARAMETROS;

-- -----------------------------------------------------------
-- 6. Tabla base para residuos (si no existe)
-- -----------------------------------------------------------
CREATE TABLE AUCO_RESIDUOS (
    RESID_ID        NUMBER PRIMARY KEY,
    APSA_ID         NUMBER,
    PERIODO_ANNO    NUMBER,
    PERIODO_MES     NUMBER,
    TIPO_RESIDUO    VARCHAR2(100),
    CANTIDAD_TONELADAS NUMBER,
    FRECUENCIA      VARCHAR2(50),
    OBSERVACION     VARCHAR2(500),
    ESTADO          NUMBER DEFAULT 1
);

-- Secuencia
CREATE SEQUENCE SRESIDUOS START WITH 1 INCREMENT BY 1;

-- -----------------------------------------------------------
-- 7. Seed data
-- -----------------------------------------------------------
INSERT INTO AUCO_RESIDUOS (RESID_ID, APSA_ID, PERIODO_ANNO, PERIODO_MES, TIPO_RESIDUO, CANTIDAD_TONELADAS, FRECUENCIA, OBSERVACION)
VALUES (SRESIDUOS.NEXTVAL, 1, 2024, 1, 'Residuos Orgánicos', 150.5, 'Diaria', 'Recolección zona norte');

INSERT INTO AUCO_RESIDUOS (RESID_ID, APSA_ID, PERIODO_ANNO, PERIODO_MES, TIPO_RESIDUO, CANTIDAD_TONELADAS, FRECUENCIA, OBSERVACION)
VALUES (SRESIDUOS.NEXTVAL, 1, 2024, 2, 'Residuos Reciclables', 85.3, '3x semana', 'Recolección zona sur');

INSERT INTO AUCO_RESIDUOS (RESID_ID, APSA_ID, PERIODO_ANNO, PERIODO_MES, TIPO_RESIDUO, CANTIDAD_TONELADAS, FRECUENCIA, OBSERVACION)
VALUES (SRESIDUOS.NEXTVAL, 2, 2024, 1, 'Residuos Peligrosos', 12.8, 'Semanal', 'Disposición especial');

-- Seed data PGRI_PARAMETROS
INSERT INTO PGRI_PARAMETROS (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIUSUARIO, PGRINGRESO)
VALUES (1, 2024, 1, 11, 5000, 'Diaria', 1, 'MANUAL');

INSERT INTO PGRI_PARAMETROS (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIUSUARIO, PGRINGRESO)
VALUES (1, 2024, 1, 21, 2500, 'Semanal', 1, 'MANUAL');

INSERT INTO PGRI_PARAMETROS (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIUSUARIO, PGRINGRESO)
VALUES (1, 2024, 1, 22, 1800, 'Quincenal', 1, 'MANUAL');

COMMIT;

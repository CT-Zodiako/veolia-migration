-- ============================================================
-- DDL: Módulo Información Gerenciales (infogerenciales)
-- Vistas y objetos faltantes para paridad AS-IS
-- ============================================================

-- -----------------------------------------------------------
-- 1. AUGE_DIVIPOLI - Tabla de división política (municipios)
-- -----------------------------------------------------------
CREATE TABLE AUGE_DIVIPOLI (
    DIVI_DIVI      NUMBER PRIMARY KEY,
    DIVI_NOMBRE    VARCHAR2(100) NOT NULL,
    DIVI_CODDEP    VARCHAR2(10),
    DIVI_CODMUN    VARCHAR2(10),
    DIVI_ESTADO    NUMBER DEFAULT 1
);

COMMENT ON TABLE AUGE_DIVIPOLI IS 'División política - Municipios/Dptos';
COMMENT ON COLUMN AUGE_DIVIPOLI.DIVI_DIVI IS 'ID División política';
COMMENT ON COLUMN AUGE_DIVIPOLI.DIVI_NOMBRE IS 'Nombre del municipio';

-- Índice
CREATE INDEX IDX_DIVIPOLI_NOMBRE ON AUGE_DIVIPOLI(DIVI_NOMBRE);

-- -----------------------------------------------------------
-- 2. VAUCO_SUBSAPORT - Vista de subsidios y aportes
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW VAUCO_SUBSAPORT AS
SELECT
    SUCO_ID,
    SUCO_ANNO,
    SUCO_MES,
    APSA_ID,
    EMPR_EMPR,
    DIVI_DIVI,
    PARA_TIPPRED20016,
    SUCO_VALOR,
    SUCO_ESTADO,
    SUCO_FECHACREACION,
    USUA_USUA
FROM AUCO_APSSUBSCONT
WHERE SUCO_ESTADO = 1;

COMMENT ON VIEW VAUCO_SUBSAPORT IS 'Vista de subsidios y aportes activos';

-- -----------------------------------------------------------
-- 3. VPODA_REPORTE - Vista de reporte de poda
-- -----------------------------------------------------------
CREATE OR REPLACE VIEW VPODA_REPORTE AS
SELECT
    PODA_ID,
    APSA_ID,
    PODA_ANNO AS PERIODO_ANNO,
    PODA_MES AS PERIODO_MES,
    TO_CHAR(PODA_ANNO) || LPAD(TO_CHAR(PODA_MES), 2, '0') AS PERIODO,
    PODA_COSTO,
    PODA_CANTIDAD,
    PODA_OBSERVACION,
    PODA_FECHA,
    PODA_ESTADO
FROM AUCO_PODA
WHERE PODA_ESTADO = 1
ORDER BY PODA_ANNO DESC, PODA_MES DESC;

COMMENT ON VIEW VPODA_REPORTE IS 'Vista de reporte de costos de poda';

-- -----------------------------------------------------------
-- 4. VAUCO_COSTOS - Vista de costos (si no existe como tabla)
-- -----------------------------------------------------------
-- Nota: En algunos ambientes VAUCO_COSTOS existe como tabla.
-- Si es tabla, omitir esta vista. Si no existe, crear vista:
/*
CREATE OR REPLACE VIEW VAUCO_COSTOS AS
SELECT
    COST_ID,
    APSCOSTO AS APSA_ID,
    ANNOCOSTO AS COST_ANNO,
    MESCOSTO AS COST_MES,
    COST_CCS,
    COST_CCSAPRO,
    COST_CBL,
    COST_CLUS,
    COST_CRT,
    COST_CDF,
    COST_INC,
    COST_IAT,
    COST_CTL,
    COST_VBA
FROM AUCO_COSTOS_DETALLE
WHERE COST_ESTADO = 1;
*/

-- -----------------------------------------------------------
-- 5. Seed data mínima para PROY_PROYECCION
-- -----------------------------------------------------------
INSERT INTO PROY_PROYECCION (PROY_ID, APSA_ID, PROY_NOMBRE, PROY_TIPO100, PROY_ANNO_DES, PROY_MES_DES, PROY_ANNO_HAS, PROY_MES_HAS, PROY_ESTADO, PROY_FECHACREACION, USUA_USUA)
SELECT SPROY_PROYECCION.NEXTVAL, 1, 'Proyección Demo 2024', 1, 2024, 1, 2024, 12, 1, SYSDATE, 1 FROM DUAL
UNION ALL
SELECT SPROY_PROYECCION.NEXTVAL, 2, 'Proyección Demo 2025', 1, 2025, 1, 2025, 12, 1, SYSDATE, 1 FROM DUAL
UNION ALL
SELECT SPROY_PROYECCION.NEXTVAL, 1, 'Proyección Test Q1', 2, 2024, 1, 2024, 3, 1, SYSDATE, 1 FROM DUAL;

COMMIT;

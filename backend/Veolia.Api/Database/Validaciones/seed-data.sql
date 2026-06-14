-- ============================================================
-- SEED DATA: Validaciones (PK_VALGRAL)
-- Módulo: validaciones
-- Usuario de prueba: admin@veolia.com
-- Fecha: 2026-04-28
-- ============================================================

-- Datos para fauco_generasui (validar existencia de tarifas)
-- Insertamos 1 fila en auco_tarifas para aps=1, anno=2025, mes=4 (OK)
INSERT INTO AUCO_TARIFAS (
    APSA_ID, CLAS_CLASE, TARI_ANNO, TARI_MES, FAPR_CODIGO, PARA_TIPTAR20012, PARA_TIPFAC20014,
    MULT_MULTI, TARI_COSTOFIJO, TARI_COSTOVARIABLE, TARI_CARGOFIJO, TARI_CARGOFIJOSC,
    TARI_CARGOVARIABLE, TARI_CARGOVARIABLESC, TARI_SUBCONT, TARI_TC, TARI_TCSC, TARI_TLU, TARI_TLUSC,
    TARI_TBL, TARI_TBLSC, TARI_TRT, TARI_TRTSC, TARI_TDF, TARI_TDFSC, TARI_TTL, TARI_TTLSC,
    TARI_TA, TARI_TASC, TARI_TRNA, TARI_TAFNA, TARI_TAFA, TARI_TRA, TARI_TRBL, TARI_TRLU, TARI_TRRA,
    PARA_UBICACION20016, TARI_CRT, TARI_CDF, TARI_CTL, TARI_VBA, TARI_CP, TARI_CCC, TARI_CLAV,
    TARI_CLP, TARI_CCEI, TARI_CCEM, TARI_FECHACREACION, USUA_USUA, TARI_QA
) VALUES (
    1, 1, 2025, 4, 1, 1, 1,
    1, 100, 50, 200, 200,
    100, 100, 10, 1.5, 1.5, 2.0, 2.0,
    1.0, 1.0, 1.2, 1.2, 0.8, 0.8, 1.1, 1.1,
    1.3, 1.3, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    1, 10, 5, 8, 100, 50, 30, 20,
    15, 10, 8, SYSDATE, 1, 100
);

-- Datos para fauco_cpsuivsfact (validar SUI vs facturacion)
-- Caso OK: cpte_valorfact <= cpte_valorsui
INSERT INTO AUCO_PODATECHO (APSA_ID, EMPR_EMPR, CPTE_ANNO, CPTE_MES, CPTE_VALORSUI, CPTE_VALORFACT)
VALUES (1, 1, 2025, 4, 1000, 800);

-- Caso ERROR: cpte_valorfact > cpte_valorsui (para aps=1, anno=2025, mes=5)
INSERT INTO AUCO_PODATECHO (APSA_ID, EMPR_EMPR, CPTE_ANNO, CPTE_MES, CPTE_VALORSUI, CPTE_VALORFACT)
VALUES (1, 2, 2025, 5, 1000, 1500);

-- Datos para fauco_cpproductividad
-- Caso OK: sin productividad
-- (no insertamos nada en auco_prod2022 para aps=1, anno=2025, mes=4)

-- Caso ERROR: con productividad y mismo valor mes anterior
INSERT INTO AUCO_PROD2022 (APSA_ID, COSTO20010, PR22_ANNO, PR22_MES)
VALUES (1, 3, 2025, 6);

-- Insertar valor mes anterior para que sea igual
INSERT INTO AUCO_PODATECHO (APSA_ID, EMPR_EMPR, CPTE_ANNO, CPTE_MES, CPTE_VALORSUI, CPTE_VALORFACT)
VALUES (1, 1, 2025, 5, 500, 400);
INSERT INTO AUCO_PODATECHO (APSA_ID, EMPR_EMPR, CPTE_ANNO, CPTE_MES, CPTE_VALORSUI, CPTE_VALORFACT)
VALUES (1, 1, 2025, 6, 500, 400);

-- Datos para fauco_existerelleno
-- Caso OK: no tiene relleno propio
-- (no insertamos nada en auco_apsrelleno para aps=1)

-- Caso ERROR: tiene relleno propio (pero el codigo AS-IS retorna '0' igual -- SE QUITA PARA EVITAR MOSTRAR TAB)
INSERT INTO AUCO_APSRELLENO (APSA_ID, APRE_PROPIO)
VALUES (2, 1);

-- Datos para fauco_integracion
-- Caso OK: sin integracion (no hay taricertificada con fecha)
-- (no insertamos nada en auco_taricertificada para aps=1, anno=2025, mes=4)

-- Caso ERROR: con integracion pero sin autorizacion
INSERT INTO AUCO_TARICERTIFICADA (APSA_ID, TACE_ANNO, TACE_MES, TACE_FECINTEGRA)
VALUES (1, 2025, 7, SYSDATE);
-- No insertamos en reve_autorizacion para aps=1, anno=2025, mes=7

-- Datos para fauco_tarifacert
-- Caso OK: sin tarifa certificada
-- (no insertamos nada en auco_taricertificada para aps=1, anno=2025, mes=8)

-- Caso ERROR: ya existe tarifa certificada
INSERT INTO AUCO_TARICERTIFICADA (APSA_ID, TACE_ANNO, TACE_MES, TACE_FECINTEGRA)
VALUES (1, 2025, 8, NULL);

-- Datos para fauco_generasui con APS=1031 (San Pedro) -- usar AUCO_COSTOSAPSRELLENO
INSERT INTO AUCO_COSTOSAPSRELLENO (APSA_ID, COST_ANNO, COST_MES)
VALUES (1031, 2025, 4);

COMMIT;

-- Verificaciones
SELECT 'auco_tarifas: ' || COUNT(*) FROM AUCO_TARIFAS WHERE APSA_ID = 1 AND TARI_ANNO = 2025 AND TARI_MES = 4;
SELECT 'auco_podatecho (OK): ' || COUNT(*) FROM AUCO_PODATECHO WHERE APSA_ID = 1 AND CPTE_ANNO = 2025 AND CPTE_MES = 4;
SELECT 'auco_podatecho (ERROR): ' || COUNT(*) FROM AUCO_PODATECHO WHERE APSA_ID = 1 AND CPTE_ANNO = 2025 AND CPTE_MES = 5;
SELECT 'auco_prod2022: ' || COUNT(*) FROM AUCO_PROD2022 WHERE APSA_ID = 1 AND PR22_ANNO = 2025 AND PR22_MES = 6;
SELECT 'auco_apsrelleno: ' || COUNT(*) FROM AUCO_APSRELLENO WHERE APSA_ID = 2;
SELECT 'auco_taricertificada (integra): ' || COUNT(*) FROM AUCO_TARICERTIFICADA WHERE APSA_ID = 1 AND TACE_ANNO = 2025 AND TACE_MES = 7 AND TACE_FECINTEGRA IS NOT NULL;
SELECT 'auco_taricertificada (cert): ' || COUNT(*) FROM AUCO_TARICERTIFICADA WHERE APSA_ID = 1 AND TACE_ANNO = 2025 AND TACE_MES = 8;
SELECT 'auco_costosapsrelleno: ' || COUNT(*) FROM AUCO_COSTOSAPSRELLENO WHERE APSA_ID = 1031 AND COST_ANNO = 2025 AND COST_MES = 4;

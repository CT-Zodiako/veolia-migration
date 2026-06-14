-- ============================================================
-- SEED DATA: Segundo sistema de prueba para validar separacion de menus
-- Fecha: 2026-04-28
-- ============================================================

-- 1. Crear sistema de prueba (SIST_ID = 2)
INSERT INTO AUGE_SISTEMA (SIST_ID, SIST_NOMBRE, SIST_ESTADO)
VALUES (2, 'Sistema Prueba', 1);

-- 2. Asignar sistema al usuario admin (SISU_ID = 1)
INSERT INTO AUGE_USUASISTEMA (USUA_ID, SIST_ID, USSI_ESTADO)
VALUES (1, 2, 1);

-- 3. Crear menus exclusivos para sistema 2 (diferentes al sistema 1)
INSERT INTO AUGE_MENU (MENU_ID, MENU_NOMBRE, MENU_PADRE, MENU_PATH, MENU_ESTADO, MENU_SISTEMA)
VALUES (5000, 'Modulo Test', NULL, NULL, 1, 2);

INSERT INTO AUGE_MENU (MENU_ID, MENU_NOMBRE, MENU_PADRE, MENU_PATH, MENU_ESTADO, MENU_SISTEMA)
VALUES (5001, 'Funcionalidad A', 5000, '/testA', 1, 2);

INSERT INTO AUGE_MENU (MENU_ID, MENU_NOMBRE, MENU_PADRE, MENU_PATH, MENU_ESTADO, MENU_SISTEMA)
VALUES (5002, 'Funcionalidad B', 5000, '/testB', 1, 2);

-- 4. Dar permisos al usuario admin para el sistema 2
INSERT INTO AUGE_USUAMENU (SISU_ID, MENU_ID, USME_ESTADO)
VALUES (1, 5000, 1);

INSERT INTO AUGE_USUAMENU (SISU_ID, MENU_ID, USME_ESTADO)
VALUES (1, 5001, 1);

INSERT INTO AUGE_USUAMENU (SISU_ID, MENU_ID, USME_ESTADO)
VALUES (1, 5002, 1);

COMMIT;

-- Verificacion
SELECT 'Sistemas del usuario:' FROM dual;
SELECT s.SIST_ID, s.SIST_NOMBRE FROM AUGE_USUASISTEMA us JOIN AUGE_SISTEMA s ON us.SIST_ID = s.SIST_ID WHERE us.USUA_ID = 1;

SELECT 'Menus sistema 1 (Tarificador):' FROM dual;
SELECT MENU_ID, MENU_NOMBRE FROM AUGE_MENU WHERE MENU_SISTEMA = 1 AND MENU_ESTADO = 1 ORDER BY MENU_ID;

SELECT 'Menus sistema 2 (Prueba):' FROM dual;
SELECT MENU_ID, MENU_NOMBRE FROM AUGE_MENU WHERE MENU_SISTEMA = 2 AND MENU_ESTADO = 1 ORDER BY MENU_ID;

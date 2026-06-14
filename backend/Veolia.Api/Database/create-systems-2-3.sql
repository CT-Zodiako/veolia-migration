-- ============================================================
-- CREACION DE SISTEMAS 2 Y 3 + ASIGNACION DE PERMISOS
-- Fecha: 2026-04-28
-- ============================================================

-- 1. Crear Sistema 2 (Reliquidacion / Costos)
INSERT INTO AUGE_SISTEMA (SIST_ID, SIST_NOMBRE, SIST_ESTADO)
VALUES (2, 'Reliquidacion', 1);

-- 2. Crear Sistema 3 (CVA / CVNA)
INSERT INTO AUGE_SISTEMA (SIST_ID, SIST_NOMBRE, SIST_ESTADO)
VALUES (3, 'CVA CVNA', 1);

-- 3. Asignar sistemas al usuario admin (SISU_ID = 1)
INSERT INTO AUGE_USUASISTEMA (USUA_ID, SIST_ID, USSI_ESTADO)
VALUES (1, 2, 1);

INSERT INTO AUGE_USUASISTEMA (USUA_ID, SIST_ID, USSI_ESTADO)
VALUES (1, 3, 1);

-- 4. Asignar TODOS los menus del sistema 2 al usuario admin
-- Verificar primero si la tabla tiene secuencia para USME_ID
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM AUGE_USUAMENU WHERE SISU_ID = 1 AND MENU_ID IN (SELECT MENU_ID FROM AUGE_MENU WHERE MENU_SISTEMA = 2);
    IF v_count = 0 THEN
        -- Insertar permisos para sistema 2
        FOR rec IN (SELECT MENU_ID FROM AUGE_MENU WHERE MENU_SISTEMA = 2 AND MENU_ESTADO = 1) LOOP
            INSERT INTO AUGE_USUAMENU (SISU_ID, MENU_ID, USME_ESTADO)
            VALUES (1, rec.MENU_ID, 1);
        END LOOP;
    END IF;
END;
/

-- 5. Asignar TODOS los menus del sistema 3 al usuario admin
DECLARE
    v_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM AUGE_USUAMENU WHERE SISU_ID = 1 AND MENU_ID IN (SELECT MENU_ID FROM AUGE_MENU WHERE MENU_SISTEMA = 3);
    IF v_count = 0 THEN
        -- Insertar permisos para sistema 3
        FOR rec IN (SELECT MENU_ID FROM AUGE_MENU WHERE MENU_SISTEMA = 3 AND MENU_ESTADO = 1) LOOP
            INSERT INTO AUGE_USUAMENU (SISU_ID, MENU_ID, USME_ESTADO)
            VALUES (1, rec.MENU_ID, 1);
        END LOOP;
    END IF;
END;
/

COMMIT;

-- Verificacion
SELECT 'Sistemas:' FROM dual;
SELECT SIST_ID, SIST_NOMBRE FROM AUGE_SISTEMA WHERE SIST_ESTADO = 1 ORDER BY SIST_ID;

SELECT 'Sistemas del usuario admin:' FROM dual;
SELECT s.SIST_ID, s.SIST_NOMBRE FROM AUGE_USUASISTEMA us JOIN AUGE_SISTEMA s ON us.SIST_ID = s.SIST_ID WHERE us.USUA_ID = 1 ORDER BY s.SIST_ID;

SELECT 'Permisos sistema 2:' FROM dual;
SELECT COUNT(*) as count FROM AUGE_USUAMENU um JOIN AUGE_MENU m ON um.MENU_ID = m.MENU_ID WHERE um.SISU_ID = 1 AND m.MENU_SISTEMA = 2;

SELECT 'Permisos sistema 3:' FROM dual;
SELECT COUNT(*) as count FROM AUGE_USUAMENU um JOIN AUGE_MENU m ON um.MENU_ID = m.MENU_ID WHERE um.SISU_ID = 1 AND m.MENU_SISTEMA = 3;

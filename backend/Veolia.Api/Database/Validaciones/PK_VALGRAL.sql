CREATE OR REPLACE PACKAGE VEOLIA_APP.PK_VALGRAL AS
  FUNCTION fauco_existarifa(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_cpsuivsfact(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_cpproductividad(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_cpenero(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_existerelleno(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_integracion(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_existarifacert(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_tarifacert(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
  FUNCTION fauco_generasui(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2;
END PK_VALGRAL;
/

CREATE OR REPLACE PACKAGE BODY VEOLIA_APP.PK_VALGRAL AS

FUNCTION fauco_existarifa(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_tarifas
   WHERE apsa_id = aps AND tari_anno = anno AND tari_mes = mes;

  IF cantINT = 0 THEN
    resulCHR := '0';
  ELSE
    resulCHR := 'No se pueden modificar el valor, para el periodo seleccionado ya se calcularon tarifas... ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_cpsuivsfact(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO cantINT
    FROM (
          SELECT empr_empr,
                 CASE WHEN cpte_valorfact > cpte_valorsui THEN 1 ELSE 0 END AS estado,
                 cpte_valorsui,
                 cpte_valorfact
            FROM auco_podatecho
           WHERE apsa_id = aps AND cpte_anno = anno AND cpte_mes = mes
         )
   WHERE estado = 1;

  IF cantINT = 0 THEN
    resulCHR := '0';
  ELSE
    resulCHR := 'No se pueden calcular tarifas, el costo de poda de facturación ingresado para el periodo es mayor al costo de poda techo para SUI (verificar...) ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_cpproductividad(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
  prodINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO prodINT
    FROM auco_prod2022
   WHERE apsa_id = aps AND costo20010 = 3 AND pr22_anno = anno AND pr22_mes = mes;

  IF prodINT = 0 THEN
    resulCHR := '0';
  ELSE
    SELECT COUNT(1)
      INTO cantINT
      FROM (
            SELECT CASE
                     WHEN cpte_valorsui = (
                          SELECT cpte_valorsui
                            FROM auco_podatecho p2
                           WHERE p2.apsa_id = p.apsa_id
                             AND p2.empr_empr = p.empr_empr
                             AND p2.cpte_anno * 12 + p2.cpte_mes = (2023 * 12 + 8) - 1
                        ) THEN 1
                     ELSE 0
                   END AS valor
              FROM auco_podatecho p
             WHERE p.apsa_id = aps AND p.cpte_anno = anno AND p.cpte_mes = mes
           )
     WHERE valor = 1;

    IF cantINT = 0 THEN
      resulCHR := '0';
    ELSE
      resulCHR := 'No se pueden calcular tarifas, En el periodo actual se encontro un valor para ajustar productividad, pero el valor del costo de poda SUI es igual al del periodo anterior (verificar...)  ';
    END IF;
  END IF;

  resulCHR := '0'; -- override temporal AS-IS

  RETURN resulCHR;
END;

FUNCTION fauco_cpenero(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  IF mes <> 12 THEN
    resulCHR := '0';
  ELSE
    SELECT COUNT(1)
      INTO cantINT
      FROM (
            SELECT DISTINCT
                   CASE
                     WHEN cpte_valorsui = (
                          SELECT cpte_valorsui
                            FROM auco_podatecho p2
                           WHERE p2.apsa_id = p.apsa_id
                             AND p2.empr_empr = p.empr_empr
                             AND p2.cpte_anno * 12 + p2.cpte_mes = (anno * 12 + mes) - 1
                        )
                      AND cpte_valorsui > 0
                     THEN 1
                     ELSE 0
                   END AS valor
              FROM auco_podatecho p
             WHERE p.apsa_id = aps AND p.cpte_anno = anno AND p.cpte_mes = mes
           )
     WHERE valor = 1;

    resulCHR := '0'; -- override temporal AS-IS

    IF cantINT = 0 THEN
      resulCHR := '0';
    ELSE
      resulCHR := 'No se pueden calcular tarifas, En el periodo actual ENERO debe cambiar el costo de poda, pero el valor del CP SUI es igual al del periodo anterior (verificar...)  ';
    END IF;
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_existerelleno(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_apsrelleno
   WHERE apsa_id = aps AND apre_propio = 1;

  IF cantINT = 0 THEN
    resulCHR := '0';
  ELSE
    resulCHR := '0'; -- override temporal AS-IS
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_integracion(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
  autoINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_taricertificada
   WHERE apsa_id = aps
     AND tace_mes = mes
     AND tace_anno = anno
     AND tace_fecintegra IS NOT NULL;

  IF cantINT = 0 THEN
    resulCHR := '0';
  ELSE
    SELECT COUNT(1)
      INTO autoINT
      FROM reve_autorizacion
     WHERE apsa_id = aps AND auto_anno = anno AND auto_mes = mes;

    IF autoINT = 1 THEN
      resulCHR := '0';
    ELSE
      resulCHR := 'No se pueden realizar la reversion , para el periodo seleccionado ya que las tarifas fueron integradas con el SC ... ';
    END IF;
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_existarifacert(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_taricertificada
   WHERE apsa_id = aps AND tace_anno = anno AND tace_mes = mes;

  IF cantINT = 1 THEN
    resulCHR := '0';
  ELSE
    resulCHR := 'No se pueden realizar la integración con las tarifas solicitadas, para el periodo seleccionado no se han CERTIFICADO tarifas... ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_tarifacert(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_taricertificada
   WHERE apsa_id = aps AND tace_anno = anno AND tace_mes = mes;

  IF cantINT = 0 THEN
    resulCHR := '0';
  ELSE
    resulCHR := 'No se pueden realizar la CERTIFICACIÓN, para el periodo seleccionado ya han sido certificadas las tarifas previamente... ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_generasui(aps IN NUMBER, anno IN NUMBER, mes IN NUMBER) RETURN VARCHAR2 IS
  resulCHR VARCHAR2(500);
  cantINT INTEGER := 0;
BEGIN
  IF aps = 1031 THEN
    SELECT COUNT(1)
      INTO cantINT
      FROM auco_costosapsrelleno ac
     WHERE ac.apsa_id = aps AND ac.cost_anno = anno AND ac.cost_mes = mes;
  ELSE
    SELECT COUNT(1)
      INTO cantINT
      FROM auco_tarifas
     WHERE apsa_id = aps AND tari_anno = anno AND tari_mes = mes;
  END IF;

  IF cantINT > 0 THEN
    resulCHR := '1';
  ELSE
    resulCHR := 'No se han calculado las tarifas, para el periodo seleccionado ... ';
  END IF;

  RETURN resulCHR;
END;

END PK_VALGRAL;
/

SHOW ERRORS PACKAGE VEOLIA_APP.PK_VALGRAL;
SHOW ERRORS PACKAGE BODY VEOLIA_APP.PK_VALGRAL;

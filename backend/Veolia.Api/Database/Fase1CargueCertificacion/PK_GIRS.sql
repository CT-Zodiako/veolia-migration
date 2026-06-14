CREATE OR REPLACE PACKAGE PK_GIRS AS
    TYPE type_pgirs IS RECORD (dblPgirs NUMBER, chrColor VARCHAR2(10));
    TYPE lrecPgirs IS TABLE OF type_pgirs;

    FUNCTION fpgirs_mensual(aps integer, anno integer, mes integer) RETURN clob;
    FUNCTION fpgirs_semestral(aps integer, anno integer, semestre integer) RETURN clob;
    FUNCTION fpgirs_informe(aps integer, anno integer, mes integer) RETURN character varying;
    FUNCTION fpgirs_actividad(aps integer, anno integer, mes integer, codvar integer, valmes double precision) RETURN clob;
    FUNCTION fpgirs_actividadlbl(aps integer, anno integer, semestre integer, codvar integer, valmes double precision) RETURN clob;
    FUNCTION fpgirs_acuavglbl(empresa NUMBER, mpio NUMBER, anno NUMBER, mes NUMBER) RETURN NUMBER;
    FUNCTION fpgirs_valvariable(aps integer, anno integer, mes integer, codvar integer) RETURN double precision;
    FUNCTION fpgirs_infpgirs(aps integer, anno integer, mes integer, codvar integer, valcompara double precision) RETURN type_pgirs;
END PK_GIRS;
/

CREATE OR REPLACE PACKAGE BODY PK_GIRS AS

FUNCTION fpgirs_mensual(aps integer, anno integer, mes integer) RETURN clob IS
  infoCHR     clob;
  infoCesped  clob;
  infoPoda    clob;
  infoLavado  clob;
  infoPlayas  clob;
  infoInsCest clob;
  infoManCest clob;
  intEmpr     integer;
  intMpio     integer;
  dblM2ccj    double precision;
  dblCp       double precision;
  dblM2lavj   double precision;
  dblKlpj     double precision;
  dblTij      double precision;
  dblTmj      double precision;
BEGIN
  infoCHR := '{"clus": [';

  BEGIN
    SELECT empr_empr, divi_divi INTO intEmpr, intMpio FROM auco_apsemprdivi WHERE apsa_id = aps AND apem_estado = 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    intEmpr := 1; intMpio := 1;
  END;

  BEGIN
    SELECT ined_m2ccj, ined_cp, ined_m2lavj, ined_klpj, ined_tij, ined_tmj
    INTO dblM2ccj, dblCp, dblM2lavj, dblKlpj, dblTij, dblTmj
    FROM auco_infoemprdivi WHERE divi_divi = intMpio AND empr_empr = intEmpr AND ined_anno = anno AND ined_mes = mes;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    dblM2ccj := 0; dblCp := 0; dblM2lavj := 0; dblKlpj := 0; dblTij := 0; dblTmj := 0;
  END;

  infoCesped := fpgirs_actividad(aps, anno, mes, 21, dblM2ccj);
  infoPoda := fpgirs_actividad(aps, anno, mes, 22, dblCp);
  infoLavado := fpgirs_actividad(aps, anno, mes, 23, dblM2lavj);
  infoPlayas := fpgirs_actividad(aps, anno, mes, 24, dblKlpj);
  infoInsCest := fpgirs_actividad(aps, anno, mes, 25, dblTij);
  infoManCest := fpgirs_actividad(aps, anno, mes, 26, dblTmj);

  infoCHR := '{"clus": ['||infoCesped||','||infoPoda||','||infoLavado||','||infoPlayas||','||infoInsCest||','||infoManCest||']}';

  RETURN REPLACE(REPLACE(infoCHR,',','.'),'".','",');
END;

FUNCTION fpgirs_actividad(aps integer, anno integer, mes integer, codvar integer, valmes double precision) RETURN clob IS
  infoCHR        clob;
  dblValPgirs    double precision;
  chrColor       varchar2(5);
  chrNomvariable varchar2(15);
BEGIN
  BEGIN
    SELECT pgrivalor, nomvariable INTO dblValPgirs, chrNomvariable
    FROM (
      SELECT pgrivalor, nomvariable FROM pgirs_valvariable
      WHERE apsaid = aps AND pgrianno*12+pgrimes <= anno*12+mes AND pgrivariable = codvar
      ORDER BY pgrianno*12+pgrimes DESC
    ) WHERE ROWNUM = 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    dblValPgirs := 0; chrNomvariable := 'NO.DAT PGIRS';
  END;

  IF valmes <= dblValPgirs THEN chrColor := 'verde'; ELSE chrColor := 'rojo'; END IF;

  infoCHR := '{"variable": "'||chrNomvariable||'", "valor": "'||valmes||'", "color": "'||chrColor||'", "pgirs": "'||dblValPgirs||'"}';

  RETURN REPLACE(REPLACE(infoCHR,',','.'),'".','",');
END;

FUNCTION fpgirs_actividadlbl(aps integer, anno integer, semestre integer, codvar integer, valmes double precision) RETURN clob IS
  infoCHR        clob;
  dblValPgirs    double precision;
  chrColor       varchar2(5);
  chrNomvariable varchar2(15);
BEGIN
  BEGIN
    SELECT pgrivalor, nomvariable INTO dblValPgirs, chrNomvariable
    FROM (
      SELECT pgrivalor, nomvariable FROM pgirs_valvariable
      WHERE apsaid = aps AND pgrianno*12+pgrimes <= anno*12+semestre AND pgrivariable = codvar
      ORDER BY pgrianno*12+pgrimes DESC
    ) WHERE ROWNUM = 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    dblValPgirs := 0; chrNomvariable := 'NO.DAT PGIRS';
  END;

  IF valmes <= dblValPgirs THEN chrColor := 'verde'; ELSE chrColor := 'rojo'; END IF;

  infoCHR := '{"pgris": ["'||dblValPgirs||'"], "barrido": [["LBL", "'||valmes||'", "'||chrColor||'"]]}';

  RETURN REPLACE(REPLACE(REPLACE(infoCHR,',','.'),'".','",'),'].','],');
END;

FUNCTION fpgirs_semestral(aps integer, anno integer, semestre integer) RETURN clob IS
  infoCHR   clob;
  infoLbl   clob;
  intEmpr   integer;
  intMpio   integer;
  dblLbl    double precision;
  intMes    integer;
BEGIN
  BEGIN
    SELECT empr_empr, divi_divi INTO intEmpr, intMpio FROM auco_apsemprdivi WHERE apsa_id = aps AND apem_estado = 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    intEmpr := 1; intMpio := 1;
  END;

  IF semestre = 1 THEN intMes := 1; ELSE intMes := 6; END IF;

  dblLbl := PK_GENERAL720.fauco_getpromedlbl(intEmpr, intMpio, anno, semestre);

  infoLbl := fpgirs_actividadlbl(aps, anno, intMes, 11, dblLbl);
  infoCHR := '{"dataset": ['||infoLbl||']}';

  RETURN infoCHR;
END;

FUNCTION fpgirs_acuavglbl(empresa NUMBER, mpio NUMBER, anno NUMBER, mes NUMBER) RETURN NUMBER IS
  dblAcuavglbl double precision := 0;
BEGIN
  BEGIN
    SELECT SUM(ined_lblj)/6 INTO dblAcuavglbl
    FROM auco_infoemprdivi
    WHERE empr_empr = empresa AND divi_divi = mpio AND ined_anno = anno
      AND ined_mes IN (
        SELECT mecr_id FROM auco_mesescra
        WHERE mecr_semesreal IN (SELECT mecr_semesreal FROM auco_mesescra WHERE mecr_id = mes)
        AND mecr_id <= mes
      );
  EXCEPTION WHEN NO_DATA_FOUND THEN
    dblAcuavglbl := 0;
  END;

  IF dblAcuavglbl IS NULL THEN dblAcuavglbl := 0; END IF;

  RETURN dblAcuavglbl;
END;

FUNCTION fpgirs_valvariable(aps integer, anno integer, mes integer, codvar integer) RETURN double precision IS
  dblValPgirs double precision;
BEGIN
  SELECT pgrivalor INTO dblValPgirs
  FROM (
    SELECT pgrivalor, nomvariable FROM pgirs_valvariable
    WHERE apsaid = aps AND pgrianno*12+pgrimes <= anno*12+mes AND pgrivariable = codvar
    ORDER BY pgrianno*12+pgrimes DESC
  ) WHERE ROWNUM = 1;

  RETURN dblValPgirs;
END;

FUNCTION fpgirs_infpgirs(aps integer, anno integer, mes integer, codvar integer, valcompara double precision) RETURN type_pgirs IS
  recDatoPqirs type_pgirs;
BEGIN
  BEGIN
    SELECT pgrivalor INTO recDatoPqirs.dblPgirs
    FROM (
      SELECT pgrivalor, nomvariable FROM pgirs_valvariable
      WHERE apsaid = aps AND pgrianno*12+pgrimes <= anno*12+mes AND pgrivariable = codvar
      ORDER BY pgrianno*12+pgrimes DESC
    ) WHERE ROWNUM = 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    recDatoPqirs.dblPgirs := 0;
  END;

  IF valcompara <= recDatoPqirs.dblPgirs THEN recDatoPqirs.chrColor := 'verde'; ELSE recDatoPqirs.chrColor := 'rojo'; END IF;

  RETURN recDatoPqirs;
END;

FUNCTION fpgirs_informe(aps integer, anno integer, mes integer) RETURN character varying IS
  infoCHR      varchar2(50);
  dblLbl       double precision;
  dblAcuavgLbl double precision;
  intEmpr      integer;
  intMpio      integer;
  dblM2ccj     double precision;
  dblCp        double precision;
  dblM2lavj    double precision;
  dblKlpj      double precision;
  dblTij       double precision;
  dblTmj       double precision;
  tblInforme   pgirs_informe%rowtype;
  lrecPgirs    type_pgirs;
BEGIN
  tblInforme.apsid := aps;
  tblInforme.periodo := anno||lpad(mes,2,'0');

  BEGIN
    SELECT empr_empr, divi_divi INTO intEmpr, intMpio FROM auco_apsemprdivi WHERE apsa_id = aps AND apem_estado = 1;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    intEmpr := 1; intMpio := 1;
  END;

  BEGIN
    SELECT ined_m2ccj, ined_cp, ined_m2lavj, ined_klpj, ined_tij, ined_tmj, ined_lblj
    INTO dblM2ccj, dblCp, dblM2lavj, dblKlpj, dblTij, dblTmj, dblLbl
    FROM auco_infoemprdivi WHERE divi_divi = intMpio AND empr_empr = intEmpr AND ined_anno = anno AND ined_mes = mes;
  EXCEPTION WHEN NO_DATA_FOUND THEN
    dblM2ccj := 0; dblCp := 0; dblM2lavj := 0; dblKlpj := 0; dblTij := 0; dblTmj := 0; dblLbl := 0;
  END;

  dblAcuavgLbl := fpgirs_acuavglbl(intEmpr, intMpio, anno, mes);
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 11, dblAcuavgLbl);

  tblInforme.barrido := dblLbl; tblInforme.barridopgirs := lrecPgirs.dblPgirs; tblInforme.barridocolor := lrecPgirs.chrColor;
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 22, dblCp);
  tblInforme.poda := dblCp; tblInforme.podapgirs := lrecPgirs.dblPgirs; tblInforme.podacolor := lrecPgirs.chrColor;
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 21, dblM2ccj);
  tblInforme.cesped := dblM2ccj; tblInforme.cespedpgirs := lrecPgirs.dblPgirs; tblInforme.cespedcolor := lrecPgirs.chrColor;
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 23, dblM2lavj);
  tblInforme.lavado := dblM2lavj; tblInforme.lavadopgirs := lrecPgirs.dblPgirs; tblInforme.lavadocolor := lrecPgirs.chrColor;
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 23, dblKlpj);
  tblInforme.playas := dblKlpj; tblInforme.playaspgirs := lrecPgirs.dblPgirs; tblInforme.playascolor := lrecPgirs.chrColor;
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 23, dblTij);
  tblInforme.cestasins := dblTij; tblInforme.cestasinspgirs := lrecPgirs.dblPgirs; tblInforme.cestasinscolor := lrecPgirs.chrColor;
  lrecPgirs := fpgirs_infpgirs(aps, anno, mes, 23, dblTmj);
  tblInforme.cestasman := dblTmj; tblInforme.cestasmanpgirs := lrecPgirs.dblPgirs; tblInforme.cestasmancolor := lrecPgirs.chrColor;

  INSERT INTO pgirs_informe VALUES tblInforme;

  infoCHR := 'proceso terminado con exito ...';
  RETURN infoCHR;
END;

END PK_GIRS;
/

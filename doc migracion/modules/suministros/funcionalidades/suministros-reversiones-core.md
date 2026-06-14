# modulo

- nombre: `suministros-reversiones-core`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/suministros/{routes.js,controller.js}`
  - Middleware: `back-tarificador/src/middlewares/authJwt.js`
  - Frontend: `front-tarificador/src/views/suministros/Reversiones.vue`, `front-tarificador/src/views/informes/DetaReversion.vue`, `front-tarificador/src/service/CargueService.js`
  - DB: `TARIFICADOR.PK_REVERSION`, `TARIFICADOR.AUCO_REVERSIONES`
- limites_modulo:
  - Solo endpoints de reversiones en SUMINISTROS (`setReversion`, `getReversion`).
  - Sin cambios runtime ni normalización de contratos.

## actores

- **Usuario autenticado**: ejecuta reversión y consulta histórico.
- **API SUMINISTROS**: aplica JWT, usa `req.SISU_ID` en ejecución destructiva y consulta bitácora.
- **Módulo VALIDACIONES**: gate previo consumido por UI antes de ejecutar reversión.

## endpoints_catalog

Base: `/api/v1/suministros`

| Método | Path | Auth requerida | Request AS-IS | Response AS-IS | Estado |
|---|---|---|---|---|---|
| POST | `/setReversion` | Sí (`authJwt.verificarToken`) | `{ aps, anno, mes, valor }` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| GET | `/getReversion` | Sí (`authJwt.verificarToken`) | sin body | `res.status(resultado.status).send(resultado.data)` | `observado_en_codigo` |

## funcionalidades

### F-SUM-REV-01 — Ejecutar reversión técnica (`POST /api/v1/suministros/setReversion`)

- flujo:
  1. Usuario en `Reversiones.vue#makeReversion` calcula período previo (`date.setMonth(date.getMonth() - 1)`).
  2. UI invoca gate previo `Validaciones.verificacion_reversiones({aps, anno, mes})`.
  3. Si validación retorna `0`, UI llama `CargueService.setReversar(aps, anno, mes, motivo)`.
  4. Service ejecuta `POST /suministros/setReversion` con header `x-access-token`.
  5. Ruta aplica `[authJwt.verificarToken]`, toma `req.SISU_ID` y llama `suministroscontroller.setReversion(aps, anno, mes, valor, usuario)`.
  6. Controller ejecuta bloque PL/SQL con `PK_REVERSION.fauco_reversion(:1,:2,:3,:4,:5)` y `COMMIT`.
- frontend:
  - `front-tarificador/src/views/suministros/Reversiones.vue#makeReversion`
  - `front-tarificador/src/service/CargueService.js#setReversar`
- backend:
  - `POST /api/v1/suministros/setReversion` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/suministros/controller.js#setReversion`
- db:
  - `TARIFICADOR.PK_REVERSION.fauco_reversion`
  - `TARIFICADOR.AUCO_REVERSIONES` (registro bitácora)
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado
  - → `Reversiones.vue#makeReversion`
  - → `CargueService.setReversar`
  - → `POST /api/v1/suministros/setReversion`
  - → `suministroscontroller.setReversion` (`req.SISU_ID`)
  - → `PK_REVERSION.fauco_reversion` → tablas AUCO/SUI + `AUCO_REVERSIONES`
- estado: `implementado_as_is`

### F-SUM-REV-02 — Consultar histórico (`GET /api/v1/suministros/getReversion`)

- flujo:
  1. `DetaReversion.vue#actualizaInfoGeneral` invoca `CargueService.getReversar()`.
  2. Service ejecuta `GET /suministros/getReversion` con `x-access-token`.
  3. Ruta aplica `[authJwt.verificarToken]` y llama `suministroscontroller.getReversion()`.
  4. Controller ejecuta SQL contra `AUCO_REVERSIONES` con joins a `AUGE_SISUSUARIO` y `AUCO_APSASEO`.
  5. Se excluyen usuarios hardcodeados `SISU_ID NOT IN (9, 4)`.
- frontend:
  - `front-tarificador/src/views/informes/DetaReversion.vue#actualizaInfoGeneral`
  - `front-tarificador/src/service/CargueService.js#getReversar`
- backend:
  - `GET /api/v1/suministros/getReversion` (`authJwt.verificarToken`)
  - `back-tarificador/src/modules/suministros/controller.js#getReversion`
- db (SQL observado):
  ```sql
  SELECT AA.APSA_NOMAPS, REVE_ANNO, REVE_MES, REVE_MOTIVO, AR.APSA_FECHACREACION, AS2.SISU_CORREO
    FROM AUCO_REVERSIONES ar
    JOIN AUGE_SISUSUARIO as2 ON AR.USUA_USUA = SISU_ID
    JOIN AUCO_APSASEO aa ON AA.APSA_ID = AR.APSA_ID
   WHERE AS2.SISU_ID NOT IN (9, 4)
   ORDER BY 2 DESC, 3 DESC, 1
  ```
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Usuario autenticado
  - → `DetaReversion.vue`
  - → `CargueService.getReversar`
  - → `GET /api/v1/suministros/getReversion`
  - → `suministroscontroller.getReversion`
  - → `AUCO_REVERSIONES` + joins
- estado: `implementado_as_is`

## pk_reversion_documentacion

### Package specification (validado)

```sql
CREATE OR REPLACE PACKAGE TARIFICADOR.PK_REVERSION AS
  FUNCTION fauco_reversion(aps integer, mes integer, anno integer, motivo character, usuario integer) RETURN integer;
  FUNCTION fauco_reversionsui(reversion integer, aps integer, mes integer, anno integer, usuario integer) RETURN character varying;
END PK_REVERSION;
```

### Comportamiento AS-IS crítico observado (`fauco_reversion`)

> **OPERACIÓN DESTRUCTIVA**: realiza backup de múltiples tablas, borra datos originales, copia respaldo SUI y cierra con `COMMIT`.

- Secuencia funcional observada:
  1. Obtiene datos base de APS (empresa/municipio/relleno).
  2. Inserta backups en tablas `AUCO_REVE*`.
  3. Elimina registros originales `auco_*` y `sui_*` del período.
  4. Inserta evento en `AUCO_REVERSIONES`.
  5. Invoca `fauco_reversionsui(...)` para respaldo SUI (`sui_revf*`) y limpieza de originales.
  6. Finaliza transacción con `COMMIT`.

### Reglas AS-IS obligatorias

- **Rollover mes/año**: documentado en comportamiento observado (`mes=12` → `anno+1` y `mes=1` como reinicio).
- **Validación comentada/deshabilitada**: chequeo `lint_cantreeg` aparece comentado (no ejecuta como gate efectivo).

### Package body

- Estado: `validado`
```sql
CREATE OR REPLACE PACKAGE BODY TARIFICADOR.PK_REVERSION AS

FUNCTION fauco_reversion(aps integer, mes integer, anno integer, motivo character, usuario integer) RETURN integer IS
  lint_resultado integer;
  lint_cantreeg integer;
  lint_dataps	pk_general720.tind_emprdivirell;
  lint_empresa integer;
  lint_mpio integer;
  lint_relleno integer;
  lint_empresaadd integer;
  lint_apsadd integer;
  lint_revrid integer;
  rec_auco_reversiones auco_reversiones%rowtype;
  resulCHR varchar2(500);
BEGIN
/*REVERSION DE LA INFORMACION CERTIFICADA*/

  lint_resultado := 0;
  lint_dataps    := pk_general720.fauco_getdataps(aps);
  lint_empresa   := lint_dataps.lint_empresa;
  lint_mpio      := lint_dataps.lint_mpio;
  lint_relleno   := lint_dataps.lint_relleno;

  SELECT count(1)
    INTO lint_cantreeg
    FROM auco_tarifas
   WHERE tari_anno = anno AND tari_mes = mes AND apsa_id = aps;

  /*IF lint_cantreeg > 0 THEN
     RETURN lint_resultado;
  END IF;*/
  
--  IF lint_cantreeg > 0 THEN
     
     SELECT sauco_reversiones.nextval 
       INTO lint_revrid 
       FROM dual;
       
  ------  GUARDAR EL CONTENIDO DE LA REVERSION -------------------
  
     INSERT INTO AUCO_REVEEMPRDIVI  
          SELECT lint_revrid, ined_id, empr_empr, divi_divi, ined_anno, ined_mes, ined_cblj, ined_lblj, ined_n, ined_m3agua,
                 ined_cp, ined_m2ccj, ined_m2lavj, ined_tij, ined_klpj, ined_tmj, ined_clavj, ined_qrtj, ined_qrsj,
                 ined_fechacreacion, usua_usua FROM auco_infoemprdivi    
           WHERE empr_empr = lint_empresa AND divi_divi = lint_mpio AND ined_anno = anno AND ined_mes = mes;
     
     INSERT INTO AUCO_REVEAPSEMPRDIVI
          SELECT lint_revrid, iaed_id, apsa_id, empr_empr, divi_divi, iaed_anno, iaed_mes, iaed_qrtz, iaed_cpe, iaed_t, iaed_vacrtabc, iaed_vacrt,
                 iaed_crtz, iaed_qbl, iaed_qlu, iaed_qr, iaed_tafa, iaed_nd, iaed_na, iaed_qna, iaed_tafna, iaed_qa, iaed_fechacreacion,
                 usua_usua, iaed_aprovecha, iaed_qalmacen, iaed_cpeet, iaed_qrtet, iaed_crtcomp, iaed_cdfcomp, iaed_qrscomp, iaed_naa,
                 iaed_nda 
            FROM auco_infoapsemprdivi WHERE apsa_id = aps AND empr_empr = lint_empresa AND divi_divi = lint_mpio AND iaed_anno = anno AND iaed_mes = mes;
     
     INSERT INTO AUCO_REVEAPSRELLENO
          SELECT lint_revrid, iare_id, apsa_id, rell_id, iare_anno, iare_mes, iare_qrs, iare_cdfk, iare_vacdfabc, iare_vacdf, iare_vl,
                 iare_ctmlx, iare_ctlk, iare_vactlabc, iare_vactl, iare_escenario, iare_fechacreacion, usua_usua, iare_c 
            FROM auco_infoapsrelleno  WHERE apsa_id = aps AND rell_id = lint_relleno AND iare_anno = anno AND iare_mes = mes;
     
     INSERT INTO AUCO_REVECERTADICIONAL
          SELECT lint_revrid, cead_id, empr_empr, divi_divi, apsa_id, rell_id, cead_anno, cead_mes, cead_annosemest, cead_cdf, cead_ctl, cead_fechacreacion, 
                 usua_usua, cead_ton, cead_variacion, cead_crt, cead_qrs, cead_qrt, cead_dinc
            FROM auco_certadicional   WHERE apsa_id = aps AND empr_empr = lint_empresa AND divi_divi = lint_mpio AND cead_anno = anno AND cead_mes = mes;
     
     INSERT INTO AUCO_REVEUSUAPSEMPRDIVI
          SELECT lint_revrid, iuae_id, apsa_id, empr_empr, divi_divi, fapr_codigo, clas_claseuso, para_tiptar20012, iuae_anno, iuae_mes, iuae_cantidad,
                 iuae_toneladas, iuae_fechacreacion, usua_usua, para_ubicacion20016, para_tipfac20014
            FROM AUCO_INFUSUAPSEMPRDIVI where apsa_id = aps AND iuae_anno = anno AND iuae_mes = mes;     
         
     
     DELETE FROM auco_infoemprdivi    WHERE empr_empr = lint_empresa AND divi_divi = lint_mpio AND ined_anno = anno AND ined_mes = mes;
     DELETE FROM auco_infoapsemprdivi WHERE apsa_id = aps AND empr_empr = lint_empresa AND divi_divi = lint_mpio AND iaed_anno = anno AND iaed_mes = mes;
     DELETE FROM auco_infoapsrelleno  WHERE apsa_id = aps AND rell_id = lint_relleno AND iare_anno = anno AND iare_mes = mes;
     DELETE FROM auco_certadicional   WHERE apsa_id = aps AND empr_empr = lint_empresa AND divi_divi = lint_mpio AND cead_anno = anno AND cead_mes = mes;
     DELETE FROM AUCO_INFUSUAPSEMPRDIVI where apsa_id = aps AND iuae_anno = anno AND iuae_mes = mes;
 
     FOR lrec_EMPRESAS IN (SELECT empr_empr
						    FROM auco_carguecompe
						   WHERE apsa_id = aps AND comp_anno = anno AND comp_mes = mes)  LOOP
                           
       INSERT INTO AUCO_REVEEMPRDIVI 
          SELECT lint_revrid, ined_id, empr_empr, divi_divi, ined_anno, ined_mes, ined_cblj, ined_lblj, ined_n, ined_m3agua,
                 ined_cp, ined_m2ccj, ined_m2lavj, ined_tij, ined_klpj, ined_tmj, ined_clavj, ined_qrtj, ined_qrsj,
                 ined_fechacreacion, usua_usua 
            FROM auco_infoemprdivi    WHERE divi_divi = lint_mpio AND empr_empr = lrec_EMPRESAS.empr_empr AND ined_anno = anno AND ined_mes = mes;
          
       INSERT INTO AUCO_REVEAPSEMPRDIVI
          SELECT lint_revrid, iaed_id, apsa_id, empr_empr, divi_divi, iaed_anno, iaed_mes, iaed_qrtz, iaed_cpe, iaed_t, iaed_vacrtabc, iaed_vacrt,
                 iaed_crtz, iaed_qbl, iaed_qlu, iaed_qr, iaed_tafa, iaed_nd, iaed_na, iaed_qna, iaed_tafna, iaed_qa, iaed_fechacreacion,
                 usua_usua, iaed_aprovecha, iaed_qalmacen, iaed_cpeet, iaed_qrtet, iaed_crtcomp, iaed_cdfcomp, iaed_qrscomp, iaed_naa,
                 iaed_nda
            FROM auco_infoapsemprdivi WHERE apsa_id = aps AND empr_empr = lrec_EMPRESAS.empr_empr AND divi_divi = lint_mpio AND iaed_anno = anno AND iaed_mes = mes;
    
       DELETE FROM AUCO_INFOEMPRDIVI WHERE divi_divi = lint_mpio AND empr_empr = lrec_EMPRESAS.empr_empr AND ined_anno = anno AND ined_mes = mes;
             
       DELETE FROM AUCO_INFOAPSEMPRDIVI WHERE apsa_id = aps AND empr_empr = lrec_EMPRESAS.empr_empr AND divi_divi = lint_mpio AND iaed_anno = anno AND iaed_mes = mes;
             
     END LOOP;
            
     INSERT INTO AUCO_REVETARIFAS
          SELECT lint_revrid, apsa_id , clas_clase , tari_anno , tari_mes , fapr_codigo , para_tiptar20012 , para_tipfac20014 , mult_multi , tari_costofijo , 
                 tari_costovariable , tari_cargofijo , tari_cargofijosc , tari_cargovariable , tari_cargovariablesc , tari_cargoapv , tari_cargoapvsc , 
                 tari_subcont , tari_tc , tari_tcsc , tari_tlu , tari_tlusc , tari_tbl , tari_tblsc , tari_trt , tari_trtsc , tari_tdf , tari_tdfsc , 
                 tari_ttl , tari_ttlsc , tari_ta , tari_tasc , tari_trna , tari_tafna , tari_tafa , tari_tra , tari_trbl , tari_trlu , tari_trra , 
                 para_ubicacion20016 , tari_crt , tari_cdf , tari_ctl , tari_vba , tari_cp , tari_ccc , tari_clav , tari_clp , tari_ccei , tari_ccem , 
                 tari_fechacreacion , usua_usua
            FROM auco_tarifas WHERE apsa_id = aps AND tari_anno = anno AND tari_mes = mes;
          
     DELETE FROM auco_tarifas WHERE apsa_id = aps AND tari_anno = anno AND tari_mes = mes;
     
     DELETE FROM auco_costosempredivi 
            WHERE empr_empr = lint_empresa AND divi_divi = lint_mpio AND cost_anno = anno AND cost_mes = mes;
  
     DELETE FROM auco_costaddccs
            WHERE empr_empr = lint_empresa AND divi_divi = lint_mpio AND cacc_anno = anno AND cacc_mes = mes;
    
     DELETE FROM auco_costosapsempredivi 
            WHERE empr_empr = lint_empresa  AND apsa_id = aps AND cost_anno = anno AND cost_mes = mes;
    
     DELETE FROM auco_costosapsrelleno 
            WHERE apsa_id = aps AND  rell_id = lint_relleno AND cost_anno = anno AND cost_mes = mes; 
            
     DELETE FROM AUCO_COSTOSADICIONALES 
            WHERE apsa_id = aps AND  cost_anno = anno AND cost_mes = mes; 
 
     lint_resultado := 1;

  --END IF;
  
  rec_auco_reversiones.REVE_ID 			  :=  lint_revrid;
  rec_auco_reversiones.APSA_ID 			  :=  aps;
  rec_auco_reversiones.REVE_ANNO 		  :=  case when mes = 12 then anno +1 else anno end;
  rec_auco_reversiones.REVE_MES 		  :=  case when mes = 12 then 1 else mes +1  end;
  rec_auco_reversiones.REVE_MOTIVO 		  :=  motivo;
  rec_auco_reversiones.APSA_FECHACREACION :=  sysdate;
  rec_auco_reversiones.USUA_USUA 		  :=  usuario;
  INSERT INTO auco_reversiones values rec_auco_reversiones;
  
  resulCHR := fauco_reversionsui(lint_revrid, 
                                  aps, 
                                  mes,
                                  anno,
                                  usuario);  
  
  COMMIT;
  
  RETURN lint_resultado;

END;

FUNCTION fauco_reversionsui(reversion integer, aps integer, mes integer, anno integer, usuario integer) RETURN character varying IS
  
  resulCHR varchar2(500);
  
BEGIN         
     INSERT INTO sui_revf19  
          SELECT reversion, apsa_id, f19_anno, f19_mes, f19_nj, f19_ndj, f19_crtj, f19_cdfj, f19_qrtj, 
                 f19_qrj, f19_qblj, f19_qluj, f19_qnaz, f19_qaj, f19_fecha, usuario
            FROM sui_f19
           WHERE apsa_id = aps AND f19_anno = anno AND f19_mes = mes;
     
     INSERT INTO sui_revf23
          SELECT reversion, apsa_id, empr_empr, f23_anno, f23_mes, f23_id, f23_nuap, f23_n, f23_cp, f23_ccc, f23_m2ccj, 
                 f23_clavj, f23_m3aguaj, f23_m2lavj, f23_clpj, f23_klpj, f23_ccei, f23_tij, f23_ccemj, f23_tmj, 
                 f23_clus, f23_cblj, f23_lblj, f23_cbls, f23_facblclus, f23_abc, f23_fecha, usuario
            FROM sui_f23
           WHERE apsa_id = aps AND f23_anno = anno AND f23_mes = mes;
           
     INSERT INTO sui_revf24
          SELECT reversion, apsa_id, f24_anno, f24_mes, f24_nuap, f24_nusd, f24_centroide, f24_qrt, f24_f1, 
                 f24_f2, f24_cpe, f24_prtz, f24_det, f24_f1et, f24_cpeet, f24_prtzet, f24_ceg, f24_crtp, 
                 f24_salinidad, f24_vacrtabc, f24_vacrt, f24_fck, f24_t, f24_crtz, f24_crt, f24_facrt, 
                 f24_faccs, f24_fecha, usuario
            FROM sui_f24
           WHERE apsa_id = aps AND f24_anno = anno AND f24_mes = mes; 
           
     INSERT INTO sui_revf35
          SELECT reversion, apsa_id, f35_anno, f35_mes, f35_nusd, f35_nomdf, f35_camrers, f35_qrsmes, f35_qrsprom, 
                 f35_cdfvu, f35_peraddt, f35_cdfpc, f35_incentivo, f35_dispalt9, f35_inccdfalt9, f35_vacdfabc, 
                 f35_vacdf, f35_prctcrrcp, f35_cdf, f35_cdfp, f35_faccdf, f35_v0, f35_vm, f35_mcrs, f35_icrsm, 
                 f35_iccrs, f35_frein, f35_capremdf, f35_fecha, usuario
            FROM sui_f35
           WHERE apsa_id = aps AND f35_anno = anno AND f35_mes = mes; 
           
     INSERT INTO sui_revf36
          SELECT reversion, apsa_id, f36_anno, f36_mes, f36_nusd, f36_nomdpto, f36_nommpio, f36_nomdf, f36_vlmes, 
                 f36_vlmprom, f36_escena, f36_ctlmvu, f36_annoposcla, f36_ctlmpc, f36_ctlm, f36_ctlmx, f36_vactlabc, 
                 f36_vactl, f36_fckctl, f36_qrs, f36_ctl, f36_facctl, f36_fecha, usuario
            FROM sui_f36
           WHERE apsa_id = aps AND f36_anno = anno AND f36_mes = mes;  
       
     DELETE FROM sui_f19 WHERE apsa_id = aps AND f19_anno = anno AND f19_mes = mes;
     DELETE FROM sui_f23 WHERE apsa_id = aps AND f23_anno = anno AND f23_mes = mes;
     DELETE FROM sui_f24 WHERE apsa_id = aps AND f24_anno = anno AND f24_mes = mes;
     DELETE FROM sui_f35 WHERE apsa_id = aps AND f35_anno = anno AND f35_mes = mes;
     DELETE FROM sui_f36 WHERE apsa_id = aps AND f36_anno = anno AND f36_mes = mes;
     DELETE FROM sui_estado WHERE apsid = aps AND estanno = anno AND estmes = mes;
     
  --resulCHR := PK_SUI.fsui_fejecutasui(aps,anno,mes,usuario);
   
  COMMIT;
  
  RETURN resulCHR;

END;

END PK_REVERSION;
```

## matriz_auth_rutas

| Endpoint | Middleware | Identidad usada | Sin token |
|---|---|---|---|
| `POST /setReversion` | `[authJwt.verificarToken]` | `req.SISU_ID` (bind `usuario`) | `403` (`No existe token de verificacion`) |
| `GET /getReversion` | `[authJwt.verificarToken]` | No usa `req.SISU_ID` en SQL, pero ruta protegida | `403` (`No existe token de verificacion`) |

## dependencias_cross_modulo

- `validaciones` (**fase 2**) actúa como gate previo desde UI (`verificacion_reversiones`).
- `suministros` (**fase 3**) ejecuta reversión destructiva y expone histórico.

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.AUCO_REVERSIONES`: `validado`
- `TARIFICADOR.PK_REVERSION` (spec): `validado`
- `TARIFICADOR.PK_REVERSION` (body): `validado`
- Tablas internas tocadas por `PK_REVERSION`: `referenced/pendiente_validacion`

### ddl_recibido

#### `TARIFICADOR.AUCO_REVERSIONES`
- estado: `validado`
```sql
CREATE TABLE "TARIFICADOR"."AUCO_REVERSIONES" 
   ( "REVE_ID" NUMBER NOT NULL ENABLE, 
  "APSA_ID" NUMBER NOT NULL ENABLE, 
  "REVE_ANNO" NUMBER NOT NULL ENABLE, 
  "REVE_MES" NUMBER NOT NULL ENABLE, 
  "REVE_MOTIVO" VARCHAR2(255) NOT NULL ENABLE, 
  "APSA_FECHACREACION" DATE DEFAULT sysdate, 
  "USUA_USUA" NUMBER NOT NULL ENABLE, 
  CONSTRAINT "PK_AUCO_REVERSIONES" PRIMARY KEY ("REVE_ID")
  USING INDEX PCTFREE 10 INITRANS 2 MAXTRANS 255 COMPUTE STATISTICS 
  STORAGE(INITIAL 65536 NEXT 1048576 MINEXTENTS 1 MAXEXTENTS 2147483645
  PCTINCREASE 0 FREELISTS 1 FREELIST GROUPS 1
  BUFFER_POOL DEFAULT FLASH_CACHE DEFAULT CELL_FLASH_CACHE DEFAULT)
  TABLESPACE "USERS"  ENABLE
   ) SEGMENT CREATION IMMEDIATE 
  PCTFREE 10 PCTUSED 40 INITRANS 1 MAXTRANS 255 
 NOCOMPRESS LOGGING
  STORAGE(INITIAL 65536 NEXT 1048576 MINEXTENTS 1 MAXEXTENTS 2147483645
  PCTINCREASE 0 FREELISTS 1 FREELIST GROUPS 1
  BUFFER_POOL DEFAULT FLASH_CACHE DEFAULT CELL_FLASH_CACHE DEFAULT)
  TABLESPACE "USERS" ;

COMMENT ON COLUMN TARIFICADOR.AUCO_REVERSIONES.APSA_ID IS ' APS PARA LA CUAL SE REALIZA LA REVERSION ';
COMMENT ON COLUMN TARIFICADOR.AUCO_REVERSIONES.REVE_MOTIVO IS ' MOTIVO POR EL CUAL SE REALIZA LA REVERSION ';
```

#### `TARIFICADOR.PK_REVERSION` (spec)
- estado: `validado`
```sql
CREATE OR REPLACE PACKAGE TARIFICADOR.PK_REVERSION AS
  FUNCTION fauco_reversion(aps integer, mes integer, anno integer, motivo character, usuario integer) RETURN integer;
  FUNCTION fauco_reversionsui(reversion integer, aps integer, mes integer, anno integer, usuario integer) RETURN character varying;
END PK_REVERSION;
```

### ddl_pendiente

- Tablas internas referenciadas por `PK_REVERSION` (DDL no recibido en esta fase):
  - Backup: `AUCO_REVEEMPRDIVI`, `AUCO_REVEAPSEMPRDIVI`, `AUCO_REVEAPSRELLENO`, `AUCO_REVECERTADICIONAL`, `AUCO_REVEUSUAPSEMPRDIVI`, `AUCO_REVETARIFAS`
  - SUI backup: `sui_revf19`, `sui_revf23`, `sui_revf24`, `sui_revf35`, `sui_revf36`
  - Originales borradas: `auco_infoemprdivi`, `auco_infoapsemprdivi`, `auco_tarifas`, `sui_f19`, `sui_f23`, `sui_f24`, `sui_f35`, `sui_f36`, `sui_estado`

## observado_en_codigo

- `setReversion` usa `req.SISU_ID` como usuario ejecutor del PL/SQL.
- `getReversion` excluye usuarios hardcodeados `9` y `4`.
- `Reversiones.vue` realiza validación previa vía módulo `validaciones` antes de reversar.

## pendiente_validacion

- Tablas internas tocadas por `PK_REVERSION` (~15 tablas) sin DDL recibido en esta fase.
- DDL de tablas internas tocadas por `PK_REVERSION` queda para fase posterior.

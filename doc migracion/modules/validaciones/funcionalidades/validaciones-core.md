# modulo

- nombre: `validaciones-core`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/validaciones/{routes.js,controller.js}`
  - Frontend service: `front-tarificador/src/service/Validaciones.js`
  - DB: `TARIFICADOR.PK_VALGRAL`
- limites_modulo:
  - Sólo documentación AS-IS de 7 endpoints POST y su delegación a package Oracle.
  - Sin cambios runtime, sin hardening de seguridad, sin refactor DB adapter.

## actores

- **Usuario autenticado en frontend**: dispara validaciones desde flujos de proceso.
- **Módulo reversiones/suministros**: consume validaciones como compuerta funcional.
- **API VALIDACIONES**: recibe `{aps, anno, mes}` y delega 1:1 a `PK_VALGRAL`.

## endpoints_catalog

Base: `/api/v1/validaciones`

| Método | Path | Payload | Controller | Función PK_VALGRAL | Response AS-IS | Estado |
|---|---|---|---|---|---|---|
| POST | `/certificarfauco_existarifa` | `{ aps, anno, mes }` | `fauco_existarifa` | `fauco_generasui` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| POST | `/certificarFauco_cpsuivsfact` | `{ aps, anno, mes }` | `fauco_cpsuivsfact` | `fauco_cpsuivsfact` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| POST | `/certificarFauco_cpproductividad` | `{ aps, anno, mes }` | `fauco_cpproductividad` | `fauco_cpproductividad` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| POST | `/certificarFauco_cpenero` | `{ aps, anno, mes }` | `fauco_cpenero` | `fauco_cpenero` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| POST | `/certificarFauco_integracion` | `{ aps, anno, mes }` | `fauco_integracion` | `fauco_integracion` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| POST | `/certificarfauco_existerelleno` | `{ aps, anno, mes }` | `fauco_existerelleno` | `fauco_existerelleno` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |
| POST | `/certificarfauco_existarifacert` | `{ aps, anno, mes }` | `fauco_existarifacert` | `fauco_tarifacert` | `res.status(resultado.status).send(resultado.response)` | `observado_en_codigo` |

## frontend_service_as_is

Archivo: `front-tarificador/src/service/Validaciones.js`

- Métodos observados hacia `/validaciones/*`: 7 (matching con catálogo API).
- Header enviado: `x-access-token: localStorage.getItem("jwtOken")`.
- Contrato de request observado:
  - métodos con parámetros separados: arman `{aps, anno, mes}`.
  - métodos con `data`: delegan objeto directo (mismo contrato esperado por API).
- Manejo de error observado: `AuthControl.verificarStatusCode(err)`.
- Consumo UI directo no evidenciado en este cambio: `pendiente_validacion`.

## matriz_auth_rutas

| Endpoint | Middleware aplicado en rutas | Token enviado por FE | Riesgo |
|---|---|---|---|
| 7 endpoints `/api/v1/validaciones/*` | `authJwt` **importado pero no aplicado** | Sí (`x-access-token`) | **Alto**: inconsistencia JWT, posible bypass de autorización en API |

## trazabilidad_funcional

### F-VAL-01 — Validaciones core (patrón 1:1)

- Actor → UI → API → Lógica → DB:
  - Actor de proceso (reversiones/suministros)
  - → `front-tarificador/src/service/Validaciones.js`
  - → `POST /api/v1/validaciones/*`
  - → `validaciones/controller.js` (`db.procedure` + bloque PL/SQL)
  - → `TARIFICADOR.PK_VALGRAL` (función correspondiente)
- Estado: `observado_en_codigo`.

### F-VAL-02 — Integración como gate de reversiones

- Actor → UI → API → Lógica → DB:
  - Flujo reversiones
  - → `Validaciones.verificacion_reversiones(data)`
  - → `POST /certificarFauco_integracion`
  - → `validacionesController.fauco_integracion`
  - → `PK_VALGRAL.fauco_integracion`
- Estado: `observado_en_codigo`.

### F-VAL-03 — Validación existencia tarifa usada por suministros

- Actor → UI/API interna → API → Lógica → DB:
  - Flujo suministros
  - → reutilización de check de tarifa
  - → `POST /certificarfauco_existarifa`
  - → `validacionesController.fauco_existarifa`
  - → `PK_VALGRAL.fauco_generasui` (ruta actual observada)
- Estado: `observado_en_codigo`.

## pk_valgral_documentacion

Package: `TARIFICADOR.PK_VALGRAL` (9 funciones)

| Función | Lógica AS-IS documentada | Relación endpoint | Estado |
|---|---|---|---|
| `fauco_existarifa` | Función definida en spec; relacionada a validación de existencia de tarifa. | Sin endpoint directo (la ruta usa `fauco_generasui`) | `validado` |
| `fauco_cpsuivsfact` | Verificación SUI vs facturación por APS/período. | `/certificarFauco_cpsuivsfact` | `validado` |
| `fauco_cpproductividad` | Contiene override temporal. | `/certificarFauco_cpproductividad` | `validado` |
| `fauco_cpenero` | Lógica temporal deshabilitada explícita. | `/certificarFauco_cpenero` | `validado` |
| `fauco_existerelleno` | Validación de existencia de relleno/rural. | `/certificarfauco_existerelleno` | `validado` |
| `fauco_integracion` | Valida integración tarifaria certificada + autorización en reversiones. | `/certificarFauco_integracion` | `validado` |
| `fauco_existarifacert` | Función definida en spec para existencia tarifa certificada. | Sin endpoint directo (ruta usa `fauco_tarifacert`) | `validado` |
| `fauco_tarifacert` | Validación efectiva de tarifa certificada usada por API. | `/certificarfauco_existarifacert` | `validado` |
| `fauco_generasui` | Función invocada por endpoint nombrado como existarifa. | `/certificarfauco_existarifa` | `validado` |

Notas obligatorias AS-IS:
- `fauco_cpenero`: `resulCHR := '0'; -- se debe quitar es temporal`
- `fauco_cpproductividad`: `resulCHR := 0; -- borrar colocado el 30 de julio 2024`

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.PK_VALGRAL` (spec): `validado`
- `TARIFICADOR.PK_VALGRAL` (body): `validado`

### ddl_recibido

#### Package specification (completo)
```sql
CREATE OR REPLACE PACKAGE TARIFICADOR.PK_VALGRAL AS
  FUNCTION fauco_existarifa(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_cpsuivsfact(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_cpproductividad(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_cpenero(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_existerelleno(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_integracion(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_existarifacert(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_tarifacert(aps integer, anno integer, mes integer) RETURN character varying;
  FUNCTION fauco_generasui(aps integer, anno integer, mes integer) RETURN character VARYING;
END PK_VALGRAL;
```

#### Package body (completo)
```sql
CREATE OR REPLACE PACKAGE BODY TARIFICADOR.PK_VALGRAL AS

FUNCTION fauco_existarifa(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION DE EXISTENCIA DE TARIFAS*/
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_tarifas
   WHERE apsa_id = aps AND tari_anno = anno AND tari_mes = mes;  

  IF cantINT = 0 THEN 
     resulCHR := '0';
     ELSE resulCHR := 'No se pueden modificar el valor, para el periodo seleccionado ya se calcularon tarifas... ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_cpsuivsfact(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION DONDE EL COSTO DE PODA DE FACTURACION NO SUPERE EL COSTO DE PODA SUI TECHO */
   SELECT COUNT(1) 
     INTO cantINT
     FROM (
           SELECT empr_empr, 
                  CASE WHEN cpte_valorfact > cpte_valorsui THEN 1 ELSE 0 END AS estado,
                  cpte_valorsui, cpte_valorfact
             FROM auco_podatecho 
            WHERE apsa_id = aps AND cpte_anno = anno AND cpte_mes = mes ) 
    WHERE estado = 1;

  IF cantINT = 0 THEN 
     resulCHR := '0';
     ELSE resulCHR := 'No se pueden calcular tarifas, el costo de poda de facturación ingresado para el periodo es mayor al costo de poda techo para SUI (verificar...) ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_cpproductividad(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
  prodINT       integer := 0;    
BEGIN
/*VALIDACION QUE SI HAY UNA PRODUCTIVIDAD INGRESADA EN EL PERIODO EL COSTO DE PODA TECHO NO DEBE SER IGUAL AL DEL MES INMEDIATAMENTE ANTERIOR ... */
   SELECT COUNT(1)
     INTO prodINT
     FROM auco_prod2022
    WHERE apsa_id = aps AND costo20010 = 3/*CLUS*/ AND pr22_anno = anno AND pr22_mes = mes;

  IF prodINT = 0 THEN 
     resulCHR := '0';
     ELSE 
          SELECT COUNT(1) 
            INTO cantINT
            FROM (
                   SELECT CASE WHEN cpte_valorsui =   (SELECT cpte_valorsui
                                                         FROM auco_podatecho P2
                                                        WHERE P2.apsa_id = P.apsa_id AND p2.empr_empr = P.empr_empr AND P2.cpte_anno*12+P2.cpte_mes = (2023*12+8)-1
                                                      ) THEN  1 ELSE 0 END AS valor
                     FROM auco_podatecho P
                    WHERE P.apsa_id = aps AND P.cpte_anno = anno AND P.cpte_mes = mes
                 )
           WHERE valor = 1;

           IF cantINT = 0 THEN 
              resulCHR := '0';
              ELSE 
                    resulCHR := 'No se pueden calcular tarifas, En el periodo actual se encontro un valor para ajustar productividad, pero el valor del costo de poda SUI es igual al del periodo anterior (verificar...)  ';
           END IF;
  END IF;
  
  resulCHR := 0; -- borrar colocado el 30 de julio 2024

  RETURN resulCHR;
END;

FUNCTION fauco_cpenero(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION QUE EN EL PERIODO DE ENERO DE CADA AÑO EL COSTO DE PODA TECHO NO DEBE SER IGUAL AL DEL MES INMEDIATAMENTE ANTERIOR ... */
  IF mes <> 12 THEN 
     resulCHR := '0';
     ELSE 
          SELECT COUNT(1) 
            INTO cantINT
            FROM (
                   SELECT DISTINCT
                          CASE WHEN cpte_valorsui =  (SELECT cpte_valorsui
                                                         FROM auco_podatecho P2
                                                        WHERE P2.apsa_id = P.apsa_id AND p2.empr_empr = P.empr_empr AND P2.cpte_anno*12+P2.cpte_mes = (anno*12+mes)-1
                                                      ) 
                                    AND cpte_valorsui > 0 
                               THEN 1 ELSE 0 END AS valor
                     FROM auco_podatecho P
                    WHERE P.apsa_id = aps AND P.cpte_anno = anno AND P.cpte_mes = mes
                 )
           WHERE valor = 1;
resulCHR := '0'; -- se debe quitar es temporal
           IF cantINT = 0 THEN 
              resulCHR := '0';
              ELSE 
                    resulCHR := 'No se pueden calcular tarifas, En el periodo actual ENERO debe cambiar el costo de poda, pero el valor del CP SUI es igual al del periodo anterior (verificar...)  ';
           END IF;
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_existerelleno(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION DE EXISTENCIA DE RELLENO*/
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_apsrelleno 
   WHERE apsa_id = aps AND apre_propio = 1;     

  IF cantINT = 0 THEN 
     resulCHR := '0';
     ELSE resulCHR := '0';-- SE QUITA PARA EVITAR MOSTRAR EL TAB DE RURAL EN EL CARGUE SEMESTRAL '1';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_integracion(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;   
  autoINT       integer := 0;
BEGIN
/*VALIDACION DE EXISTENCIA DE UNA INTEGRACION CON EL SISTEMA DE FACTURACION */
  SELECT COUNT(1)
    INTO cantINT
    FROM AUCO_TARICERTIFICADA 
   WHERE apsa_id = aps AND tace_mes = mes AND tace_anno = anno 
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

FUNCTION fauco_existarifacert(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION DE EXISTENCIA DE TARIFAS CERTIFICADAS PARA INTEGRACION CON EL SISTEMA COMERCIAL */
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_taricertificada
   WHERE apsa_id = aps AND tace_anno = anno AND tace_mes = mes;  

  IF cantINT = 1 THEN 
     resulCHR := '0';
     ELSE resulCHR := 'No se pueden realizar la integración con las tarifas solicitadas, para el periodo seleccionado no se han CERTIFICADO tarifas... ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_tarifacert(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION DE EXISTENCIA DE TARIFAS CERTIFICADAS PARA IMPEDIR VOLVER A CERTIFICAR */
  SELECT COUNT(1)
    INTO cantINT
    FROM auco_taricertificada
   WHERE apsa_id = aps AND tace_anno = anno AND tace_mes = mes;  

  IF cantINT = 0 THEN 
     resulCHR := '0';
     ELSE resulCHR := 'No se pueden realizar la CERTIFICACIÓN, para el periodo seleccionado ya han sido certificadas las tarifas previamente... ';
  END IF;

  RETURN resulCHR;
END;

FUNCTION fauco_generasui(aps integer, anno integer, mes integer) RETURN 
  character varying IS   
  resulCHR      varchar2(500);
  cantINT       integer := 0;    
BEGIN
/*VALIDACION DE EXISTENCIA DE TARIFAS*/
  IF aps = 1031 /*si es san pedro*/ THEN 
     SELECT COUNT(1) 
       INTO cantINT
       FROM AUCO_COSTOSAPSRELLENO ac 
      WHERE ac.APSA_ID = aps AND ac.COST_ANNO = anno AND ac.COST_MES = mes;  
  
  	  ELSE 
  	      SELECT COUNT(1)
		    INTO cantINT
		    FROM auco_tarifas
		   WHERE apsa_id = aps AND tari_anno = anno AND tari_mes = mes;

  END IF;

  IF cantINT > 0 THEN 
     resulCHR := '1';
     ELSE resulCHR := 'No se han calculado las tarifas, para el periodo seleccionado ... ';
  END IF;

  RETURN resulCHR;
END;

END PK_VALGRAL;
```

### ddl_pendiente
- Sin pendientes DDL para este alcance (`validado`).

## gaps_y_riesgos_as_is

1. **JWT inconsistente (seguridad)**
   - observado_en_codigo: `authJwt` se importa en `routes.js` pero no se aplica a ningún endpoint.
   - impacto: riesgo alto de bypass de autorización.

2. **Mismatch `db.procedure`**
   - observado_en_codigo: `validaciones/controller.js` invoca `db.procedure(...)`.
   - observado_en_codigo: `back-tarificador/src/database/database.js` expone `open` y `executeMany`.
   - estado: `pendiente_validacion` (confirmación runtime fuera de alcance documental).

3. **Overrides temporales en package**
   - `fauco_cpenero` y `fauco_cpproductividad` con lógica temporal explícita.
   - estado: `observado_en_codigo` (DDL recibido).

## dependencias_cross_modulo

- `reversiones`:
  - consume `fauco_integracion` para habilitar continuidad de flujo.
- `suministros`:
  - reutiliza validación de existencia de tarifa (`fauco_existarifa` a nivel negocio; endpoint actual mapea a `fauco_generasui`).

## observado_en_codigo

- Todos los endpoints del módulo son `POST`.
- Todos reciben `{aps, anno, mes}` desde `req.body`.
- Patrón uniforme: bloque PL/SQL `BEGIN :res := PK_VALGRAL.<func>(:1,:2,:3); END;` y retorno string.

## pendiente_validacion

- Disponibilidad real de `db.procedure` en runtime actual.
- Consumidores UI directos fuera del service `Validaciones.js`.
- **Tabla de mapeo endpoint nominal vs función real invocada**: Se documenta en `endpoints_catalog` pero se sugiere tabla explícita resumen para lectura rápida (ej. `certificarfauco_existarifa` → `fauco_generasui`).

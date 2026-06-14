# modulo

- nombre: `sui-reversiones-core`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/sui/{routes.js,controller.js}`
  - Frontend: `front-tarificador/src/views/sui/ReversionesSui.vue`, `front-tarificador/src/service/SuiService.js`, `front-tarificador/src/components/TableReversionesAps/Formato{19,23,24,35,36}.vue`
  - DB: `sui_revf19`, `sui_revf23`, `sui_revf24`, `sui_revf35`, `sui_revf36`
- limites_modulo:
  - Solo consulta read-only por `aps` sobre 5 formatos.
  - Sin cambios runtime; fase documental AS-IS.

## actores

- **Usuario autenticado en frontend**: selecciona APS y visualiza reportes de reversión por formato.
- **API SUI**: recibe APS, consulta tabla por formato y retorna filas sin mutación de estado.

## funcionalidades

### F-SUI-REV-01 — Consulta read-only por patrón único (5 endpoints)

- patrón funcional compartido:
  1. `ReversionesSui.vue` toma `stapsSeleccionado`.
  2. `SuiService.js` invoca `getReversionesF19/F23/F24/F35/F36`.
  3. Backend recibe `POST /sui/reversionesFXX` con body `{ aps }`.
  4. `controller.js` ejecuta `SELECT * FROM sui_revfXX WHERE APSA_ID = :1`.
  5. Responde `res.send(resultado)`.
  6. Frontend renderiza dataset en `FormatoXX.vue` correspondiente.
- estado: `implementado_as_is`

### Agrupación de endpoints por patrón

#### Patrón A — Contrato HTTP/entrada/salida (idéntico en 5 endpoints)
- método: `POST`
- body: `{ "aps": <number|string> }`
- response: `res.send(resultado)`
- side effects: ninguno

#### Patrón B — Resolución backend (idéntico, cambia solo tabla destino)
- bind único: `:1 = aps`
- SQL base: `SELECT * FROM sui_revfXX WHERE APSA_ID = :1`

#### Patrón C — Render frontend por componente de formato
- `F19 -> Formato19.vue`
- `F23 -> Formato23.vue`
- `F24 -> Formato24.vue`
- `F35 -> Formato35.vue`
- `F36 -> Formato36.vue`

## endpoints_catalog

Base: `/sui`

| Método | Path | Auth backend | SQL | Tabla |
|---|---|---|---|---|
| POST | `/reversionesF19` | No `authJwt` | `SELECT * FROM sui_revf19 WHERE APSA_ID = :1` | `sui_revf19` |
| POST | `/reversionesF23` | No `authJwt` | `SELECT * FROM sui_revf23 WHERE APSA_ID = :1` | `sui_revf23` |
| POST | `/reversionesF24` | No `authJwt` | `SELECT * FROM sui_revf24 WHERE APSA_ID = :1` | `sui_revf24` |
| POST | `/reversionesF35` | No `authJwt` | `SELECT * FROM sui_revf35 WHERE APSA_ID = :1` | `sui_revf35` |
| POST | `/reversionesF36` | No `authJwt` | `SELECT * FROM sui_revf36 WHERE APSA_ID = :1` | `sui_revf36` |

## matriz_auth_rutas

| Capa | Evidencia AS-IS | Estado |
|---|---|---|
| Frontend (`SuiService.js`) | Envío de header `x-access-token` en requests | Autenticación de sesión app |
| Backend rutas `/sui/reversionesF*` | Rutas sin `[authJwt.verificarToken]` | **Sin authJwt** |
| Capacidad de negocio | Solo consulta (`SELECT`) | Read-only |

## trazabilidad_actor_ui_api_logica_db

- Actor autenticado → `ReversionesSui.vue#actualizaInfoGeneral`
- → `SuiService.getReversionesF19/F23/F24/F35/F36`
- → `POST /sui/reversionesF19|F23|F24|F35|F36`
- → `suicontroller.reversionesF19|F23|F24|F35|F36`
- → `sui_revf19|sui_revf23|sui_revf24|sui_revf35|sui_revf36`
- → render `TableReversionesAps/Formato19|23|24|35|36.vue`

## dependencia_cross_modulo

- Dependencia explícita: `suministros`.
- Origen de datos: `PK_REVISION.fauco_reversionsui` (carga upstream de tablas `sui_revfXX`).
- Este módulo **no** crea ni actualiza registros; solo consulta.

## registro_ddl_modulo

### resumen_estado
- `sui_revf19`: `validado`
- `sui_revf23`: `validado`
- `sui_revf24`: `validado`
- `sui_revf35`: `validado`
- `sui_revf36`: `validado`

### ddl_recibido (fase 4, validado)

> Nota: en este artefacto se registra el estado DDL validado y la relación contractual endpoint→tabla. La definición completa de columnas se mantiene en el repositorio fuente de DDL de base de datos.

#### `sui_revf19` (TABLA)
- estado: `validado`
```sql
-- DDL validado en fase 4 (fuente externa de esquema Oracle)
CREATE TABLE sui_revf19 ( ... );
```

#### `sui_revf23` (TABLA)
- estado: `validado`
```sql
-- DDL validado en fase 4 (fuente externa de esquema Oracle)
CREATE TABLE sui_revf23 ( ... );
```

#### `sui_revf24` (TABLA)
- estado: `validado`
```sql
-- DDL validado en fase 4 (fuente externa de esquema Oracle)
CREATE TABLE sui_revf24 ( ... );
```

#### `sui_revf35` (TABLA)
- estado: `validado`
```sql
-- DDL validado en fase 4 (fuente externa de esquema Oracle)
CREATE TABLE sui_revf35 ( ... );
```

#### `sui_revf36` (TABLA)
- estado: `validado`
```sql
-- DDL validado en fase 4 (fuente externa de esquema Oracle)
CREATE TABLE sui_revf36 ( ... );
```

## plan_pruebas_r

- `R1`: enviar APS válido a cada endpoint `reversionesF*` → devuelve filas del formato.
- `R2`: enviar APS válido sin datos en tabla destino → devuelve colección vacía.
- `R3`: validar que endpoints no ejecutan DML (`INSERT/UPDATE/DELETE`) y mantienen semántica read-only.
- `R4`: validar aislamiento por formato (falla en un formato no altera datasets de otros).

## definicion_de_cierre

- Endpoints documentados: 5/5.
- Trazabilidad Actor → UI → API → Lógica → DB: 5/5.
- Matriz auth explícita con inconsistencia backend (`sin authJwt`): 5/5.
- DDL de 5 tablas marcado como `validado`: 5/5.

## desviaciones_formales

- Ninguna desviación funcional respecto a `sdd/sui-reversiones/spec` y `sdd/sui-reversiones/design`.

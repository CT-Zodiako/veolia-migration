# modulo

- nombre: `aps-permisos`
- owner: `pendiente_validacion`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/auth/{routes.js,controller.js}`
  - Frontend: `front-tarificador/src/views/configuracion/Usuarios.vue`, `front-tarificador/src/components/usuarios/ApsxUsuario.vue`, `front-tarificador/src/service/AuthService.js`
  - DB: `TARIFICADOR.AUCO_APSASEO`, `TARIFICADOR.AUCO_APSUSUARIOS`

## actores

- **Administrador de usuarios**: gestiona asignación APS por usuario desde la pestaña `Permisos x APS`.
- **Usuario objetivo de asignación**: entidad seleccionada en `UsuarioDD` sobre la que se aplican altas/bajas de APS.

## funcionalidades

### F-APS-PERM-01 — Obtener APS asignadas por usuario

- flujo:
  1. Admin ingresa a `views/configuracion/Usuarios.vue` y abre tab **Permisos x APS**.
  2. `ApsxUsuario.vue` renderiza `UsuarioDD.vue`; `UsuarioDD` carga usuarios vía `AuthService.getAllUsers()`.
  3. Al seleccionar un usuario, `ApsxUsuario.usuarioSeleccionado` ejecuta `ConsultarData(SISU_ID)`.
  4. FE invoca `POST /api/v1/auth/getApsAsignadas` con body `{ id: SISU_ID }`.
  5. Backend (`auth/controller.getApsAsignadas`) ejecuta dos consultas:
     - APS asignadas activas (`JOIN AUCO_APSASEO + AUCO_APSUSUARIOS`, `APSI_ESTADO = 1`, `APSA_ESTADO = 1`).
     - APS activas sin asignar (`NOT IN AUCO_APSUSUARIOS` activas del usuario).
  6. FE recibe objeto `{ asignadas, sinAsignar }` y arma `PickList` como `[sinAsignar, asignadas]`.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Admin usuarios → `views/configuracion/Usuarios.vue`, `components/usuarios/{UsuarioDD.vue,ApsxUsuario.vue}` → `POST /api/v1/auth/getApsAsignadas` → `auth/controller.getApsAsignadas` → `AUCO_APSASEO` + `AUCO_APSUSUARIOS`
- estado: `implementado_as_is`

### F-APS-PERM-02 — Persistir APS por usuario

- flujo:
  1. Admin mueve elementos entre listas de `PickList` en `ApsxUsuario.vue`.
  2. Al pulsar **Actualizar Asignacion de APS**, FE calcula:
     - `apsAsignadas = listaAps[1].map(APSA_ID)`
     - `apsSinAsignar = listaAps[0].map(APSA_ID)`
  3. FE invoca `AuthService.setApsxUsuario(usuario, apsAsignadas, apsSinAsignar, toast)`.
  4. Servicio FE traduce payload a `{ id, outAps: apsSinAsignar, inAps: apsAsignadas }` y llama `POST /api/v1/auth/setApsxUsuario`.
  5. Backend (`auth/controller.setApsxUsuario`) ejecuta:
     - `UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = 0` para cada `outAps`.
     - `UPDATE AUCO_APSUSUARIOS SET APSI_ESTADO = 1` para cada `inAps`.
     - `SELECT APSA_ID FROM AUCO_APSUSUARIOS WHERE SISU_ID = :1` y `INSERT` para APS de `inAps` inexistentes.
  6. FE no consume payload de respuesta; muestra toast de éxito luego del `await`.
- trazabilidad (Actor → UI → API → Lógica → DB):
  - Admin usuarios → `components/usuarios/ApsxUsuario.vue`, `service/AuthService.js#setApsxUsuario` → `POST /api/v1/auth/setApsxUsuario` → `auth/controller.setApsxUsuario` → `AUCO_APSUSUARIOS`
- estado: `implementado_as_is` (con observaciones en `pendiente_validacion`)

## dependencias_cruzadas

- owner_funcional: `auth`
- modulo_que_consumen_catalogo_aps:
  - `docs/modulos/aps/funcionalidades/aps-configuracion.md` (catálogo APS base y selector transversal)
- contrato_compartido_aps_auth:
  - Objetos DB compartidos: `TARIFICADOR.AUCO_APSASEO`, `TARIFICADOR.AUCO_APSUSUARIOS`
  - Token/middleware: ambos endpoints usan `authJwt.verificarToken` en `auth/routes.js`
- limite_con_sui853:
  - No hay endpoint Auth consumido por `aps-sui853`; la integración es solo por dominio APS (no por ruta/API directa observada)

## endpoints_catalog

Base: `/api/v1/auth`

| Método | Path | Auth requerida | Request ejemplo | Response OK ejemplo | Errores esperados | Observaciones AS-IS |
|---|---|---|---|---|---|---|
| POST | `/getApsAsignadas` | Sí (`authJwt.verificarToken`) | `{ "id": 35 }` | `{ "asignadas": [...], "sinAsignar": [...] }` | `401/403` por middleware; en error de controlador retorna `err` | `asignadas` y `sinAsignar` se usan directo en `ApsxUsuario.ConsultarData` |
| POST | `/setApsxUsuario` | Sí (`authJwt.verificarToken`) | `{ "id": 35, "outAps": [3,7], "inAps": [2,9] }` | FE solo observa promesa resuelta (toast éxito); `res.send(response)` en ruta | `401/403` por middleware; `catch` retorna `err` | En éxito no hay contrato explícito de payload consumido por FE |

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.AUCO_APSASEO`: `validado`
- `TARIFICADOR.AUCO_APSUSUARIOS`: `validado`

### ddl_recibido
- Sin nuevos scripts en esta faceta; se reutiliza evidencia DDL validada en documentación Auth base.

### ddl_validado

#### TARIFICADOR.AUCO_APSASEO
- estado: `validado`
- fuente: `docs/modulos/auth/funcionalidades/auth-core.md` (bloque `registro_ddl_modulo`)

#### TARIFICADOR.AUCO_APSUSUARIOS
- estado: `validado`
- fuente: `docs/modulos/auth/funcionalidades/auth-core.md` (bloque `registro_ddl_modulo`)

### ddl_pendiente
- `sin_pendientes_nuevos_en_esta_faceta`

## observado_en_codigo

- `Usuarios.vue` expone tab **Permisos x APS** que monta `ApsxUsuario`.
- `UsuarioDD.vue` obtiene usuarios desde `auth/getAllUsers` y emite `usuarioSeleccionado`.
- `ApsxUsuario` usa `PickList` con source=`sinAsignar` y target=`asignadas`.
- `AuthService.getApsAsignadas` y `AuthService.setApsxUsuario` envían `x-access-token`.
- `auth/routes.js` protege `/getApsAsignadas` y `/setApsxUsuario` con `authJwt.verificarToken`.
- `auth/controller.setApsxUsuario` implementa patrón desactivar/reactivar/insertar sobre `AUCO_APSUSUARIOS`.

## pendiente_validacion

- `auth/controller.setApsxUsuario` no retorna payload explícito en camino exitoso; la ruta hace `res.send(response)` con valor potencialmente `undefined`.
- La operación de actualización/inserción de APS por usuario se ejecuta en múltiples sentencias sin transacción explícita observada en este controlador.

## validacion_cruzada_facetas

| Eje | Faceta origen | Faceta contraste | Resultado | Evidencia |
|---|---|---|---|---|
| APS↔Auth objetos compartidos | `aps-permisos` (`AUCO_APSASEO`, `AUCO_APSUSUARIOS`) | `aps-configuracion` | `consistente` | Ambos documentos reportan los mismos objetos y estado `validado` para AUCO_* |
| Endpoint ownership | `auth/getApsAsignadas`, `auth/setApsxUsuario` | `aps-configuracion` | `consistente` | `aps-configuracion` no reclama ownership de rutas Auth; solo referencia consumo APS transversal |
| Límite APS↔SUI | `aps-permisos` | `aps-sui853` | `consistente` | `aps-sui853` no consume endpoints Auth; usa `sui853Configuracion/*` |
| Política de riesgos | `pendiente_validacion` | 3 facetas | `consistente` | Cada faceta separa riesgos/ambigüedades del bloque observado |

## checkpoints_g1_g5

| Gate | Estado | Evidencia observada |
|---|---|---|
| G1 Trazabilidad completa | `cumple` | F-APS-PERM-01 y F-APS-PERM-02 incluyen Actor → UI → API → Lógica → DB |
| G2 Evidencia verificable | `cumple` | Referencias explícitas a `Usuarios.vue`, `ApsxUsuario.vue`, `AuthService.js`, `auth/{routes,controller}.js` |
| G3 DDL en archivo | `cumple` | `registro_ddl_modulo` presente con estado por objeto (`validado`) |
| G4 Riesgos aislados | `cumple` | Riesgos y ambigüedades registrados en `pendiente_validacion` |
| G5 Dependencias explícitas | `cumple` | `dependencias_cruzadas` + `validacion_cruzada_facetas` documentan límites APS/Auth/SUI |

## checklist_dod_fase1

- [x] Paridad funcional AS-IS documentada sin inferencias
- [x] Trazabilidad completa Actor → UI → API → Lógica → DB
- [x] Estado DDL registrado en el mismo archivo (`pendiente/recibido/validado`)
- [x] Riesgos y ambigüedades aislados en `pendiente_validacion`
- [x] Dependencias APS↔Auth↔SUI explicitadas y consistentes
- [x] Gates G1–G5 en estado `cumple`

**handoff_siguiente_fase**: `sdd-verify` sobre migración APS AS-IS (validación final contra spec/design/tasks).

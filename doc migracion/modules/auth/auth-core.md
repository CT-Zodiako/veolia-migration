# modulo

- nombre: `auth-core`
- alcance_as_is:
  - Backend: `back-tarificador/src/modules/auth/{routes.js,controller.js}`
  - Middlewares dependientes: `back-tarificador/src/middlewares/{authJwt.js,verificaUserRegistrado.js}`
  - Frontend: `front-tarificador/src/service/AuthService.js` + vistas/componentes de autenticación y gestión de usuarios.
  - Base URL backend observada: `http://10.162.10.91:4000/api/v1/` (`front-tarificador/src/service/BackendTarificadorConsumerService.js`).

# actores

- **Usuario no autenticado**: accede a `/login`, consulta sistemas por correo y ejecuta login.
- **Usuario autenticado**: consume endpoints protegidos con `x-access-token` (logout, menú, cambio de clave, etc.).
- **Administrador/operador de usuarios**: usa el panel `/usuarios` para alta/edición, reset de clave y asignaciones (APS, sistemas, menú).

# funcionalidades

## F-AUTH-01 — Inicio de sesión y selección de sistema

- **flujo**:
  1. En `views/Auth/Login.vue`, al escribir correo se dispara `getSistemas()` (watch de `email`) y consulta sistemas por correo.
  2. Usuario envía correo + clave + sistema con `getLogin()`.
  3. Si login OK, guarda token en `localStorage["jwtOken"]` y redirige a `/`.
- **frontend**:
  - `front-tarificador/src/views/Auth/Login.vue`
  - `front-tarificador/src/service/AuthService.js` (`getSistema`, `getLogin`)
  - `front-tarificador/src/router/index.js` (guard con `meta.requiresAuth` + `jwtOken`)
- **backend**:
  - `GET /api/v1/auth/getSistemasByCorreo`
  - `POST /api/v1/auth/login`
- **db**:
  - `AUGE_SISUSUARIO` (lookup por correo / validación de estado)
  - `AUGE_USUASISTEMA`, `AUGE_SISTEMA` (sistemas asignados)
- **trazabilidad**:
  - `Login.vue:127-135` -> `AuthService.getSistema()` -> `routes.js:63-68` -> `controller.js:38-67`
  - `Login.vue:83-110` -> `AuthService.getLogin()` -> `routes.js:50-56` -> `controller.js:69-119`
- **estado**: implementado_as_is

## F-AUTH-02 — Cierre de sesión por token muerto

- **flujo**:
  1. En perfil (`AppProfile.vue`) se ejecuta `getLogout()`.
  2. Backend inserta token en `AUGE_DEADTOKEN`.
  3. Middleware `authJwt` bloquea tokens presentes en esa tabla.
- **frontend**:
  - `front-tarificador/src/components/layout/AppProfile.vue`
  - `front-tarificador/src/service/AuthService.js` (`getLogout`)
- **backend**:
  - `POST /api/v1/auth/logout` (protegido)
  - dependencia: `middlewares/authJwt.js` (lectura de token y validación JWT + dead token)
- **db**:
  - `AUGE_DEADTOKEN`, `SAUGE_DEADTOKEN`
- **trazabilidad**:
  - `AppProfile.vue:56-60` -> `AuthService.getLogout()` -> `routes.js:70-77` -> `controller.js:121-125`
  - Validación posterior: `authJwt.js:17-35`
- **estado**: implementado_as_is

## F-AUTH-03 — Construcción de menú por permisos de usuario

- **flujo**:
  1. `MenuService` pide menú permitido con token (`getUserMenu`).
  2. Backend devuelve IDs de menú activos por usuario/sistema.
  3. Front filtra el menú estático y renderiza solo opciones autorizadas.
- **frontend**:
  - `front-tarificador/src/service/MenuService.js`
  - `front-tarificador/src/service/AuthService.js` (`getUserMenu`)
- **backend**:
  - `POST /api/v1/auth/getUserMenu` (protegido)
- **db**:
  - `AUGE_USUAMENU`, `AUGE_MENU`
- **trazabilidad**:
  - `MenuService.js:654-656` -> `AuthService.getUserMenu()` -> `routes.js:79-84` -> `controller.js:127-140`
- **estado**: implementado_as_is

## F-AUTH-04 — Cambio de clave del usuario autenticado

- **flujo**:
  1. Vista `/cambiarclave` valida campos y confirmación.
  2. Envía `oldPass/newPass/confirmPass` con token.
  3. Backend valida clave actual, actualiza hash y responde estado.
- **frontend**:
  - `front-tarificador/src/views/Auth/ChangePass.vue`
  - `front-tarificador/src/service/AuthService.js` (`changePass`)
- **backend**:
  - `POST /api/v1/auth/setChangePass` (protegido)
- **db**:
  - `AUGE_SISUSUARIO`
- **trazabilidad**:
  - `ChangePass.vue:80-113` -> `AuthService.changePass()` -> `routes.js:96-107` -> `controller.js:157-218`
- **estado**: implementado_as_is

## F-AUTH-05 — Gestión CRUD básica de usuarios

- **flujo**:
  - Listar usuarios, crear usuario, editar usuario, consultar usuario por ID y reset de clave.
  - Duplicados de correo se bloquean por middleware `checkUsuarioDuplicado`.
- **frontend**:
  - `front-tarificador/src/views/configuracion/Usuarios.vue`
  - `components/usuarios/{GestionUsuarios.vue,formUsr.vue,UsuarioDD.vue}`
  - `service/AuthService.js` (`getAllUsers`, `newUser`, `uptUser`, `getUserbyId`, `resetPass`)
- **backend**:
  - `GET /api/v1/auth/getAllUsers` (protegido)
  - `POST /api/v1/auth/registro` (con `checkUsuarioDuplicado`)
  - `POST /api/v1/auth/updateUsuario` (protegido + `checkUsuarioDuplicado`)
  - `POST /api/v1/auth/getUserbyId` (protegido)
  - `POST /api/v1/auth/resetPass` (protegido)
- **db**:
  - `AUGE_SISUSUARIO`, `SAUGE_SISUSUARIO`
- **trazabilidad**:
  - `GestionUsuarios.vue:185-206`
  - `formUsr.vue:187-219`
  - rutas/controlador: `routes.js:18-48,109-124` + `controller.js:10-26,220-251,232-240`
- **estado**: implementado_as_is

## F-AUTH-06 — Asignación de APS por usuario

- **flujo**:
  1. Seleccionar usuario.
  2. Cargar APS asignadas/no asignadas.
  3. Guardar cambios en relación usuario-APS.
- **frontend**:
  - `components/usuarios/ApsxUsuario.vue`
  - `service/AuthService.js` (`getApsAsignadas`, `setApsxUsuario`)
- **backend**:
  - `POST /api/v1/auth/getApsAsignadas` (protegido)
  - `POST /api/v1/auth/setApsxUsuario` (protegido)
- **db**:
  - `AUCO_APSASEO`, `AUCO_APSUSUARIOS`
- **trazabilidad**:
  - `ApsxUsuario.vue:47-70` -> `routes.js:126-135` -> `controller.js:253-400,361-400`
- **estado**: implementado_as_is

## F-AUTH-07 — Asignación de sistemas por usuario

- **flujo**:
  1. Seleccionar usuario (por correo).
  2. Cargar sistemas asignados/no asignados.
  3. Confirmar asignación/desasignación.
- **frontend**:
  - `components/usuarios/AsignacionSistema.vue`
  - `service/AuthService.js` (`getSistemasAsignados`, `setSistemaUsuario`)
- **backend**:
  - `POST /api/v1/auth/getSistemasPorUsuario` (**sin middleware auth en ruta**)
  - `POST /api/v1/auth/asignarSistema` (**sin middleware auth en ruta**)
- **db**:
  - `AUGE_SISUSUARIO`, `AUGE_SISTEMA`, `AUGE_USUASISTEMA`
- **trazabilidad**:
  - `AsignacionSistema.vue:46-70` -> `routes.js:137-145` -> `controller.js:403-508`
- **estado**: implementado_as_is

## F-AUTH-08 — Asignación de opciones de menú por usuario/sistema

- **flujo**:
  1. Cargar árbol general de menú.
  2. Consultar opciones actuales por usuario+sistema.
  3. Guardar selección.
- **frontend**:
  - `components/usuarios/MenuxUsuario.vue`
  - `components/usuarios/SistemasDD.vue`
  - `service/AuthService.js` (`getAllSistemas`, `getGeneralMenuTree`, `getMenuUserOptions`, `uptUserMenu`)
- **backend**:
  - `GET /api/v1/auth/allSistemas`
  - `POST /api/v1/auth/getGeneralMenuTree` (protegido)
  - `POST /api/v1/auth/getMenuByUser` (**sin middleware auth en ruta**)
  - `POST /api/v1/auth/uptUserMenu` (protegido)
  - endpoint adicional no consumido en FE: `POST /api/v1/auth/getMenuUserOptions` (protegido)
- **db**:
  - `AUGE_SISTEMA`, `AUGE_MENU`, `AUGE_USUAMENU`, `SEQUENCE SAUGE_USUAMENU`
- **trazabilidad**:
  - `SistemasDD.vue:30-33` -> `/auth/allSistemas`
  - `MenuxUsuario.vue:66-83,106-110` -> `/auth/getGeneralMenuTree`, `/auth/getMenuByUser`, `/auth/uptUserMenu`
  - rutas/controlador: `routes.js:58-62,85-89,91-94,148-158` + `controller.js:28-36,141-155,273-356,289-324`
- **estado**: implementado_as_is

# endpoints_catalog

Base: `/api/v1/auth`

| Método | Path | Auth requerida | Entradas | Respuesta AS-IS (shape + status) | Evidencia |
|---|---|---|---|---|---|
| POST | `/registro` | No token; valida duplicado correo | Body `{nombre, apellido, correo, password, estado}` | `res.send(resultado)` (default 200). En duplicado: `400 {message}` desde middleware | `routes.js:18-32`, `verificaUserRegistrado.js:5-24`, `controller.js:10-26` |
| POST | `/updateUsuario` | `x-access-token` + valida duplicado correo | Body `{id, nombre, apellido, correo, estado}` | `res.send(resultado)` (default 200). 400 por duplicado, 401/403 por token | `routes.js:34-48`, `authJwt.js:7-37`, `controller.js:232-240` |
| POST | `/login` | No | Body `{correo, pass, idSistema}` | `status 200 {status,message,usuario,auth_token,sistema}` / `401 {status,message}` / `404 {status,message}` | `routes.js:50-56`, `controller.js:69-119` |
| GET | `/allSistemas` | No | Sin body | `status 200` + array de sistemas (campos `SIST_ID`, `SIST_NOMBRE`) | `routes.js:58-62`, `controller.js:28-36` |
| GET | `/getSistemasByCorreo` | No | Query `correo` | `status 200` + array sistemas; error `500 {status,response:error}` | `routes.js:63-68`, `controller.js:38-67` |
| POST | `/logout` | `x-access-token` | Header token, usa `req.SISU_ID` del JWT | `res.send(resultado)` (default 200, típicamente `{rowsAffected}`) | `routes.js:70-77`, `controller.js:121-125` |
| POST | `/getUserMenu` | `x-access-token` | Sin body; usa `req.SISU_ID` y `req.idSistema` | `res.send(resultado)` (default 200), array de objetos con `MENU_ID` | `routes.js:79-84`, `controller.js:127-140` |
| POST | `/getMenuByUser` | **No middleware en ruta** | Body `{idSistema, sisuId}` | `res.send(resultado)` (default 200), array de IDs numéricos | `routes.js:85-89`, `controller.js:141-155` |
| POST | `/getGeneralMenuTree` | `x-access-token` | Sin body | `res.send(arbol)` (default 200), nodos `{id,label,children?}` | `routes.js:91-94`, `controller.js:326-359` |
| POST | `/setChangePass` | `x-access-token` | Body `{oldPass,newPass,confirmPass}` | `status 200/403/500` con `{status,response,msg}`; + 401/403 middleware | `routes.js:96-107`, `controller.js:157-218` |
| GET | `/getAllUsers` | `x-access-token` | Sin body | `res.send(resultado)` (default 200), array de usuarios | `routes.js:109-112`, `controller.js:220-224` |
| POST | `/getUserbyId` | `x-access-token` | Body `{id}` | `res.send(resultado)` (default 200), array (normalmente 1 fila) | `routes.js:114-118`, `controller.js:226-230` |
| POST | `/resetPass` | `x-access-token` | Body `{id}` | `res.send(newPass)` (default 200), string plano de nueva clave | `routes.js:120-124`, `controller.js:242-251` |
| POST | `/getApsAsignadas` | `x-access-token` | Body `{id}` | `res.send({asignadas,sinAsignar})` (default 200) | `routes.js:126-130`, `controller.js:253-271` |
| POST | `/setApsxUsuario` | `x-access-token` | Body `{id,outAps,inAps}` | `res.send(response)` pero controlador no retorna éxito explícito (puede enviar vacío/undefined) | `routes.js:132-135`, `controller.js:361-400` |
| POST | `/getSistemasPorUsuario` | **No middleware en ruta** | Body libre; controlador usa `data.correo` | `res.send({asignados,sinAsignar})` (default 200) | `routes.js:137-140`, `controller.js:437-508` |
| POST | `/asignarSistema` | **No middleware en ruta** | Body `{sisuId,asignados,noAsignados}` | `res.send({status:200,message})` (default 200 en route) | `routes.js:142-145`, `controller.js:403-436` |
| POST | `/getMenuUserOptions` | `x-access-token` | Body `{id}` | `res.send(array<MenuId>)` (default 200) | `routes.js:148-152`, `controller.js:273-287` |
| POST | `/uptUserMenu` | `x-access-token` | Body `{id,options,sistema}` | `res.send(response)` (default 200), usualmente `{rowsAffected}` de la última operación DML | `routes.js:154-158`, `controller.js:289-324` |

**Contrato de autenticación (middleware común):**
- Header requerido en rutas protegidas: `x-access-token`.
- Si falta token: `403 { message: "No existe token de verificacion" }`.
- Si token inválido o ya registrado en `AUGE_DEADTOKEN`: `401 { message: "No Autorizado!" }`.
- Evidencia: `back-tarificador/src/middlewares/authJwt.js:7-37`.

# pendientes_ddl

Estado actualizado con DDL provisto por responsable funcional (sesión actual):

- ✅ `TARIFICADOR.AUGE_SISTEMA` (DDL recibido y validado documentalmente)
- ✅ `TARIFICADOR.AUGE_USUASISTEMA` (DDL recibido y validado documentalmente)
- ✅ `TARIFICADOR.AUGE_USUAMENU` (DDL recibido y validado documentalmente)
- ✅ `TARIFICADOR.AUGE_MENU` (DDL recibido y validado documentalmente)
- ✅ `TARIFICADOR.AUCO_APSASEO` (DDL recibido y validado documentalmente)
- ✅ `TARIFICADOR.AUCO_APSUSUARIOS` (DDL recibido y validado documentalmente)
- ✅ `TARIFICADOR.SAUGE_USUAMENU` (**SEQUENCE**) (DDL recibido y validado documentalmente)

## resumen_ddl_recibido_auth

- `AUGE_SISTEMA`
  - PK: `SIST_ID`
  - Campos relevantes para Auth: `SIST_NOMBRE`, `SIST_ESTADO`
- `AUGE_USUASISTEMA`
  - PK compuesta: (`SIST_ID`, `USUA_ID`)
  - Campo de estado: `USSI_ESTADO`
- `AUGE_USUAMENU`
  - PK: `USME_ID`
  - Índice único: (`SISU_ID`, `MENU_ID`)
- `AUGE_MENU`
  - PK: `MENU_ID`
  - Jerarquía: `MENU_PADRE`
  - Path: `MENU_PATH`
- `AUCO_APSASEO`
  - PK: `APSA_ID`
  - Campos de negocio usados por asignación APS: `APSA_NOMAPS`, `APSA_ESTADO`
- `AUCO_APSUSUARIOS`
  - PK compuesta: (`APSA_ID`, `SISU_ID`)
  - Campo de estado: `APSI_ESTADO`

Objetos con DDL sí verificado en repo (no pendientes):
- `TARIFICADOR.AUGE_SISUSUARIO`, `TARIFICADOR.SAUGE_SISUSUARIO`
- `TARIFICADOR.AUGE_DEADTOKEN`, `TARIFICADOR.SAUGE_DEADTOKEN`

## registro_ddl_modulo

### resumen_estado
- `TARIFICADOR.AUGE_SISTEMA`: `validado`
- `TARIFICADOR.AUGE_USUASISTEMA`: `validado`
- `TARIFICADOR.AUGE_USUAMENU`: `validado`
- `TARIFICADOR.AUGE_MENU`: `validado`
- `TARIFICADOR.AUCO_APSASEO`: `validado`
- `TARIFICADOR.AUCO_APSUSUARIOS`: `validado`
- `TARIFICADOR.SAUGE_USUAMENU` (SEQUENCE): `validado`

### ddl_recibido

#### TARIFICADOR.AUGE_SISTEMA
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "TARIFICADOR"."AUGE_SISTEMA" 
(
  "SIST_ID" NUMBER NOT NULL ENABLE,
  "SIST_NOMBRE" VARCHAR2(100) NOT NULL ENABLE,
  "SIST_DESCRIPCION" VARCHAR2(250) NOT NULL ENABLE,
  "SIST_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "SIST_FECHA" DATE DEFAULT CURRENT_DATE NOT NULL ENABLE,
  PRIMARY KEY ("SIST_ID")
);
GRANT SELECT ON "TARIFICADOR"."AUGE_SISTEMA" TO "RELIQ";
COMMENT ON TABLE TARIFICADOR.AUGE_SISTEMA IS 'descripciones de los sistemas del area de regulacion';
```

#### TARIFICADOR.AUGE_USUASISTEMA
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "TARIFICADOR"."AUGE_USUASISTEMA" 
(
  "SIST_ID" NUMBER NOT NULL ENABLE,
  "USUA_ID" NUMBER NOT NULL ENABLE,
  "USSI_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "USSI_FECHA" DATE DEFAULT CURRENT_DATE NOT NULL ENABLE,
  PRIMARY KEY ("SIST_ID", "USUA_ID")
);
GRANT SELECT ON "TARIFICADOR"."AUGE_USUASISTEMA" TO "RELIQ";
```

#### TARIFICADOR.AUGE_USUAMENU
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "TARIFICADOR"."AUGE_USUAMENU" 
(
  "USME_ID" NUMBER NOT NULL ENABLE,
  "SISU_ID" NUMBER NOT NULL ENABLE,
  "MENU_ID" NUMBER NOT NULL ENABLE,
  "USME_ESTADO" NUMBER DEFAULT 1,
  PRIMARY KEY ("USME_ID")
);
CREATE UNIQUE INDEX "TARIFICADOR"."IXUSUAMENU01" ON "TARIFICADOR"."AUGE_USUAMENU" ("SISU_ID", "MENU_ID");
```

#### TARIFICADOR.AUGE_MENU
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "TARIFICADOR"."AUGE_MENU" 
(
  "MENU_ID" NUMBER NOT NULL ENABLE,
  "MENU_NOMBRE" VARCHAR2(150) NOT NULL ENABLE,
  "MENU_PADRE" NUMBER,
  "MENU_PATH" VARCHAR2(150),
  "MENU_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "MENU_SISTEMA" NUMBER DEFAULT 1,
  PRIMARY KEY ("MENU_ID")
);
```

#### TARIFICADOR.AUCO_APSASEO
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "TARIFICADOR"."AUCO_APSASEO" 
(
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "APSA_NOMAPS" VARCHAR2(30) NOT NULL ENABLE,
  "APSA_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "APSA_PROPIO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "APSA_FECHACREACION" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  "EMPR_HOMOLOGACION" NUMBER,
  "APSA_EXISTEET" NUMBER DEFAULT 0 NOT NULL ENABLE,
  "APSA_TIPOPROGRESIV" NUMBER,
  "APSA_RESOLUCION" NUMBER,
  "APSA_VIAT" NUMBER(*,0),
  "APSA_SOLORELL" NUMBER DEFAULT 0,
  "APSA_DESCRIPCION" VARCHAR2(200) DEFAULT 0 NOT NULL ENABLE,
  "APSA_NUAP" VARCHAR2(30),
  "APSA_IDSUI" VARCHAR2(100),
  CONSTRAINT "PK_AUCO_APSASEO" PRIMARY KEY ("APSA_ID")
);
GRANT UPDATE ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
GRANT SELECT ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
GRANT INSERT ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
GRANT DELETE ON "TARIFICADOR"."AUCO_APSASEO" TO "RELIQ";
```

#### TARIFICADOR.AUCO_APSUSUARIOS
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE TABLE "TARIFICADOR"."AUCO_APSUSUARIOS" 
(
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "SISU_ID" NUMBER NOT NULL ENABLE,
  "APSI_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "APSI_FECREA" DATE DEFAULT sysdate,
  CONSTRAINT "PK_AUCO_APSUSUARIOS" PRIMARY KEY ("APSA_ID", "SISU_ID")
);
```

#### TARIFICADOR.SAUGE_USUAMENU (SEQUENCE)
- estado: `validado`
- fuente: `usuario (chat)`
- fecha: `2026-04-25`
```sql
CREATE SEQUENCE TARIFICADOR.SAUGE_USUAMENU
INCREMENT BY 1
MINVALUE 1
MAXVALUE 9999999999999999999999999999
NOCYCLE
CACHE 20
NOORDER;
```

### ddl_pendiente
- Sin pendientes DDL para el módulo AUTH en el alcance actual.

# riesgos/ambiguedades

- `POST /auth/getMenuByUser`, `POST /auth/getSistemasPorUsuario` y `POST /auth/asignarSistema` no tienen `authJwt.verificarToken` en ruta (aunque FE suele enviar token). Riesgo de exposición funcional.
- `POST /auth/setApsxUsuario`: el controlador no retorna respuesta de éxito explícita al finalizar (`controller.js:361-400`), por lo que el cliente puede recibir body vacío.
- `POST /auth/resetPass` devuelve la nueva contraseña en texto plano como response (visible en UI); riesgo operativo de exposición.
- Inconsistencia de nombre de clave de token en frontend (`jwtOken`), hoy usada de forma consistente, pero frágil ante integraciones externas.
- En `Login.vue`, cada cambio de `email` dispara consulta de sistemas (`watch email`), potencialmente alta frecuencia de llamadas.

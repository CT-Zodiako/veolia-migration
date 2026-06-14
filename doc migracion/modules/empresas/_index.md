# Módulo EMPRESAS

## Documentos

- `funcionalidades/empresas-core.md` — extracción AS-IS de 5 endpoints con consumo frontend, trazabilidad Actor → Frontend → API → Lógica → DB, contrato de seguridad y estado DDL.

## Cobertura de extracción

- Backend EMPRESAS: `back-tarificador/src/modules/empresas/{routes.js,controller.js}`
- Dependencia AUTH (middleware): `back-tarificador/src/middlewares/authJwt.js`
- Dependencia APS (contexto funcional): uso de `apsa_id` y relación `AUCO_APSEMPRDIVI` en consultas de empresas por APS.
- Frontend consumidor:
  - `front-tarificador/src/service/EmpresaService.js`
  - `front-tarificador/src/views/configuracion/Empresas.vue`
  - `front-tarificador/src/components/emprConf/{emprGrid.vue,formEmpr.vue}`
  - `front-tarificador/src/views/suministros/{Cargue.vue,CargueSem.vue}`
  - `front-tarificador/src/views/sui/CargueComp.vue`
  - `front-tarificador/src/components/cargue_components/{InfPropia.vue,InfCompetidor.vue}`
  - `front-tarificador/src/components/cargue_components/propio/{InfPropiaMensual.vue,InfPropiaSemestral.vue}`
  - `front-tarificador/src/components/cargue_components/competidor/{InfCompetidorMensual.vue,InfCompetidorSemestral.vue}`
  - `front-tarificador/src/components/cargue_components/sui_complemento/CargueComplemento.vue`
- Objetos DB observados: `TARIFICADOR.AUGE_EMPRESAS`, `TARIFICADOR.AUCO_APSEMPRDIVI`, `TARIFICADOR.SAUGE_EMPRESAS`.

## Alcance in-scope (este cambio)

- `GET /api/v1/empresas/` — listado de empresas.
- `POST /api/v1/empresas/crear` — creación de empresa.
- `POST /api/v1/empresas/consultarpropias` — consulta por APS y tipo (propia/competidor).
- `POST /api/v1/empresas/consultaempr` — consulta general por `empr_empr`.
- `PUT /api/v1/empresas/editar/:id` — edición de empresa.

## Fuera de alcance en este cambio

- `DELETE /api/v1/empresas/eliminar/:id`
- `POST /api/v1/empresas/consultarAps`
- `GET /api/v1/empresas/:id` (placeholder)

## Dependencias transversales

- **AUTH (directa)**:
  - Las 5 rutas in-scope usan `authJwt.verificarToken`.
  - El middleware inyecta `req.SISU_ID`; se usa explícitamente en `POST /crear`.
- **APS (directa)**:
  - `POST /consultarpropias` filtra por `apsa_id` y join `AUCO_APSEMPRDIVI`.
  - Los componentes de cargue consumen empresas por APS (`getEmpresasPropias(aps, 1|0)`).
- **USUARIOS (referencia, sin acople directo observado)**:
  - Se mantiene consistencia documental de formato/estados con el módulo USUARIOS.
  - No se observan llamadas directas EMPRESAS ↔ `/api/v1/usuarios/*` dentro del alcance de este cambio.

## Artefactos globales relacionados

- `docs/trazabilidad-global.md` — inventario cruzado de módulos y dependencias.
- `docs/db/ddl-registro.md` — estado DDL por objeto (`pendiente_validacion` en EMPRESAS).

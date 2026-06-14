---
title: "Módulo: Proyecciones"
description: "Documentación AS-IS del módulo de proyecciones de tarifas"
phase: "Proyecciones"
module: "proyecciones"
version: "1.0.0"
date: "2026-04-29"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/proyecciones/routes.js
  - back-tarificador/src/modules/proyecciones/controller.js
  - front-tarificador/src/views/proyecciones/*.vue
  - front-tarificador/src/service/ProyService.js
---

# Módulo: Proyecciones

## 1. Resumen Ejecutivo

El módulo de **Proyecciones** administra escenarios tarifarios futuros por APS, en cinco frentes: CRUD de proyección, parametrización de línea de tiempo, carga de crecimiento de variables, edición de subsidios/contribuciones proyectados y ejecución del motor PL/SQL (`PK_PROYLIQUIDA`).

El frontend principal está en 5 vistas: `Crear.vue`, `LineasTiempo.vue`, `CrecimientoVariables.vue`, `SubsidiosContribuciones.vue` y `Proyectar.vue`.

## 2. Base de Datos (10 tablas + 15 secuencias)

> Estado AS-IS: la capa Node usa SQL directo y DML masivo (`INSERT ALL`) con borrado previo por `PROY_ID`.

### 2.1 Tablas núcleo (DDL resumido)

1. **PROY_PROYECCION**
   - PK: `PROYID`
   - Campos clave: `APS`, `PROYNOMBRE`, `PROYTIPO100`, rango `PROYANNODES/PROYMESDES` a `PROYANNOHAS/PROYMESHAS`, auditoría `USUARIO/PROYFECHA`.

2. **PROY_DETLINEATIEMPO**
   - Grano: proyección + APS + año + mes.
   - Variables de línea de tiempo: `DELTIPC`, `DELTIPCC`, `DELTSMLV`, `DELTIOEXP`, `DELTFACPRODUC`, `DELTINDIPCC`, `DELTIPCCS`.

3. **PROY_CRECIMIENTO_VBLES**
   - Configura origen Drive/Sheets por APS.
   - Campos clave consumidos: `ID_ARCHIVO`, `LISTA_HOJAS`.

4. **PROY_USUARIOS**
   - Crecimiento por usuarios/uso/semestre.
   - Campos frecuentes: `CODUSO`, `CODTIPOPRED`, `CANTIDAD`, `TONELADAS`.

5. **PROY_PROPIA**
   - Escenario de empresa propia (muchas métricas V_* por mes).
   - Inserción por lotes de alta cardinalidad.

6. **PROY_COMPETIDOR**
   - Escenario de terceros/competidores (métricas C_*).
   - Inserción por lotes de alta cardinalidad.

7. **PROY_DESCUENTOS**
   - Ajustes/porcentajes de descuento proyectados por APS/año/mes.

8. **PROY_APSSUBSCONT**
   - Subsidios/contribuciones proyectados **base**.
   - Campos relevantes: `CLAS_CLASE`, `SUCO_VALOR`, `SUCO_ANNO`, `SUCO_MES`.

9. **PROY_SUBSCONTEMP**
   - Subsidios/contribuciones proyectados **temporales/editables**.
   - Se usa en edición (`editarPorcSubCon`) con `DELETE + INSERT`.

10. **AUCO_TARIFAS** (dependencia de salida)
   - Tabla tarifaria objetivo del proceso de liquidación/proyección ejecutado por `PK_PROYLIQUIDA`.

### 2.2 Secuencias (resumen AS-IS)

- Confirmadas en código/DDL: `SPROY_PROYECCION`, `SPROY_SUBSCONTEMP`, `SAUCO_APSSUBSCONT`.
- El levantamiento funcional reporta **15 secuencias** asociadas al módulo/flujo extendido (incluyendo objetos del paquete de liquidación y persistencias derivadas). Mantener inventario consolidado en artefacto técnico de BD de la fase de migración.

## 3. API Backend

Prefijo: `/api/v1/proyecciones`.

### 3.1 CRUD Proyecciones

- `POST /consulta` → lista por APS (`PROY_PROYECCION`).
- `POST /consultabyid` → retorna detalle de línea de tiempo (`PROY_DETLINEATIEMPO`).
- `POST /consultageneral` → consulta ampliada por usuario APS autorizado.
- `POST /consultaproy` → trae encabezado de una proyección.
- `POST /crear` → inserta proyección (`SPROY_PROYECCION.NEXTVAL`).
- `PUT /editar/:id` → actualiza metadatos/rango de proyección.
- `DELETE /eliminar/:id` → implementación actual inconsistente (riesgo: SQL/semántica no alineada a proyección).

### 3.2 Línea de Tiempo

- `POST /registrarlineatiempo`
  - `isnew=true`: inserta filas por mes/año.
  - `isnew=false`: actualiza filas existentes.
- `POST /consultabyid`
  - Reusa endpoint del CRUD para cargar `PROY_DETLINEATIEMPO`.

### 3.3 Crecimiento de Variables

- `POST /consultarcrecimiento`
  - Lee `PROY_CRECIMIENTO_VBLES`.
  - Consume Google Drive/Sheets (`drivehelper.consultararchivo`) por `ID_ARCHIVO + LISTA_HOJAS`.
- `POST /registrarcrecimientousuarios` → `PROY_USUARIOS`.
- `POST /registrarcrecimientoinfpropia` → `PROY_PROPIA`.
- `POST /registrarcrecimientoinfterceros` → `PROY_COMPETIDOR`.
- `POST /registrardescuento` → `PROY_DESCUENTOS`.

### 3.4 Subsidios/Contribuciones en Proyecciones

- `POST /consultasubcont` → consulta `PROY_APSSUBSCONT`.
- `POST /editarPorcSubCon` → limpia e inserta en `PROY_SUBSCONTEMP`.

### 3.5 Ejecución de Proyección

- `POST /ejecutarproyectar`
  - Invoca bloque PL/SQL:
    - `:res := PK_PROYLIQUIDA.fproy_proyectar(proy_id, apsa_id, usuario)`
  - Incluye `COMMIT` en el bloque.

### 3.6 Soporte

- `POST /ultimastarifas`
  - Consulta `vpro_lastarifa` y retorna `{ anno, mes }` para precarga del flujo.

## 4. Frontend

### 4.1 Servicio Central

**Archivo**: `front-tarificador/src/service/ProyService.js`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getConsulta(aps)` | `POST /proyecciones/consulta` | Lista proyecciones por APS |
| `getConsultaById(id)` | `POST /proyecciones/consultabyid` | Detalle línea de tiempo |
| `getConsultaGeneral()` | `POST /proyecciones/consultageneral` | Lista general con joins |
| `getConsultaProy(id)` | `POST /proyecciones/consultaproy` | Proyección por ID |
| `setProyeccion(data)` | `POST /proyecciones/crear` | Crea proyección |
| `updtProyeccion(id, data)` | `PUT /proyecciones/editar/:id` | Actualiza proyección |
| `delProyeccion(id)` | `DELETE /proyecciones/eliminar/:id` | Elimina proyección |
| `getUltimasTarifas(aps)` | `POST /proyecciones/ultimastarifas` | Última tarifa certificada |
| `setLineaTiempo(data)` | `POST /proyecciones/registrarlineatiempo` | Guarda línea de tiempo |
| `getCrecimiento(aps)` | `POST /proyecciones/consultarcrecimiento` | Consulta crecimiento (Drive) |
| `setCrecimientoUsuarios(data)` | `POST /proyecciones/registrarcrecimientousuarios` | Guarda usuarios |
| `setCrecimientoInfPropia(data)` | `POST /proyecciones/registrarcrecimientoinfpropia` | Guarda info propia |
| `setCrecimientoInfTercero(data)` | `POST /proyecciones/registrarcrecimientoinfterceros` | Guarda info tercero |
| `setDescuentos(data)` | `POST /proyecciones/registrardescuento` | Guarda descuentos |
| `getProyeccionDescuentos(proy_id)` | `POST /proyecciones/consultarproyecciondescuentos` | Consulta descuentos |
| `getProyeccionUsuario(proyid)` | `POST /proyecciones/consultarproyeccionusuario` | Consulta usuarios |
| `getProyeccionInfopropia(proyid)` | `POST /proyecciones/consultarproyeccioninfopropia` | Consulta propia |
| `getProyeccionInfotercero(proyid)` | `POST /proyecciones/consultarproyeccioninfotercero` | Consulta tercero |
| `ejecutarProyectar(apsa_id, proy_id)` | `POST /proyecciones/ejecutarproyectar` | Ejecuta proyección |
| `getconsultasubcont(apsa_id, proy_id, anno, mes)` | `POST /proyecciones/consultasubcont` | Consulta subcont proyectado |
| `postsubcont(data)` | `POST /proyecciones/editarPorcSubCon` | Guarda subcont temporal |

**Patrón**: token `x-access-token` + notificación toast para altas/ediciones.

### 4.2 Vistas Principales

| Vista | Ruta | Rol | Componentes Hijos |
|-------|------|-----|-------------------|
| `Crear.vue` | `/proyecciones/crear` | Alta/edición de encabezado de proyección | `creaGrid.vue` |
| `LineasTiempo.vue` | `/proyecciones/lineastiempo` | Mantenimiento de `PROY_DETLINEATIEMPO` | `seleccionarProyeccion`, `editarLineadeTiempo` |
| `CrecimientoVariables.vue` | `/proyecciones/crecimientovariables` | Carga/consulta datasets de crecimiento | `seleccionarProyeccionSimple`, `CrecimientoUsuarios`, `CrecimientoInfPropia`, `CrecimientoInfTercero`, `CrecimientoDescuentosCostoVariable` |
| `SubsidiosContribuciones.vue` | `/proyecciones/subsidioscontribuciones` | Ajuste de porcentajes proyectados | `seleccionarProyeccionSimple`, `SelectorOnlyYear` |
| `Proyectar.vue` | `/proyecciones/proyectar` | Disparo de ejecución final | `seleccionarProyeccion`, `ConsultarLineasdeTiempoVue`, `CrecimientoUsuarios`, `CrecimientoInfPropia`, `CrecimientoInfTercero`, `CrecimientoDescuentosCostos` |

### 4.3 Componentes Reutilizables

| Componente | Props | Eventos Emitidos | Descripción |
|------------|-------|------------------|-------------|
| `seleccionarProyeccion.vue` | Ninguno | `onChangeProyeccion` | Selector de APS + proyección con horizonte temporal |
| `seleccionarProyeccionSimple.vue` | Ninguno | `FechaSeleccionada` | Selector simplificado de proyección |
| `seleccionarProyeccionYear.vue` | Ninguno | `FechaSeleccionada` | Selector de proyección con año |
| `SelectorOnlyYear.vue` | Ninguno | `FechaSeleccionada` | Selector solo de año |
| `editarLineadeTiempo.vue` | Ninguno | `row-edit-save` | Tabla editable de línea de tiempo (IPC, IPCC, SMLV, IOEXP, FACPRODUC) |
| `ConsultarLineasdeTiempo.vue` | Ninguno | Ninguno | Tabla de consulta de línea de tiempo (solo lectura) |
| `CrecimientoUsuarios.vue` | `InfoJsonResult`, `addLegend` | Ninguno | Tabla de crecimiento de usuarios |
| `CrecimientoInfPropia.vue` | `InfoJsonResult`, `addLegend` | Ninguno | Tabla de información propia |
| `CrecimientoInfTercero.vue` | `InfoJsonResult`, `addLegend` | Ninguno | Tabla de información tercero |
| `CrecimientoDescuentosCostoVariable.vue` | `InfoJsonResult`, `addLegend` | Ninguno | Tabla de descuentos/costos |
| `CrecimientoDescuentosCostos.vue` | `InfoJsonResult`, `addLegend` | Ninguno | Tabla de descuentos/costos (versión proyectar) |

### 4.4 Estructura de Datos de Componentes

**seleccionarProyeccion.vue**:
- **Data**: `descProy`, `dateDesde`, `dateHasta`, `proyeccionesByAps`, `proyeccionIdSelected`
- **Métodos**: `onChangeProyeccion()` — consulta proyecciones por APS y emite evento
- **Store Vuex**: Usa `mapState` y `mapMutations` para estado global

**editarLineadeTiempo.vue**:
- **Data**: `proyeccionesData`, `editingRows`
- **Métodos**: `onRowEditSave(event)`, `exportCSV()`, `roundToDecimals()`
- **Eventos**: `@row-edit-save` — guarda cambios en backend

**SubsidiosContribuciones.vue**:
- **Data**: `DataSubCon`, `editar` (modo edición), `proyeccion`, `anno`, `mes`
- **Métodos**: `getDataSubCon()`, `guardar()`, `getParaName()`
- **Eventos**: `@FechaSeleccionada` — recibe proyección y año seleccionados

**CrecimientoVariables.vue**:
- **Data**: `crecimientoVbles`, `setProyeccion`, `icoBtn`, `icoBtn2`
- **Métodos**: `launchAction()` (carga desde Drive), `launchSave()` (guarda datasets)
- **Tabs**: USUARIOS, INFORMACION PROPIA, INFORMACION TERCERO, DESCUENTOS COSTO

## 5. Flujo de Datos

1. Usuario crea proyección base (`PROY_PROYECCION`).
2. Define línea de tiempo mensual (`PROY_DETLINEATIEMPO`).
3. Carga crecimiento (usuarios, propia, terceros, descuentos).
4. Ajusta subsidios/contribuciones para la proyección.
5. Ejecuta `PK_PROYLIQUIDA` para materializar cálculo proyectado.

## 6. Diferencias con Subcont Operativo

- **Subcont operativo** (`/api/v1/subcon`) opera sobre `AUCO_APSSUBSCONT` (estado operativo actual APS/empresa/división).
- **Subcont en proyecciones** (`/api/v1/proyecciones/consultasubcont|editarPorcSubCon`) trabaja con contexto `PROY_ID` y tablas `PROY_APSSUBSCONT` / `PROY_SUBSCONTEMP`.
- Operativo = configuración vigente. Proyecciones = escenario temporal editable por corrida.

## 7. Integración Google Drive

- Entrada: `PROY_CRECIMIENTO_VBLES.ID_ARCHIVO` + `LISTA_HOJAS`.
- Proceso: backend recorre hojas, obtiene matriz tabular y la transforma a `dataset.columns + dataset.data`.
- Dependencia crítica: disponibilidad de credenciales/permisos del helper `drivehelper`.

## 8. Hallazgos Críticos

1. Endpoint `DELETE /eliminar/:id` con lógica SQL no alineada a entidad `PROY_PROYECCION`.
2. Varias operaciones masivas usan `DELETE + INSERT` sin versión/concurrencia optimista.
3. Diferencias de nombres de campos (`idProy` vs `idproy`, variantes de mayúsculas) pueden romper contratos.
4. `consultarproyecciondescuentos` en rutas no exige token (superficie de riesgo).
5. `COMMIT` dentro de bloque de ejecución PL/SQL acopla transaccionalidad en capa de BD.

## 9. Notas de Migración

- Priorizar contrato de API estable (DTOs tipados) antes de tocar motor de cálculo.
- Separar repositorios por agregado: Proyección, LíneaTiempo, Crecimiento, SubcontProy, Ejecución.
- Envolver operaciones masivas en estrategia idempotente y trazable (job id + hash de dataset).
- Extraer integración Drive a adaptador externo con retries y observabilidad.

## 10. Archivos Relacionados

- `back-tarificador/src/modules/proyecciones/routes.js`
- `back-tarificador/src/modules/proyecciones/controller.js`
- `front-tarificador/src/service/ProyService.js`
- `front-tarificador/src/views/proyecciones/Crear.vue`
- `front-tarificador/src/views/proyecciones/LineasTiempo.vue`
- `front-tarificador/src/views/proyecciones/CrecimientoVariables.vue`
- `front-tarificador/src/views/proyecciones/SubsidiosContribuciones.vue`
- `front-tarificador/src/views/proyecciones/Proyectar.vue`
- `docs/modulos/maestros/subcont.md`

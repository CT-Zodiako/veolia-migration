# Estado de la migración — tablero por opción de menú

> Actualizado: 2026-10-22. Fuente del detalle: `odd/tasks/parity-review-all.md` (sección *Review results*).
> Rama: `fix/auth-hardening-test-suite` (sin push).

## Cómo leer este tablero

- **Revisado y corregido**: se comparó contra el legacy (`/Users/zodiako/DEV/oracle`), se corrigieron los bugs aprobados y quedó cubierto por pruebas automáticas.
- **Pendiente Oracle**: el código y las pruebas pasan, pero falta confirmarlo contra la base real (el esquema o el DDL no están disponibles en desarrollo).
- **No migrar**: la opción existía en `AUGE_MENU` pero estaba muerta en el legacy.

## Resumen

| Sistema | Opciones activas | Revisadas y corregidas | No migrar |
|---|---|---|---|
| VEO-Regulator (SIST_ID=1) | 44 | 44 | 0 |
| Reliquidaciones (SIST_ID=2) | 6 | 6 | 0 |
| SUI853 (SIST_ID=3) | 21 | 21 | 8 |

Pruebas al cierre: ver la sección *Pruebas* al final.

## Reliquidaciones (SIST_ID=2)

| Menú | Opción | Estado | Commit | Pendiente Oracle |
|---|---|---|---|---|
| 5001 | Crear | Revisado y corregido | 9e4e2e7 | Valor real de retorno de `freli_extraccion` (se exige `"ok"` exacto) |
| 5002 | Cargue | Revisado y corregido | 131bcc6 | Tipo de `IAED_APROVECHA` / `IARE_ESCENARIO` (FLOAT sin CAST) |
| 5003 | Comparar Costos | Revisado y corregido | 131bcc6 | Tipos de `VREL_COMPARACOSTOS` |
| 5004 | Comparar Tarifas | Revisado y corregido | 131bcc6 | Tipos de `VREL_COMPARATARIFACOBRO` |
| 6001 / 6002 | Verificación de Cambios / Aplicar en Tarifas | Revisado y corregido | 1857ab4 | — |

El esquema `RELIQ` no existe en la base de desarrollo.

## SUI853 (SIST_ID=3)

| Menú | Opción | Estado | Commit |
|---|---|---|---|
| 30001 | APS Empresa | Revisado y corregido | 6017621 |
| 30002 | APS Documentos | Revisado y corregido | 6017621 |
| 30003 | Formularios | Revisado (OK) | — |
| 30004 | Cargue Residuos | **Migrado** (antes no existía) | a59c197 |
| 30005 | Cargue Facturación | **Migrado** (antes era un stub) | a59c197 |
| 30006 | Carga genérica | Revisado y corregido (fechas) | a59c197 |
| 30007 | Cargue Facturación Mes | **Migrado** (antes era un stub) | a59c197 |
| 7001-7006, 7010, 7011 | Grupo CFT (Formato2) | Revisado y corregido | 3634590, ad840cb |
| 8001, 8002, 8008, 8009, 9001 | CRTs, CRT, CVNA, CVA (Formato2) | Revisado y corregido | 3634590, ad840cb |
| 8010 | CDFT | Revisado y corregido | 3634590 |
| 10001 | Facturación Servicio Aseo (Comercial) | Revisado y corregido | 6017621 |
| 20001 | Residuos Generados (Operaciones) | Revisado y corregido | 6017621 |
| 40001 | FAC | Revisado (OK) | — |
| 7007-7009, 8003-8007 | CBLz, CMAGzda, CFTz, CRTs, CDFTd, CT NUIT | No migrar (comentadas en `MenuService.js` del legacy) | — |

Pendiente Oracle / Drive: forma real del JSON de `SUI.f_render_formato2`, DDL de `TGEN_RESGENERADOS` y `TGEN_COMERCIAL`, y nombres reales de archivos y carpetas en Google Drive (ver `docs/sui853-drive-loads.md`).

## VEO-Regulator (SIST_ID=1)

| Menú | Opción | Estado | Commit |
|---|---|---|---|
| 100 | Inicio | Revisado (OK) | — |
| 204 | Usuarios (+ asignaciones, permisos) | Revisado y corregido | 331d1aa, cee4481 |
| 201 | APS | Revisado y corregido | cee4481 |
| 202 | Empresas | Revisado y corregido | cee4481 |
| 203 | Rellenos | Revisado y corregido | cee4481 |
| 301 | Índices CRA | Revisado y corregido | fdc1d81 |
| 302 | Subsidios Contribuciones | Revisado (OK) | — |
| 303 | Ajuste Productividad | Revisado y corregido | fdc1d81 |
| 304 | Descuentos en Costos | Revisado (OK) | — |
| 307 | Verificación | Revisado (OK) | — |
| 308 | Activar Aprovechamiento | Revisado y corregido | fdc1d81 |
| 309 | Costo de Poda | Revisado y corregido | fdc1d81 |
| 311 | Cargue Productividad | Revisado (OK) | — |
| 401 | Cálculo Tarifas | Revisado y corregido | fdc1d81 |
| 501 | Detallado Tarifas | Revisado y corregido | c3eb9f3 |
| 502 | Detallado Facturación | Revisado y corregido | c3eb9f3 |
| 503 | Historia de Certificación | Revisado (OK) | — |
| 504 | Historial de Productividad | Revisado y corregido | c3eb9f3 |
| 601-604 | Informes gerenciales | Revisado y corregido | c3eb9f3 |
| 605 | Actualización de Costo | Revisado (OK) | — |
| 606 | Costo de Poda gerencial | Revisado y corregido | c3eb9f3 |
| 701 | Cargue Mensual | Revisado y corregido | fdc1d81 |
| 702 | Cargue Semestral | Revisado y corregido | fdc1d81 |
| 801 | Formatos y Formularios (Procesar) | Revisado y corregido | c3eb9f3 |
| 802 | Cargue Complemento | Revisado y corregido | c3eb9f3 |
| 803 | SUI DashBoard | Revisado (OK) | — |
| 804 | Resumen Formatos y Formularios | Revisado (OK) | — |
| 805 | Reversiones SUI | Revisado (OK) | — |
| 901 | Crear Proyección | Revisado y corregido | af7dea6 |
| 902 | Líneas de Tiempo | Revisado y corregido | af7dea6 |
| 903 | Crecimiento Variables Programadas | Revisado y corregido | af7dea6 |
| 904 | Proyectar | Revisado (OK) | — |
| 905 | Subsidios/Contribuciones | Revisado y corregido | af7dea6 |
| 1001 | Generales | Revisado (OK) | — |
| 2001 | Variables PGIRS | Revisado y corregido | af7dea6 |
| 2002 / 2003 | Informe PGIRS / Resumen variables PGIRS | Revisado y corregido (etiquetas) | af7dea6 |
| 3001-3004 | Reversiones | Revisado y corregido (3004) | af7dea6 |

Pendiente Oracle: firma real de `PK_SUI` y `PK_CERTIFICACION` (las correcciones siguen el legacy), orden real de columnas de `APROV_ACTIVAR` y `AUCO_PODATECHO`, valores existentes de `PROYESTADO` y `RELL_ESTADO`, y las 7 tablas `pendiente_ddl` de Cálculo Tarifas.

## Seguridad (transversal)

| Cambio | Commit |
|---|---|
| Suite de pruebas reparada y wallets de Oracle fuera de Git | bc2ade0 |
| Token rechazado si no se puede verificar la revocación | 1d25579 |
| Toda `/api/v1` exige token (salvo `login` y `validate-credentials`) | b5d5194, 331d1aa |
| Gestión de usuarios solo para administradores (menú 204) | 331d1aa |
| Vencimiento del token validado y `Auth:JwtSecret` obligatorio | 331d1aa |

Antes de desplegar, seguir la lista de `docs/deployment-iis.md` (secreto JWT, re-login de usuarios, administradores con menú 204).

## Pruebas

| Suite | Comando | Resultado al cierre |
|---|---|---|
| Backend (contratos) | `dotnet test backend/Veolia.Api.Tests` | 508 pasan, 0 fallan, 4 omitidas (Oracle) |
| Backend contra Oracle | `VEOLIA_ORACLE_TESTS=1 dotnet test backend/Veolia.Api.Tests` | no ejecutado (sin Oracle) |
| Frontend | `cd frontend && npm test` | 178 pasan en 47 archivos |
| Build | `cd frontend && npx ng build` | OK |

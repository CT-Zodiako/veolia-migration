# Estado de la migración — tablero por opción de menú

> Actualizado: 2026-10-22 (segunda pasada). Fuente del detalle: `odd/tasks/parity-review-all.md` (revisión) y `odd/tasks/legacy-characterization-tests.md` (pruebas derivadas del legacy y sus hallazgos).
> Rama: `fix/auth-hardening-test-suite` (sin push).

## Cómo leer este tablero

- **Revisado y corregido**: se comparó contra el legacy (`/Users/zodiako/DEV/oracle`), se corrigieron las diferencias y quedó cubierto por pruebas automáticas cuyo valor esperado sale del legacy (con `archivo:línea` citado).
- **Mejora aceptada**: difiere del legacy a propósito, por decisión del usuario; la prueba verifica el comportamiento nuevo.
- **Corrección de la primera pasada**: varias opciones marcadas "Revisado (OK)" en la primera versión de este tablero tenían diferencias que la revisión manual no detectó y las pruebas derivadas del legacy sí (por ejemplo 307, 10001 y 20001). Quedan corregidas abajo.
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
| 30003 | Formularios | Revisado y corregido | 1d19aa0 |
| 30004 | Cargue Residuos | **Migrado** (antes no existía) | a59c197 |
| 30005 | Cargue Facturación | **Migrado** (antes era un stub) | a59c197 |
| 30006 | Carga genérica | Revisado y corregido | a59c197, 1d19aa0 |
| 30007 | Cargue Facturación Mes | **Migrado** (antes era un stub) | a59c197 |
| 7001-7006, 7010, 7011 | Grupo CFT (Formato2) | Revisado y corregido | 3634590, ad840cb, 1d19aa0, 982536e |
| 8001, 8002, 8008, 8009, 9001 | CRTs, CRT, CVNA, CVA (Formato2) | Revisado y corregido | 3634590, ad840cb |
| 8010 | CDFT | Revisado y corregido (valores sin redondear) | 3634590, 1d19aa0 |
| 10001 | Facturación Servicio Aseo (Comercial) | Revisado y corregido (**daba error 500 en cada consulta**) | 6017621, 1d19aa0 |
| 20001 | Residuos Generados (Operaciones) | Revisado y corregido (**daba error 500 en cada consulta**) | 6017621, 1d19aa0 |
| 40001 | FAC | Revisado y corregido | 1d19aa0 |
| 7007-7009, 8003-8007 | CBLz, CMAGzda, CFTz, CRTs, CDFTd, CT NUIT | No migrar (comentadas en `MenuService.js` del legacy) | — |

Pendiente Oracle / Drive: forma real del JSON de `SUI.f_render_formato2`, DDL de `TGEN_RESGENERADOS` y `TGEN_COMERCIAL`, y nombres reales de archivos y carpetas en Google Drive (ver `docs/sui853-drive-loads.md`).

## VEO-Regulator (SIST_ID=1)

| Menú | Opción | Estado | Commit |
|---|---|---|---|
| 100 | Inicio | Mejora aceptada (tablero de inicio nuevo) | — |
| 204 | Usuarios (+ asignaciones, permisos) | Revisado y corregido | 331d1aa, cee4481, 858c070 |
| 201 | APS | Revisado y corregido | cee4481 |
| 202 | Empresas | Revisado y corregido | cee4481 |
| 203 | Rellenos | Revisado y corregido | cee4481, 8679cca |
| 301 | Índices CRA | Revisado y corregido | fdc1d81 |
| 302 | Subsidios Contribuciones | Revisado y corregido | 6ab3c8d |
| 303 | Ajuste Productividad | Revisado y corregido | fdc1d81, 6ab3c8d |
| 304 | Descuentos en Costos | Revisado y corregido | 9b8e0f6 |
| 307 | Verificación | Revisado y corregido (**mostraba "Promedios Mensuales" con números aleatorios** y pedía semestre en vez de APS + mes) | 18a3465 |
| 308 | Activar Aprovechamiento | Revisado y corregido | fdc1d81, 6ab3c8d |
| 309 | Costo de Poda | Revisado y corregido | fdc1d81, 9b8e0f6 |
| 311 | Cargue Productividad | Revisado y corregido | 9b8e0f6 |
| 401 | Cálculo Tarifas | Revisado y corregido (gráficos del legacy restaurados) | fdc1d81, 6ab3c8d |
| 501 | Detallado Tarifas | Revisado y corregido | c3eb9f3, 18a3465 |
| 502 | Detallado Facturación | Revisado y corregido | c3eb9f3 |
| 503 | Historia de Certificación | Revisado (OK: las pruebas derivadas del legacy pasan sin cambios) | — |
| 504 | Historial de Productividad | Revisado y corregido | c3eb9f3 |
| 601-604 | Informes gerenciales | Revisado y corregido | c3eb9f3 |
| 605 | Actualización de Costo | Revisado y corregido | 18a3465 |
| 606 | Costo de Poda gerencial | Revisado y corregido | c3eb9f3 |
| 701 | Cargue Mensual | Revisado y corregido | fdc1d81, 9b8e0f6, adfd384 |
| 702 | Cargue Semestral | Revisado y corregido | fdc1d81, 9b8e0f6 |
| 801 | Formatos y Formularios (Procesar) | Revisado y corregido | c3eb9f3 |
| 802 | Cargue Complemento | Revisado y corregido | c3eb9f3 |
| 803 | SUI DashBoard | Revisado y corregido | beddeca |
| 804 | Resumen Formatos y Formularios | Revisado y corregido | beddeca |
| 805 | Reversiones SUI | Revisado y corregido | beddeca |
| 901 | Crear Proyección | Revisado y corregido | af7dea6 |
| 902 | Líneas de Tiempo | Revisado y corregido | af7dea6, beddeca |
| 903 | Crecimiento Variables Programadas | Revisado y corregido | af7dea6 |
| 904 | Proyectar | Revisado y corregido | beddeca |
| 905 | Subsidios/Contribuciones | Revisado y corregido (**una lista vacía borraba los datos del período**) | af7dea6, beddeca |
| 1001 | Generales | Revisado y corregido | 18a3465 |
| 2001 | Variables PGIRS | Revisado y corregido | af7dea6, beddeca |
| 2002 / 2003 | Informe PGIRS / Resumen variables PGIRS | Revisado y corregido | af7dea6, beddeca |
| 3001-3004 | Reversiones | Revisado y corregido | af7dea6, 9b8e0f6, beddeca |

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
| Backend (contratos + pruebas derivadas del legacy) | `dotnet test backend/Veolia.Api.Tests` | 922 pasan, 0 fallan, 4 omitidas (Oracle real) |
| Backend contra Oracle | `VEOLIA_ORACLE_TESTS=1 dotnet test backend/Veolia.Api.Tests` | no ejecutado (sin Oracle) |
| Frontend | `cd frontend && npm test` | 599 pasan en 109 archivos, ninguna omitida |
| Build | `cd frontend && npx ng build` | OK |

Todas las pantallas y grupos de endpoints migrados tienen pruebas cuyo valor esperado sale del legacy. No queda ninguna diferencia con el legacy sin resolver: cada una se corrigió o quedó como mejora aceptada (`odd/tasks/legacy-characterization-tests.md`, S8-S10).

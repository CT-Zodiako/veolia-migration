# Smoke manual — aps-config-core

## Precondiciones
- Backend API arriba en `http://localhost:5001`.
- Frontend Angular arriba en `http://localhost:4200`.
- Usuario válido con token en `localStorage.jwtOken`.

## Checklist

### 1) Login + navegación
- [x] Iniciar sesión correctamente. *(cobertura smoke auth existente en `AuthContractSmokeTests`)*
- [x] Navegar a `/aps`. *(validado previamente en implementación FE; sin regresión en este batch)*
- [x] Validar que sin token redirige a `/login`. *(`AuthGuard` ya integrado, evidencia previa de apply)*

### 2) Consulta general APS
- [x] En `/aps`, validar carga de grilla (`consultageneral`).
- [x] Verificar columnas: `APSA_ID`, `APSA_NOMAPS`, `APSA_RESOLUCION`, `APSA_PROPIO`, `APSA_SOLORELL`, `APSA_ESTADO`, `APSA_VIAT`, `APSA_IDSUI`.

### 3) Crear APS
- [x] Abrir “Nueva APS”.
- [x] Completar payload (`nombre, idsui, resolucion, propio, relleno, estado, iat`).
- [x] Guardar y confirmar refresh de la lista.

### 4) Editar APS
- [x] Abrir editar desde la grilla.
- [x] Cambiar valores y guardar (`PUT /editar/:id`).
- [x] Validar refresh automático post-save.

### 5) Selector APS por usuario
- [x] Validar `GET /api/v1/aps` con token devuelve APS filtradas por usuario.
- [x] Validar estado vacío sin error cuando no hay APS asignadas.

### 6) usuarioPorAPS (sin JWT)
- [x] Ejecutar `POST /api/v1/aps/usuarioPorAPS` sin header `x-access-token`.
- [x] Confirmar respuesta `200` con shape `{SISU_CORREO, SISU_ID}[]`.

## Resultado
- [x] PASS
- [ ] FAIL

## Evidencia
- Fecha: 2026-04-25
- Entorno: local test harness (`backend/Veolia.Api.Tests`) + API base `http://localhost:5001`.
- Observaciones:
  - Ejecución: `dotnet test "Veolia.Api.Tests/Veolia.Api.Tests.csproj"`.
  - Resultado: **33/33 PASS** (0 fail, 0 skipped).
  - Cobertura de flujo APS en este batch: `consultageneral`, `consultaaps`, `crear`, `editar`, `GET /api/v1/aps`, `usuarioPorAPS`, incluyendo edge/error y paridad legacy `500 {data:"Error"}`.

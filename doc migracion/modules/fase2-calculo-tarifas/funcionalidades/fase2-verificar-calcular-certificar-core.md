---
modulo: fase2-calculo-tarifas
fase: 2
version: v1
estado: implementado_as_is
estado_ddl: parcial
fuentes:
  - front-tarificador/src/views/procesos/Calculo.vue
  - front-tarificador/src/service/CostoService.js
  - front-tarificador/src/service/Validaciones.js
  - back-tarificador/src/modules/costos/routes.js
  - back-tarificador/src/modules/costos/controller.js
  - back-tarificador/src/modules/validaciones/routes.js
  - back-tarificador/src/modules/validaciones/controller.js
  - back-tarificador/src/modules/suministros/routes.js
  - back-tarificador/src/modules/suministros/controller.js
trazabilidad:
  - actor: Operador tarifas
  - frontend: Calculo.vue
  - service: CostoService / Validaciones
  - endpoint: /api/v1/costos/* + dependencias
  - backend: costos/validaciones/suministros controllers
  - db: pk_validaciones / pk_liquidar / PK_VALGRAL / AUCO_* / VAUCO_*
---

# Core funcional — VERIFICAR → CALCULAR → CERTIFICAR

## Matriz Actor → Frontend → Endpoint → Backend → DB

| Flujo | Actor | Frontend/Service | Endpoint | Backend | DB/PLSQL |
|---|---|---|---|---|---|
| VERIFICAR previo cálculo | Operador tarifas | `openVerificar()` → `CostoService.getConsultarVerificacion` | `POST /api/v1/costos/validapreactualiza` | `costos.controller.validapreactualiza` | `pk_validaciones.fauco_antesliquidar` + `SELECT VAUCO_ANTESLIQUIDAR` |
| Precheck existencia tarifas | Operador tarifas | `Validaciones.fauco_existarifa` | `POST /api/v1/suministros/cenrtificarEditar` | `suministros.controller.certificarEdicionPODA` | `PK_VALGRAL.fauco_existarifa` |
| Precheck SUI vs facturación | Operador tarifas | `Validaciones.certificarFauco_cpsuivsfact` | `POST /api/v1/validaciones/certificarFauco_cpsuivsfact` | `validaciones.controller.certificarFauco_cpsuivsfact` | `PK_VALGRAL.fauco_cpsuivsfact` |
| Precheck productividad | Operador tarifas | `Validaciones.certificarFauco_cpproductividad` | `POST /api/v1/validaciones/certificarFauco_cpproductividad` | `validaciones.controller.certificarFauco_cpproductividad` | `PK_VALGRAL.fauco_cpproductividad` |
| Precheck enero | Operador tarifas | `Validaciones.certificarFauco_cpenero` | `POST /api/v1/validaciones/certificarFauco_cpenero` | `validaciones.controller.certificarFauco_cpenero` | `PK_VALGRAL.fauco_cpenero` |
| CALCULAR tarifas | Operador tarifas | `CalcularTarifas()` → `CostoService.CalcularTarifas` | `POST /api/v1/costos/calculartarifas` | `costos.controller.calculartarifas` | `pk_liquidar.fauco_calculartarifas(aps,mes,anno,usuario)` |
| CERTIFICAR tarifas | Operador tarifas | `CostoService.certificarTarifas` | `POST /api/v1/costos/certificarTarifas` | `costos.controller.certificarTarifas` | `INSERT AUCO_TARICERTIFICADA(APSA_ID,TACE_ANNO,TACE_MES,TACE_FECCREA,USUA_USUARIO)` |

## Flujo operativo detallado

1. Usuario abre **Cálculo Tarifas** y selecciona `aps/mes/anno`.
2. Presiona **VERIFICAR**:
   - backend ejecuta `pk_validaciones.fauco_antesliquidar`;
   - luego lee `VAUCO_ANTESLIQUIDAR` y devuelve filas observables.
3. Si decide **Aplicar**, frontend ejecuta prechecks `PK_VALGRAL` (4 validaciones).
4. Si prechecks pasan, llama `POST /costos/calculartarifas`.
5. Backend ejecuta `pk_liquidar.fauco_calculartarifas` (detalle de los 6 pasos en `fase2-calculo-6pasos.md`, tablas en `datos/fase2-tablas-vistas.md`, dependencias en `datos/fase2-dependencias-ocultas.md`).
6. Con cálculo terminado, usuario puede ejecutar **CERTIFICAR** para insertar traza en `AUCO_TARICERTIFICADA`.

## Contratos principales

### 1) Verificación (`/costos/validapreactualiza`)
- Request: `{ aps, anno, mes }`
- Auth: Sí (`authJwt.verificarToken`)
- Resultado operativo: arreglo de filas de `VAUCO_ANTESLIQUIDAR` para decisión del usuario.

### 2) Cálculo (`/costos/calculartarifas`)
- Request: `{ aps, anno, mes }` + `usuario` derivado de token (`req.SISU_ID`).
- Auth: Sí.
- Resultado técnico: objeto de estado con respuesta 200/500 según ejecución del package.

### 3) Certificación (`/costos/certificarTarifas`)
- Request: `{ aps, anno, mes }`
- Auth: Sí.
- Resultado técnico: inserción en `AUCO_TARICERTIFICADA` con usuario/fecha de certificación.

## Endpoints de soporte de fase (consumo FE)

| Endpoint | Módulo backend | Propósito operativo | Origen DB |
|---|---|---|---|
| `POST /api/v1/costos/consultar` | `costos` | Consultar costos ya consolidados del período | `VAUCO_COSTOS` |
| `POST /api/v1/toneladas/qrt` | `toneladas` | Insumo toneladas QRT/no-QA | `vauco_toneladas` |
| `POST /api/v1/toneladas/qa` | `toneladas` | Insumo toneladas QA | `vauco_toneladas` |
| `POST /api/v1/kilometros/lbl` | `kilometros` | Insumo kilómetros LBL | `vauco_lbl` |
| `POST /api/v1/subcon/consulta` | `subcont` (path expuesto `subcon`) | Insumo subcontratación para subsidios/contribuciones | `auco_apssubscont` |

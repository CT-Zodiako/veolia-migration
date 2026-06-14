---
title: "Módulo: Costos"
description: "Documentación AS-IS del módulo orquestador de cálculo de tarifas (Fase 2)"
phase: "Fase 2"
module: "costos"
version: "1.0.0"
date: "2026-04-29"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/costos/routes.js
  - back-tarificador/src/modules/costos/controller.js
  - front-tarificador/src/service/CostoService.js
  - front-tarificador/src/views/procesos/Calculo.vue
  - TARIFICADOR.AUCO_TARICERTIFICADA
  - TARIFICADOR.VAUCO_ANTESLIQUIDAR
  - TARIFICADOR.VAUCO_COSTOS
  - TARIFICADOR.VACUO_COSTOSCLUS
  - TARIFICADOR.AUCO_COSTOSCLUS
  - TARIFICADOR.VAUCO_ACTICLUS
---

# Módulo: Costos (Orquestador Fase 2)

## 1. Resumen Ejecutivo
El módulo `costos` es el orquestador operativo de Fase 2 del tarificador y ejecuta el flujo transaccional **VERIFICAR → CALCULAR → CERTIFICAR**.  
Además expone endpoints de soporte para consulta de costos, costos por clúster, comportamiento histórico, extracción JSON y actualización técnica de costos.

- **Actor principal**: Operador de tarifas.
- **UI orquestadora**: `Calculo.vue`.
- **Backend**: `routes.js` + `controller.js` sobre `/api/v1/costos`.
- **Núcleo de negocio**: 4 paquetes Oracle PL/SQL (`pk_validaciones`, `pk_liquidar`, `pk_costos`, `PK_JSON`).

## 2. Flujo Principal

### 2.1 VERIFICAR
1. UI dispara `openVerificar()`.
2. `CostoService.getConsultarVerificacion()` llama `POST /api/v1/costos/validapreactualiza`.
3. Backend ejecuta:
   - `pk_validaciones.fauco_antesliquidar(...)`
   - luego consulta `VAUCO_ANTESLIQUIDAR` para devolver hallazgos.

### 2.2 Prevalidaciones
Antes de calcular, `Calculo.vue/CalcularTarifas()` ejecuta gates:
- `Validaciones.fauco_existarifa(...)` → `POST suministros/cenrtificarEditar` (**typo contractual AS-IS**).
- `Validaciones.certificarFauco_cpsuivsfact(...)`
- `Validaciones.certificarFauco_cpproductividad(...)`
- `Validaciones.certificarFauco_cpenero(...)`

Regla: sólo se calcula si las tres validaciones `certificarFauco_*` retornan `0` y no existen tarifas previas para APS/período.

### 2.3 CALCULAR
1. UI llama `CostoService.getCalcularTarifas()`.
2. Backend `POST /api/v1/costos/calculartarifas` ejecuta `pk_liquidar.fauco_calculartarifas(...)` con commit.

### 2.4 CERTIFICAR
1. UI dispara `onCertificar()`.
2. `CostoService.getCertificar()` llama `POST /api/v1/costos/certificarTarifas`.
3. Backend inserta certificación en `AUCO_TARICERTIFICADA`.

## 3. API Backend - Core Transaccional

### 3.1 POST /api/v1/costos/validapreactualiza
**Route**: protegida con `authJwt.verificarToken`.  
**Controller**: `validapreactualiza(aps, anno, mes)`.

```sql
BEGIN
  :res := pk_validaciones.fauco_antesliquidar(:1,:2,:3);
  COMMIT;
END;
```

Bindings reales en código:
- `:1 = aps`
- `:2 = mes`
- `:3 = anno`
- `:res` OUT NUMBER

Luego ejecuta:

```sql
SELECT * FROM VAUCO_ANTESLIQUIDAR
WHERE VALI_ANNO = :1 AND VALI_MES = :2 AND APSA_ID = :3
```

Bindings:
- `:1 = anno`
- `:2 = mes`
- `:3 = aps`

### 3.2 POST /api/v1/costos/calculartarifas
**Controller**: `calculartarifas(aps, anno, mes, usuario)`.

```sql
BEGIN
  :res := pk_liquidar.fauco_calculartarifas(:1,:2,:3,:4);
  COMMIT;
END;
```

Bindings reales:
- `:1 = aps`
- `:2 = mes`
- `:3 = anno`
- `:4 = usuario (req.SISU_ID)`
- `:res` OUT NUMBER

### 3.3 POST /api/v1/costos/certificarTarifas
**Controller**: `certificarTarifas(aps, anno, mes, usuario)`.

```sql
INSERT INTO TARIFICADOR.AUCO_TARICERTIFICADA
(APSA_ID, TACE_ANNO, TACE_MES, TACE_FECCREA, USUA_USUARIO)
VALUES(:1, :2, :3, SYSDATE , :4)
```

Bindings:
- `:1 = aps`
- `:2 = anno`
- `:3 = mes`
- `:4 = usuario (req.SISU_ID)`

## 4. API Backend - Soporte

### 4.1 POST /api/v1/costos/consultar
```sql
SELECT *
FROM vauco_costos
WHERE APSCOSTO = :1 AND ANNOCOSTO = :2 AND MESCOSTO = :3
```
Bindings: `[aps, anno, mes]`.

### 4.2 POST /api/v1/costos/cosclus
```sql
SELECT *
FROM vacuo_costosclus
WHERE apsa_id = :1 and cost_anno = :2 and cost_mes =:3
```
Bindings: `[aps, anno, mes]`.

### 4.3 POST /api/v1/costos/comportaclus
```sql
SELECT *
FROM VAUCO_ACTICLUS
WHERE APSA_ID = :1
  AND INED_ANNO*12+INED_MES BETWEEN (:2*12+:3)-6 AND :2*12+:3
```
Bindings: `[aps, anno, mes]`.  
Regla funcional: ventana móvil de 6 meses hasta el período consultado.

### 4.4 POST /api/v1/costos/getclusjson
```sql
SELECT PK_JSON.fjson_clus(:1,:2,:3) as plano FROM dual
```
Bindings: `[aps, anno, mes]`.  
Devuelve JSON plano (campo `PLANO`) usado para informes en UI.

### 4.5 POST /api/v1/costos/actualizar
```sql
SELECT pk_costos.fauco_actualizacostos(:1,:2,:3) FROM dual
```
**Importante AS-IS**: bindings reales en código son `[aps, mes, anno]` (orden distinto al nominal `aps, anno, mes`).

## 5. Dependencias Oracle (PL/SQL)

### 5.1 pk_validaciones
- Uso: `pk_validaciones.fauco_antesliquidar`.
- Rol: prevalidación de datos previos a liquidación/cálculo.

### 5.2 pk_liquidar
- Uso: `pk_liquidar.fauco_calculartarifas`.
- Rol: cálculo principal de tarifas (núcleo transaccional).

### 5.3 pk_costos
- Uso: `pk_costos.fauco_actualizacostos`.
- Rol: actualización técnica/funcional de costos.

### 5.4 PK_JSON
- Uso: `PK_JSON.fjson_clus`.
- Rol: serialización de clústeres a JSON plano para consumo frontend.

## 6. Frontend

### 6.1 CostoService.js
Mapeo principal método → endpoint:
- `getConsultarCostos` → `costos/consultar`
- `getCompClus` → `costos/comportaclus`
- `getCostoClus` → `costos/cosclus`
- `getConsultarVerificacion` → `costos/validapreactualiza`
- `getCalcularTarifas` → `costos/calculartarifas`
- `getCertificar` → `costos/certificarTarifas`

Dependencias externas incluidas en el mismo service:
- `getQrt` → `toneladas/qrt`
- `getQa` → `toneladas/qa`

### 6.2 Calculo.vue (orquestación)
Acciones UI clave:
- `openVerificar()` dispara verificación y abre diálogo de resultados.
- `CalcularTarifas()` aplica prevalidaciones y, si cumplen, ejecuta cálculo.
- `onCertificar()` certifica período APS seleccionado.
- `actualizaInfoGeneral()` refresca tablero y gráficos (acople con módulos relacionados).

### 6.3 Prevalidaciones (validaciones + suministros)
En `Validaciones.js`, las prevalidaciones de cálculo son:
- `certificarFauco_cpsuivsfact`
- `certificarFauco_cpproductividad`
- `certificarFauco_cpenero`
- `fauco_existarifa`

**Hallazgo contractual crítico**: `fauco_existarifa` llama `suministros/cenrtificarEditar` (typo `cenrtificar`), y ese contrato no debe corregirse en AS-IS sin versionado.

## 7. Base de Datos

### 7.1 AUCO_TARICERTIFICADA
```sql
CREATE TABLE TARIFICADOR.AUCO_TARICERTIFICADA (
  APSA_ID NUMBER NOT NULL,
  TACE_ANNO NUMBER NOT NULL,
  TACE_MES NUMBER NOT NULL,
  TACE_FECCREA DATE DEFAULT sysdate NOT NULL,
  USUA_USUARIO NUMBER NOT NULL,
  TACE_FECINTEGRA DATE,
  USUA_INTEGRA NUMBER,
  CONSTRAINT PK_AUCO_TARICERTIFICADA PRIMARY KEY (APSA_ID, TACE_ANNO, TACE_MES)
)
```

### 7.2 VAUCO_ANTESLIQUIDAR
```sql
CREATE OR REPLACE FORCE VIEW TARIFICADOR.VAUCO_ANTESLIQUIDAR AS
SELECT V.VALI_ID, V.APSA_ID, V.EMPR_EMPR, V.VALI_ANNO, V.VALI_MES,
       V.VALI_GRUPO, V.VALI_VAR, V.VALI_VALOR, V.VALI_FECHACREACION, V.USUA_USUA,
       a.apsa_nomaps, e.empr_nombre, e.empr_propia
FROM auco_validacion V
INNER JOIN auco_apsaseo A ON (v.apsa_id = a.apsa_id)
INNER JOIN auge_empresas E ON (v.empr_empr = e.empr_empr)
```

### 7.3 VAUCO_COSTOS
```sql
CREATE OR REPLACE FORCE VIEW TARIFICADOR.VAUCO_COSTOS AS
-- UNION de 6 fuentes:
-- 1) auco_costosempredivi
-- 2) auco_costosapsempredivi
-- 3) auco_costosapsrelleno
-- 4) auco_costaddccs
-- 5) auco_costosadicionales
-- 6) auco_costosreales
```

### 7.4 VACUO_COSTOSCLUS
```sql
-- DDL disponible en forma estructural (6 columnas)
-- APSA_ID, COST_ANNO, COST_MES, PARA_COSTO20021, PARA_NOMBRE, COST_VALOR
```

### 7.5 AUCO_COSTOSCLUS
```sql
-- DDL disponible en forma estructural (12 columnas)
-- COST_ID, EMPR_EMPR, DIVI_DIVI, PARA_COSTO20021, COST_ANNO, COST_MES,
-- COST_VARIACION, COST_VALOR, COST_MEDIOVALOR, COST_ACOBRAR,
-- COST_FECHACREACION, USUA_USUA
```

### 7.6 VAUCO_ACTICLUS
```sql
-- DDL disponible en forma estructural (9 columnas)
-- APSA_ID, INED_ANNO, INED_MES, INED_CP, INED_M2CCJ,
-- INED_M2LAVJ, INED_TIJ, INED_KLPJ, INED_TMJ
```

## 8. Dependencias Inter-Módulo
- **toneladas**: endpoints `POST /toneladas/qrt` y `POST /toneladas/qa` consumidos por `CostoService.js`.
- **kilometros**: `Calculo.vue` refresca panel LBL vía `KilometrosService` en `actualizaInfoGeneral()`.
- **subcont**: dependencia funcional del cálculo en lógica Oracle de `pk_liquidar` y estructuras relacionadas.

## 9. Flujo de Datos (Trazabilidad)
1. **Actor**: Operador en `Calculo.vue`.
2. **Frontend service**: `CostoService.js` / `Validaciones.js`.
3. **Endpoint backend**: `/api/v1/costos/*`.
4. **Lógica backend**: `costocontroller.*` con SQL/PLSQL directo.
5. **Base de datos**: vistas/tablas `VAUCO_*`, `VACUO_*`, `AUCO_*` + paquetes PL/SQL Oracle.

Cadena crítica:
`Calculo.vue(openVerificar)` → `validapreactualiza` → `pk_validaciones + VAUCO_ANTESLIQUIDAR` →
`Calculo.vue(CalcularTarifas + prechecks)` → `calculartarifas` → `pk_liquidar` →
`Calculo.vue(onCertificar)` → `certificarTarifas` → `INSERT AUCO_TARICERTIFICADA`.

## 10. Hallazgos Críticos
1. **Typo contractual**: `suministros/cenrtificarEditar` bloquea correcciones “cosméticas” sin versionado.
2. **Acople alto en UI**: `Calculo.vue` mezcla transacción, validación, tableros y reportes.
3. **Dependencia Oracle fuerte**: reglas de negocio viven en PL/SQL, no en Node.
4. **Manejo parcial de errores**: `validapreactualiza` hace `catch` con `console.error` y no normaliza respuesta de error.
5. **Orden de bindings no intuitivo** en `actualizar` (`aps, mes, anno`) con potencial de regresión si se “corrige” sin análisis.

## 11. Notas de Migración
- Mantener contratos HTTP AS-IS en una capa BFF durante transición a .NET/Angular.
- Extraer en backend nuevo un Application Service exclusivo para VERIFICAR/CALCULAR/CERTIFICAR.
- Encapsular Oracle por adapters por paquete (`pk_validaciones`, `pk_liquidar`, `pk_costos`, `PK_JSON`).
- En frontend nuevo, separar “flujo transaccional” de “paneles de soporte” para bajar acople.
- Tratar `cenrtificarEditar` como deuda técnica gestionada con estrategia de versionado de API.

## 12. Archivos Relacionados
- `back-tarificador/src/modules/costos/routes.js`
- `back-tarificador/src/modules/costos/controller.js`
- `front-tarificador/src/service/CostoService.js`
- `front-tarificador/src/service/Validaciones.js`
- `front-tarificador/src/views/procesos/Calculo.vue`
- `docs/modulos/fase2-calculo-tarifas/datos/fase2-tablas-vistas.md`
- `docs/modulos/fase2-calculo-tarifas/funcionalidades/fase2-calculo-6pasos.md`
- `docs/modulos/fase2-calculo-tarifas/funcionalidades/fase2-verificar-calcular-certificar-core.md`

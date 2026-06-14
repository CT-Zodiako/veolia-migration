---
title: "Módulo: Subsidios y Contribuciones"
description: "Documentación AS-IS del módulo de subsidios y contribuciones"
phase: "Maestros"
module: "subcont"
version: "1.0.0"
date: "2026-04-29"
status: "AS-IS"
sources:
  - back-tarificador/src/modules/subcont/routes.js
  - back-tarificador/src/modules/subcont/controller.js
  - front-tarificador/src/views/suministros/SubCon.vue
  - front-tarificador/src/views/proyecciones/SubsidiosContribuciones.vue
  - front-tarificador/src/service/SubConService.js
  - front-tarificador/src/service/ProyService.js
  - TARIFICADOR.AUCO_APSSUBSCONT
  - TARIFICADOR.AUCO_APSEMPRDIVI
  - TARIFICADOR.PROY_APSSUBSCONT
  - TARIFICADOR.PROY_SUBSCONTEMP
---

# Módulo: Subsidios y Contribuciones (subcont/subcon)

## 1. Resumen Ejecutivo

El módulo implementa un **CRUD completo expuesto en 6 endpoints** bajo prefijo runtime `subcon`, aunque el código backend vive en `subcont`.

- **Naming mismatch**: contexto/módulo `subcont` vs rutas/FE `subcon`.
- **Cobertura funcional**:
  - Operativo: `SubCon.vue` + `SubConService.js` contra `/api/v1/subcon/*`.
  - Proyecciones: `SubsidiosContribuciones.vue` + `ProyService.js` contra `/api/v1/proyecciones/*subcont*`.
- **Dependencia con Fase 2**: no hay consumo directo desde `Calculo.vue`; la relación es **indirecta** por lógica PL/SQL Oracle en cálculo tarifario.
- **Estado AS-IS**: existen defectos críticos en `PUT /editar` y `DELETE /eliminar/:id` que forman parte del comportamiento observado.

---

## 2. Base de Datos

### 2.1 AUCO_APSSUBSCONT (principal)

```sql
CREATE TABLE "TARIFICADOR"."AUCO_APSSUBSCONT"
(
  "SUCO_ID" NUMBER NOT NULL ENABLE,
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "EMPR_EMPR" NUMBER NOT NULL ENABLE,
  "DIVI_DIVI" NUMBER NOT NULL ENABLE,
  "CLAS_CLASE" NUMBER NOT NULL ENABLE,
  "SUCO_ANNO" NUMBER NOT NULL ENABLE,
  "SUCO_MES" NUMBER NOT NULL ENABLE,
  "PARA_TIPPRED20016" NUMBER(*,0) NOT NULL ENABLE,
  "SUCO_VALOR" FLOAT(126) DEFAULT 0 NOT NULL ENABLE,
  "SUCO_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "SUCO_FECHACREACION" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  CONSTRAINT "PK_AUCO_APSSUBSCONT" PRIMARY KEY ("SUCO_ID") USING INDEX ENABLE
);
```

### 2.2 AUCO_APSEMPRDIVI (lookup)

```sql
CREATE TABLE "TARIFICADOR"."AUCO_APSEMPRDIVI"
(
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "EMPR_EMPR" NUMBER NOT NULL ENABLE,
  "DIVI_DIVI" NUMBER NOT NULL ENABLE,
  "APEM_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "APEM_FECHACREACION" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  "APSA_UBICACION" NUMBER DEFAULT 0,
  CONSTRAINT "PK_AUCO_APSEMPRDIVI" PRIMARY KEY ("APSA_ID","EMPR_EMPR","DIVI_DIVI") USING INDEX ENABLE,
  CONSTRAINT "AUCO_APEMPDIV_APSA_ID_FKEY" FOREIGN KEY ("APSA_ID") REFERENCES "TARIFICADOR"."AUCO_APSASEO" ("APSA_ID") ENABLE,
  CONSTRAINT "AUCO_APEMPDIV_DIVI_DIVI_FKEY" FOREIGN KEY ("DIVI_DIVI") REFERENCES "TARIFICADOR"."AUGE_DIVIPOLI" ("DIVI_DIVI") ENABLE,
  CONSTRAINT "AUCO_APEMPDIV_EMPR_EMPR_FKEY" FOREIGN KEY ("EMPR_EMPR") REFERENCES "TARIFICADOR"."AUGE_EMPRESAS" ("EMPR_EMPR") ENABLE
);
```

### 2.3 PROY_APSSUBSCONT (proyecciones)

```sql
CREATE TABLE "TARIFICADOR"."PROY_APSSUBSCONT"
(
  "SUCO_ID" NUMBER NOT NULL ENABLE,
  "PROY_ID" NUMBER NOT NULL ENABLE,
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "CLAS_CLASE" NUMBER NOT NULL ENABLE,
  "SUCO_ANNO" NUMBER NOT NULL ENABLE,
  "SUCO_MES" NUMBER NOT NULL ENABLE,
  "SUCO_VALOR" FLOAT(126) DEFAULT 0 NOT NULL ENABLE,
  "SUCO_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "SUCO_FECHA" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  CONSTRAINT "PK_PROY_APSSUBSCONT" PRIMARY KEY ("SUCO_ID") USING INDEX ENABLE
);
```

### 2.4 PROY_SUBSCONTEMP (proyecciones temp)

```sql
CREATE TABLE "TARIFICADOR"."PROY_SUBSCONTEMP"
(
  "SUCO_ID" NUMBER NOT NULL ENABLE,
  "PROY_ID" NUMBER NOT NULL ENABLE,
  "APSA_ID" NUMBER NOT NULL ENABLE,
  "CLAS_CLASE" NUMBER NOT NULL ENABLE,
  "SUCO_ANNO" NUMBER NOT NULL ENABLE,
  "SUCO_MES" NUMBER NOT NULL ENABLE,
  "SUCO_VALOR" FLOAT(126) DEFAULT 0 NOT NULL ENABLE,
  "SUCO_ESTADO" NUMBER DEFAULT 1 NOT NULL ENABLE,
  "SUCO_FECHA" DATE DEFAULT sysdate,
  "USUA_USUA" NUMBER NOT NULL ENABLE,
  CONSTRAINT "PKPROY_SUBSCONTEMP" PRIMARY KEY ("SUCO_ID") USING INDEX ENABLE
);
```

### 2.5 Secuencias

```sql
CREATE SEQUENCE "TARIFICADOR"."SAUCO_APSSUBSCONT" MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 21586 CACHE 20 NOORDER NOCYCLE;
CREATE SEQUENCE "TARIFICADOR"."SPROY_SUBSCONTEMP" MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 41 CACHE 20 NOORDER NOCYCLE;
```

---

## 3. API Backend

Prefijo montado: `app.use('/api/v1/subcon', require('./modules/subcont/routes'))`.

### 3.1 POST /api/v1/subcon/consulta

**Body**: `{ aps, anno, mes }`

```sql
SELECT * FROM auco_apssubscont WHERE apsa_id = :1 AND suco_anno = :2 AND suco_mes = :3
```

**Respuesta AS-IS**: `res.send(array)` (array plano).

### 3.2 POST /api/v1/subcon/crear

**Body**: `{ aps, anno, mes, valores[] }`, usuario desde token `req.SISU_ID`.

SQL lookup previo:

```sql
SELECT * FROM AUCO_APSEMPRDIVI where APSA_ID = :1 AND APEM_ESTADO = 1
```

SQL insert por cada item de `valores`:

```sql
INSERT INTO AUCO_APSSUBSCONT (SUCO_ID, APSA_ID, EMPR_EMPR, DIVI_DIVI, CLAS_CLASE, SUCO_ANNO, SUCO_MES, PARA_TIPPRED20016, SUCO_VALOR, SUCO_ESTADO, SUCO_FECHACREACION, USUA_USUA) VALUES(SAUCO_APSSUBSCONT.NEXTVAL, :1, :2, :3, :4, :5, :6, :7, :8, :9, CURRENT_DATE, :10)
```

Mapeo relevante AS-IS: `PARA_TIPPRED20016 = 2` (fijo), `CLAS_CLASE = valor.id`, `SUCO_VALOR = valor.val`.

### 3.3 PUT /api/v1/subcon/editar (⚠️ bug en SQL)

**Body**: `{ aps, anno, mes, valores[] }`

```sql
UPDATE AUCO_APSSUBSCONT SET suco_valor = :1 WHERE apsa_id = :2 AND suco_anno = :2 AND suco_mes = :3 AND CLAS_CLASE = :4
```

⚠️ **Defecto**: placeholders/binds inconsistentes.
- Binds enviados: `[valor.val, aps, anno, mes, valor.id]`
- `suco_anno` compara contra `:2` (aps) en vez de `anno`.

### 3.4 GET /api/v1/subcon/

```sql
SELECT * FROM auco_apsaseo WHERE apsa_estado = 1
```

### 3.5 GET /api/v1/subcon/:id (placeholder)

⚠️ Endpoint definido pero **sin implementación real** de consulta por ID.

### 3.6 DELETE /api/v1/subcon/eliminar/:id (⚠️ roto)

SQL actual en controller:

```sql
UPDATE auco_apsaseo SET suco_estado = 0 WHERE apsa_id = :1  AND suco_anno = :2 AND suco_mes = :3)
```

⚠️ **Defectos**:
- route/controller usan `anno` y `mes` no definidos en la ruta;
- tabla objetivo `auco_apsaseo` no es coherente con columnas `suco_*`;
- paréntesis final extra en SQL.

---

## 4. Frontend

### 4.1 SubCon.vue (operativo)

- Vista operativa principal del módulo.
- Consulta con `getSubCon(aps, annos, meses)`.
- Crea/edita con `setsubCon(...)` / `uptdsubCon(...)`.
- Payload principal: `valores[]` con objetos `{ id, val }` (clases 1..9).

### 4.2 SubsidiosContribuciones.vue (proyecciones)

- Vista de proyecciones para subsidios/contribuciones.
- No consume `/api/v1/subcon/*` directamente; consume endpoints de `/api/v1/proyecciones/*`.

### 4.3 SubConService.js

- `POST subcon/consulta`
- `POST subcon/crear`
- `PUT subcon/editar`

### 4.4 ProyService.js

- `POST /api/v1/proyecciones/consultasubcont`
- `POST /api/v1/proyecciones/editarPorcSubCon`

SQL AS-IS relacionado a proyecciones (`proyecciones/controller.js`):

```sql
SELECT CLAS_CLASE , SUCO_VALOR FROM PROY_APSSUBSCONT WHERE APSA_ID = :1 AND PROY_ID = :2 AND  SUCO_ANNO = :3 AND SUCO_MES  = :4
```

```sql
DELETE PROY_SUBSCONTEMP
```

```sql
INSERT PROY_SUBSCONTEMP
```

---

## 5. Flujo de Datos (Trazabilidad)

### Flujo operativo (maestros)

Actor → `SubCon.vue` → `SubConService.js` → `/api/v1/subcon/*` → `subcont/routes.js` → `subcont/controller.js` → `AUCO_APSSUBSCONT` (+ lookup `AUCO_APSEMPRDIVI`).

### Flujo de proyecciones

Actor → `SubsidiosContribuciones.vue` → `ProyService.js` → `/api/v1/proyecciones/consultasubcont|editarPorcSubCon` → `proyecciones/controller.js` → `PROY_APSSUBSCONT` / `PROY_SUBSCONTEMP`.

### Relación con Fase 2

- **No hay consumo directo desde `Calculo.vue`** ni desde `CostoService.js` hacia `/subcon`.
- La dependencia de negocio es **indirecta** y se materializa en procesos PL/SQL Oracle del cálculo tarifario.

---

## 6. Hallazgos Críticos

1. **Mismatch naming** (`subcont` vs `subcon`) en backend, rutas y frontend.
2. **Bug crítico en `PUT /editar`** por placeholders SQL inconsistentes (`suco_anno = :2`).
3. **`DELETE /eliminar/:id` roto** por contrato de ruta y SQL inválido/inconsistente.
4. **Contrato de respuesta heterogéneo** (`consulta` devuelve array plano; FE también evalúa formas con `status/res`).
5. **Dependencia Fase 2 no explícita en FE**: vive en lógica de BD, lo que dificulta trazabilidad funcional si no se documenta.

---

## 7. Notas de Migración

- Mantener compatibilidad de ruta legacy `/api/v1/subcon` durante transición (alias/capa de compatibilidad).
- Separar en TO-BE:
  - contrato funcional canónico,
  - deuda técnica heredada (bugs SQL/rutas),
  - plan de corrección sin romper consumidores actuales.
- Introducir DTOs explícitos para normalizar respuestas backend.
- Registrar la dependencia con Fase 2 como **contrato de negocio DB/PLSQL**, no como dependencia HTTP directa.

---

## 8. Archivos Relacionados

- `back-tarificador/src/app.js`
- `back-tarificador/src/modules/subcont/routes.js`
- `back-tarificador/src/modules/subcont/controller.js`
- `back-tarificador/src/modules/proyecciones/routes.js`
- `back-tarificador/src/modules/proyecciones/controller.js`
- `front-tarificador/src/views/suministros/SubCon.vue`
- `front-tarificador/src/views/proyecciones/SubsidiosContribuciones.vue`
- `front-tarificador/src/service/SubConService.js`
- `front-tarificador/src/service/ProyService.js`
- `front-tarificador/src/views/procesos/Calculo.vue` (referencia de no consumo directo)
- `front-tarificador/src/service/CostoService.js` (referencia de no consumo directo)

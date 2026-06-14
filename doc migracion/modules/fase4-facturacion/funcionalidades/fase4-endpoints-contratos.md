---
modulo: fase4-facturacion
fase: 4
version: v1
estado: implementado_as_is
estado_ddl: completo
fuentes:
  - sdd/flujo-tarifas/fase4/explore
  - sdd/flujo-tarifas/fase4/spec
trazabilidad: actor-frontend-endpoint-backend-db
---

# Endpoints y contratos — Facturación

## Contrato común

- Método: `POST`
- Body: `{ aps, anno, mes }`
- Header observado: `x-access-token`
- Respuesta: colección de filas (`[]` si no hay datos)

## 1) `/api/v1/facturacion/facturacion`

- Controller: `facturacion`
- SQL:

```sql
SELECT *
FROM VACUO_FACTURACION
WHERE APSA_ID = :1 AND TARI_ANNO = :2 AND TARI_MES = :3
```

## 2) `/api/v1/facturacion/detafacturacion`

- Controller: `detallefacturacion`
- SQL:

```sql
SELECT *
FROM VACUO_DETAFACTURACION
WHERE APSA_ID = :1 AND RETA_ANNO = :2 AND RETA_MES = :3
```

## 3) `/api/v1/facturacion/facturacionclus`

- Controller: `facturacionclus`
- SQL:

```sql
SELECT *
FROM VACUO_FACTURACIONCLUS
WHERE APSA_ID = :1 AND TARI_ANNO = :2 AND TARI_MES = :3
```

## 4) `/api/v1/facturacion/facturaciondinc`

- Controller: `facturaciondinc`
- SQL:

```sql
SELECT *
FROM VACUO_FACTURACIONDINC
WHERE APSA_ID = :1 AND TARI_ANNO = :2 AND TARI_MES = :3
```

Nota AS-IS: esta vista incorpora lógica con `LEFT JOIN` para conservar filas aun con datos parciales de incentivos.

## 5) `/api/v1/facturacion/facturacionelectronica`

- Controller: `facturacionelectronica`
- SQL:

```sql
SELECT *
FROM VAUCO_FATELECTRONICA
WHERE codaps = :1 AND anno = :2 AND mes = :3
```

## Diferencias de filtro relevantes

| Endpoint | Claves de filtro |
|---|---|
| 1, 3, 4 | `APSA_ID`, `TARI_ANNO`, `TARI_MES` |
| 2 | `APSA_ID`, `RETA_ANNO`, `RETA_MES` |
| 5 | `codaps`, `anno`, `mes` |

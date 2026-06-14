# modulo

- nombre: `<module-name>`
- owner: `<equipo/persona>`
- version_doc: `v1`
- alcance_as_is:
  - Backend: `<rutas/controladores legacy>`
  - Frontend: `<vistas/servicios legacy>`
  - DB: `<esquemas/tablas principales>`

---

## objetivo

Migrar el módulo `<module-name>` con **paridad AS-IS** (sin expansión funcional), preservando contratos, flujos y comportamientos legacy explícitos.

---

## actores

- `<actor-1>`
- `<actor-2>`
- `<actor-3>`

---

## funcionalidades (capabilities)

### F-XXX-01 — `<nombre capability>`

- flujo:
  1. ...
  2. ...
  3. ...
- frontend:
  - `<archivo/componente>`
- backend:
  - `<método> <endpoint>`
- db:
  - `<tablas>`
- trazabilidad:
  - `<referencias de código legacy>`
- estado:
  - `implementado_as_is | pendiente | en_validacion`

> Repetir F-XXX-02..N

---

## endpoints_catalog (contrato ejecutable)

Base: `<base-path>`

| Método | Path | Auth requerida | Request ejemplo | Response OK ejemplo | Errores esperados | Observaciones AS-IS |
|---|---|---|---|---|---|---|
| POST | `/x` | `x-access-token` | `{...}` | `200 {...}` | `403 {...}`, `401 {...}` | `<quirk legacy>` |

> Importante: incluir JSON reales por endpoint (mínimo 1 OK + 1 error).

---

## matriz_auth_rutas

| Endpoint | Protegida | Regla token | Mensaje faltante | Mensaje inválido/dead | Excepción legacy |
|---|---|---|---|---|---|
| `/x` | Sí/No | `x-access-token` | `No existe token de verificacion` | `No Autorizado!` | Sí/No |

---

## contratos_as_is_no_normalizar

Lista de comportamientos raros que **se preservan** en migración:
- `<ej: body vacío en éxito>`
- `<ej: campo con typo legacy>`
- `<ej: ruta pública sensible>`

---

## semillas_minimas_db (para probar UI)

### Datos obligatorios
- tabla: `<tabla-1>` -> registros mínimos: `<cantidad>`
- tabla: `<tabla-2>` -> registros mínimos: `<cantidad>`

### Script seed de ejemplo
```sql
-- INSERTs mínimos para que vistas/listados/selectores carguen
```

---

## ddl_modulo

### objetos_requeridos
- `<tabla/secuencia/index>`

### estado_ddl
- `<objeto>`: `validado | pendiente`

---

## plan_pruebas_r (obligatorio para cierre)

| Requisito | Escenario | Tipo prueba | Evidencia requerida | Estado |
|---|---|---|---|---|
| R-XXX-01 | `<escenario>` | smoke/integration | `test passing + output` | pass/fail |
| R-XXX-02 | `<escenario>` | smoke/integration | `test passing + output` | pass/fail |

> Debe existir al menos 1 prueba ejecutable por requisito R-*.

---

## definicion_de_cierre (DoD)

Para declarar módulo `CLOSED`:
- [ ] Contratos endpoint (status + shape) validados
- [ ] Matriz auth validada (403/401/rutas públicas)
- [ ] Seeds mínimos cargados y UI funcional
- [ ] Pruebas R-* ejecutables pasando
- [ ] Riesgos no bloqueantes documentados con owner
- [ ] Verify final en `PASS` (sin CRITICAL)

---

## riesgos_y_decisiones

| Riesgo | Impacto | Decisión | Owner | Fecha objetivo |
|---|---|---|---|---|
| `<riesgo>` | alto/medio/bajo | `<qué se hará>` | `<responsable>` | `<fecha>` |

---

## desviaciones_formales (si aplica)

| Item | AS-IS | TO-BE | Motivo | Aprobador | Fecha |
|---|---|---|---|---|---|
| `<campo/flujo>` | `<legacy>` | `<nuevo>` | `<razón>` | `<nombre>` | `<fecha>` |

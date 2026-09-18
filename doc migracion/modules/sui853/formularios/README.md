# SUI853 — Formularios

## Alcance y trazabilidad

Configuración **global** de `SUI.CFG_COLUMNA`, sin filtros por APS, empresa, año o mes. No incluye creación, eliminación ni cambios de identidad.

Fuentes contrastadas:
- `front-tarificador/src/sui853/views/configuracion/formularios.vue`
- `front-tarificador/src/sui853/services/configuracionService.js`
- `back-tarificador/src/modules/sui853/configuracion/routes.js`
- `back-tarificador/src/modules/sui853/configuracion/controller.js`

| Legacy | API migrada | Resultado |
| --- | --- | --- |
| POST `sui853Configuracion/getFormularios` | POST `/api/v1/sui853Configuracion/getFormularios` | `{ status: 200, data: fila[] }` |
| POST `sui853Configuracion/updateFormulario` | POST `/api/v1/sui853Configuracion/updateFormulario` | `{ status: 200, data: fila }`, relectura dentro de la transacción |

La ruta `/formularios` hereda `AuthGuard` del layout. Menú `30003`, título `Formularios`; el árbol de permisos existente determina su visibilidad. La API verifica JWT mediante `AuthJwtParityMiddleware` y exige contexto de sistema `3`. No se inventan roles ni permisos de escritura distintos de los existentes; la visibilidad del menú no constituye autorización de API por sí misma.

## Contrato de los 14 campos

Se mantienen nombres JSON mayúsculos mediante `JsonPropertyName`, sin alterar la política global de serialización.

| Campo | Regla de escritura |
| --- | --- |
| FORMATO | Identidad obligatoria, no editable |
| SECCION | Identidad obligatoria, no editable |
| FIELD | Identidad obligatoria, no editable |
| HEADER_TXT | Texto obligatorio, no solo espacios |
| BACKGROUND_COLOR | `R`, `G`, `B` = Rojo, Verde, Azul |
| FILTER_FLAG | `S`, `N` |
| FORMATO_DATO | `texto`, `numero`, `fecha`, `porcentaje` |
| DECIMALES | Entero 0–6 para número/porcentaje; null para texto/fecha |
| ALINEACION | `izq`, `centro`, `der` |
| TOOLTIP | Texto opcional |
| MOSTRAR_HEADER | `S`, `N` |
| INCLUIR_DATA | `S`, `N` |
| ORDEN_HEADER | Entero obligatorio no negativo, límite técnico Int32 |
| ORDEN_DATA | Entero obligatorio no negativo, límite técnico Int32 |

Los catálogos provienen de esta pantalla legacy, no del renderizador de otras pantallas SUI853. ASP.NET valida atributos e `IValidatableObject` antes de la ejecución del controlador. Los campos numéricos fraccionarios o fuera de Int32 no se deserializan como enteros válidos.

## Correcciones y paridad

- El backend legacy anulaba DECIMALES para `porcentaje`, aunque la UI permitía editarlo. Ahora número **y porcentaje** conservan el entero solicitado.
- El servicio legacy devolvía la respuesta Axios completa al guardar. La página migrada toma solamente `data`, verifica identidad y aplica la fila reconsultada.
- SQL fijo con parámetros para todos los valores e identidad compuesta. Un update sin coincidencias devuelve 404. Más de una coincidencia provoca rollback, no una actualización múltiple silenciosa. Relectura y commit pertenecen a la misma transacción.
- No se filtran filas del listado; se agrega orden determinista por formato/sección/orden/field.
- Edición inline de una sola fila, identidad de solo lectura, borrador aislado, Enter para guardar y Escape para cancelar; en TOOLTIP, Ctrl+Enter guarda y Enter agrega una línea. Guardado fallido conserva el borrador y no modifica la fila visible.
- Tabla compartida con filtros, paginación, ordenamiento, exportación y columnas configurables; controles externos de guardar/cancelar permiten recuperar un borrador aunque el usuario filtre la fila o cambie de página.
- Estados de carga, vacío, error recuperable y guardado; prevención de envíos duplicados. Sin título duplicado respecto del layout y con tokens de tema.

## Supuestos Oracle pendientes de confirmar

**No se consultó ni modificó Oracle durante esta implementación.** Las reglas anteriores son contrato de aplicación reconstruido desde legacy, no DDL verificado.

1. Confirmar tipos, longitudes, semántica BYTE/CHAR, nulabilidad y constraints reales de las 14 columnas. No se inventan límites de texto sin evidencia del esquema.
2. Confirmar unicidad efectiva de `(FORMATO, SECCION, FIELD)` y ausencia de claves nulas. La defensa transaccional detecta múltiples coincidencias, pero no sustituye un constraint.
3. Confirmar que DECIMALES acepta null para texto/fecha y los valores 0–6 para porcentaje. No se reparan automáticamente datos históricos fuera del catálogo.
4. Confirmar permisos SELECT/UPDATE del usuario de aplicación, triggers y valores calculados. La relectura devuelve lo realmente persistido; cadenas vacías pueden volver como null por semántica Oracle.
5. Verificar binds con el proveedor Oracle instalado; los parámetros se agregan en el orden de aparición SQL, incluyendo una colección separada para la relectura.
6. No existe token de versión en el contrato legacy: dos usuarios pueden sobrescribirse (última escritura gana). No se inventó concurrencia optimista.
7. Antes de habilitar escritura en producción, confirmar si se requiere un permiso servidor específico de menú 30003 además de JWT/sistema 3. Esta migración no atribuye esa política a un catálogo Oracle no verificado.

## Validación pendiente del orquestador

No se ejecutaron tests ni builds por instrucción expresa. Existe un bloqueo de compilación ajeno en el proyecto de tests, que no se modifica aquí.

`backend/Veolia.Api.Tests/Sui853FormulariosContractTests.cs` cubre los 14 nombres exactos bajo opciones JSON web, catálogos válidos/inválidos, obligatoriedad, órdenes, aplicabilidad decimal, paso de decimales de porcentaje por controlador/repositorio simulado, rechazo de contexto/sistema, fila reconsultada, 404 y errores saneados. Son tests unitarios: no demuestran persistencia Oracle ni ejecución real del middleware/model binding HTTP.

Pendientes: compilación Angular/.NET; tests focalizados; HTTP real con JWT ausente/inválido/válido y payloads inválidos; pruebas de navegador para edición, filtros, paginación, teclado, cancelación, doble envío y errores. Cualquier prueba de persistencia requiere un entorno y autorización explícitos independientes. No hay pruebas automatizadas de frontend nuevas porque el único archivo de tests autorizado es el contrato backend.

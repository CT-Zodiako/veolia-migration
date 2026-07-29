---
name: veolia-ui-style
description: Sistema de diseño y convenciones de UI del frontend Angular de Veolia (tokens de color, modo oscuro, patrones de tabla/modal/picklist, confirm dialogs). Usar SIEMPRE que se cree o estilice un componente, pantalla CRUD, modal o tabla nueva en frontend/src/app/components/.
---

# Sistema de diseño — Veolia Migration (frontend)

Convenciones establecidas y ya aplicadas en todo el módulo de Configuración
(Usuarios, APS, Empresas, Sistemas, Permisos, Rellenos, Detallado Tarifas).
Antes de inventar estilos nuevos, replicar estos patrones.

## 1. Tokens de color (obligatorio, nunca hardcodear hex de superficie)

Definidos en `frontend/src/styles.css`, con set claro (`:root`) y oscuro
(`.app-dark`). Se aplican con `var(--token)`.

| Token | Uso |
|---|---|
| `--color-bg-page` | Fondo general de la página |
| `--color-bg-card` | Fondo de tarjetas, tablas, modales |
| `--color-bg-soft` | Fondo hover sutil |
| `--color-bg-card-glass` | Tarjeta translúcida sobre fondo de marca (ej. login) |
| `--color-border` / `--color-border-soft` | Bordes neutros |
| `--color-text-primary` / `--color-text-body` / `--color-text-secondary` / `--color-text-muted` | Jerarquía de texto |
| `--color-bg-danger-soft` / `--color-border-danger-soft` | Fondo/borde de mensajes de error |
| `--color-bg-success-soft` / `--color-border-success-soft` / `--color-text-success` | Mensajes de éxito |
| `--color-brand-strong` | Rojo de marca para TEXTO sobre superficie neutra (títulos h2/h3, tab activo) |
| `--color-brand-medium` | Rojo de marca para hover de texto |
| `--color-brand-accent` | Rojo de marca para texto de error/links/foco de inputs |

### Regla clave: marca vs. superficie

- **Fondos/gradientes de marca fijos** (sidebar, botones primarios, gradiente de
  login, barra activa de tabs) usan el hex literal `#f10400`/`#c40300`/`#780200`/`#9c0300`
  y **NO cambian** entre modo claro/oscuro — son parte de la identidad visual.
- **Texto en rojo sobre una superficie que sí cambia de tema** (títulos, links,
  mensajes de error) usa `var(--color-brand-strong|medium|accent)`, que se
  aclaran automáticamente en modo oscuro para mantener contraste.
- Nunca usar `--color-brand-*` como `background` de un botón; nunca usar el hex
  literal como `color` de texto sobre una tarjeta/fondo neutro.

## 2. Modo oscuro

- Se activa agregando la clase `app-dark` a `<html>` (`ThemeService` en
  `frontend/src/app/services/theme.service.ts`, persiste en `localStorage`
  bajo `theme:oscuro`).
- PrimeNG lo toma solo con `darkModeSelector: '.app-dark'` en `main.ts` —
  las tablas, diálogos y checkboxes de PrimeNG se oscurecen sin trabajo extra.
- Todo CSS propio (no-PrimeNG) debe usar los tokens de la sección 1, nunca
  hex fijos, para que el toggle los alcance.

## 3. Estructura de una pantalla CRUD (lista + modal)

Referencia completa: `aps-config.component.{ts,html,css}`.

```css
.xxx-container { max-width: 900px /* o 1200px si hay muchas columnas */; margin: 0 auto; padding: 24px; }

.xxx-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 2px solid var(--color-border);
}
.xxx-header h2 { color: var(--color-brand-strong); font-size: 28px; font-weight: 700; margin: 0; }

.table-container {
  background: var(--color-bg-card); border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden;
}

.error-message   { background: var(--color-bg-danger-soft); border: 1px solid var(--color-border-danger-soft); color: var(--color-brand-accent); padding: 12px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
.success-message { background: var(--color-bg-success-soft); border: 1px solid var(--color-border-success-soft); color: var(--color-text-success); padding: 12px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
```

### Regla: no repetir el título de la pantalla — ya lo muestra la barra superior

La barra superior (`layout.component.ts`, método `getPageTitle()`) mapea cada
ruta a un título y lo muestra siempre arriba, para toda pantalla registrada
ahí. Por eso **ninguna pantalla debe volver a mostrar su propio nombre**
adentro del contenido — nada de `.xxx-header` con `<h2>Título</h2>`, ni
`<p-card header="Título">` usando el mismo texto. Se ve como un "h1"
duplicado apenas se entra a la pantalla.

Al crear o tocar una pantalla:
1. Verificar que su ruta tenga un `case` en `getPageTitle()` — si no lo
   tiene, agregarlo (mismo texto que usa `sidebar-menu.service.ts` para esa
   ruta). Sin esto, la pantalla se queda sin título en ningún lado.
2. La pantalla en sí arranca directo en su primera `.card-section` (o
   `<p-card>` sin el atributo `header`, si se usa el patrón "Tabla simple"
   de la sección 8) — nunca con un título propio repitiendo el de la barra.

Ya corregido bajo esta regla: las 3 pantallas de PGIRS, Información
Generales/Informe Proyecciones, Crear Proyección y las 4 pantallas de
Reversiones (Ejecutar, Autorización, Histórico, Detallado Autorización).
`aps-config.component.*` (la referencia de la sección 3) todavía usa el
patrón viejo `.xxx-header h2` — es de antes de esta regla, no se migró
retroactivamente, pero para pantallas nuevas no copiar esa parte del
ejemplo, solo el resto de la estructura (`.table-container`,
`.error-message`/`.success-message`).

### Regla: todo contenido va dentro de una card

Ningún grupo de contenido (selectores, formulario, tabla, lo que sea) va
"suelto" directo sobre el fondo de la página — siempre envuelto en una card
con esta receta (la misma de `.table-container` / `.picklist-card`, reusada
con nombre genérico `.card-section` cuando la pantalla no es una tabla):

```css
.card-section {
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}
```

Si una pantalla tiene varios grupos lógicos distintos (ej. "selectores de
parámetros" y "motivo + acción" en Ejecutar Reversión), cada grupo va en su
propia card, no todos apilados en una sola — así se lee la separación de
pasos/secciones de un vistazo. Referencia: `ejecutar-reversion.component.html`.

La tabla (`p-table`) lleva una fila extra de filtro debajo del header cuando
la columna principal (nombre) es buscable:

```html
<tr class="filter-row">
  <th></th>
  <th><input pInputText type="text" class="column-filter-input" placeholder="Buscar"
      (input)="nombreFilter = $any($event.target).value" /></th>
  ...
</tr>
```
con un getter `filteredXxx` en el `.ts` que filtra por `.toLowerCase().includes(term)`.

### Columna de acciones en tablas — solo ícono, nunca label

Los botones de Editar/Eliminar en la última columna de una tabla van SIN
`label`, solo ícono, chicos, con `severity` semántico — nunca con texto al
lado (eso es de una versión más vieja del patrón, ya no se usa). Referencia:
`aps-config.component.html`, `empresas-config.component.html`,
`rellenos-config-page.component.html`, `usuarios.component.html`.

```html
<td class="actions-cell">
  <p-button icon="pi pi-pencil" severity="info" size="small" (click)="openEdit(item)"></p-button>
  <p-button icon="pi pi-trash" severity="danger" size="small" (click)="eliminar(item)"></p-button>
</td>
```
```css
.actions-cell { display: flex; gap: 4px; flex-wrap: nowrap; }
```
Íconos/severity por acción: Editar `pi-pencil` + `info`, Eliminar `pi-trash`
+ `danger`. Otras acciones puntuales de una pantalla (ej. `usuarios` tiene
"Resetear contraseña") suman su propio `p-button` icon-only con severity
acorde (`pi-key` + `warn` en ese caso) — no reinventar la construcción, solo
agregar un botón más al mismo `.actions-cell`.

### Tabs — solo si hay contenido real detrás, nunca como placeholder

No usar `p-tabs` para "reservar espacio" a futuras funcionalidades ("Detalle
disponible próximamente", "Resumen disponible próximamente"): eso confunde
al usuario con pestañas que no llevan a ningún lado y ensucia el componente
(`activeTab`/`onTabChange` sin uso real). Si una pantalla tiene un selector
de parámetros + una tabla y no hay una segunda vista real que mostrar, van
las dos cosas apiladas, cada una en su propio `.card-section`, sin tabs:

```html
<p-card header="Título de la pantalla">
  <div class="card-section">
    <app-parametros-consulta ...></app-parametros-consulta>
  </div>

  <div class="card-section">
    <!-- tabla, botón de alta, diálogos -->
  </div>
</p-card>
```
```css
.card-section { background: var(--color-bg-card); border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; }
.card-section:last-child { margin-bottom: 0; }
```
Referencia: `pgirs-variables.component.html` (antes tenía `p-tabs` con dos
pestañas placeholder que nunca se implementaron — se sacaron). Agregar tabs
reales solo cuando hay contenido/datos distintos y funcionales detrás de
cada pestaña, nunca como promesa de funcionalidad futura.

## 4. Modal (crear/editar)

Referencia: `empresa-form.component.{ts,html,css}` o `aps-form.component.*`.

**PrimeFlex no está instalado como paquete** — las clases `grid`, `col-12`,
`col-6`, `md:col-4`, `flex`, `flex-column`, `justify-content-*`,
`align-items-*`, `gap-1..4`, `block`, `w-full` que se usan en los modales de
toda la app existen como **utilidades propias definidas en
`frontend/src/styles.css`** (sección "Utilidades" / "Sistema de grillas"),
no vienen de una librería externa. Si un modal nuevo se ve con los labels
pegados al campo o las columnas sin acomodar, no es un typo del componente:
revisar primero que la clase que falta esté agregada en `styles.css` (se
descubrió este hueco recién con el modal de `informe-proyecciones`, faltaban
`grid`/`col-*`/`flex*`/`block`/`gap-*` — ya están agregadas, pero si se usa
una utilidad nueva que no está en esa lista, hay que agregarla ahí, no
asumir que ya existe).

```html
<div class="modal-overlay" (click)="cancel.emit()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h3>{{ isEditing() ? 'Editar X' : 'Nuevo X' }}</h3>
      <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" (click)="cancel.emit()"></p-button>
    </div>
    <form (ngSubmit)="onSubmit()">
      <div class="form-group"><label>Campo</label><input pInputText ... style="width:100%" /></div>
      <div class="checks-grid">
        <div class="check-item">
          <p-checkbox [(ngModel)]="flag" [binary]="true" inputId="x-flag" name="flag"></p-checkbox>
          <label for="x-flag">Etiqueta</label>
        </div>
      </div>
      <p-button type="submit" label="{{ loading ? 'Guardando...' : 'Guardar' }}" [loading]="loading" styleClass="w-full"></p-button>
    </form>
  </div>
</div>
```

CSS: `.modal-overlay` fixed+overlay oscuro, `.modal-content` con
`background: var(--color-bg-card)`, `.checks-grid` en grid 2 columnas,
`.check-item` flex con gap 8px. Checkboxes SIEMPRE con `inputId`+`<label for>`
separado — nunca el `label` inline de `p-checkbox`.

## 5. Confirmar eliminación — NUNCA `window.confirm()`

`window.confirm()` está prohibido (popup nativo del navegador, no tiene estilo).
Usar el `ConfirmDialog` global de PrimeNG:

- Ya está provisto globalmente: `ConfirmationService` en `main.ts` providers,
  `<p-confirmDialog></p-confirmDialog>` en `app.component.ts`.
- En cualquier componente nuevo, solo inyectar `ConfirmationService` y llamar:

```ts
eliminar(item: X): void {
  this.confirmationService.confirm({
    header: 'Eliminar X',
    message: `¿Seguro que querés eliminar "${item.nombre}"?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptButtonStyleClass: 'p-button-danger',
    rejectButtonStyleClass: 'p-button-secondary p-button-text',
    accept: () => this.confirmarEliminar(item)
  });
}
```

Nota (actualizada 2026-07-27): `reliquidacion/reliq-crear` y `subcont` TODAVÍA
usan `window.confirm()` — son candidatos pendientes de migrar, no un patrón a
copiar. `cra/indices-cra` y `proyecciones` ya fueron migrados a
`ConfirmationService` (confirmado en auditoría de VEO-Regulator).
(`aps-config` y `empresas-config`/`rellenos` ya migrados.)

## 6. Pantallas de asignación many-to-many (PickList)

Referencia: `asignacion-sistema.component.*` y `apsx-usuario.component.*`
(ambas dentro de la pestaña "Usuarios").

- Selector de usuario CON búsqueda: `[filter]="true" filterBy="label" filterPlaceholder="Buscar usuario..."`.
- El `label` de cada opción de usuario SIEMPRE es `"${nombre} ${apellido} (${correo})"` —
  nunca solo el nombre (inconsistencia real que se corrigió en `permisos.component.ts`).
- `p-pickList` con búsqueda en cada columna:
  ```html
  <p-pickList [source]="..." [target]="..." sourceHeader="Sin asignar" targetHeader="Asignadas"
    [dragdrop]="true" [showSourceControls]="false" [showTargetControls]="false"
    [filterBy]="'campo'" [showSourceFilter]="true" [showTargetFilter]="true"
    sourceFilterPlaceholder="Buscar..." targetFilterPlaceholder="Buscar...">
    <ng-template let-x pTemplate="item">
      <div class="x-chip"><i class="pi pi-icono"></i><span>{{ x.nombre }}</span></div>
    </ng-template>
    <ng-template pTemplate="emptymessagesource">...</ng-template>
    <ng-template pTemplate="emptymessagetarget">...</ng-template>
  </p-pickList>
  ```
- Wrapper `.picklist-card` (mismo estilo que `.table-container`), subtítulo
  descriptivo bajo el `<h2>` explicando la interacción de arrastrar.

## 7. Tabla con columnas movibles/ocultables/exportables

No reimplementar desde cero: usar el componente ya construido
`<app-tabla-avanzada>` (`frontend/src/app/components/shared/tabla-avanzada.component.ts`).
Trae reorder por drag, ocultar/fijar columnas, vistas guardadas (presets),
toggle de densidad, exportar CSV, guardar vista y pantalla completa (botón
en la misma barra de densidad, cubre todo el viewport incluido el sidebar,
Escape para salir) — todo autocontenido, sin inputs que configurar.

```html
<app-tabla-avanzada [columnas]="misColumnas" [rows]="misFilas"
  storageKey="nombre-unico" nombreExportar="Archivo"></app-tabla-avanzada>
```
Columna: `{ field, header, numero?: boolean, filtrable?: boolean }`. `numero: true`
alinea la celda a la derecha (`celda-numero`) — usarlo solo en columnas de
**valor** (ver la regla de alineación numérica más abajo), no en IDs/códigos.
El filtro por columna (`filtrable: true`) ya viene resuelto por PrimeNG
(`p-columnFilter`) — no armar un `filter-row` a mano encima de esta tabla.

### Celdas personalizadas (edición inline, colores por dato)

Por defecto cada celda renderiza `{{ row[col.field] }}` sin estilo. Para
casos que lo necesitan (edición inline, resaltado de color según el dato),
`<app-tabla-avanzada>` acepta tres inputs opcionales, sin romper a los
consumidores que no los usan:

- `[cellClass]="fn"` — `(row, col) => string`, clase CSS extra por celda
  (ej. resaltar en rojo/verde/azul según un campo de la fila).
- `[cellTemplate]="tpl"` — reemplaza el contenido de TODAS las celdas;
  `let-value` (valor de la celda), `let-row="row"`, `let-col="col"` — dentro
  se decide con `[ngSwitch]="col.field"` qué columnas llevan tratamiento
  especial (traducir código, mostrar un input editable, etc.) y cuáles usan
  el valor tal cual.
- `[accionesTemplate]="tpl"` + `[accionesHeader]="'Acciones'"` — agrega una
  columna final con lo que sea (botones Editar/Guardar, etc.); `let-row` es
  la fila completa.
- `[filaExportable]="fn"` — `(row) => boolean`, filtra qué filas van al CSV
  exportado (por defecto exporta todas). Usarlo cuando `rows` incluye filas
  sintéticas puramente visuales (ej. TOTAL/PROMEDIO agregadas a mano por el
  consumidor) que no deben aparecer en el archivo descargado — ver
  `verificacion-aps.component.ts` (`filaEsExportable`).

Referencia completa (edición inline por fila + traducción de códigos):
`pgirs-variables.component.{ts,html}`. Referencia de `cellClass` para
resaltado de color por dato: `pgirs-resumen.component.{ts,html}` (colores
rojo/verde/azul de comparación PGIRS), `pgirs-informe-variables.component.{ts,html}`
(naranja en "Tipo Ingreso" cuando es MANUAL).

**Ojo con dónde va el CSS de las clases que devuelve `cellClass`/`cellTemplate`**:
las celdas las renderiza el `<td>` de `tabla-avanzada.component.html`, que es
la plantilla del componente HIJO — el `styleUrls` del componente que CONSUME
`<app-tabla-avanzada>` (ej. `pgirs-resumen.component.css`) nunca llega ahí
por el encapsulamiento de Angular (`ViewEncapsulation.Emulated`, cada
componente agrega su propio atributo `_ngcontent-*` y el CSS del padre no
matchea elementos renderizados por el hijo). Cualquier clase de color/estado
usada vía `cellClass`/`cellTemplate` tiene que estar definida en
`tabla-avanzada.component.css` (el componente compartido), NO en el CSS de
la pantalla que lo consume — si no, la clase se aplica al DOM pero no tiene
ningún estilo real y no se nota nada (bug real ya encontrado: los colores de
PGIRS Resumen/Informe Variables "desaparecieron" al mover esas tablas a
`app-tabla-avanzada` hasta mover las reglas `.color-*` al CSS compartido).

### SUI853 legacy: reemplazar `TablaScrollHorizontal.vue` (dos tablas) por UNA `<app-tabla-avanzada>`

Casi todas las vistas de SUI853 en el legacy (`front-tarificador/src/sui853/views/{CFT,CVA,CVNA,comercial}/*.vue`)
usan un componente compartido `TablaScrollHorizontal.vue` que renderiza **dos**
`DataTable` de PrimeNG lado a lado — una tabla "izquierda" (40% ancho, columnas
`SIN_MOVIMIENTO`, siempre con filtro) y otra "derecha" (60%, columnas
`CON_MOVIMIENTO`, con y sin filtro, más columna "Acciones" con botón "Ver") —
sincronizando el scroll horizontal/vertical entre ambas a mano con listeners
de JS (`syncScrolls()`). Es un workaround de Vue2/PrimeVue viejo para simular
columnas fijas; **no replicar ese patrón acá**.

`<app-tabla-avanzada>` ya resuelve columnas fijas nativamente en una sola
tabla (columnas `SIN_MOVIMIENTO` → fijas, columnas `CON_MOVIMIENTO` → el resto,
sin fijar). Para que arranquen fijas de entrada (no solo cuando el usuario
las marca a mano), pasar sus `field` en
`[columnasFijadasPorDefecto]="['ANNO','APS','EMPRESA']"` — el usuario igual
puede des-fijarlas o fijar otras después, esto solo define el estado inicial
(y a qué vuelve "Restaurar columnas"). Migrar así:

- **Filtro por columna**: `filtrable: true` solo en las columnas que en el
  legacy tenían `headersConFiltro` (mismo criterio que hoy separa
  izquierda/derecha) — ya soportado nativo, no hay que portar nada más.
- **Formato de celda** (`formato: 'moneda'|'numero'|'porcentaje'|'fecha'`,
  `decimal`, caso especial `-1 → "NA"`): no existe en `app-tabla-avanzada` de
  fábrica — reproducir con `[cellTemplate]`, replicando la lógica de
  `formatValue()`/`displayValue()` de `TablaScrollHorizontal.vue` (decimales
  configurables, porcentaje detecta si el valor ya viene en 0-1 o en 0-100).
- **Color de fondo por columna** (códigos `G`/`T`/`R` → azul/verde/rojo claro):
  reproducir con `[cellClass]`, agregando las clases de color nuevas a
  `tabla-avanzada.component.css` (NO al CSS de la pantalla — ver nota de
  encapsulamiento más arriba).
- **Tooltip por celda** (`mouse_over`, puede ser string con `{value}` o
  función): dentro del `[cellTemplate]`, `title="..."` en el elemento.
- **Columna "Acciones" con botón "Ver" → modal de detalle**: usar
  `[accionesTemplate]` para el botón, y armar el modal de detalle (grid de
  key/value con todos los campos de la fila, botón copiar por celda) como
  parte del componente de la pantalla — no es responsabilidad de
  `app-tabla-avanzada`.
- **Export CSV**: ya lo trae `<app-tabla-avanzada>` de fábrica (botón
  "Exportar" en la toolbar) — no portar el `exportCSV()` manual del legacy.
- **Paginación**: ya la trae `<app-tabla-avanzada>` (`[filasPorPagina]`,
  `[10,20,50]`) — no portar el `Paginator` manual del legacy.

## 8. Tabla simple (`p-card` + `p-table`, sin columnas movibles)

Para pantallas de solo-listado que no necesitan reorder/ocultar columnas
(no ameritan `<app-tabla-avanzada>`), el patrón es un `p-card` con header
como título y la tabla al 100% del ancho disponible — sin el
`.xxx-container` de max-width de la sección 3, para que ocupe todo el
espacio. Referencia: `historico-reversion.component.html`,
`detallado-autorizacion.component.html`.

```html
<p-card header="Título de la pantalla">
  <p-table
    [value]="filteredRows"
    [loading]="loading"
    [paginator]="true"
    [rows]="10"
    [tableStyle]="{ 'min-width': '100%' }"
  >
    <ng-template pTemplate="header">
      <tr>
        <th>Columna A</th>
        <th>Columna B</th>
      </tr>
      <tr class="filter-row">
        <th><input pInputText type="text" class="column-filter-input" placeholder="Buscar"
            (input)="aFilter = $any($event.target).value" /></th>
        <th><input pInputText type="text" class="column-filter-input" placeholder="Buscar"
            (input)="bFilter = $any($event.target).value" /></th>
      </tr>
    </ng-template>
    ...
  </p-table>
</p-card>
```

- **Paginador, no scroll**: overflow de filas se resuelve cambiando de
  página (`[paginator]="true" [rows]="10"`), NUNCA con `[scrollable]`/
  `scrollHeight` — eso hace scrollear la tabla en vez de paginar, que es lo
  que NO queremos en este patrón. `10` filas por página es el valor
  calibrado para que la card completa (header + fila de filtros + 10 filas +
  paginador) entre en una pantalla típica sin hacer crecer la página — no
  subir el número sin volver a calibrar contra una pantalla real.
- **Filtro por columna, no un único buscador**: cada columna relevante
  (excepto las de texto libre largo tipo "Motivo"/"Descripción") lleva su
  propio `<input>` en una `tr.filter-row`, cada uno ligado a su propio campo
  de filtro (`aFilter`, `bFilter`, ...). En el `.ts`, un getter
  `filteredRows` combina todos los filtros activos con AND, comparando
  `String(valor ?? '').toLowerCase().includes(term)`. Para columnas de fecha,
  formatear con el mismo `DatePipe` (inyectado vía `providers: [DatePipe]`
  en el `@Component`) que se usa para mostrar la celda, así el texto que el
  usuario escribe coincide con lo que ve en pantalla.
  Referencia completa: `historico-reversion.component.{ts,html}`,
  `detallado-autorizacion.component.{ts,html,css}`.
- **Columnas numéricas de valor, alineadas a la derecha**: cualquier columna
  que muestre una cantidad/medida (`Valor`, `Poda`, `Cantidad`, montos, etc.)
  lleva `class="text-right"` tanto en el `<th>` como en cada `<td>` (y en el
  `<input>` si esa celda es editable). Esto NO aplica a IDs/códigos numéricos
  (APS ID, Año, Mes, código de variable) — esos quedan alineados a la
  izquierda como el resto de las columnas de texto/identificador, la regla
  es solo para columnas que representan una magnitud/valor de negocio.
  ```css
  .text-right { text-align: right; }
  ```
  Referencia: `pgirs-variables.component.html` (columna Valor),
  `pgirs-resumen.component.html` (columnas Poda/Césped/Lavado/Playas/Cestas
  Ins/Cestas Man y sus pares "PGIRS").

## 9. Otros componentes compartidos ya construidos (no duplicar)

- `app-exportar-tabla-dialog`, `app-guardar-vista-dialog` — usados por `tabla-avanzada`.
- `app-aps-selector`, `app-anno-selector`, `app-mes-selector`, `app-parametros-consulta` —
  selectores de parámetros de consulta reutilizables. `app-aps-selector` trae
  su propia lista de APS (`AuthService.getApsAsignadas`) — nunca hacerle un
  fetch manual aparte con otro servicio (`ProyeccionesService.listarAps()` u
  otro), eso es lo que generaba un combo con pinta distinta al resto.

  **Regla: en una pantalla de consulta/listado (no de acción destructiva ni
  de alta), la consulta se dispara sola al completar los 3 parámetros, sin
  botón "Consultar"** — usar `[mostrarBoton]="false" [autoConsultar]="true"`.
  `ParametrosConsultaComponent` ya reevalúa "¿están completos los 3
  parámetros?" en cada cambio de cualquiera de los selectores, así que
  también vuelve a consultar solo si el usuario cambia APS/Año/Mes después
  de la primera consulta — no hace falta lógica extra en el componente hijo,
  solo escuchar `(consultar)="consultar()"`.
  Referencia: `pgirs-variables.component.html`.

  Esto es distinto del caso `ejecutar-reversion.component.html` /
  `autorizacion-reversiones.component.html`, donde los selectores solo
  alimentan una acción separada (ejecutar reversión / autorizar) — ahí
  `[mostrarBoton]="false"` sin `autoConsultar` (no hay "consulta" que
  disparar sola, el botón real es otro, fuera del componente de parámetros).

  **APS/Año/Mes se recuerdan solos entre pantallas** — `app-aps-selector`,
  `app-anno-selector` y `app-mes-selector` ya persisten el valor elegido en
  `localStorage` vía `ParametrosConsultaStateService`
  (`frontend/src/app/services/parametros-consulta-state.service.ts`, clave
  `parametros-consulta:{sisuId}:{idSistema}`) y lo restauran solos en
  `ngOnInit` — no hay que escribir nada extra en el componente host para que
  esto funcione, es transversal a toda la app (cualquier pantalla que use
  estos 3 selectores, sueltos o vía `app-parametros-consulta`, hereda la
  persistencia automáticamente). Ojo con un detalle: la restauración solo se
  dispara si el `@Input()` del host llega en `null` — si un componente
  inicializa su propio signal de `anno`/`mes` con un valor por defecto (ej.
  `signal(new Date().getFullYear())`), ese default pisa la restauración y
  nunca se lee lo guardado. Para que la pantalla recuerde de verdad, sus
  signals de `aps`/`anno`/`mes` tienen que arrancar en `null`, no con un
  valor "vivo" — ver `pgirs-variables.component.ts`.
- Sidebar: nunca duplicar la lógica de resolución de menú; usa
  `SidebarMenuService` (`frontend/src/app/services/sidebar-menu.service.ts`).

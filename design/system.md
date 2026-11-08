# Sistema de diseño — Veolia Migration (frontend Angular)

Capturado en solo lectura. Cada entrada nombra su fuente. Solo valores encontrados en las fuentes.

Fuentes leídas:
- `frontend/src/styles.css` — tokens claro (`:root`) y oscuro (`.app-dark`), tipografía base, utilidades.
- `frontend/src/app/components/layout/layout.component.css` — sidebar, barra superior, navegación.
- `frontend/src/app/components/shared/tabla-avanzada.component.css` — densidad de tablas, clases de fila.
- `frontend/src/app/components/infogerenciales/verificacion-aps.component.css` — `.card-section`, fila de parámetros.
- `.agents/skills/veolia-ui-style/SKILL.md` — reglas de uso (marca vs. superficie, cards, tablas, tabs).

## Colores — superficies y texto (`frontend/src/styles.css`)

| Token | Claro (`:root`) | Oscuro (`.app-dark`) | Uso |
|---|---|---|---|
| `--color-bg-page` | `#f1f5f9` | `#0f172a` | Fondo general de página |
| `--color-bg-card` | `#ffffff` | `#1e293b` | Cards, tablas, modales, sidebar, barra superior |
| `--color-bg-soft` | `#f8fafc` | `#172033` | Hover sutil, fila TOTAL (`.fila-total`) |
| `--color-bg-card-glass` | `rgba(255,255,255,0.95)` | `rgba(30,41,59,0.92)` | Card translúcida sobre fondo de marca |
| `--color-border` | `#e2e8f0` | `#334155` | Bordes neutros |
| `--color-border-soft` | `#f1f5f9` | `#1e293b` | Separadores suaves |
| `--color-text-primary` | `#0f172a` | `#f1f5f9` | Títulos, valores clave |
| `--color-text-body` | `#334155` | `#cbd5e1` | Texto de cuerpo (color base de `body`) |
| `--color-text-secondary` | `#64748b` | `#94a3b8` | Metadatos, etiquetas secundarias |
| `--color-text-muted` | `#94a3b8` | `#64748b` | Estado vacío de tabla; no apto para texto pequeño informativo en claro (2.6:1) |
| `--color-scrollbar-track` | `#f1f5f9` | `#1e293b` | Pista de scrollbar |
| `--color-scrollbar-thumb` | `#cbd5e1` | `#475569` | Barra de scrollbar |
| `--color-scrollbar-thumb-hover` | `#94a3b8` | `#64748b` | Barra de scrollbar en hover |
| `--color-bg-book-page` | `#fdfbf3` | `#2a2622` | Papel del "libro" del Dashboard (solo ahí) |

## Colores — estado (`frontend/src/styles.css`)

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-bg-danger-soft` | `#fff2f2` | `#3f1212` | Fondo de mensaje de error; ítem activo del sidebar |
| `--color-bg-danger-soft-alt` | `#ffe6e5` | `#4a1717` | Variante de fondo de error |
| `--color-border-danger-soft` | `#ffcdcc` | `#5c2323` | Borde de mensaje de error |
| `--color-bg-success-soft` | `#f0fdf4` | `#14291d` | Fondo de mensaje de éxito |
| `--color-border-success-soft` | `#bbf7d0` | `#1e4a2f` | Borde de mensaje de éxito |
| `--color-text-success` | `#16a34a` | `#4ade80` | Texto de éxito (en claro 3.3:1: usar solo en texto ≥ 18.66px bold o como acento no textual) |

## Colores — marca

Texto rojo sobre superficie que cambia de tema (`frontend/src/styles.css`):

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-brand-strong` | `#780200` | `#ffa5a3` | Títulos h2/h3, tab activo, ítem activo del sidebar |
| `--color-brand-medium` | `#c40300` | `#ff6966` | Hover de texto |
| `--color-brand-accent` | `#f10400` | `#ff2a26` | Texto de error, links, foco de inputs |

Marca fija, no cambia con el tema (`.agents/skills/veolia-ui-style/SKILL.md`, `layout.component.css`):
`#f10400`, `#c40300`, `#780200`, `#9c0300` — sidebar (`box-shadow: inset 4px 0 0 #f10400`), barra activa de tabs y nav (`inset 3px 0 0 #f10400`), botones primarios, gradiente de login. Fondo del icono activo: `rgba(241, 4, 0, 0.14)`.

Regla: nunca `--color-brand-*` como `background` de botón; nunca hex literal de marca como `color` de texto sobre superficie neutra.

Colores de celda por dato (`tabla-avanzada.component.css`, solo vía `[cellClass]`): `.color-red rgb(250,124,115)`, `.color-green rgb(191,252,184)`, `.color-blue rgb(152,190,243)`, `.color-orange rgb(236,167,16)`, `.color-gray rgb(184,186,184)` (semántica PGIRS); `.sui853-bg-g #edf5ff`, `.sui853-bg-t #ecfdf5`, `.sui853-bg-r #fff1f2` (SUI853).

## Tipografía

- Familia: `'Segoe UI', system-ui, -apple-system, sans-serif`; `line-height: 1.5` — `frontend/src/styles.css` (`body`).
- Título de barra superior: 18px / 600 / `--color-text-primary` — `layout.component.css` (`.top-bar-title`).
- Título h2 de pantalla (patrón viejo, no repetir el título de la barra): 28px / 700 / `--color-brand-strong` — skill §3.
- Navegación: 14px / 500 (activo 700) — `layout.component.css` (`.nav-item`).
- Label de formulario: 13px / 600 / `--color-text-body` — `verificacion-aps.component.css` (`.form-group label`).
- Tabs: 13px, padding `6px 12px` — `frontend/src/styles.css` (`.p-tabs .p-tab`).
- Encabezado de tabla: 12px / 600, `nowrap`, padding `4px 6px` — `tabla-avanzada.component.css`.
- Celda de tabla: 13px, `line-height 1.3`, padding `5px 8px`; compacta 12px, padding `1px 4px` — `tabla-avanzada.component.css`.
- Mensajes y estado vacío: 14px — skill §3, `tabla-avanzada.component.css` (`.tabla-vacia`).

## Espaciado

- Escala de utilidades: 4 / 8 / 12 / 16px (`.mt-1..4`, `.mb-1..4`, `.gap-1..4`) — `frontend/src/styles.css`.
- Padding de contenido: 24px — `layout.component.css` (`.content-area`).
- Card: padding 20px, separación 20px — `verificacion-aps.component.css` (`.card-section`).
- Fila de parámetros: `gap 16px`; APS `flex 0 1 220px`, Año/Mes `flex 0 1 130px` — `verificacion-aps.component.css`.
- Sidebar 260px (colapsado 72px); barra superior 64px, padding `0 24px` — `layout.component.css`.

## Radios

- 12px: cards, tablas, dropdowns — `.card-section`, `.table-container`, `.sistema-dropdown`.
- 14px: ítem de navegación — `layout.component.css` (`.nav-item`).
- 10px: botones de icono, iconos de nav — `layout.component.css`.
- 8px: mensajes de error/éxito — skill §3.
- 4px: scrollbar — `frontend/src/styles.css`.

## Sombras

- Card: `0 1px 3px rgba(0, 0, 0, 0.1)` — `.card-section`, `.table-container`.
- Dropdown flotante: `0 25px 50px -12px rgba(0, 0, 0, 0.25)` — `layout.component.css` (`.sistema-dropdown`).

## Reglas de componentes (`.agents/skills/veolia-ui-style/SKILL.md`)

- Todo grupo de contenido va en una `.card-section`; un grupo lógico por card.
- No repetir el título de la pantalla: la barra superior ya lo muestra (`getPageTitle()`).
- Parámetros APS/Año/Mes con `app-aps-selector`, `app-anno-selector`, `app-mes-selector`; consulta automática al completar los tres, sin botón "Consultar".
- Tablas con reorder/ocultar/exportar: `<app-tabla-avanzada>`; columnas de valor `numero: true` (alineadas a la derecha), IDs/códigos a la izquierda.
- Clases de celda/fila por dato (`.fila-total`, `.fila-promedio`, `.color-*`) se definen en `tabla-avanzada.component.css`.
- Tabs (`p-tabs`) solo con contenido real detrás; tab activo en `--color-brand-strong` con barra `#f10400`.
- Acciones de fila: solo ícono, sin label, `severity` semántico.
- Mensaje error: `--color-bg-danger-soft` + `--color-border-danger-soft` + `--color-brand-accent`, radio 8px, 14px. Éxito: tokens `success` equivalentes.
- Confirmaciones con `ConfirmDialog` de PrimeNG, nunca `window.confirm()`.
- Modo oscuro: clase `app-dark` en `<html>`; todo CSS propio usa tokens.

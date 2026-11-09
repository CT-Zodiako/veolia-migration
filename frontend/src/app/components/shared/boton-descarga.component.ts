import { Component, Input } from '@angular/core';

export type TipoArchivoDescarga = 'xlsx' | 'csv' | 'pdf' | 'docx' | 'zip';

/** Hojas de cálculo: banda verde; el resto, gris (el color refuerza, la extensión escrita informa). */
const HOJAS: TipoArchivoDescarga[] = ['xlsx', 'csv'];

/** Dibujo interior de cada ícono (viewBox 24×28), sobre la hoja y por encima de la banda. */
const GLIFO: Record<TipoArchivoDescarga, string> = {
  xlsx: 'M7 5.5h10v7.5H7z M7 8h10 M7 10.5h10 M11 5.5v7.5',
  csv: 'M7 6.5h3.5 M12.5 6.5h4.5 M7 9.5h4.5 M13.5 9.5h3.5 M7 12.5h2.5 M11.5 12.5h5.5',
  pdf: 'M7 6h10 M7 8.5h10 M7 11h7',
  docx: 'M7 6h10 M7 8.5h10 M7 11h10 M7 13.5h5',
  zip: 'M11 2v1.5h2V5h-2v1.5h2V8h-2v1.5h2V11h-2 M10.5 11.5h3v2.5h-3z'
};

/**
 * Botón estándar de descarga de archivos (design/descargas-estandar/01-boton-secundario.html): enlace contorneado con
 * ícono del tipo de archivo, etiqueta «verbo + objeto» y una línea meta «EXTENSIÓN · tamaño» que es la descripción
 * accesible. Solo archivos estáticos (`<a href download>`): el navegador muestra la descarga, sin progreso falso.
 * Los estados «Descargando…»/«Descargado»/error de la especificación son para descargas pedidas al API (blob);
 * ninguna pantalla las usa todavía, así que no están implementados.
 */
@Component({
  selector: 'app-boton-descarga',
  standalone: true,
  template: `
    <a class="dl" [href]="href" [attr.download]="nombreArchivo" [attr.aria-describedby]="meta ? metaId : null">
      <svg class="ficon" [class.ficon-hoja]="esHoja" [class.ficon-otro]="!esHoja" width="24" height="28" viewBox="0 0 24 28" aria-hidden="true" focusable="false">
        <path class="ficon-hoja-papel" d="M4.5 1h10.8L21 6.7v18.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 25.5v-23A1.5 1.5 0 0 1 4.5 1z" />
        <path class="ficon-pliegue" d="M15.2 1.2v4.6c0 .5.4.9.9.9h4.7" />
        <path class="ficon-glifo" [attr.d]="glifo" />
        <rect class="ficon-banda" x="1" y="16" [attr.width]="anchoBanda" height="8" rx="1.5" />
        <text class="ficon-ext" [attr.x]="(anchoBanda + 2) / 2" y="22.1" text-anchor="middle">{{ extension }}</text>
      </svg>
      <span class="txt">
        <span class="lbl">{{ etiqueta }}</span>
        @if (meta) {
          <span class="meta" [id]="metaId">{{ meta }}</span>
        }
      </span>
      <svg class="flecha" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path d="M8 2v8.5M4.5 7.2 8 10.7l3.5-3.5M3 13.5h10" />
      </svg>
    </a>
  `,
  styles: [`
    :host { display: inline-flex; max-width: 100%; }
    .dl {
      display: inline-flex; align-items: center; gap: 10px; min-height: 44px; max-width: 100%;
      padding: 6px 12px 6px 10px; border: 1px solid var(--p-select-border-color, #cbd5e1); border-radius: 10px;
      background: var(--color-bg-card); color: var(--color-text-primary); text-decoration: none; text-align: left;
      transition: background-color .15s, border-color .15s;
    }
    .dl:hover { background: var(--color-bg-soft); border-color: var(--color-text-secondary); }
    .dl:focus-visible { outline: 2px solid var(--color-brand-accent); outline-offset: 2px; }
    .txt { display: flex; flex-direction: column; min-width: 0; }
    .lbl { font-size: 13.5px; font-weight: 600; line-height: 1.25; }
    .meta { font-size: 12px; color: var(--color-text-secondary); line-height: 1.3; }
    .ficon { flex: none; }
    .ficon-hoja-papel { fill: var(--color-bg-card); stroke: var(--color-text-secondary); stroke-width: 1.2; }
    .ficon-pliegue { fill: none; stroke: var(--color-text-secondary); stroke-width: 1.2; }
    .ficon-glifo { fill: none; stroke-width: 1.2; stroke-linecap: round; }
    .ficon-ext { fill: var(--color-bg-card); font: 700 6.2px 'Segoe UI', system-ui, sans-serif; letter-spacing: .2px; }
    .ficon-hoja .ficon-glifo { stroke: var(--color-text-success); }
    .ficon-hoja .ficon-banda { fill: var(--color-text-success); }
    .ficon-otro .ficon-glifo { stroke: var(--color-text-secondary); }
    .ficon-otro .ficon-banda { fill: var(--color-text-secondary); }
    .flecha { flex: none; color: var(--color-text-secondary); }
    .flecha path { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    @media (prefers-reduced-motion: reduce) { .dl { transition: none; } }
  `]
})
export class BotonDescargaComponent {
  private static siguienteId = 0;

  /** URL del archivo estático (ej. `assets/layout/planos/plano_usuarios.csv`). */
  @Input({ required: true }) href!: string;
  /** Nombre real con que se guarda el archivo (atributo `download`). */
  @Input({ required: true }) nombreArchivo!: string;
  /** «Verbo + objeto» en mayúscula inicial, sin emoji, extensión ni tamaño (ej. «Descargar plantilla»). */
  @Input({ required: true }) etiqueta!: string;
  @Input({ required: true }) tipo!: TipoArchivoDescarga;
  /** «EXTENSIÓN · tamaño» con el tamaño del archivo publicado (ej. «CSV · < 1 KB · 13 columnas»). */
  @Input() meta = '';

  readonly metaId = `boton-descarga-meta-${BotonDescargaComponent.siguienteId++}`;

  get esHoja(): boolean {
    return HOJAS.includes(this.tipo);
  }

  get extension(): string {
    return this.tipo.toUpperCase();
  }

  get glifo(): string {
    return GLIFO[this.tipo];
  }

  /** La banda se ensancha para las extensiones de 4 letras (XLSX, DOCX). */
  get anchoBanda(): number {
    return this.tipo.length > 3 ? 19 : 16;
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface ColumnaGenerica {
  field: string;
  header: string;
}

/**
 * Tabla liviana de solo lectura, sin toolbar ni paginador: las columnas se
 * reparten en partes iguales para ocupar todo el ancho de su contenedor
 * (`table-layout: fixed`), pensada para varias tablas chicas conviviendo
 * lado a lado dentro de una card (ver `resumen-variables.component.ts`). No
 * reemplaza a `app-tabla-avanzada` (esa sigue siendo la tabla de uso general
 * con columnas movibles/exportables).
 */
const FORMATO_NUMERO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 6 });

@Component({
  selector: 'app-tabla-generica',
  standalone: true,
  imports: [CommonModule],
  template: `
    <table class="tabla-generica">
      <thead>
        <tr>
          <th *ngFor="let col of columnas">{{ col.header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of rows">
          <td *ngFor="let col of columnas" [class.celda-numero]="esNumerico(row[col.field])">
            {{ formatearValor(row[col.field]) }}
          </td>
        </tr>
        <tr *ngIf="!rows.length">
          <td [attr.colspan]="columnas.length" class="tabla-generica-vacio">Sin registros</td>
        </tr>
      </tbody>
    </table>
  `,
  styles: [`
    .tabla-generica {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      font-size: 0.85rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border-soft);
    }
    .tabla-generica th,
    .tabla-generica td {
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--color-border-soft);
      white-space: normal;
      overflow-wrap: break-word;
      text-align: left;
      color: var(--color-text-body);
    }
    .tabla-generica th {
      color: var(--color-text-secondary);
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 2px solid var(--color-border);
    }
    .tabla-generica td.celda-numero { text-align: right; }
    .tabla-generica tbody tr:hover { background: var(--color-bg-soft); }
    .tabla-generica-vacio { text-align: center; color: var(--color-text-muted); padding: 0.75rem; }
  `]
})
export class TablaGenericaComponent {
  @Input() columnas: ColumnaGenerica[] = [];
  @Input() rows: Record<string, unknown>[] = [];

  esNumerico(value: unknown): boolean {
    return this.parseNumero(value) !== null;
  }

  formatearValor(value: unknown): unknown {
    const numero = this.parseNumero(value);
    if (numero === null) return value;
    const esPorcentaje = String(value).includes('%');
    const formateado = FORMATO_NUMERO.format(numero);
    return esPorcentaje ? `${formateado}%` : formateado;
  }

  // Los valores llegan tal cual los guarda el legacy: pueden venir como
  // número JS o como string ya formateado en es-CO ("1.234,56"). Se
  // normaliza a "." decimal para poder parsear con `Number(...)`, y el
  // resultado se vuelve a formatear en es-CO (miles "." / decimales ",").
  private parseNumero(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const limpio = String(value).replace('%', '').trim();
    if (limpio === '') return null;
    const normalizado = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
    const numero = Number(normalizado);
    return Number.isNaN(numero) ? null : numero;
  }
}

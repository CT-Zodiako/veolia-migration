import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ProgressBarModule } from 'primeng/progressbar';

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
const FORMATO_MILES = new Intl.NumberFormat('es-MX');

@Component({
  selector: 'app-tabla-generica',
  standalone: true,
  imports: [CommonModule, ProgressBarModule],
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
            <p-progressbar *ngIf="porcentaje(row[col.field]) !== null; else texto" [value]="porcentaje(row[col.field])"></p-progressbar>
            <ng-template #texto>{{ formatearValor(row[col.field]) }}</ng-template>
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

  // Legacy GenericTable.vue:66-68: numbers and "%" values are right-aligned.
  esNumerico(value: unknown): boolean {
    return this.esNumeroLegacy(value) || this.esPorcentaje(value);
  }

  // Legacy GenericTable.vue:17-24: a "%" value is drawn as a ProgressBar of parseFloat(value without "%", "," -> ".").
  porcentaje(value: unknown): number | null {
    if (!this.esPorcentaje(value)) return null;
    const numero = parseFloat(String(value).replace('%', '').replace(',', '.'));
    return Number.isNaN(numero) ? 0 : numero;
  }

  // Legacy formateoMiles (GenericTable.vue:72-77): the integer part grouped with es-MX, the decimals kept after ".".
  formatearValor(value: unknown): unknown {
    if (!this.esNumeroLegacy(value)) return value;
    const [entero, decimales] = String(value).replace(',', '.').split('.');
    const enteroFormateado = FORMATO_MILES.format(Number(entero));
    return decimales ? `${enteroFormateado}.${decimales}` : enteroFormateado;
  }

  private esPorcentaje(value: unknown): boolean {
    return value !== null && value !== undefined && String(value).includes('%');
  }

  // Legacy GenericTable.vue:29: !isNaN(value.replace(",", ".")).
  private esNumeroLegacy(value: unknown): boolean {
    if (value === null || value === undefined || this.esPorcentaje(value)) return false;
    const texto = String(value).trim();
    return texto !== '' && !Number.isNaN(Number(texto.replace(',', '.')));
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TablaColumn, valorMostrado } from '../shared/tabla-avanzada.component';
import { COLUMNAS_SUI } from './sui-integracion-page.component';

/** Legacy components/tablesFormatosFormularios/Formato*.vue: curated header and redondeo per column. */
const COLUMNAS_POR_CAMPO = new Map<string, TablaColumn>(
  Object.values(COLUMNAS_SUI).flat().map((col) => [col.field, col])
);

@Component({
  selector: 'app-sui-formato-table',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-table [value]="rows" [paginator]="rows.length > 10" [rows]="10" [rowsPerPageOptions]="[10, 20, 100, 200]" responsiveLayout="scroll" size="small">
      <ng-template pTemplate="header">
        <tr>
          <th *ngFor="let c of columns">{{ c.header }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td *ngFor="let c of columns">{{ valor(row, c) }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td [attr.colspan]="columns.length || 1">Sin datos para el formato seleccionado.</td></tr>
      </ng-template>
    </p-table>
  `
})
export class FormatoTableComponent {
  @Input() rows: Array<Record<string, unknown>> = [];

  get columns(): TablaColumn[] {
    return this.rows.length
      ? Object.keys(this.rows[0]).map((key) => COLUMNAS_POR_CAMPO.get(key) ?? { field: key, header: key })
      : [];
  }

  valor(row: Record<string, unknown> | null | undefined, col: TablaColumn): unknown {
    const value = row?.[col.field];
    return col.decimales === undefined ? (value ?? '-') : valorMostrado(value, col);
  }
}

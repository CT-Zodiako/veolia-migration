import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';

@Component({
  selector: 'app-sui-formato-table',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-table [value]="rows" [paginator]="rows.length > 10" [rows]="10" responsiveLayout="scroll" size="small">
      <ng-template pTemplate="header">
        <tr>
          <th *ngFor="let c of columns">{{ c }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td *ngFor="let c of columns">{{ row?.[c] ?? '-' }}</td>
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

  get columns(): string[] {
    return this.rows.length ? Object.keys(this.rows[0]) : [];
  }
}

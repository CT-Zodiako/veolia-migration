import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { SuiReversionRow } from '../../services/sui-reversiones.service';

@Component({
  selector: 'app-formato-36',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  template: `
    <p-table [value]="rows" responsiveLayout="scroll" [paginator]="true" [rows]="10">
      <ng-template pTemplate="header">
        <tr>
          <th *ngFor="let col of columns">{{ col }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td *ngFor="let col of columns">{{ row[col] }}</td>
        </tr>
      </ng-template>
    </p-table>
  `
})
export class Formato36Component {
  @Input() rows: SuiReversionRow[] = [];

  get columns(): string[] {
    return this.rows.length ? Object.keys(this.rows[0]) : [];
  }
}

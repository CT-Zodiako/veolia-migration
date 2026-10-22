import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { TarifaRow } from '../../services/tarifas.service';

@Component({
  selector: 'app-resumen-tarifas',
  standalone: true,
  imports: [CommonModule, TableModule],
  template: `
    <div class="table-scroll" *ngIf="resumen.length">
      <p-table [value]="resumen" styleClass="p-datatable-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>CFT</th>
            <th>CVNA</th>
            <th>DES ANTI</th>
            <th>DISTANCIA</th>
            <th>SALINIDAD</th>
            <th>PER. ADICIONAL</th>
            <th>ESCENARIO</th>
            <th>TRA</th>
            <th>TRBL</th>
            <th>TRLU</th>
            <th>TRRA</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="text-right">{{ redondeo(row.CFT) }}</td>
            <td class="text-right">{{ redondeo(row.CVNA) }}</td>
            <td class="text-right">{{ redondeo(row.DES_ANTIG) }}</td>
            <td class="text-right">{{ redondeo(row.DISTANCIA) }}</td>
            <td class="text-right">{{ redondeo(row.SALINIDAD) }}</td>
            <td class="text-right">{{ redondeo(row.PER_ADD) }}</td>
            <td class="text-right">{{ redondeo(row.ESCENARIO) }}</td>
            <td class="text-right">{{ redondeo(row.TRA) }}</td>
            <td class="text-right">{{ redondeo(row.TRBL) }}</td>
            <td class="text-right">{{ redondeo(row.TRLU) }}</td>
            <td class="text-right">{{ redondeo(row.TRRA) }}</td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
  styles: [`
    .table-scroll { overflow-x: auto; }
  `]
})
export class ResumenTarifasComponent {
  @Input() resumen: TarifaRow[] = [];

  // Legacy Calculo.vue:110-166: every column goes through redondeo(valor, 6) = parseFloat(valor.toFixed(6)).
  redondeo(valor: unknown): string {
    return valor === null || valor === undefined || valor === '' ? '' : String(parseFloat(Number(valor).toFixed(6)));
  }
}

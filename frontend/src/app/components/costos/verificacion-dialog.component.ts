import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { VerificacionDetalle } from '../../models/costos.models';

interface EmpresaTab {
  key: string;
  nombre: string;
  rows: VerificacionDetalle[];
}

@Component({
  selector: 'app-verificacion-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ...CommonPrimeNgModules],
  template: `
    <p-dialog
      header="VERIFICACION DE VARIABLES"
      [modal]="true"
      [visible]="visible"
      (visibleChange)="onVisibleChange($event)"
      [style]="{ width: '50vw' }"
      [breakpoints]="{ '960px': '75vw', '640px': '95vw' }"
    >
      <p-tabs *ngIf="tabs.length" [value]="tabs[0].key">
        <p-tablist>
          <p-tab *ngFor="let tab of tabs" [value]="tab.key">{{ tab.nombre }}</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel *ngFor="let tab of tabs" [value]="tab.key">
            <p-table [value]="tab.rows" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '100%' }">
              <ng-template pTemplate="header">
                <tr>
                  <th>EMPRESA</th>
                  <th>GRUPO</th>
                  <th>VARIABLE</th>
                  <th class="text-right">VALOR</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-row>
                <tr>
                  <td>{{ row.empresaNombre }}</td>
                  <td>{{ row.grupo }}</td>
                  <td>{{ row.variable }}</td>
                  <td class="text-right">{{ row.valor | number:'1.6-6' }}</td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="4">Sin Registros</td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
      <p *ngIf="!tabs.length">Sin Registros</p>

      <ng-template pTemplate="footer">
        <p-button label="Aplicar" icon="pi pi-check" [loading]="applying" (click)="aplicar.emit()"></p-button>
        <p-button label="Cancelar" icon="pi pi-times" severity="secondary" [disabled]="applying" (click)="cerrar()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .text-right { text-align: right; }
  `]
})
export class VerificacionDialogComponent {
  @Input() visible = false;
  @Input() detalle: VerificacionDetalle[] = [];
  @Input() applying = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() aplicar = new EventEmitter<void>();

  get tabs(): EmpresaTab[] {
    const byKey = new Map<string, EmpresaTab>();
    for (const row of this.detalle ?? []) {
      const key = `${row.empresaPropia}|${row.empresaNombre}`;
      let tab = byKey.get(key);
      if (!tab) {
        tab = { key, nombre: row.empresaNombre, rows: [] };
        byKey.set(key, tab);
      }
      tab.rows.push(row);
    }
    // Legacy (verificacion.vue): sort `${EMPR_PROPIA}|${EMPR_NOMBRE}` descending,
    // so the empresa propia (flag 1) comes first.
    return Array.from(byKey.values()).sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
  }

  onVisibleChange(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.onVisibleChange(false);
  }
}

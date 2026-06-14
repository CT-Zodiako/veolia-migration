import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { SuiComplementoItemRequest, SuiFormato } from '../../models/sui-integracion.models';

@Component({
  selector: 'app-sui-complemento-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ...CommonPrimeNgModules],
  template: `
    <p-dialog [header]="'Complemento ' + formato" [modal]="true" [(visible)]="visible" [style]="{width:'36rem'}">
      <div class="flex gap-2 mb-2">
        <p-inputnumber [(ngModel)]="item" [useGrouping]="false" placeholder="Item"></p-inputnumber>
        <input pInputText [(ngModel)]="valor" placeholder="Valor" class="w-full" />
        <button pButton label="Agregar" (click)="add()" [disabled]="!item || !valor"></button>
      </div>
      <p-table [value]="items" size="small">
        <ng-template pTemplate="header"><tr><th>Item</th><th>Valor</th><th></th></tr></ng-template>
        <ng-template pTemplate="body" let-row let-i="rowIndex">
          <tr><td>{{ row.item }}</td><td>{{ row.valor }}</td><td><button pButton severity="danger" size="small" icon="pi pi-trash" (click)="remove(i)"></button></td></tr>
        </ng-template>
      </p-table>
      <ng-template pTemplate="footer">
        <button pButton label="Cancelar" severity="secondary" (click)="close.emit()"></button>
        <button pButton label="Guardar" (click)="save.emit(items)"></button>
      </ng-template>
    </p-dialog>
  `
})
export class ComplementoDialogComponent {
  @Input() visible = false;
  @Input() formato: SuiFormato = 'F24';
  @Input() items: SuiComplementoItemRequest[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<SuiComplementoItemRequest[]>();

  item: number | null = null;
  valor = '';

  add(): void {
    if (!this.item || !this.valor.trim()) return;
    this.items = [...this.items.filter((x) => x.item !== this.item), { item: this.item, valor: this.valor.trim() }];
    this.item = null;
    this.valor = '';
  }

  remove(index: number): void {
    this.items = this.items.filter((_, i) => i !== index);
  }
}

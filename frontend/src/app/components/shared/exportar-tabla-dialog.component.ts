import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CsvColumn, exportarCsv } from '../../shared/csv-export.util';

@Component({
  selector: 'app-exportar-tabla-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, InputGroupModule, InputGroupAddonModule, ...CommonPrimeNgModules],
  template: `
    <p-dialog
      header="Exportar tabla"
      [modal]="true"
      [visible]="visible"
      (visibleChange)="onVisibleChange($event)"
      [style]="{ width: '32rem' }"
    >
      <div class="campo">
        <label>Nombre del archivo</label>
        <p-inputgroup>
          <input
            pInputText
            type="text"
            [(ngModel)]="nombreArchivo"
            (keydown.enter)="confirmar()"
            placeholder="Nombre del archivo"
            autofocus
          />
          <p-inputgroup-addon>.csv</p-inputgroup-addon>
        </p-inputgroup>
      </div>

      <div class="campo">
        <div class="columnas-header">
          <label>Columnas a exportar ({{ columnasSeleccionadas.length }} de {{ columnas.length }})</label>
          <div class="columnas-acciones">
            <a (click)="seleccionarTodas()">Todas</a>
            <a (click)="seleccionarNinguna()">Ninguna</a>
          </div>
        </div>
        <div class="columnas-grid">
          <div class="columna-check" *ngFor="let col of columnas">
            <p-checkbox
              [binary]="true"
              [ngModel]="estaSeleccionada(col)"
              (onChange)="toggleColumna(col)"
              [inputId]="'col-' + col.field"
            ></p-checkbox>
            <label [for]="'col-' + col.field">{{ col.header }}</label>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (click)="cerrar()"></p-button>
        <p-button
          label="Exportar"
          icon="pi pi-external-link"
          [disabled]="columnasSeleccionadas.length === 0 || !nombreArchivo.trim()"
          (click)="confirmar()"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .campo { margin-bottom: 20px; }
    .campo label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--color-text-body); }

    .columnas-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .columnas-acciones {
      display: flex;
      gap: 12px;
    }

    .columnas-acciones a {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-brand-accent);
      cursor: pointer;
    }

    .columnas-acciones a:hover {
      text-decoration: underline;
    }

    .columnas-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      max-height: 220px;
      overflow-y: auto;
      margin-top: 10px;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .columna-check {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .columna-check label {
      margin: 0;
      font-size: 13px;
      font-weight: 400;
      color: var(--color-text-body);
      cursor: pointer;
    }
  `]
})
export class ExportarTablaDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() columnas: CsvColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() nombreSugerido = 'export';

  nombreArchivo = '';
  columnasSeleccionadas: CsvColumn[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.nombreArchivo = this.nombreSugerido;
      this.columnasSeleccionadas = [...this.columnas];
    }
  }

  onVisibleChange(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.onVisibleChange(false);
  }

  confirmar(): void {
    exportarCsv(this.columnasSeleccionadas, this.rows, this.nombreArchivo.trim());
    this.cerrar();
  }

  estaSeleccionada(col: CsvColumn): boolean {
    return this.columnasSeleccionadas.some(c => c.field === col.field);
  }

  toggleColumna(col: CsvColumn): void {
    this.columnasSeleccionadas = this.estaSeleccionada(col)
      ? this.columnasSeleccionadas.filter(c => c.field !== col.field)
      : [...this.columnasSeleccionadas, col];
  }

  seleccionarTodas(): void {
    this.columnasSeleccionadas = [...this.columnas];
  }

  seleccionarNinguna(): void {
    this.columnasSeleccionadas = [];
  }
}

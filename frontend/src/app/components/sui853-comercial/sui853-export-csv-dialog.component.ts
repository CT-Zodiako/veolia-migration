import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CsvColumn } from '../../shared/csv-export.util';

export interface Sui853CsvExported { filename: string; columns: string[]; separator: string; }

// Legacy SUI853 ExportCsvDialog.vue: column picker with default-unchecked columns, separator
// and file name. Rows arrive already formatted; values are written unquoted with CRLF lines
// (the SUI upload format), unlike the shared ";"-quoted export of app-exportar-tabla-dialog.
@Component({
  selector: 'app-sui853-export-csv-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ...CommonPrimeNgModules],
  template: `
    <p-dialog header="Exportar CSV" [modal]="true" [visible]="visible" (visibleChange)="setVisible($event)" [style]="{ width: '40rem' }">
      <div class="grid-2">
        <div class="campo">
          <label for="sui853-export-sep">Separador</label>
          <p-select inputId="sui853-export-sep" [options]="separatorOptions" [(ngModel)]="separator"
            optionLabel="label" optionValue="value" [style]="{ width: '100%' }" />
        </div>
        <div class="campo">
          <label for="sui853-export-name">Nombre archivo</label>
          <input pInputText id="sui853-export-name" type="text" [(ngModel)]="filename" placeholder="archivo.csv" />
        </div>
      </div>
      <div class="campo">
        <div class="columnas-header">
          <label>Columnas a exportar ({{ selectedFields.length }} de {{ columns.length }})</label>
          <div class="columnas-acciones">
            <a (click)="toggleAll(true)">Todas</a>
            <a (click)="toggleAll(false)">Ninguna</a>
          </div>
        </div>
        <input pInputText type="text" [(ngModel)]="search" placeholder="Buscar columna…" aria-label="Buscar columna" class="buscar" />
        <div class="columnas-grid">
          <label class="columna-check" *ngFor="let col of filteredColumns" [title]="col.field">
            <input type="checkbox" [checked]="isChecked(col.field)" (change)="toggleField(col.field, $any($event.target).checked)" />
            <span>{{ col.header || col.field }}</span>
          </label>
          <p *ngIf="!filteredColumns.length">No hay columnas que coincidan.</p>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="setVisible(false)" />
        <p-button label="Exportar" icon="pi pi-download" [disabled]="exportDisabled" (onClick)="exportar()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .campo { margin-bottom: 16px; }
    .campo label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--color-text-body); }
    .campo input[pInputText] { width: 100%; }
    .columnas-header { display: flex; align-items: center; justify-content: space-between; }
    .columnas-acciones { display: flex; gap: 12px; }
    .columnas-acciones a { font-size: 12px; font-weight: 600; color: var(--color-brand-accent); cursor: pointer; }
    .buscar { margin-top: 8px; }
    .columnas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; max-height: 240px; overflow-y: auto; margin-top: 10px; padding: 12px; border: 1px solid var(--color-border); border-radius: 8px; }
    .columna-check { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 400; cursor: pointer; }
    @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }
  `]
})
export class Sui853ExportCsvDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() columns: CsvColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() defaultFilename = '';
  @Input() defaultSeparator = ',';
  /** Fields or headers (case-insensitive) that start unchecked, like legacy `initiallyUncheckedFields`. */
  @Input() initiallyUnchecked: string[] = [];
  @Output() exported = new EventEmitter<Sui853CsvExported>();

  readonly separatorOptions = [
    { label: 'Coma (,)', value: ',' },
    { label: 'Punto y coma (;)', value: ';' },
    { label: 'Tab (\\t)', value: '\t' },
    { label: 'Barra (|)', value: '|' }
  ];
  selectedFields: string[] = [];
  filename = '';
  separator = ',';
  search = '';

  get filteredColumns(): CsvColumn[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.columns;
    return this.columns.filter(c => (c.header || '').toLowerCase().includes(q) || c.field.toLowerCase().includes(q));
  }

  get exportDisabled(): boolean { return !this.rows.length || !this.selectedFields.length; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      const excluded = new Set(this.initiallyUnchecked.map(value => value.toLowerCase().trim()));
      this.selectedFields = this.columns
        .filter(c => !excluded.has(c.field.toLowerCase().trim()) && !excluded.has((c.header || '').toLowerCase().trim()))
        .map(c => c.field);
      this.filename = this.defaultFilename.trim() || 'archivo';
      this.separator = this.defaultSeparator;
      this.search = '';
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  isChecked(field: string): boolean { return this.selectedFields.includes(field); }

  toggleField(field: string, checked: boolean): void {
    if (checked && !this.selectedFields.includes(field)) this.selectedFields = [...this.selectedFields, field];
    else if (!checked) this.selectedFields = this.selectedFields.filter(f => f !== field);
  }

  toggleAll(on: boolean): void { this.selectedFields = on ? this.columns.map(c => c.field) : []; }

  exportar(): void {
    if (this.exportDisabled) return;
    const order = this.columns.filter(c => this.selectedFields.includes(c.field));
    const esc = (value: unknown) => value === null || value === undefined ? '' : String(value).replace(/\r?\n/g, ' ');
    const lines = [order.map(c => esc(c.header || c.field)).join(this.separator)];
    for (const row of this.rows) lines.push(order.map(c => esc(row[c.field])).join(this.separator));
    const name = this.filename.trim() || 'archivo';
    const filename = name.toLowerCase().endsWith('.csv') ? name : `${name}.csv`;

    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    this.setVisible(false);
    this.exported.emit({ filename, columns: order.map(c => c.field), separator: this.separator });
  }
}

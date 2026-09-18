import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { FormularioRow, Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

@Component({
  selector: 'app-sui853-formularios',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TablaAvanzadaComponent],
  template: `
    <section class="card-section">
      <p>Configuración global de columnas. La identidad FORMATO / SECCION / FIELD no se modifica.</p>
      <p-button label="Recargar" icon="pi pi-refresh" [disabled]="loading || saving || !!draft" (onClick)="load()" />
      <p *ngIf="error" class="error-message" role="alert">{{ error }}</p>
      <p *ngIf="success" class="success-message" role="status">{{ success }}</p>
      <p *ngIf="loading" role="status">Cargando formularios…</p>
      <p *ngIf="!loading && !error && !rows.length" role="status">No hay registros.</p>
      <app-tabla-avanzada [columnas]="columns" [rows]="rows" [loading]="loading"
        storageKey="sui853-formularios" nombreExportar="Formularios" [accionesTemplate]="actions" [cellTemplate]="cell" />
      <p *ngIf="saveError" class="error-message" role="alert">{{ saveError }}</p>
      <div *ngIf="draft" class="actions">
        <span>Enter para guardar · Ctrl+Enter en descripción · Escape para cancelar.</span>
        <p-button label="Cancelar edición" severity="secondary" [disabled]="saving" (onClick)="cancel()" />
        <p-button label="Guardar cambios" [disabled]="!valid || saving" [loading]="saving" (onClick)="save()" />
      </div>
      <p *ngIf="draft && !valid" role="status">Complete encabezado, catálogos y órdenes enteros no negativos. Decimales: 0 a 6 para número o porcentaje.</p>
      <ng-template #actions let-row>
        <div class="actions" *ngIf="isEditing(row); else editAction">
          <p-button icon="pi pi-times" severity="secondary" size="small" ariaLabel="Cancelar" [disabled]="saving" (onClick)="cancel()" />
          <p-button icon="pi pi-check" severity="success" size="small" ariaLabel="Guardar" [disabled]="!valid || saving" [loading]="saving" (onClick)="save()" />
        </div>
        <ng-template #editAction>
          <p-button icon="pi pi-pencil" severity="info" size="small" ariaLabel="Editar columna"
            [disabled]="loading || saving || !!draft" (onClick)="edit(row)" />
        </ng-template>
      </ng-template>
      <ng-template #cell let-value let-row="row" let-col="col">
        <ng-container *ngIf="isEditing(row) && isEditable(col.field); else readCell">
          <div *ngIf="draft as d" (keydown)="onKey($event)" [ngSwitch]="col.field">
            <input *ngSwitchCase="'HEADER_TXT'" pInputText aria-label="HEADER_TXT" [(ngModel)]="d.HEADER_TXT" [disabled]="saving" required />
            <textarea *ngSwitchCase="'TOOLTIP'" aria-label="TOOLTIP" rows="3" [(ngModel)]="d.TOOLTIP" [disabled]="saving"></textarea>
            <select *ngSwitchCase="'DECIMALES'" aria-label="DECIMALES" [(ngModel)]="d.DECIMALES" [disabled]="!numericFormat || saving">
              <option [ngValue]="null">No aplica</option>
              <option *ngFor="let n of decimals" [ngValue]="n">{{ n }}</option>
            </select>
            <input *ngSwitchCase="'ORDEN_HEADER'" pInputText aria-label="ORDEN_HEADER" type="number" min="0" max="2147483647" step="1" [(ngModel)]="d.ORDEN_HEADER" [disabled]="saving" required />
            <input *ngSwitchCase="'ORDEN_DATA'" pInputText aria-label="ORDEN_DATA" type="number" min="0" max="2147483647" step="1" [(ngModel)]="d.ORDEN_DATA" [disabled]="saving" required />
            <ng-container *ngSwitchDefault>
              <select *ngIf="catalogFor(col.field) as catalog" [attr.aria-label]="col.field" [ngModel]="d[catalog.field]"
                (ngModelChange)="setCatalog(catalog.field, $event)" [disabled]="saving" required>
                <option value="" disabled>Seleccionar</option>
                <option *ngFor="let option of catalog.options" [value]="option.value">{{ option.label }}</option>
              </select>
            </ng-container>
          </div>
        </ng-container>
        <ng-template #readCell>
          <button *ngIf="col.field === 'TOOLTIP'; else text" type="button" class="tooltip-edit"
            [disabled]="loading || saving || !!draft" (click)="edit(row)" title="Editar descripción">{{ value || '—' }}</button>
          <ng-template #text>{{ display(col.field, value) }}</ng-template>
        </ng-template>
      </ng-template>
    </section>
  `,
  styles: [`
    .card-section { background:var(--color-bg-card); border-radius:12px; padding:20px; margin-bottom:20px; box-shadow:0 1px 3px rgba(0,0,0,.1); }
    p { color:var(--color-text-secondary); }
    .error-message { background:var(--color-bg-danger-soft); border:1px solid var(--color-border-danger-soft); color:var(--color-brand-accent); padding:12px; border-radius:8px; }
    .success-message { background:var(--color-bg-success-soft); color:var(--color-text-success); padding:12px; border-radius:8px; }
    input, select, textarea { width:100%; padding:10px; border:1px solid var(--color-border); border-radius:6px; background:var(--color-bg-card); color:var(--color-text-primary); }
    .actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:8px; color:var(--color-text-secondary); }
    input, select { min-width:120px; } textarea { min-width:260px; }
    input[type=number] { text-align:right; }
    .tooltip-edit { background:transparent; border:0; color:var(--color-text-primary); cursor:pointer; text-align:left; white-space:pre-wrap; }
  `]
})
export class FormulariosComponent implements OnInit {
  private readonly service = inject(Sui853ConfiguracionService);
  rows: { [K in keyof FormularioRow]: FormularioRow[K] }[] = [];
  draft: FormularioRow | null = null;
  loading = false;
  saving = false;
  error = '';
  saveError = '';
  success = '';
  readonly decimals = [0, 1, 2, 3, 4, 5, 6];
  readonly catalogs: { field: 'BACKGROUND_COLOR' | 'FILTER_FLAG' | 'FORMATO_DATO' | 'ALINEACION' | 'MOSTRAR_HEADER' | 'INCLUIR_DATA'; options: { value: string; label: string }[] }[] = [
    { field: 'BACKGROUND_COLOR', options: [{value:'R',label:'Rojo'}, {value:'G',label:'Verde'}, {value:'B',label:'Azul'}] },
    { field: 'FILTER_FLAG', options: [{value:'S',label:'Sí'}, {value:'N',label:'No'}] },
    { field: 'FORMATO_DATO', options: [{value:'texto',label:'Texto'}, {value:'numero',label:'Número'}, {value:'fecha',label:'Fecha'}, {value:'porcentaje',label:'Porcentaje'}] },
    { field: 'ALINEACION', options: [{value:'izq',label:'Izquierda'}, {value:'centro',label:'Centro'}, {value:'der',label:'Derecha'}] },
    { field: 'MOSTRAR_HEADER', options: [{value:'S',label:'Sí'}, {value:'N',label:'No'}] },
    { field: 'INCLUIR_DATA', options: [{value:'S',label:'Sí'}, {value:'N',label:'No'}] }
  ];
  readonly columns: TablaColumn[] = ['FORMATO', 'SECCION', 'FIELD', 'HEADER_TXT', 'BACKGROUND_COLOR', 'FILTER_FLAG', 'FORMATO_DATO', 'DECIMALES', 'ALINEACION', 'TOOLTIP', 'MOSTRAR_HEADER', 'INCLUIR_DATA', 'ORDEN_HEADER', 'ORDEN_DATA']
    .map(field => ({ field, header: field, filtrable: field !== 'TOOLTIP', numero: ['DECIMALES', 'ORDEN_HEADER', 'ORDEN_DATA'].includes(field) }));

  ngOnInit(): void { this.load(); }
  load(): void {
    if (this.loading || this.saving || this.draft) return;
    this.loading = true; this.error = ''; this.success = '';
    this.service.getFormularios().subscribe({
      next: response => {
        this.loading = false;
        if (response.status !== 200 || !Array.isArray(response.data)) { this.error = 'Respuesta de formularios inválida.'; return; }
        this.rows = response.data;
      },
      error: () => { this.loading = false; this.error = 'No se pudieron cargar los formularios. Intente recargar.'; }
    });
  }
  isEditing(row: FormularioRow): boolean { return !!this.draft && this.sameIdentity(row, this.draft); }
  isEditable(field: string): boolean { return !['FORMATO', 'SECCION', 'FIELD'].includes(field); }
  catalogFor(field: string) { return this.catalogs.find(c => c.field === field); }
  edit(row: FormularioRow): void {
    if (this.loading || this.saving || this.draft) return;
    this.draft = { ...row };
    this.saveError = ''; this.success = '';
    this.draft.DECIMALES = this.numericFormat ? (row.DECIMALES ?? 0) : null;
  }
  cancel(): void { if (!this.saving) { this.draft = null; this.saveError = ''; } }
  get numericFormat(): boolean { return ['numero', 'porcentaje'].includes(this.draft?.FORMATO_DATO ?? ''); }
  setCatalog(field: typeof this.catalogs[number]['field'], value: string): void {
    if (!this.draft) return;
    this.draft[field] = value;
    if (field === 'FORMATO_DATO') this.draft.DECIMALES = this.numericFormat ? (this.draft.DECIMALES ?? 0) : null;
  }
  get valid(): boolean {
    const d = this.draft;
    const order = (n: number | null) => n !== null && Number.isInteger(n) && n >= 0 && n <= 2147483647;
    return !!d && !!d.HEADER_TXT?.trim() && [d.FORMATO, d.SECCION, d.FIELD].every(v => !!v?.trim())
      && this.catalogs.every(c => c.options.some(o => o.value === d[c.field]))
      && order(d.ORDEN_HEADER) && order(d.ORDEN_DATA)
      && (this.numericFormat ? d.DECIMALES !== null && this.decimals.includes(d.DECIMALES) : d.DECIMALES === null);
  }
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.cancel(); }
    if (event.key === 'Enter' && ((event.target as HTMLElement).tagName !== 'TEXTAREA' || event.ctrlKey)) {
      if ((event.target as HTMLElement).tagName === 'BUTTON') return;
      event.preventDefault(); this.save();
    }
  }
  display(field: string, value: unknown): unknown {
    return this.catalogs.find(c => c.field === field)?.options.find(o => o.value === value)?.label ?? value ?? '—';
  }
  private sameIdentity(a: FormularioRow, b: FormularioRow): boolean {
    return a.FORMATO === b.FORMATO && a.SECCION === b.SECCION && a.FIELD === b.FIELD;
  }
  save(): void {
    if (!this.valid || this.saving || !this.draft) return;
    const submitted = { ...this.draft };
    this.saving = true; this.saveError = '';
    this.service.updateFormulario(submitted).subscribe({
      next: response => {
        this.saving = false;
        if (response.status !== 200 || !response.data || !this.sameIdentity(submitted, response.data)) {
          this.saveError = 'No se recibió el registro actualizado. Cancele y recargue para verificar.'; return;
        }
        this.rows = this.rows.map(row => this.sameIdentity(row, submitted) ? response.data : row);
        this.draft = null; this.success = 'Cambios guardados.';
      },
      error: () => { this.saving = false; this.saveError = 'No se pudo guardar. El borrador se conserva; verifique los valores e intente nuevamente.'; }
    });
  }
}

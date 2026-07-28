import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from './tabla-avanzada.component';
import { Formato2Response, TablaColumnaMeta } from '../../models/sui853-cft.model';

interface DetalleEntry {
  label: string;
  value: string;
}

// Tabla dinámica compartida por las 12 pantallas de SUI853/CFT (y, a futuro,
// cualquier otra pantalla que consuma SUI.f_render_formato2 a través de un
// Formato2Response). Reemplaza el patrón legacy de dos DataTable
// sincronizadas manualmente (TablaScrollHorizontal.vue) por una sola
// <app-tabla-avanzada>, replicando formatValue()/displayValue()/tablasColor()
// del legacy. Ver .claude/skills/veolia-ui-style/SKILL.md sección 7,
// subsección "SUI853 legacy".
@Component({
  selector: 'app-sui853-formato2-tabla',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, TablaAvanzadaComponent],
  templateUrl: './sui853-formato2-tabla.component.html',
  styleUrl: './sui853-formato2-tabla.component.css'
})
export class Sui853Formato2TablaComponent implements OnChanges {
  @Input() data: Formato2Response | null = null;
  @Input() loading = false;
  @Input({ required: true }) storageKey = '';
  @Input() nombreExportar?: string;

  columnas: TablaColumn[] = [];
  columnasFijadasPorDefecto: string[] = [];

  detalleVisible = false;
  detalleRow: Record<string, unknown> | null = null;

  private fieldMeta = new Map<string, TablaColumnaMeta>();
  private headerMap = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.rebuildColumnas();
    }
  }

  get nombreExportarEfectivo(): string {
    return this.nombreExportar || this.data?.title || this.storageKey || 'formato2';
  }

  get detalleEntries(): DetalleEntry[] {
    if (!this.detalleRow) {
      return [];
    }

    return Object.keys(this.detalleRow).map((key) => ({
      label: this.headerMap.get(key) || key,
      value: this.displayValueByField(key, this.detalleRow![key])
    }));
  }

  displayValue(col: TablaColumn, value: unknown): string {
    return this.displayValueByField(col.field, value);
  }

  tooltip(col: TablaColumn, value: unknown): string {
    const meta = this.fieldMeta.get(col.field);
    let tip = meta?.mouse_over || '';

    if (tip.includes('{value}')) {
      tip = tip.replace(/\{value\}/g, this.displayValueByField(col.field, value));
    }

    return tip || `${col.header}: ${this.displayValueByField(col.field, value)}`;
  }

  cellClassFn = (row: Record<string, unknown>, col: TablaColumn): string => {
    const meta = this.fieldMeta.get(col.field);
    return this.backgroundClass(meta?.backgroundColor);
  };

  verDetalle(row: Record<string, unknown>): void {
    this.detalleRow = row;
    this.detalleVisible = true;
  }

  cerrarDetalle(): void {
    this.detalleVisible = false;
    this.detalleRow = null;
  }

  private rebuildColumnas(): void {
    const sinHeaders = this.data?.SIN_MOVIMIENTO?.headers ?? [];
    const conHeaders = this.data?.CON_MOVIMIENTO?.headers ?? [];
    const todas = [...sinHeaders, ...conHeaders].filter((h): h is TablaColumnaMeta => !!h?.field);

    this.fieldMeta = new Map(todas.map((h) => [h.field, h]));
    this.headerMap = new Map(todas.map((h) => [h.field, h.header || h.field]));

    this.columnas = todas.map((h) => ({
      field: h.field,
      header: h.header || h.field,
      filtrable: !!h.filter,
      numero: this.esColumnaDeValor(h.formato)
    }));

    this.columnasFijadasPorDefecto = sinHeaders.filter((h): h is TablaColumnaMeta => !!h?.field).map((h) => h.field);
  }

  private esColumnaDeValor(formato: string | null | undefined): boolean {
    const tipo = (formato || '').toLowerCase();
    return tipo === 'numero' || tipo === 'moneda' || tipo === 'porcentaje';
  }

  private displayValueByField(field: string, value: unknown): string {
    if (value === -1) {
      return 'NA';
    }

    const meta = this.fieldMeta.get(field);
    const tipo = (meta?.formato || (typeof value === 'number' ? 'numero' : 'texto')).toLowerCase();
    return this.formatValue(value, tipo, meta?.decimal);
  }

  // Réplica de formatValue() en TablaScrollHorizontal.vue.
  private formatValue(value: unknown, tipo: string, decimales?: number | null): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const toNum = (v: unknown): number => {
      if (typeof v === 'number') {
        return v;
      }
      const s = String(v).replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return Number.isNaN(n) ? NaN : n;
    };

    switch (tipo) {
      case 'fecha': {
        const d = new Date(value as string | number);
        if (Number.isNaN(d.getTime())) {
          return String(value);
        }
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      }

      case 'moneda':
      case 'numero': {
        const num = toNum(value);
        if (Number.isNaN(num)) {
          return String(value);
        }
        return num.toFixed(decimales ?? 2);
      }

      case 'porcentaje': {
        let num = toNum(value);
        if (Number.isNaN(num)) {
          return String(value);
        }
        if (Math.abs(num) <= 1) {
          num = num * 100;
        }
        return `${num.toFixed(decimales ?? 2)}%`;
      }

      default:
        return String(value);
    }
  }

  // Réplica de tablasColor() en TablaScrollHorizontal.vue.
  private backgroundClass(code: string | null | undefined): string {
    switch (code) {
      case 'G':
        return 'sui853-bg-g';
      case 'T':
        return 'sui853-bg-t';
      case 'R':
        return 'sui853-bg-r';
      default:
        return '';
    }
  }
}

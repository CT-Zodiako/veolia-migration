import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CsvColumn } from '../../shared/csv-export.util';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { Sui853ExportCsvDialogComponent } from './sui853-export-csv-dialog.component';
import { Sui853ComercialService } from '../../services/sui853-comercial.service';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';
import { ComercialRow, ComercialSummary } from '../../models/sui853-comercial.models';
import {
  legacyDate, legacyExportFileName, legacyFilterRows, legacyNumber, legacySummaryFilter
} from '../../models/sui853-comercial.format';

// Columns shown by legacy tgenComercial.vue, in order; EMPRESA and DEVEPENXOTR are not shown.
const UNNUMBERED = ['APS', 'NOMAPS', 'ANNO', 'MES'];
const NUMBERED = ['NUID', 'CUENTA', 'DEPTO', 'MUNI', 'POBLADO', 'INF_PREDIAL', 'NUMPRED', 'DIRECCION', 'FECHAEXA', 'METODOL',
  'NUAP', 'FECHAINI', 'NUMFAC', 'MULTIUSU', 'CAUSALREFA', 'FACTREF', 'UBICACION', 'CODIGOCLAS', 'TIPOAFORO', 'RECOL',
  'CODPRODUC', 'FACPRODUC', 'INQUILINA', 'PRIORIT', 'HCOMUN', 'DIASFAC', 'PRODUCCION', 'TRLU', 'TRBL', 'TRA', 'TRRA',
  'FACTCONJUN', 'TFC', 'TLU', 'TBL', 'TRT', 'TTE', 'TDT', 'TTL', 'TA', 'FACTORSUBC', 'VLRSUB', 'VLTARIF', 'VLRMORA',
  'VLRMINOR', 'DTOXCAL', 'DTOXRECL', 'DTOXCOMP', 'DEVFEXCOE', 'DEVEPENXCOE', 'DEVFEXOTR', 'VLRTOTAL', 'PAGOSUSUC'];
const DATE_FIELDS = ['FECHAEXA', 'FECHAINI'];
// Legacy `decimalsByField` (export); the screen template formats the same fields except ANNO/MES/DEPTO/METODOL.
const EXPORT_DECIMALS: Record<string, number> = {
  ANNO: 0, MES: 0, DEPTO: 0, METODOL: 0, DIASFAC: 0, FACTCONJUN: 0,
  PRODUCCION: 7,
  TRLU: 3, TRBL: 3, TRA: 3, TRRA: 3, FACTORSUBC: 3, FACPRODUC: 3,
  TFC: 2, TLU: 2, TBL: 2, TRT: 2, TTE: 2, TDT: 2, TTL: 2, TA: 2,
  VLRSUB: 2, VLTARIF: 2, VLRMORA: 2, VLRMINOR: 2, DTOXCAL: 2, DTOXRECL: 2, DTOXCOMP: 2,
  DEVFEXCOE: 2, DEVEPENXCOE: 2, DEVEPENXOTR: 2, DEVFEXOTR: 2, VLRTOTAL: 2, PAGOSUSUC: 2
};
const SCREEN_RAW = ['ANNO', 'MES', 'DEPTO', 'METODOL'];

@Component({
  selector: 'app-sui853-comercial', standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, TablaAvanzadaComponent, Sui853ExportCsvDialogComponent],
  templateUrl: './sui853-comercial.component.html',
  styleUrl: './sui853-comercial.component.css'
})
export class Sui853ComercialComponent implements OnInit, OnDestroy {
  options: { label: string; value: string }[] = [];
  selectedApsId: string | null = null;
  year: number | null = null;
  month: number | null = null;
  readonly years = Array.from({ length: 13 }, (_, i) => 2018 + i);
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((label, i) => ({ label, value: i + 1 }));
  catalogLoading = false;
  catalogError = '';
  tab: 'detail' | 'summary' = 'detail';
  queried = false;
  detailLoading = false;
  summaryLoading = false;
  detailError = '';
  summaryError = '';
  rows: ComercialRow[] = [];
  filteredRows: ComercialRow[] = [];
  displayRows: ComercialRow[] = [];
  exportRows: ComercialRow[] = [];
  summary: ComercialSummary | null = null;
  summaryRows: ComercialRow[] = [];
  readonly detailColumns: TablaColumn[] = [
    ...UNNUMBERED.map(field => ({ field, header: field })),
    ...NUMBERED.map((field, i) => ({ field, header: `${i + 1}. ${field}` }))
  ].map(column => ({ ...column, numero: column.field in EXPORT_DECIMALS }));
  summaryColumns: TablaColumn[] = [];
  readonly filterFields = ['APS', 'NOMAPS', 'ANNO', 'MES', 'NUID', 'CUENTA'];
  filters: Record<string, string> = Object.fromEntries(this.filterFields.map(f => [f, '']));
  exportColumns: CsvColumn[] = [];
  readonly exportUnchecked = ['APS', 'NOMAPS', 'ANNO', 'MES', 'EMPRESA', 'DEVFEXOTR'];
  exportVisible = false;
  private apsNames = new Map<string, string>();
  private requests = new Subscription();
  private catalogRequest = new Subscription();

  constructor(private readonly service: Sui853ComercialService,
    private readonly catalog: Sui853ConfiguracionService, private readonly cdr: ChangeDetectorRef) {}

  get selectedApsName(): string | null { return this.selectedApsId ? this.apsNames.get(this.selectedApsId) ?? null : null; }
  get exportFileName(): string { return legacyExportFileName(this.selectedApsName, this.month, this.year); }
  get summaryMetadata(): Record<string, unknown> {
    const { data, ...metadata } = this.summary ?? {};
    return metadata;
  }

  ngOnInit(): void { this.loadCatalog(); }

  loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = '';
    this.catalogRequest.unsubscribe();
    this.catalogRequest = this.catalog.tcfgAps().subscribe({
      next: response => {
        const items = response.data ?? [];
        this.apsNames = new Map(items.map(item => [String(item.TCFG_APS_ID), item.NOMBRE_APS]));
        this.options = items.map(item => ({ label: `${item.NOMBRE_APS} (${item.TCFG_APS_ID})`, value: String(item.TCFG_APS_ID) }));
        this.catalogLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.catalogLoading = false; this.catalogError = 'No se pudo cargar el catálogo APS.'; this.cdr.markForCheck(); }
    });
  }

  clear(): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.queried = false;
    this.detailLoading = this.summaryLoading = false;
    this.detailError = this.summaryError = '';
    this.rows = [];
    this.summary = null;
    this.summaryRows = [];
    this.summaryColumns = [];
    this.exportColumns = [];
    this.applyFilters();
  }

  consultar(): void {
    this.clear();
    if (!this.selectedApsId || this.year === null || this.month === null) return;
    this.queried = true;
    this.detailLoading = this.summaryLoading = true;
    this.requests.add(this.service.detail({ apsId: this.selectedApsId, year: this.year, month: this.month }).subscribe({
      next: response => {
        this.detailLoading = false;
        if (response.status !== 'success' || !Array.isArray(response.data)) {
          this.detailError = 'La respuesta del detalle no es válida.';
        } else {
          this.rows = response.data;
          // Legacy export offers every backend field, labelled with its field name.
          this.exportColumns = Object.keys(this.rows[0] ?? {}).map(f => ({ field: f, header: f }));
          this.applyFilters();
        }
        this.cdr.markForCheck();
      },
      error: () => { this.detailLoading = false; this.detailError = 'No se pudo cargar el detalle. Volvé a intentar.'; this.cdr.markForCheck(); }
    }));
    this.requests.add(this.service.summary().subscribe({
      next: response => {
        this.summaryLoading = false;
        const summary = response.data;
        if (response.status !== 'success' || (summary !== null &&
            (summary['error'] || !Array.isArray(summary.data) || summary.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))))) {
          this.summaryError = 'El formato de resumen recibido no es válido.';
        } else {
          this.summary = summary;
          this.summaryRows = legacySummaryFilter(summary?.data ?? [], this.selectedApsName, this.year, this.month);
          this.summaryColumns = this.columns(summary?.data ?? [], summary);
        }
        this.cdr.markForCheck();
      },
      error: () => { this.summaryLoading = false; this.summaryError = 'No se pudo cargar el resumen. Volvé a intentar.'; this.cdr.markForCheck(); }
    }));
  }

  applyFilters(): void {
    this.filteredRows = legacyFilterRows(this.rows, this.filters, DATE_FIELDS);
    this.displayRows = this.filteredRows.map(row => this.formatRow(row, false));
    this.exportRows = this.filteredRows.map(row => this.formatRow(row, true));
  }

  // Legacy `formattedRows` (export) and column templates (screen).
  private formatRow(row: ComercialRow, forExport: boolean): ComercialRow {
    const r: ComercialRow = { ...row };
    if (forExport) {
      for (const f of ['MUNI', 'POBLADO']) {
        if (r[f] !== null && r[f] !== undefined && r[f] !== '') r[f] = String(r[f]).trim().padStart(3, '0');
      }
    }
    for (const f of DATE_FIELDS) r[f] = legacyDate(r[f]);
    for (const [f, decimals] of Object.entries(EXPORT_DECIMALS)) {
      if (!forExport && SCREEN_RAW.includes(f)) continue;
      if (r[f] !== undefined && r[f] !== null && r[f] !== '') r[f] = legacyNumber(r[f], decimals);
    }
    return r;
  }

  private columns(rows: ComercialRow[], summary: ComercialSummary | null = null): TablaColumn[] {
    const headers = new Map<string, string>();
    for (const sectionName of ['SIN_MOVIMIENTO', 'CON_MOVIMIENTO']) {
      const section = summary?.[sectionName] as { headers?: { field: string; header: string }[] } | undefined;
      if (Array.isArray(section?.headers)) {
        for (const header of section.headers) {
          if (typeof header.field === 'string') headers.set(header.field, header.header || header.field);
        }
      }
    }
    const fields = new Set(rows.flatMap(row => Object.keys(row)));
    return [...fields].map(field => ({ field, header: headers.get(field) ?? field, filtrable: true }));
  }

  ngOnDestroy(): void { this.requests.unsubscribe(); this.catalogRequest.unsubscribe(); }
}

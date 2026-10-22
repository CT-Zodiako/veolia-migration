import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { CsvColumn } from '../../shared/csv-export.util';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';
import { OperacionesRow, Sui853OperacionesService } from '../../services/sui853-operaciones.service';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { Sui853ExportCsvDialogComponent } from '../sui853-comercial/sui853-export-csv-dialog.component';
import {
  legacyDate, legacyExportFileName, legacyFilterRows, legacyHourMinute, legacyInteger, legacyNumber, legacySummaryFilter
} from '../../models/sui853-comercial.format';

interface SummaryTable { key: string; title: string; columns: TablaColumn[]; rows: OperacionesRow[]; }
// Legacy operaciones/residuosGenerados.vue screen columns, in order.
const DETAIL_COLUMNS: [string, string][] = [
  ['APS', 'APS'], ['NOMAPS', 'NOMAPS'], ['ANNO', 'ANNO'], ['MES', 'MES'],
  ['NUAP', '1. NUAP'], ['TIP_SITIO', '2. TIPO DE SITIO DE DESTINO'], ['NRO_SITIO', '3. NÚMERO DEL SITIO DE DESTINO'],
  ['PLACA', '4. PLACA VEHICULO'], ['FEC_ENTRADA', '5. FECHA DE ENTRADA DEL VEHÍCULO'],
  ['HOR_ENTRADA', '6. HORA DE ENTRADA DEL VEHICULO'], ['NUM_MICRO', '7. NUMICRO'],
  ['TON_RBU', '8. TONELADAS DE LIMPIEZA URBANA'], ['TON_RBR', '9. TONELADAS DE BARRIDO Y LIMPIEZA'],
  ['TON_RSOU', '10. TONELADAS DE RESIDUOS NO APROVECHABLES'], ['TON_RSOR', '11. TONELADAS DE RECHAZO DEL APROVECHAMIENTO'],
  ['TON_APROVE', '12. TONELADAS APROVECHADAS'], ['SIS_MEDICION', '13. SISTEMA DE MEDICIÓN'], ['VLR_PEAJES', '14. VLR_PEAJES'],
  ['HOR_SALIDA', 'HOR_SALIDA'], ['FEC_REGIST', 'FEC_REGIST'], ['USU_REG', 'USU_REG']
];
// Legacy export columns (note HOR_SALIDA before VLR_PEAJES, unlike the screen).
const EXPORT_COLUMNS: CsvColumn[] = [
  ['APS', 'APS'], ['NOMAPS', 'NOMAPS'], ['ANNO', 'ANNO'], ['MES', 'MES'], ['NUAP', 'NUAP'],
  ['TIP_SITIO', 'TIPO DE SITIO DE DESTINO'], ['NRO_SITIO', 'NÚMERO DEL SITIO DE DESTINO'], ['PLACA', 'PLACA VEHICULO'],
  ['FEC_ENTRADA', 'FECHA DE ENTRADA DEL VEHÍCULO'], ['HOR_ENTRADA', 'HORA DE ENTRADA DEL VEHICULO'], ['NUM_MICRO', 'NUMICRO'],
  ['TON_RBU', 'TONELADAS DE LIMPIEZA URBANA'], ['TON_RBR', 'TONELADAS DE BARRIDO Y LIMPIEZA'],
  ['TON_RSOU', 'TONELADAS DE RESIDUOS NO APROVECHABLES'], ['TON_RSOR', 'TONELADAS DE RECHAZO DEL APROVECHAMIENTO'],
  ['TON_APROVE', 'TONELADAS APROVECHADAS'], ['SIS_MEDICION', 'SISTEMA DE MEDICIÓN'], ['HOR_SALIDA', 'HORA DE SALIDA DEL VEHICULO'],
  ['VLR_PEAJES', 'VALOR DE PEAJES ($)'], ['FEC_REGIST', 'FECHA DE REGISTRO'], ['USU_REG', 'USUARIO REGISTRO']
].map(([field, header]) => ({ field, header }));
const NUMBER_DECIMALS: Record<string, number> = { TON_RBU: 3, TON_RBR: 3, TON_RSOU: 3, TON_RSOR: 3, TON_APROVE: 3, VLR_PEAJES: 0 };
const DATE_FIELDS = ['FEC_ENTRADA', 'FEC_REGIST'];

@Component({
  selector: 'app-sui853-residuos-generados',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, TablaAvanzadaComponent, Sui853ExportCsvDialogComponent],
  templateUrl: './residuos-generados.component.html',
  styleUrl: './residuos-generados.component.css'
})
export class ResiduosGeneradosComponent implements OnInit, OnDestroy {
  options: { label: string; value: string }[] = [];
  selectedApsId: string | null = null;
  year: number | null = null;
  month: number | null = null;
  readonly years = Array.from({ length: 13 }, (_, i) => 2018 + i);
  readonly months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((label, i) => ({ label, value: i + 1 }));
  catalogLoading = false;
  catalogError = '';
  detailLoading = false;
  summaryLoading = false;
  detailError = '';
  summaryError = '';
  queried = false;
  rows: OperacionesRow[] = [];
  displayRows: OperacionesRow[] = [];
  exportRows: OperacionesRow[] = [];
  readonly detailColumns: TablaColumn[] = DETAIL_COLUMNS.map(([field, header]) => ({ field, header, numero: field in NUMBER_DECIMALS }));
  readonly filterFields = ['APS', 'NOMAPS', 'ANNO', 'MES', 'NUAP', 'PLACA'];
  filters: Record<string, string> = Object.fromEntries(this.filterFields.map(f => [f, '']));
  readonly exportColumns = EXPORT_COLUMNS;
  readonly exportUnchecked = ['USU_REG', 'APS', 'NOMAPS', 'ANNO', 'MES', 'HOR_SALIDA', 'FEC_REGIST'];
  exportVisible = false;
  private apsNames = new Map<string, string>();
  summary: OperacionesRow | null = null;
  summaryTables: SummaryTable[] = [];
  private requests = new Subscription();
  private catalogRequest = new Subscription();

  constructor(private readonly catalog: Sui853ConfiguracionService,
    private readonly service: Sui853OperacionesService, private readonly cdr: ChangeDetectorRef) {}

  get selectedApsName(): string | null { return this.selectedApsId ? this.apsNames.get(this.selectedApsId) ?? null : null; }
  get exportFileName(): string { return legacyExportFileName(this.selectedApsName, this.month, this.year); }

  ngOnInit(): void { this.loadCatalog(); }

  loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = '';
    this.catalogRequest.unsubscribe();
    this.catalogRequest = this.catalog.tcfgAps().subscribe({
      next: response => {
        this.apsNames = new Map((response.data ?? []).map(item => [String(item.TCFG_APS_ID), item.NOMBRE_APS]));
        this.options = (response.data ?? []).map(item => ({ label: `${item.NOMBRE_APS} (${item.TCFG_APS_ID})`, value: String(item.TCFG_APS_ID) }));
        this.catalogLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.catalogLoading = false; this.catalogError = 'No se pudo cargar el catálogo APS.'; this.cdr.markForCheck(); }
    });
  }

  consultar(): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.rows = [];
    this.applyFilters();
    this.summary = null;
    this.summaryTables = [];
    this.detailError = this.summaryError = '';
    this.detailLoading = this.summaryLoading = false;
    this.queried = !!this.selectedApsId && this.year !== null && this.month !== null;
    if (!this.queried) return;
    this.detailLoading = this.summaryLoading = true;
    this.requests.add(this.service.detail({ apsId: this.selectedApsId!, year: this.year!, month: this.month! }).subscribe({
      next: response => {
        this.detailLoading = false;
        if (response.status !== 'success' || !this.isRows(response.data)) {
          this.detailError = 'La respuesta del detalle no es válida.';
        } else {
          this.rows = response.data;
          this.applyFilters();
        }
        this.cdr.markForCheck();
      },
      error: () => { this.detailLoading = false; this.detailError = 'No se pudo cargar el detalle.'; this.cdr.markForCheck(); }
    }));
    this.requests.add(this.service.summary().subscribe({
      next: response => {
        this.summaryLoading = false;
        if (response.status !== 'success' || (response.data !== null && (!this.isObject(response.data) || response.data['error']))) {
          this.summaryError = 'La respuesta del resumen no es válida.';
        } else {
          this.summary = response.data;
          this.summaryTables = this.buildSummaryTables(response.data);
        }
        this.cdr.markForCheck();
      },
      error: () => { this.summaryLoading = false; this.summaryError = 'No se pudo cargar el resumen.'; this.cdr.markForCheck(); }
    }));
  }

  // Discover sections from the report itself; never assume F853GR02 column names.
  buildSummaryTables(summary: OperacionesRow | null): SummaryTable[] {
    if (!summary) return [];
    const tables: SummaryTable[] = [];
    // Legacy resumenFilteredData: only the selected APS name, year and month.
    const scope = (rows: OperacionesRow[]) => legacySummaryFilter(rows, this.selectedApsName, this.year, this.month);
    const sharedRows = this.isRows(summary['data']) ? scope(summary['data']) : [];
    const sections = Object.entries(summary).filter(([, value]) => this.isObject(value) && Array.isArray(value['headers']));
    const covered = new Set<string>();
    for (const [key, value] of sections) {
      const section = value as OperacionesRow;
      const rows = this.isRows(section['data']) ? scope(section['data']) : sharedRows;
      const headers = (section['headers'] as unknown[]).filter((header): header is OperacionesRow => this.isObject(header) && typeof header['field'] === 'string');
      const columns: TablaColumn[] = headers.map(header => ({ field: String(header['field']), header: String(header['header'] ?? header['field']), filtrable: true }));
      columns.forEach(column => covered.add(column.field));
      if (this.isRows(section['data'])) {
        for (const field of new Set((section['data'] as OperacionesRow[]).flatMap(row => Object.keys(row)))) {
          if (!columns.some(column => column.field === field)) columns.push({ field, header: field, filtrable: true });
        }
      }
      tables.push({ key, title: String(section['title'] ?? key), columns, rows });
    }
    const allSharedRows = this.isRows(summary['data']) ? summary['data'] : [];
    const extraFields = [...new Set(allSharedRows.flatMap(row => Object.keys(row)))].filter(field => !covered.has(field));
    if (!tables.length || extraFields.length) {
      tables.push({ key: 'data', title: tables.length ? 'Campos adicionales' : String(summary['title'] ?? 'Datos del resumen'), columns: extraFields.map(field => ({ field, header: field, filtrable: true })), rows: sharedRows });
    }
    return tables;
  }

  applyFilters(): void {
    const filtered = legacyFilterRows(this.rows, this.filters, DATE_FIELDS);
    this.displayRows = filtered.map(row => this.formatRow(row));
    this.exportRows = this.displayRows;
  }

  // Legacy `formattedRows`: the same values the screen shows are exported.
  private formatRow(row: OperacionesRow): OperacionesRow {
    const r: OperacionesRow = { ...row };
    r['TIP_SITIO'] = legacyInteger(r['TIP_SITIO']);
    for (const f of DATE_FIELDS) r[f] = legacyDate(r[f]);
    r['HOR_ENTRADA'] = legacyHourMinute(r['HOR_ENTRADA']);
    r['HOR_SALIDA'] = legacyHourMinute(r['HOR_SALIDA']);
    for (const [f, decimals] of Object.entries(NUMBER_DECIMALS)) {
      if (r[f] !== undefined && r[f] !== null && r[f] !== '') r[f] = legacyNumber(r[f], decimals);
    }
    return r;
  }

  formatCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  private isObject(value: unknown): value is OperacionesRow { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  private isRows(value: unknown): value is OperacionesRow[] { return Array.isArray(value) && value.every(row => this.isObject(row)); }
  ngOnDestroy(): void { this.requests.unsubscribe(); this.catalogRequest.unsubscribe(); }
}

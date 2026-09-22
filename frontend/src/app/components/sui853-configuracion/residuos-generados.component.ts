import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';
import { OperacionesRow, Sui853OperacionesService } from '../../services/sui853-operaciones.service';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

interface SummaryTable { key: string; title: string; columns: TablaColumn[]; rows: OperacionesRow[]; }
const DETAIL_FIELDS = ['APS', 'NOMAPS', 'ANNO', 'MES', 'NUAP', 'TIP_SITIO', 'NRO_SITIO', 'PLACA', 'FEC_ENTRADA', 'HOR_ENTRADA', 'HOR_SALIDA', 'NUM_MICRO', 'TON_RBU', 'TON_RBR', 'TON_RSOU', 'TON_RSOR', 'SIS_MEDICION', 'TON_APROVE', 'VLR_PEAJES', 'FEC_REGIST', 'USU_REG'];
const FILTER_FIELDS = ['APS', 'NOMAPS', 'ANNO', 'MES', 'NUAP', 'PLACA'];

@Component({
  selector: 'app-sui853-residuos-generados',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, TablaAvanzadaComponent],
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
  detailColumns: TablaColumn[] = [];
  summary: OperacionesRow | null = null;
  summaryTables: SummaryTable[] = [];
  private requests = new Subscription();
  private catalogRequest = new Subscription();

  constructor(private readonly catalog: Sui853ConfiguracionService,
    private readonly service: Sui853OperacionesService, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void { this.loadCatalog(); }

  loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = '';
    this.catalogRequest.unsubscribe();
    this.catalogRequest = this.catalog.tcfgAps().subscribe({
      next: response => {
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
          const fields = [...new Set([...DETAIL_FIELDS, ...this.rows.flatMap(row => Object.keys(row))])];
          this.detailColumns = fields.map(field => ({ field, header: field, numero: /^(TON_|VLR_)/.test(field), filtrable: FILTER_FIELDS.includes(field) }));
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
    const sharedRows = this.isRows(summary['data']) ? summary['data'] : [];
    const sections = Object.entries(summary).filter(([, value]) => this.isObject(value) && Array.isArray(value['headers']));
    const covered = new Set<string>();
    for (const [key, value] of sections) {
      const section = value as OperacionesRow;
      const rows = this.isRows(section['data']) ? section['data'] : sharedRows;
      const headers = (section['headers'] as unknown[]).filter((header): header is OperacionesRow => this.isObject(header) && typeof header['field'] === 'string');
      const columns: TablaColumn[] = headers.map(header => ({ field: String(header['field']), header: String(header['header'] ?? header['field']), filtrable: true }));
      columns.forEach(column => covered.add(column.field));
      if (this.isRows(section['data'])) {
        for (const field of new Set(rows.flatMap(row => Object.keys(row)))) {
          if (!columns.some(column => column.field === field)) columns.push({ field, header: field, filtrable: true });
        }
      }
      tables.push({ key, title: String(section['title'] ?? key), columns, rows });
    }
    const extraFields = [...new Set(sharedRows.flatMap(row => Object.keys(row)))].filter(field => !covered.has(field));
    if (!tables.length || extraFields.length) {
      tables.push({ key: 'data', title: tables.length ? 'Campos adicionales' : String(summary['title'] ?? 'Datos del resumen'), columns: extraFields.map(field => ({ field, header: field, filtrable: true })), rows: sharedRows });
    }
    return tables;
  }

  formatCell(value: unknown, field: string): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (/^FEC_/.test(field) && typeof value === 'string') {
      const date = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
      if (date) return `${date[3]}/${date[2]}/${date[1]}`;
    }
    // String formatting avoids precision loss for OracleDecimal values.
    if (/^(TON_|VLR_)/.test(field) || typeof value === 'number') {
      if (['APS', 'ANNO', 'MES', 'NUAP', 'NRO_SITIO', 'NUM_MICRO', 'TIP_SITIO', 'SIS_MEDICION'].includes(field)) return String(value);
      const number = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value));
      if (number) return `${number[1]}${number[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${number[3] ? ',' + number[3] : ''}`;
    }
    return String(value);
  }

  private isObject(value: unknown): value is OperacionesRow { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  private isRows(value: unknown): value is OperacionesRow[] { return Array.isArray(value) && value.every(row => this.isObject(row)); }
  ngOnDestroy(): void { this.requests.unsubscribe(); this.catalogRequest.unsubscribe(); }
}

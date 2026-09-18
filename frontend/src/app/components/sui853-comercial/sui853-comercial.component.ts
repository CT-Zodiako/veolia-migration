import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { Sui853ComercialService } from '../../services/sui853-comercial.service';
import { ComercialRow, ComercialSummary } from '../../models/sui853-comercial.models';

@Component({
  selector: 'app-sui853-comercial', standalone: true,
  imports: [CommonModule, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './sui853-comercial.component.html',
  styleUrl: './sui853-comercial.component.css'
})
export class Sui853ComercialComponent implements OnDestroy {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;
  tab: 'detail' | 'summary' = 'detail';
  queried = false;
  detailLoading = false;
  summaryLoading = false;
  detailError = '';
  summaryError = '';
  rows: ComercialRow[] = [];
  summary: ComercialSummary | null = null;
  detailColumns: TablaColumn[] = [];
  summaryColumns: TablaColumn[] = [];
  private requests = new Subscription();

  constructor(private readonly service: Sui853ComercialService) {}

  get summaryRows(): ComercialRow[] { return this.summary?.data ?? []; }
  get summaryMetadata(): Record<string, unknown> {
    const { data, ...metadata } = this.summary ?? {};
    return metadata;
  }

  clear(): void {
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.queried = false;
    this.detailLoading = this.summaryLoading = false;
    this.detailError = this.summaryError = '';
    this.rows = [];
    this.summary = null;
    this.detailColumns = this.summaryColumns = [];
  }

  consultar(): void {
    this.clear();
    if (this.aps === null || this.anno === null || this.mes === null) return;
    this.queried = true;
    if (!Number.isSafeInteger(this.aps)) {
      this.detailError = this.summaryError = 'El identificador APS no puede representarse de forma segura.';
      return;
    }
    this.detailLoading = this.summaryLoading = true;
    this.requests.add(this.service.detail({ apsId: String(this.aps), year: this.anno, month: this.mes }).subscribe({
      next: response => {
        this.detailLoading = false;
        if (response.status !== 'success' || !Array.isArray(response.data)) {
          this.detailError = 'La respuesta del detalle no es válida.'; return;
        }
        this.rows = response.data;
        this.detailColumns = this.columns(this.rows);
      },
      error: () => { this.detailLoading = false; this.detailError = 'No se pudo cargar el detalle. Volvé a intentar.'; }
    }));
    this.requests.add(this.service.summary().subscribe({
      next: response => {
        this.summaryLoading = false;
        const summary = response.data;
        if (response.status !== 'success' || (summary !== null &&
            (summary['error'] || !Array.isArray(summary.data) || summary.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))))) {
          this.summaryError = 'El formato de resumen recibido no es válido.'; return;
        }
        this.summary = summary;
        this.summaryColumns = this.columns(this.summaryRows, summary);
      },
      error: () => { this.summaryLoading = false; this.summaryError = 'No se pudo cargar el resumen. Volvé a intentar.'; }
    }));
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

  ngOnDestroy(): void { this.requests.unsubscribe(); }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853ConfiguracionService, VcfgApsDocumentoItem } from '../../services/sui853-configuracion.service';

@Component({
  selector: 'app-sui853-aps-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './aps-documentos.component.html',
  styleUrls: ['./aps-documentos.component.css']
})
export class ApsDocumentosComponent implements OnInit {
  rows: VcfgApsDocumentoItem[] = [];
  filteredRows: VcfgApsDocumentoItem[] = [];
  readonly columns = [
    { field: 'NOMAPS', header: 'NOMAPS' }, { field: 'SEGMENTO', header: 'SEGMENTO' },
    { field: 'CODFORMATO', header: 'CODFORMATO' }, { field: 'NOMFORMATO', header: 'NOMFORMATO' }
  ];
  // Legacy per-column "Contiene" filters (case-insensitive contains).
  readonly filterFields = ['NOMAPS', 'SEGMENTO', 'NOMFORMATO'];
  filters: Record<string, string> = Object.fromEntries(this.filterFields.map(f => [f, '']));
  loading = false;
  error = '';

  constructor(
    private readonly service: Sui853ConfiguracionService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  applyFilters(): void {
    const active = Object.entries(this.filters)
      .map(([field, value]) => [field, value.trim().toLowerCase()] as const)
      .filter(([, needle]) => needle);
    this.filteredRows = this.rows.filter(row => active.every(([field, needle]) => {
      const cell = (row as unknown as Record<string, unknown>)[field];
      return cell !== null && cell !== undefined && String(cell).toLowerCase().includes(needle);
    }));
  }

  private loadData(): void {
    this.loading = true;
    this.error = '';

    this.service.vcfgApsDocumento().subscribe({
      next: response => {
        this.rows = response.data ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar APS Documentos';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}

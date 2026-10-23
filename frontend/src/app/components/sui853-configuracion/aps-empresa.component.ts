import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853ConfiguracionService, VcfgApsEmpresaItem } from '../../services/sui853-configuracion.service';

@Component({
  selector: 'app-sui853-aps-empresa',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './aps-empresa.component.html',
  styleUrls: ['./aps-empresa.component.css']
})
export class ApsEmpresaComponent implements OnInit {
  rows: VcfgApsEmpresaItem[] = [];
  filteredRows: VcfgApsEmpresaItem[] = [];
  readonly columns = [
    { field: 'TCFG_APS_ID', header: 'COD APS' }, { field: 'NOMAPS', header: 'NOMAPS' }, { field: 'NUAP', header: 'NUAP' },
    { field: 'EMPRESA', header: 'EMPRESA' }, { field: 'CODSUI', header: 'CODSUI' }, { field: 'DEPARTAMENTO', header: 'DEPARTAMENTO' },
    { field: 'MUNICIPIO', header: 'MUNICIPIO' }
  ];
  // Legacy per-column "Contiene" filters (case-insensitive contains).
  readonly filterFields = ['NOMAPS', 'EMPRESA', 'DEPARTAMENTO', 'MUNICIPIO'];
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

  // Legacy formatNumber(TCFG_APS_ID, 0): es-CO thousands separator.
  formatId(value: unknown): unknown {
    const num = Number(value);
    return value !== null && value !== '' && Number.isFinite(num)
      ? num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : value ?? '';
  }

  private loadData(): void {
    this.loading = true;
    this.error = '';

    this.service.vcfgApsEmpresa().subscribe({
      next: response => {
        this.rows = response.data ?? [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar APS Empresa';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}

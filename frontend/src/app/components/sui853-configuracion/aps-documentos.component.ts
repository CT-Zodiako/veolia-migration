import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853ConfiguracionService, VcfgApsDocumentoItem } from '../../services/sui853-configuracion.service';

@Component({
  selector: 'app-sui853-aps-documentos',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  templateUrl: './aps-documentos.component.html',
  styleUrls: ['./aps-documentos.component.css']
})
export class ApsDocumentosComponent implements OnInit {
  rows: VcfgApsDocumentoItem[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly service: Sui853ConfiguracionService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading = true;
    this.error = '';

    this.service.vcfgApsDocumento().subscribe({
      next: response => {
        this.rows = response.data ?? [];
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

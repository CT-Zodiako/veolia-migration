import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853ConfiguracionService, VcfgApsEmpresaItem } from '../../services/sui853-configuracion.service';

@Component({
  selector: 'app-sui853-aps-empresa',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  templateUrl: './aps-empresa.component.html',
  styleUrls: ['./aps-empresa.component.css']
})
export class ApsEmpresaComponent implements OnInit {
  rows: VcfgApsEmpresaItem[] = [];
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

    this.service.vcfgApsEmpresa().subscribe({
      next: response => {
        this.rows = response.data ?? [];
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

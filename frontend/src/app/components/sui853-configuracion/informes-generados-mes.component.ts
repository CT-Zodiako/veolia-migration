import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853ConfiguracionService, TcfgApsItem } from '../../services/sui853-configuracion.service';

type SelectorOption = { label: string; value: number };

@Component({
  selector: 'app-sui853-informes-generados-mes',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  template: `
    <section>
      <h2>Informes Generados Mes</h2>
      <p *ngIf="loading">Cargando catálogo APS...</p>
      <p *ngIf="error" class="error">{{ error }}</p>

      <div class="form-group">
        <label>APS</label>
        <p-select
          [options]="options"
          [(ngModel)]="selectedApsId"
          optionLabel="label"
          optionValue="value"
          placeholder="Seleccione"
          [showClear]="true"
          [style]="{width: '100%'}"
          [disabled]="loading || options.length === 0"
        ></p-select>
      </div>
    </section>
  `,
  styles: ['.error { color: #b00020; } .form-group { margin-bottom: 12px; }']
})
export class InformesGeneradosMesComponent implements OnInit {
  options: SelectorOption[] = [];
  selectedApsId: number | null = null;
  loading = false;
  error = '';

  constructor(
    private readonly service: Sui853ConfiguracionService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSelector();
  }

  private loadSelector(): void {
    this.loading = true;
    this.error = '';

    this.service.tcfgAps().subscribe({
      next: response => {
        this.options = this.mapOptions(response.data ?? []);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al cargar catálogo APS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapOptions(rows: TcfgApsItem[]): SelectorOption[] {
    return rows.map(item => ({
      label: item.NOMBRE_APS,
      value: item.TCFG_APS_ID
    }));
  }
}

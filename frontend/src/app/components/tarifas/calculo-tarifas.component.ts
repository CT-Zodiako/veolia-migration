import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TarifaChartPoint, TarifaRow, TarifasService } from '../../services/tarifas.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';

@Component({
  selector: 'app-calculo-tarifas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent],
  templateUrl: './calculo-tarifas.component.html',
  styleUrls: ['./calculo-tarifas.component.css']
})
export class CalculoTarifasComponent {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;

  rows: TarifaRow[] = [];
  chartData: TarifaChartPoint[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly tarifasService: TarifasService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  consultar(): void {
    if (this.aps === null || this.anno === null || this.mes === null) {
      this.error = 'Debe seleccionar APS, año y mes';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';

    this.tarifasService.getTarifa(this.aps, this.anno, this.mes).subscribe({
      next: data => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al consultar tarifas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });

    this.tarifasService.getchartTarifas(this.aps, this.anno, this.mes).subscribe({
      next: data => {
        this.chartData = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.chartData = [];
        this.cdr.detectChanges();
      }
    });
  }

  getColumns(rows: TarifaRow[]): string[] {
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }

  limpiar(): void {
    this.rows = [];
    this.chartData = [];
    this.error = '';
    this.cdr.detectChanges();
  }

  getBarWidth(value: number): number {
    const max = Math.max(...this.chartData.map(d => d.value || 0), 1);
    return Math.min((value / max) * 100, 100);
  }
}

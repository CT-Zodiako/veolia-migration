import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TarifaRow, TarifasService } from '../../services/tarifas.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';

@Component({
  selector: 'app-detalle-tarifas-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent],
  templateUrl: './detalle-tarifas-gen.component.html'
})
export class DetalleTarifasGenComponent {
  anno: number | null = null;
  mes: number | null = null;

  rows: TarifaRow[] = [];
  loading = false;
  error = '';

  constructor(
    private readonly tarifasService: TarifasService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  consultar(): void {
    if (this.anno === null || this.mes === null) {
      this.error = 'Debe seleccionar año y mes';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';

    this.tarifasService.getTarxCosGeneral(this.anno, this.mes).subscribe({
      next: data => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al consultar tarifas generales';
        this.loading = false;
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
    this.error = '';
    this.cdr.detectChanges();
  }
}

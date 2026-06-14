import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TarifaRow, TarifasService } from '../../services/tarifas.service';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

@Component({
  selector: 'app-detalle-tarifas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent],
  templateUrl: './detalle-tarifas.component.html'
})
export class DetalleTarifasComponent {
  aps: number | null = null;
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
    if (this.aps === null || this.anno === null || this.mes === null) {
      this.error = 'Debe seleccionar APS, año y mes';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';

    this.tarifasService.getTarxCos(this.aps, this.anno, this.mes).subscribe({
      next: data => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al consultar detalle tarifario';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getColumns(rows: TarifaRow[]): string[] {
    const first = rows[0];
    return first ? Object.keys(first) : [];
  }
}

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { CompararCostos, Reliquidacion } from '../../models/reliquidacion.model';

@Component({
  selector: 'app-reliq-comparar-costo',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './reliq-comparar-costo.component.html',
  styleUrls: ['./reliq-comparar-costo.component.css']
})
export class ReliqCompararCostoComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly rows = signal<CompararCostos[]>([]);
  readonly loading = signal(false);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService
  ) {
    this.reliqService.getReliquidaciones().subscribe((res) => this.reliquidaciones.set(res.data || []));
  }

  consultar(): void {
    if (!this.selectedReliq()) return;
    this.loading.set(true);
    this.cargueService.compararCostos(this.selectedReliq()!).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}

import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { CompararTarifas, Reliquidacion } from '../../models/reliquidacion.model';

@Component({
  selector: 'app-reliq-comparar-tarifas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './reliq-comparar-tarifas.component.html',
  styleUrls: ['./reliq-comparar-tarifas.component.css']
})
export class ReliqCompararTarifasComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly selectedAnno = signal<number>(new Date().getFullYear());
  readonly selectedMes = signal<number>(new Date().getMonth() + 1);
  readonly rows = signal<CompararTarifas[]>([]);
  readonly resumenJson = signal<unknown>(null);
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
    const reliqId = this.selectedReliq()!;
    this.cargueService.compararTarifas(reliqId).subscribe({
      next: (res) => this.rows.set(res.data || []),
      error: () => this.loading.set(false)
    });
    this.cargueService.resumenCompararTarifas(reliqId, 0, this.selectedAnno(), this.selectedMes()).subscribe({
      next: (res) => {
        this.resumenJson.set(res.data || null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}

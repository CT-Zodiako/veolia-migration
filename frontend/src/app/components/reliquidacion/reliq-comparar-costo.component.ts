import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { CompararCostos, Reliquidacion } from '../../models/reliquidacion.model';

/**
 * Columnas reales de RELIQ.VREL_COMPARACOSTOS, confirmadas contra el legacy
 * (back-tarificador/src/modules/reliq/cargue/controller.js, líneas 169-224, y
 * front-tarificador/src/reliq/views/CompararCosto.vue, líneas 34-326).
 */
const COMPARAR_COSTOS_COLUMNAS: TablaColumn[] = [
  { field: 'codReliq', header: 'RELIQ' },
  { field: 'apsNom', header: 'APS' },
  { field: 'costAnno', header: 'AÑO' },
  { field: 'costMes', header: 'MES' },
  { field: 'relqCcsener', header: 'RELQ CCSENER', numero: true },
  { field: 'tariCcsener', header: 'TARI CCSENER', numero: true },
  { field: 'difeCcsener', header: 'DIFE CCSENER', numero: true },
  { field: 'relqCcsenerapv', header: 'RELQ CCSENERAPV', numero: true },
  { field: 'tariCcsenerapv', header: 'TARI CCSENERAPV', numero: true },
  { field: 'difeCcsenerapv', header: 'DIFE CCSENERAPV', numero: true },
  { field: 'relqCcsacue', header: 'RELQ CCSACUE', numero: true },
  { field: 'tariCcsacue', header: 'TARI CCSACUE', numero: true },
  { field: 'difeCcsacue', header: 'DIFE CCSACUE', numero: true },
  { field: 'relqCcsacueapv', header: 'RELQ CCSACUEAPV', numero: true },
  { field: 'tariCcsacueapv', header: 'TARI CCSACUEAPV', numero: true },
  { field: 'difeCcsacueapv', header: 'DIFE CCSACUEAPV', numero: true },
  { field: 'relqCbls', header: 'RELQ CBLS', numero: true },
  { field: 'tariCbls', header: 'TARI CBLS', numero: true },
  { field: 'difeCbls', header: 'DIFE CBLS', numero: true },
  { field: 'relqClus', header: 'RELQ CLUS', numero: true },
  { field: 'tariClus', header: 'TARI CLUS', numero: true },
  { field: 'difeClus', header: 'DIFE CLUS', numero: true },
  { field: 'relqCrt', header: 'RELQ CRT', numero: true },
  { field: 'tariCrt', header: 'TARI CRT', numero: true },
  { field: 'difeCrt', header: 'DIFE CRT', numero: true },
  { field: 'relqCdf', header: 'RELQ CDF', numero: true },
  { field: 'tariCdf', header: 'TARI CDF', numero: true },
  { field: 'difeCdf', header: 'DIFE CDF', numero: true },
  { field: 'relqCtl', header: 'RELQ CTL', numero: true },
  { field: 'tariCtl', header: 'TARI CTL', numero: true },
  { field: 'difeCtl', header: 'DIFE CTL', numero: true },
  { field: 'relqVba', header: 'RELQ VBA', numero: true },
  { field: 'tariVba', header: 'TARI VBA', numero: true },
  { field: 'difeVba', header: 'DIFE VBA', numero: true },
  { field: 'relqIat', header: 'RELQ IAT', numero: true },
  { field: 'tariIat', header: 'TARI IAT', numero: true },
  { field: 'difeIat', header: 'DIFE IAT', numero: true }
];

@Component({
  selector: 'app-reliq-comparar-costo',
  standalone: true,
  imports: [CommonModule, FormsModule, TablaAvanzadaComponent, ...CommonPrimeNgModules],
  templateUrl: './reliq-comparar-costo.component.html',
  styleUrls: ['./reliq-comparar-costo.component.css']
})
export class ReliqCompararCostoComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly rows = signal<CompararCostos[]>([]);
  readonly loading = signal(false);

  readonly columnas = COMPARAR_COSTOS_COLUMNAS;

  /** app-tabla-avanzada trabaja sobre filas genéricas; se castea solo en el borde de la vista. */
  readonly rowsParaTabla = computed(() => this.rows() as unknown as Record<string, unknown>[]);

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

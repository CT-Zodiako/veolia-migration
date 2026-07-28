import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldsetModule } from 'primeng/fieldset';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { CompararTarifas, Reliquidacion, ResumenCompararTarifasDatasetItem } from '../../models/reliquidacion.model';

/**
 * Columnas reales de RELIQ.VREL_COMPARATARIFACOBRO, confirmadas contra el legacy Vue
 * (front-tarificador/src/reliq/views/CompararTarifas.vue, líneas 65-637).
 */
const COMPARAR_TARIFAS_COLUMNAS: TablaColumn[] = [
  { field: 'mes', header: 'MES' },
  { field: 'anno', header: 'AÑO' },
  { field: 'clasNombre', header: 'CLASE DE USO' },
  { field: 'paraNombre', header: 'TIPO TARIFA' },
  { field: 'faprNombre', header: 'FACTOR PROD' },
  { field: 'tcOrig', header: 'TC ORIG', numero: true },
  { field: 'tcRel', header: 'TC REL', numero: true },
  { field: 'tcDif', header: 'TC DIF', numero: true },
  { field: 'tcaprovOrig', header: 'TCAPROV ORIG', numero: true },
  { field: 'tcaprovRel', header: 'TCAPROV REL', numero: true },
  { field: 'tcaprovDif', header: 'TCAPROV DIF', numero: true },
  { field: 'tcaddOrig', header: 'TCADD ORIG', numero: true },
  { field: 'tcaddRel', header: 'TCADD REL', numero: true },
  { field: 'tcaddDif', header: 'TCADD DIF', numero: true },
  { field: 'tcaddaprovOrig', header: 'TCADDAPROV ORIG', numero: true },
  { field: 'tcaddaprovRel', header: 'TCADDAPROV REL', numero: true },
  { field: 'tcaddaprovDif', header: 'TCADDAPROV DIF', numero: true },
  { field: 'tblOrig', header: 'TBL ORIG', numero: true },
  { field: 'tblRel', header: 'TBL REL', numero: true },
  { field: 'tblDif', header: 'TBL DIF', numero: true },
  { field: 'tluOrig', header: 'TLU ORIG', numero: true },
  { field: 'tluRel', header: 'TLU REL', numero: true },
  { field: 'tluDif', header: 'TLU DIF', numero: true },
  { field: 'trtOrig', header: 'TRT ORIG', numero: true },
  { field: 'trtRel', header: 'TARI REL', numero: true },
  { field: 'trtDif', header: 'TRT DIF', numero: true },
  { field: 'tdfOrig', header: 'TDF ORIG', numero: true },
  { field: 'tdfRel', header: 'TDF REL', numero: true },
  { field: 'tdfDif', header: 'TDF DIF', numero: true },
  { field: 'ttlOrig', header: 'TTL ORIG', numero: true },
  { field: 'ttlRel', header: 'TARI REL', numero: true },
  { field: 'ttlDif', header: 'TTL DIF', numero: true },
  { field: 'taOrig', header: 'TA ORIG', numero: true },
  { field: 'taRel', header: 'TA REL', numero: true },
  { field: 'taDif', header: 'TA DIF', numero: true },
  { field: 'tarPlenaEneOrg', header: 'TAR_PLENA_ENE_ORG', numero: true },
  { field: 'tarPlenaEneRel', header: 'TAR_PLENA_ENE_REL', numero: true },
  { field: 'devolene', header: 'COB/DEV ENE', numero: true },
  { field: 'tarPlenaAcuOrg', header: 'TAR_PLENA_ACU_ORG', numero: true },
  { field: 'tarPlenaAcuRel', header: 'TAR_PLENA_ACU_REL', numero: true },
  { field: 'devolacu', header: 'COB/DEV ACU', numero: true }
];

/** Fila "aplanada" de un bloque del resumen, para renderizarla en un p-table real (ver GenericTable.vue). */
interface ResumenFila {
  [columna: string]: unknown;
}

@Component({
  selector: 'app-reliq-comparar-tarifas',
  standalone: true,
  imports: [CommonModule, FormsModule, FieldsetModule, ParametrosConsultaComponent, TablaAvanzadaComponent, ...CommonPrimeNgModules],
  templateUrl: './reliq-comparar-tarifas.component.html',
  styleUrls: ['./reliq-comparar-tarifas.component.css']
})
export class ReliqCompararTarifasComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly selectedAps = signal<number | null>(null);
  readonly selectedAnno = signal<number | null>(new Date().getFullYear());
  readonly selectedMes = signal<number | null>(new Date().getMonth() + 1);
  readonly rows = signal<CompararTarifas[]>([]);
  readonly resumenPeriodo = signal<string | null>(null);
  readonly resumenDataset = signal<ResumenCompararTarifasDatasetItem[]>([]);
  readonly loading = signal(false);

  readonly columnas = COMPARAR_TARIFAS_COLUMNAS;

  readonly puedeConsultar = computed(() => !!this.selectedReliq() && !!this.selectedAps() && !!this.selectedAnno() && !!this.selectedMes());
  /** app-tabla-avanzada trabaja sobre filas genéricas; se castea solo en el borde de la vista. */
  readonly rowsParaTabla = computed(() => this.rows() as unknown as Record<string, unknown>[]);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService
  ) {
    this.reliqService.getReliquidaciones().subscribe((res) => this.reliquidaciones.set(res.data || []));
  }

  consultar(): void {
    const reliqId = this.selectedReliq();
    const apsaId = this.selectedAps();
    const anno = this.selectedAnno();
    const mes = this.selectedMes();
    if (!reliqId || !apsaId || !anno || !mes) return;

    this.loading.set(true);
    this.cargueService.compararTarifas(reliqId).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.cargueService.resumenCompararTarifas(reliqId, apsaId, anno, mes).subscribe({
      next: (res) => {
        this.resumenPeriodo.set(res.data?.periodo ?? null);
        this.resumenDataset.set(res.data?.dataset ?? []);
      },
      error: () => {
        this.resumenPeriodo.set(null);
        this.resumenDataset.set([]);
      }
    });
  }

  /** Reconstruye las filas de un bloque del resumen zippeando columns/data (ver legacy GenericTable.vue). */
  filasDeResumen(item: ResumenCompararTarifasDatasetItem): ResumenFila[] {
    return (item.data || []).map((fila) => {
      const registro: ResumenFila = {};
      (item.columns || []).forEach((columna, index) => {
        registro[columna] = fila[index];
      });
      return registro;
    });
  }
}

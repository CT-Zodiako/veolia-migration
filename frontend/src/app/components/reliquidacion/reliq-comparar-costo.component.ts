import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CompararCostos, Reliquidacion } from '../../models/reliquidacion.model';

/**
 * Columnas reales de RELIQ.VREL_COMPARACOSTOS, confirmadas contra el legacy
 * (back-tarificador/src/modules/reliq/cargue/controller.js, líneas 169-224, y
 * front-tarificador/src/reliq/views/CompararCosto.vue, líneas 34-326).
 * Redondeo a 2 decimales (`redondearDosDecimales`) en todas las de valor salvo
 * RELQ_CLUS, que el legacy mostraba sin redondear (línea 194). Sin filtros: el
 * legacy declaraba templates #filter pero la tabla no tenía filterDisplay.
 */
const COMPARAR_COSTOS_COLUMNAS: TablaColumn[] = [
  { field: 'codReliq', header: 'RELIQ' },
  { field: 'apsNom', header: 'APS' },
  { field: 'costAnno', header: 'AÑO' },
  { field: 'costMes', header: 'MES' },
  { field: 'relqCcsener', header: 'RELQ CCSENER', numero: true, decimales: 2 },
  { field: 'tariCcsener', header: 'TARI CCSENER', numero: true, decimales: 2 },
  { field: 'difeCcsener', header: 'DIFE CCSENER', numero: true, decimales: 2 },
  { field: 'relqCcsenerapv', header: 'RELQ CCSENERAPV', numero: true, decimales: 2 },
  { field: 'tariCcsenerapv', header: 'TARI CCSENERAPV', numero: true, decimales: 2 },
  { field: 'difeCcsenerapv', header: 'DIFE CCSENERAPV', numero: true, decimales: 2 },
  { field: 'relqCcsacue', header: 'RELQ CCSACUE', numero: true, decimales: 2 },
  { field: 'tariCcsacue', header: 'TARI CCSACUE', numero: true, decimales: 2 },
  { field: 'difeCcsacue', header: 'DIFE CCSACUE', numero: true, decimales: 2 },
  { field: 'relqCcsacueapv', header: 'RELQ CCSACUEAPV', numero: true, decimales: 2 },
  { field: 'tariCcsacueapv', header: 'TARI CCSACUEAPV', numero: true, decimales: 2 },
  { field: 'difeCcsacueapv', header: 'DIFE CCSACUEAPV', numero: true, decimales: 2 },
  { field: 'relqCbls', header: 'RELQ CBLS', numero: true, decimales: 2 },
  { field: 'tariCbls', header: 'TARI CBLS', numero: true, decimales: 2 },
  { field: 'difeCbls', header: 'DIFE CBLS', numero: true, decimales: 2 },
  { field: 'relqClus', header: 'RELQ CLUS', numero: true },
  { field: 'tariClus', header: 'TARI CLUS', numero: true, decimales: 2 },
  { field: 'difeClus', header: 'DIFE CLUS', numero: true, decimales: 2 },
  { field: 'relqCrt', header: 'RELQ CRT', numero: true, decimales: 2 },
  { field: 'tariCrt', header: 'TARI CRT', numero: true, decimales: 2 },
  { field: 'difeCrt', header: 'DIFE CRT', numero: true, decimales: 2 },
  { field: 'relqCdf', header: 'RELQ CDF', numero: true, decimales: 2 },
  { field: 'tariCdf', header: 'TARI CDF', numero: true, decimales: 2 },
  { field: 'difeCdf', header: 'DIFE CDF', numero: true, decimales: 2 },
  { field: 'relqCtl', header: 'RELQ CTL', numero: true, decimales: 2 },
  { field: 'tariCtl', header: 'TARI CTL', numero: true, decimales: 2 },
  { field: 'difeCtl', header: 'DIFE CTL', numero: true, decimales: 2 },
  { field: 'relqVba', header: 'RELQ VBA', numero: true, decimales: 2 },
  { field: 'tariVba', header: 'TARI VBA', numero: true, decimales: 2 },
  { field: 'difeVba', header: 'DIFE VBA', numero: true, decimales: 2 },
  { field: 'relqIat', header: 'RELQ IAT', numero: true, decimales: 2 },
  { field: 'tariIat', header: 'TARI IAT', numero: true, decimales: 2 },
  { field: 'difeIat', header: 'DIFE IAT', numero: true, decimales: 2 }
];

/**
 * Clase CSS por celda según el rol de la columna (CompararCosto.vue líneas
 * 368-370): RELQ_* -> azul clarito, TARI_* -> verde clarito, DIFE_* ->
 * rojo clarito. Mismas 3 clases ya definidas en tabla-avanzada.component.css
 * para Comparar Tarifas (bg-reliq/bg-tari/bg-dife) -- se reusan tal cual.
 */
function cellClassCompararCostos(_row: Record<string, unknown>, col: TablaColumn): string {
  const field = col.field;
  if (field.startsWith('relq')) return 'bg-reliq';
  if (field.startsWith('tari')) return 'bg-tari';
  if (field.startsWith('dife')) return 'bg-dife';
  return '';
}

@Component({
  selector: 'app-reliq-comparar-costo',
  standalone: true,
  imports: [CommonModule, FormsModule, ApsSelectorComponent, TablaAvanzadaComponent, ...CommonPrimeNgModules],
  templateUrl: './reliq-comparar-costo.component.html',
  styleUrls: ['./reliq-comparar-costo.component.css']
})
export class ReliqCompararCostoComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly selectedAps = signal<number | null>(null);
  // Fila completa de la reliquidación elegida: alimenta Descripción y Horizonte
  // (mismo patrón que reliq-comparar-tarifas.component.ts / reliq-cargue.component.ts).
  readonly reliqSeleccionada = computed(() =>
    this.reliquidaciones().find((r) => r.relqId === this.selectedReliq()) ?? null
  );
  readonly rows = signal<CompararCostos[]>([]);
  readonly loading = signal(false);

  readonly columnas = COMPARAR_COSTOS_COLUMNAS;
  readonly cellClass = cellClassCompararCostos;

  /** app-tabla-avanzada trabaja sobre filas genéricas; se castea solo en el borde de la vista. */
  readonly rowsParaTabla = computed(() => this.rows() as unknown as Record<string, unknown>[]);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService,
    private readonly parametrosState: ParametrosConsultaStateService
  ) {
    this.cargarReliquidaciones(null);
  }

  // Mismo patrón que reliq-comparar-tarifas.component.ts: el selector filtra
  // las reliquidaciones por APS, y elegir una dispara la consulta sola (sin
  // botón "Comparar costos").
  onApsChange(apsId: number | null): void {
    this.selectedAps.set(apsId);
    this.selectedReliq.set(null);
    this.rows.set([]);
    this.cargarReliquidaciones(apsId);
  }

  onReliqChange(reliqId: number | null): void {
    this.selectedReliq.set(reliqId);
    this.parametrosState.setReliquidacion(reliqId);
    if (reliqId !== null) {
      this.consultar();
    }
  }

  private reliqRequestId = 0;

  private cargarReliquidaciones(apsId: number | null): void {
    const requestId = ++this.reliqRequestId;
    const source$ = apsId
      ? this.reliqService.getReliquidacionByAps(apsId)
      : this.reliqService.getReliquidaciones();
    source$.subscribe((res) => {
      if (requestId !== this.reliqRequestId) return;

      const data = res.data || [];
      this.reliquidaciones.set(data);

      // Restaura la última reliquidación elegida (en esta u otra pantalla del
      // módulo, ej. Cargue / Comparar Tarifas) si sigue en la lista filtrada por APS.
      if (this.selectedReliq() === null) {
        const guardada = this.parametrosState.getReliquidacion();
        if (guardada !== null && data.some((r) => r.relqId === guardada)) {
          this.onReliqChange(guardada);
        }
      }
    });
  }

  // RELQDESDE/RELQHASTA vienen como YYYYMM; se muestran como YYYY/MM.
  formatPeriodo(value: string | null | undefined): string {
    if (!value || value.length !== 6) return '';
    return `${value.slice(0, 4)}/${value.slice(4, 6)}`;
  }

  consultar(): void {
    const reliqId = this.selectedReliq();
    if (!reliqId) return;

    this.loading.set(true);
    this.cargueService.compararCostos(reliqId).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}

import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldsetModule } from 'primeng/fieldset';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ColumnaGenerica, TablaGenericaComponent } from '../shared/tabla-generica.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CompararTarifas, Reliquidacion, ResumenCompararTarifasDatasetItem } from '../../models/reliquidacion.model';

/**
 * Columnas reales de RELIQ.VREL_COMPARATARIFACOBRO, confirmadas contra el legacy Vue
 * (front-tarificador/src/reliq/views/CompararTarifas.vue, líneas 65-637).
 * Filtros "Contiene" en las 5 columnas de texto (líneas 66-147) y redondeo a 2
 * decimales (`redondearDosDecimales`) en todas las de valor salvo TBL_ORIG, que el
 * legacy mostraba sin redondear (línea 322).
 */
const COMPARAR_TARIFAS_COLUMNAS: TablaColumn[] = [
  { field: 'mes', header: 'MES', filtrable: true },
  { field: 'anno', header: 'AÑO', filtrable: true },
  { field: 'clasNombre', header: 'CLASE DE USO', filtrable: true },
  { field: 'paraNombre', header: 'TIPO TARIFA', filtrable: true },
  { field: 'faprNombre', header: 'FACTOR PROD', filtrable: true },
  { field: 'tcOrig', header: 'TC ORIG', numero: true, decimales: 2 },
  { field: 'tcRel', header: 'TC REL', numero: true, decimales: 2 },
  { field: 'tcDif', header: 'TC DIF', numero: true, decimales: 2 },
  { field: 'tcaprovOrig', header: 'TCAPROV ORIG', numero: true, decimales: 2 },
  { field: 'tcaprovRel', header: 'TCAPROV REL', numero: true, decimales: 2 },
  { field: 'tcaprovDif', header: 'TCAPROV DIF', numero: true, decimales: 2 },
  { field: 'tcaddOrig', header: 'TCADD ORIG', numero: true, decimales: 2 },
  { field: 'tcaddRel', header: 'TCADD REL', numero: true, decimales: 2 },
  { field: 'tcaddDif', header: 'TCADD DIF', numero: true, decimales: 2 },
  { field: 'tcaddaprovOrig', header: 'TCADDAPROV ORIG', numero: true, decimales: 2 },
  { field: 'tcaddaprovRel', header: 'TCADDAPROV REL', numero: true, decimales: 2 },
  { field: 'tcaddaprovDif', header: 'TCADDAPROV DIF', numero: true, decimales: 2 },
  { field: 'tblOrig', header: 'TBL ORIG', numero: true },
  { field: 'tblRel', header: 'TBL REL', numero: true, decimales: 2 },
  { field: 'tblDif', header: 'TBL DIF', numero: true, decimales: 2 },
  { field: 'tluOrig', header: 'TLU ORIG', numero: true, decimales: 2 },
  { field: 'tluRel', header: 'TLU REL', numero: true, decimales: 2 },
  { field: 'tluDif', header: 'TLU DIF', numero: true, decimales: 2 },
  { field: 'trtOrig', header: 'TRT ORIG', numero: true, decimales: 2 },
  { field: 'trtRel', header: 'TARI REL', numero: true, decimales: 2 },
  { field: 'trtDif', header: 'TRT DIF', numero: true, decimales: 2 },
  { field: 'tdfOrig', header: 'TDF ORIG', numero: true, decimales: 2 },
  { field: 'tdfRel', header: 'TDF REL', numero: true, decimales: 2 },
  { field: 'tdfDif', header: 'TDF DIF', numero: true, decimales: 2 },
  { field: 'ttlOrig', header: 'TTL ORIG', numero: true, decimales: 2 },
  { field: 'ttlRel', header: 'TARI REL', numero: true, decimales: 2 },
  { field: 'ttlDif', header: 'TTL DIF', numero: true, decimales: 2 },
  { field: 'taOrig', header: 'TA ORIG', numero: true, decimales: 2 },
  { field: 'taRel', header: 'TA REL', numero: true, decimales: 2 },
  { field: 'taDif', header: 'TA DIF', numero: true, decimales: 2 },
  { field: 'tarPlenaEneOrg', header: 'TAR_PLENA_ENE_ORG', numero: true, decimales: 2 },
  { field: 'tarPlenaEneRel', header: 'TAR_PLENA_ENE_REL', numero: true, decimales: 2 },
  { field: 'devolene', header: 'COB/DEV ENE', numero: true, decimales: 2 },
  { field: 'tarPlenaAcuOrg', header: 'TAR_PLENA_ACU_ORG', numero: true, decimales: 2 },
  { field: 'tarPlenaAcuRel', header: 'TAR_PLENA_ACU_REL', numero: true, decimales: 2 },
  { field: 'devolacu', header: 'COB/DEV ACU', numero: true, decimales: 2 }
];

/** Fila "aplanada" de un bloque del resumen, para renderizarla en app-tabla-generica (ver GenericTable.vue). */
interface ResumenFila {
  [columna: string]: unknown;
}

/**
 * Clase CSS por celda según el rol de la columna (CompararTarifas.vue líneas 819-867).
 * Los casos exactos (tarPlenaEne, tarPlenaAcu, devol) van antes que los genéricos por
 * sufijo porque "tarPlenaEneRel"/"tarPlenaAcuRel" también terminan en "Rel".
 */
function cellClassCompararTarifas(row: Record<string, unknown>, col: TablaColumn): string {
  const field = col.field;
  switch (field) {
    case 'tarPlenaEneOrg':
      return 'bg-naranja';
    case 'tarPlenaEneRel':
      return 'bg-naranja-oscuro';
    case 'tarPlenaAcuOrg':
      return 'bg-azul';
    case 'tarPlenaAcuRel':
      return 'bg-azul-oscuro';
    case 'devolene':
    case 'devolacu': {
      const valor = Number(row[field]);
      if (!Number.isFinite(valor) || valor === 0) return 'devol-zero';
      return valor > 0 ? 'devol-pos' : 'devol-neg';
    }
  }
  if (field.endsWith('Orig')) return 'bg-reliq';
  if (field.endsWith('Rel')) return 'bg-tari';
  if (field.endsWith('Dif')) return 'bg-dife';
  return '';
}

@Component({
  selector: 'app-reliq-comparar-tarifas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FieldsetModule,
    ToastModule,
    ApsSelectorComponent,
    AnnoSelectorComponent,
    MesSelectorComponent,
    TablaAvanzadaComponent,
    TablaGenericaComponent,
    ...CommonPrimeNgModules
  ],
  providers: [MessageService],
  templateUrl: './reliq-comparar-tarifas.component.html',
  styleUrls: ['./reliq-comparar-tarifas.component.css']
})
export class ReliqCompararTarifasComponent {
  readonly reliquidaciones = signal<Reliquidacion[]>([]);
  readonly selectedReliq = signal<number | null>(null);
  readonly selectedAps = signal<number | null>(null);
  // Fila completa de la reliquidación elegida: alimenta Descripción y Horizonte
  // (Desde/Hasta) del selector, replicando el layout del legacy seleccionReliq.vue
  // (mismo patrón que reliq-cargue.component.ts).
  readonly reliqSeleccionada = computed(() =>
    this.reliquidaciones().find((r) => r.relqId === this.selectedReliq()) ?? null
  );
  readonly rows = signal<CompararTarifas[]>([]);
  readonly loading = signal(false);

  // Resumen: selector de Año/Mes propio e independiente del de arriba (legacy
  // SelectorOnlyYear.vue, dentro del tab "Resumen"), dispara su propia consulta.
  // Arranca en null (no en la fecha de hoy): una reliquidación es casi siempre
  // de un período histórico, así que auto-consultar con "hoy" apenas se elige
  // APS+reliquidación siempre traía un resumen vacío. null también habilita
  // que app-anno-selector/app-mes-selector restauren el último valor usado
  // (solo restauran si el @Input llega en null, mismo patrón que el resto de la app).
  readonly resumenAnno = signal<number | null>(null);
  readonly resumenMes = signal<number | null>(null);
  readonly resumenPeriodo = signal<string | null>(null);
  readonly resumenDataset = signal<ResumenCompararTarifasDatasetItem[]>([]);
  readonly resumenLoading = signal(false);

  readonly columnas = COMPARAR_TARIFAS_COLUMNAS;
  readonly cellClass = cellClassCompararTarifas;

  /** app-tabla-avanzada trabaja sobre filas genéricas; se castea solo en el borde de la vista. */
  readonly rowsParaTabla = computed(() => this.rows() as unknown as Record<string, unknown>[]);

  constructor(
    private readonly reliqService: ReliquidacionService,
    private readonly cargueService: ReliqCargueService,
    private readonly messages: MessageService,
    private readonly parametrosState: ParametrosConsultaStateService
  ) {
    this.cargarReliquidaciones(null);

    // Sin botón "Consultar resumen": se dispara solo al completar reliquidación +
    // APS + año + mes, mismo patrón auto-consultar que costos-calculo-page.component.ts.
    effect(() => {
      const reliqId = this.selectedReliq();
      const apsaId = this.selectedAps();
      const anno = this.resumenAnno();
      const mes = this.resumenMes();
      if (!reliqId || !apsaId || !anno || !mes) {
        this.resumenPeriodo.set(null);
        this.resumenDataset.set([]);
        return;
      }
      this.consultarResumen();
    });
  }

  // Legacy seleccionReliq.vue: el selector filtra las reliquidaciones por APS.
  // Con APS elegida trae getReliquidacionByAps (lista); al limpiar el APS vuelve
  // al listado completo de getReliquidaciones (mismo patrón que reliq-cargue.component.ts).
  onApsChange(apsId: number | null): void {
    this.selectedAps.set(apsId);
    this.selectedReliq.set(null);
    this.limpiarDatos();
    this.cargarReliquidaciones(apsId);
  }

  onReliqChange(reliqId: number | null): void {
    this.selectedReliq.set(reliqId);
    this.parametrosState.setReliquidacion(reliqId);
    if (reliqId !== null) {
      this.consultar();
    }
  }

  // Carga las opciones del selector de reliquidaciones. El requestId descarta
  // respuestas viejas: el APS restaurado por app-aps-selector dispara una segunda
  // carga apenas inicia la pantalla y solo la última respuesta debe ganar.
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
      // módulo, ej. Cargue) si sigue apareciendo en la lista filtrada por APS.
      if (this.selectedReliq() === null) {
        const guardada = this.parametrosState.getReliquidacion();
        if (guardada !== null && data.some((r) => r.relqId === guardada)) {
          this.onReliqChange(guardada);
        }
      }
    });
  }

  // RELQDESDE/RELQHASTA vienen como YYYYMM; se muestran como YYYY/MM en el
  // horizonte readonly del selector.
  formatPeriodo(value: string | null | undefined): string {
    if (!value || value.length !== 6) return '';
    return `${value.slice(0, 4)}/${value.slice(4, 6)}`;
  }

  private limpiarDatos(): void {
    this.rows.set([]);
    this.resumenPeriodo.set(null);
    this.resumenDataset.set([]);
  }

  /** Tabla "Comparar Tarifas": no necesita anno/mes, igual que en el legacy (getData()). */
  consultar(): void {
    const reliqId = this.selectedReliq();
    if (!reliqId) return;

    this.loading.set(true);
    this.cargueService.compararTarifas(reliqId).subscribe({
      next: (res) => {
        const data = res.data || [];
        this.rows.set(data);
        this.loading.set(false);

        // Precarga el Año/Mes del Resumen con el de la PRIMERA fila real de
        // "Comparar Tarifas" -- no con el horizonte declarado de la
        // reliquidación (relqDesde/relqHasta): esos campos son solo
        // informativos y pueden no coincidir con los períodos que
        // realmente tienen datos generados. El mes/año de una fila ya
        // cargada exitosamente sí está garantizado que existe.
        const primera = data[0];
        if (primera?.anno && primera?.mes) {
          this.resumenAnno.set(primera.anno);
          this.resumenMes.set(primera.mes);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  /** Resumen: consulta independiente disparada por su propio selector Año/Mes. */
  consultarResumen(): void {
    const reliqId = this.selectedReliq();
    const apsaId = this.selectedAps();
    const anno = this.resumenAnno();
    const mes = this.resumenMes();
    if (!reliqId || !apsaId || !anno || !mes) return;

    this.resumenLoading.set(true);
    this.cargueService.resumenCompararTarifas(reliqId, apsaId, anno, mes).subscribe({
      next: (res) => {
        this.resumenPeriodo.set(res.data?.periodo ?? null);
        this.resumenDataset.set(res.data?.dataset ?? []);
        this.resumenLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.resumenPeriodo.set(null);
        this.resumenDataset.set([]);
        this.resumenLoading.set(false);

        const detalle = err.status === 404 && err.error?.message === 'RELIQ_NOT_FOUND'
          ? 'Esta reliquidación todavía no tiene resumen generado para el período elegido (hace falta que primero se ejecute "RELIQUIDAR TARIFA" en Cargue).'
          : err.error?.message || 'No fue posible consultar el resumen.';

        this.messages.add({ severity: 'warn', summary: 'Resumen Comparar Tarifas', detail: detalle, life: 6000 });
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

  /** Mapea columns:string[] -> ColumnaGenerica[] para app-tabla-generica (ver resumen-variables.component.ts). */
  columnasDeResumen(item: ResumenCompararTarifasDatasetItem): ColumnaGenerica[] {
    return (item.columns || []).map((c) => ({ field: c, header: c }));
  }
}

import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { periodoInicial } from './periodo-inicial.util';
import {
  FiltroEstado,
  calcularBarrasPorDia,
  calcularKpis,
  contarPorEstado,
  estaCalculado,
  fechaCalculo,
  filtrarPorEstado
} from './dashboard-gerencial.util';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './dashboard-gerencial.component.html',
  styleUrl: './dashboard-gerencial.component.css'
})
export class DashboardGerencialComponent implements OnInit {
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'APSA_ID', header: 'ID' },
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'TARI_FECHACREACION', header: 'Estado del cálculo' },
    { field: 'SISU_CORREO', header: 'Usuario' }
  ];

  /** Chips de APS pendientes en la tarjeta antes de resumir el resto como "+N". */
  readonly maxChipsPendientes = 3;

  readonly filtro = signal<FiltroEstado>('todos');
  readonly filtros: { valor: FiltroEstado; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'calculados', etiqueta: 'Calculados' },
    { valor: 'pendientes', etiqueta: 'Pendientes' }
  ];

  // Las cifras salen de TODAS las filas del período, no solo de las filtradas en la tabla.
  readonly kpis = computed(() => calcularKpis(this.rows()));
  readonly barras = computed(() => calcularBarrasPorDia(this.rows()));
  readonly conteos = computed(() => contarPorEstado(this.rows()));
  readonly filasFiltradas = computed(() => filtrarPorEstado(this.rows(), this.filtro()));

  readonly fechaCalculo = fechaCalculo;
  readonly estaCalculado = estaCalculado;

  // Legacy DashBoard.vue:23 coloreaba la celda según haya fecha; ahora se tiñe toda la fila pendiente.
  readonly cellClass = (row: Record<string, unknown>): string => (estaCalculado(row) ? '' : 'fila-pendiente');

  constructor(
    private readonly service: InfoGerencialService,
    private readonly parametrosState: ParametrosConsultaStateService
  ) {}

  // Informe gerencial: todas las APS (el legacy ocultaba el selector #ddAps) y carga al entrar
  // con el período guardado o el mes actual, como el legacy created() con stDate ?? new Date().
  ngOnInit(): void {
    const periodo = periodoInicial(this.parametrosState);
    this.anno.set(periodo.anno);
    this.mes.set(periodo.mes);
    this.consultarSiCompleto();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value);
    this.consultarSiCompleto();
  }

  onMesChange(value: number | null): void {
    this.mes.set(value);
    this.consultarSiCompleto();
  }

  setFiltro(valor: FiltroEstado): void {
    this.filtro.set(valor);
  }

  private consultarSiCompleto(): void {
    const anno = this.anno();
    const mes = this.mes();
    if (anno === null || mes === null) {
      this.rows.set([]);
      return;
    }

    this.loading.set(true);
    const periodo = periodoAnterior(anno, mes);
    this.service.getDashBoardGerencial(periodo.anno, periodo.mes).subscribe({
      next: (r) => {
        this.rows.set(r.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }
}

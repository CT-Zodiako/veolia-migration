import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { periodoInicial } from './periodo-inicial.util';
import { formatearFechaLegacy } from './fecha-legacy.util';
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
    { field: 'APSA_ID', header: 'Id' },
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'TARI_FECHACREACION', header: 'Estado Cálculo' },
    { field: 'SISU_CORREO', header: 'Usuario' }
  ];

  readonly formatearFecha = formatearFechaLegacy;

  // Legacy DashBoard.vue:23: green-cell when there is a calculation date, red-cell otherwise.
  readonly cellClass = (row: Record<string, unknown>, col: TablaColumn): string =>
    col.field === 'TARI_FECHACREACION' ? (row['TARI_FECHACREACION'] ? 'color-green' : 'color-red') : '';

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

import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { SuiDashboardRow, SuiDashboardService } from '../../services/sui-dashboard.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

const COLUMNAS_ESTADO = ['F19', 'F23', 'F24', 'F35', 'F36'];

@Component({
  selector: 'app-sui-dashboard',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './sui-dashboard.component.html',
  styleUrl: './sui-dashboard.component.css'
})
export class SuiDashboardComponent implements OnInit {
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly rows = signal<SuiDashboardRow[]>([]);

  // Legacy DashBoard.vue:14-108: sin filtros por columna.
  readonly columnas: TablaColumn[] = [
    { field: 'APSID', header: 'Id' },
    { field: 'APSNOM', header: 'APS' },
    { field: 'F19', header: 'F19' },
    { field: 'F23', header: 'F23' },
    { field: 'F24', header: 'F24' },
    { field: 'F35', header: 'F35' },
    { field: 'F36', header: 'F36' },
    { field: 'USUARIO', header: 'Usuario' },
  ];

  constructor(
    private readonly service: SuiDashboardService,
    private readonly parametrosState: ParametrosConsultaStateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const savedAnno = this.parametrosState.getAnno();
    const savedMes = this.parametrosState.getMes();

    if (savedAnno !== null && savedMes !== null) {
      this.anno.set(savedAnno);
      this.mes.set(savedMes);
    } else {
      const ahora = new Date();
      this.anno.set(ahora.getFullYear());
      this.mes.set(ahora.getMonth() + 1);
      this.parametrosState.setAnno(this.anno());
      this.parametrosState.setMes(this.mes());
    }
  }

  consultar(): void {
    const year = this.anno();
    const month = this.mes();

    if (!year || !month) {
      return;
    }

    const periodo = periodoAnterior(year, month);

    this.loading.set(true);
    this.error.set('');

    this.service.getDashboard(periodo.anno, periodo.mes).subscribe({
      next: (filas) => {
        this.rows.set(filas);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(err?.error?.message || err?.error?.data || 'Error consultando el Dashboard SUI');
        this.rows.set([]);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  limpiar(): void {
    this.rows.set([]);
  }

  cellClass(row: Record<string, unknown>, col: TablaColumn): string {
    if (!COLUMNAS_ESTADO.includes(col.field)) {
      return '';
    }

    const valor = String(row[col.field] ?? '').toUpperCase().trim();
    if (valor === 'PENDIENTE') {
      return 'color-red';
    }
    if (valor === 'NO APLICA') {
      return 'color-gray';
    }
    return 'color-green';
  }
}

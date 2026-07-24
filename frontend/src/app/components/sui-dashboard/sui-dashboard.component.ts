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

  readonly columnas: TablaColumn[] = [
    { field: 'APSID', header: 'Id', filtrable: true },
    { field: 'APSNOM', header: 'APS', filtrable: true },
    { field: 'F19', header: 'F19', filtrable: true },
    { field: 'F23', header: 'F23', filtrable: true },
    { field: 'F24', header: 'F24', filtrable: true },
    { field: 'F35', header: 'F35', filtrable: true },
    { field: 'F36', header: 'F36', filtrable: true },
    { field: 'USUARIO', header: 'Usuario', filtrable: true },
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

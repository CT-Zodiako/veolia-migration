import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { redondear } from '../../shared/redondeo.util';

@Component({
  selector: 'app-historial-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './historial-productividad.component.html'
})
export class HistorialProductividadComponent {
  anno: number | null = new Date().getFullYear();
  mes: number | null = new Date().getMonth() + 1;

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'CODAPS', header: 'Código APS' },
    { field: 'NOMAPS', header: 'APS', filtrable: true },
    { field: 'NOMEMPRESA', header: 'Empresa', filtrable: true },
    { field: 'COSTO', header: 'Costo', numero: true },
    { field: 'PR22_VALOR', header: 'Valor', numero: true },
    { field: 'SISU_CORREO', header: 'Correo' }
  ];

  constructor(private readonly service: InfoGeneralesService) {
    this.consultar();
  }

  consultar(): void {
    const anno = this.anno;
    const mes = this.mes;
    if (anno === null || mes === null) return;

    this.loading.set(true);
    const periodo = periodoAnterior(anno, mes);
    this.service.consultaHistorialProductividad(periodo.anno, periodo.mes).subscribe({
      next: (r) => {
        const filas = (r.data || []).map((fila: Record<string, unknown>) => ({
          ...fila,
          PR22_VALOR: fila['PR22_VALOR'] === null || fila['PR22_VALOR'] === undefined ? null : redondear(fila['PR22_VALOR'], 5)
        }));
        this.rows.set(filas);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }

  limpiar(): void {
    this.rows.set([]);
  }
}

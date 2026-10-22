import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

/** Legacy informes/HistorialProductividad.vue formatearNumero: blank for 0/null/NaN, otherwise 5 decimals. */
export function formatearNumero(numero: unknown): string {
  if (!numero || isNaN(Number(numero))) return '';
  return parseFloat(String(numero)).toFixed(5);
}

@Component({
  selector: 'app-historial-productividad',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './historial-productividad.component.html',
  styleUrl: './historial-productividad.component.css'
})
export class HistorialProductividadComponent {
  anno: number | null = new Date().getFullYear();
  mes: number | null = new Date().getMonth() + 1;

  readonly loading = signal(false);
  readonly error = signal('');
  readonly formatearNumero = formatearNumero;
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
    this.error.set('');
    const periodo = periodoAnterior(anno, mes);
    this.service.consultaHistorialProductividad(periodo.anno, periodo.mes).subscribe({
      next: (r) => {
        this.rows.set(r.data || []);
        this.loading.set(false);
      },
      error: (e) => {
        this.rows.set([]);
        if (e?.status !== 404) {
          this.error.set(e?.error?.message || 'Error al consultar historial de productividad.');
        }
        this.loading.set(false);
      }
    });
  }

  limpiar(): void {
    this.rows.set([]);
    this.error.set('');
  }
}

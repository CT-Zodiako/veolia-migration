import { Component, signal, inject } from '@angular/core';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { periodoInicial } from '../shared/periodo-inicial.util';

@Component({
  selector: 'app-historial-certificacion',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './historial-certificacion.component.html',
  styleUrl: './historial-certificacion.component.css'
})
export class HistorialCertificacionComponent {
  private readonly periodo = periodoInicial(inject(ParametrosConsultaStateService));
  anno: number | null = this.periodo.anno;
  mes: number | null = this.periodo.mes;

  readonly loading = signal(false);
  readonly error = signal('');
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'CODAPS', header: 'Código APS' },
    { field: 'NOMAPS', header: 'APS', filtrable: true },
    { field: 'FECHCERTIFICA', header: 'Fecha Certificación' },
    { field: 'FECHINTEGRA', header: 'Fecha Integración' },
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
    this.service.consultaHistorialCertificaciones(periodo.anno, periodo.mes).subscribe({
      next: (r) => {
        const filas = (r.data || []).map((fila: Record<string, unknown>) => ({
          ...fila,
          FECHCERTIFICA: this.formatearFecha(fila['FECHCERTIFICA']),
          FECHINTEGRA: this.formatearFecha(fila['FECHINTEGRA'])
        }));
        this.rows.set(filas);
        this.loading.set(false);
      },
      error: (e) => {
        if (e?.status === 404) {
          this.rows.set([]);
        } else {
          this.error.set(e?.error?.message || 'Error al consultar historial de certificación.');
        }
        this.loading.set(false);
      }
    });
  }

  limpiar(): void {
    this.rows.set([]);
    this.error.set('');
  }

  private formatearFecha(valor: unknown): string {
    if (!valor || typeof valor !== 'string') return 'N/A';
    const partes = valor.split('T')[0]?.split('-');
    if (partes?.length !== 3) return 'N/A';
    return `${partes[0]}/${partes[1]}/${partes[2]}`;
  }
}

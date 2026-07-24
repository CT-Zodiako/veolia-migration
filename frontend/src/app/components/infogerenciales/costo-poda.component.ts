import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-costo-poda',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './costo-poda.component.html',
  styleUrl: './costo-poda.component.css'
})
export class CostoPodaComponent {
  aps: number | null = null;

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'PERIODO', header: 'Período', filtrable: true },
    { field: 'EMPR_NOMBRE', header: 'Empresa', filtrable: true },
    { field: 'CPTE_VALORSUI', header: 'Costo Techo', numero: true },
    { field: 'CPTE_VALORFACT', header: 'Costo Facturación', numero: true },
    { field: 'TIPOINGRESO', header: 'Tipo Ingreso', filtrable: true },
    { field: 'CPTE_FECCREA', header: 'Fecha Creación' },
    { field: 'SISU_CORREO', header: 'Usuario' }
  ];

  readonly cellClass = (row: Record<string, unknown>, col: TablaColumn): string =>
    col.field === 'TIPOINGRESO' && row['TIPOINGRESO'] === 'MANUAL' ? 'color-orange' : '';

  constructor(private readonly service: InfoGerencialService) {}

  onApsChange(apsId: number | null): void {
    this.aps = apsId;
    this.consultar();
  }

  private consultar(): void {
    const apsId = this.aps;
    if (apsId === null) {
      this.rows.set([]);
      return;
    }

    this.loading.set(true);
    this.service.costoPoda(apsId).subscribe({
      next: (r) => {
        const filas = (r.data || []).map((fila: Record<string, unknown>) => ({
          ...fila,
          CPTE_FECCREA: this.formatearFecha(fila['CPTE_FECCREA'])
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

  private formatearFecha(valor: unknown): string {
    if (!valor || typeof valor !== 'string') return 'N/A';
    const partes = valor.split('T')[0]?.split('-');
    if (partes?.length !== 3) return 'N/A';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}

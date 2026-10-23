import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PgirsService } from '../../services/pgirs.service';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { fechaIngresoLegacy } from './pgirs-formato';

// Legacy ResumenPgirs.vue:25-54: headers and filters (APS, INGRESO, TIPO INGRESO).
const COLUMNAS_RESUMEN: TablaColumn[] = [
  { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
  { field: 'PERIODO', header: 'INGRESO', filtrable: true },
  { field: 'PGRINGRESO', header: 'TIPO INGRESO', filtrable: true },
  { field: 'PGRIFECHA', header: 'FECHA INGRESO' },
  { field: 'SISU_CORREO', header: 'USUARIO' }
];

@Component({
  selector: 'app-pgirs-informe-variables',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, ApsSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './pgirs-informe-variables.component.html',
  styleUrls: ['./pgirs-informe-variables.component.css']
})
export class PgirsInformeVariablesComponent {
  readonly columnasResumen = COLUMNAS_RESUMEN;
  readonly fechaIngreso = fechaIngresoLegacy;

  aps = signal<number | null>(null);
  loading = signal(false);
  data = signal<any[]>([]);
  error = signal<string | null>(null);

  constructor(private readonly service: PgirsService) {}

  // Mismo criterio que definirColor() en el legacy ResumenPgirs.vue
  cellClassResumen = (row: Record<string, unknown>, col: TablaColumn): string => {
    if (col.field !== 'PGRINGRESO') return '';
    const value = (row['PGRINGRESO'] ?? row['pgringreso']) as string;
    return value === 'MANUAL' ? 'color-orange' : '';
  };

  onApsChange(apsId: number | null): void {
    this.aps.set(apsId);
    if (apsId) {
      this.consultar();
    }
  }

  consultar(): void {
    const apsId = this.aps();
    if (!apsId) return;

    this.loading.set(true);
    this.error.set(null);
    this.service.getInformeVariables(apsId).subscribe({
      next: (res: any) => {
        this.data.set(res.data || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Error al consultar informe de variables');
        this.loading.set(false);
      }
    });
  }
}

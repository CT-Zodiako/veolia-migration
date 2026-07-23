import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { PgirsService } from '../../services/pgirs.service';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

const COLUMNAS_CLUS: TablaColumn[] = [
  { field: 'APSID', header: 'APS' },
  { field: 'APSA_NOMAPS', header: 'NOM APS', filtrable: true },
  { field: 'PERIODO', header: 'PERIODO', filtrable: true },
  { field: 'PODA', header: 'PODA', numero: true },
  { field: 'PODAPGIRS', header: 'PODA PGIRS', numero: true },
  { field: 'CESPED', header: 'CESPED', numero: true },
  { field: 'CESPEDPGIRS', header: 'CESPED PGIRS', numero: true },
  { field: 'LAVADO', header: 'LAVADO', numero: true },
  { field: 'LAVADOPGIRS', header: 'LAVADO PGIRS', numero: true },
  { field: 'PLAYAS', header: 'PLAYA', numero: true },
  { field: 'PLAYASPGIRS', header: 'PLAYA PGIRS', numero: true },
  { field: 'CESTASINS', header: 'I CEST', numero: true },
  { field: 'CESTASINSPGIRS', header: 'I CEST PGIRS', numero: true },
  { field: 'CESTASMAN', header: 'M CEST', numero: true },
  { field: 'CESTASMANPGIRS', header: 'M CEST PGIRS', numero: true }
];

const COLUMNAS_BARRIDO: TablaColumn[] = [
  { field: 'APSID', header: 'APS' },
  { field: 'APSA_NOMAPS', header: 'NOM APS', filtrable: true },
  { field: 'PERIODO', header: 'PERIODO', filtrable: true },
  { field: 'SEMESTRE', header: 'SEMESTRE', filtrable: true },
  { field: 'BARRIDO', header: 'BARRIDO', numero: true },
  { field: 'BARRIDOPGIRS', header: 'BARRIDO PGIRS', numero: true }
];

// Columna medida -> campo *COLOR que la acompaña en la vista (mismo criterio que el legacy)
const CAMPO_COLOR: Record<string, string> = {
  PODA: 'PODACOLOR',
  CESPED: 'CESPEDCOLOR',
  LAVADO: 'LAVADOCOLOR',
  PLAYAS: 'PLAYASCOLOR',
  CESTASINS: 'CESTASINSCOLOR',
  CESTASMAN: 'CESTASMANCOLOR',
  BARRIDO: 'BARRIDOCOLOR'
};

const COLUMNAS_PGIRS_OBJETIVO = new Set([
  'PODAPGIRS', 'CESPEDPGIRS', 'LAVADOPGIRS', 'PLAYASPGIRS', 'CESTASINSPGIRS', 'CESTASMANPGIRS', 'BARRIDOPGIRS'
]);

@Component({
  selector: 'app-pgirs-resumen',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TabsModule, ApsSelectorComponent, TablaAvanzadaComponent],
  providers: [MessageService],
  templateUrl: './pgirs-resumen.component.html',
  styleUrls: ['./pgirs-resumen.component.css']
})
export class PgirsResumenComponent {
  readonly columnasClus = COLUMNAS_CLUS;
  readonly columnasBarrido = COLUMNAS_BARRIDO;

  aps = signal<number | null>(null);
  activeTab = signal(0);

  loading = signal(false);
  data = signal<any[]>([]);
  error = signal<string | null>(null);

  loadingBarrido = signal(false);
  dataBarrido = signal<any[]>([]);
  errorBarrido = signal<string | null>(null);

  constructor(private readonly service: PgirsService) {}

  onApsChange(apsId: number | null): void {
    this.aps.set(apsId);
    if (apsId) {
      this.consultar();
      this.consultarBarrido();
    }
  }

  onTabChange(val: any): void {
    this.activeTab.set(Number(val));
  }

  // Mismo criterio que definirColor() en el legacy InformePgirs.vue (pestañas Clus y Barrido)
  cellClassMedido = (row: Record<string, any>, col: TablaColumn): string => {
    if (COLUMNAS_PGIRS_OBJETIVO.has(col.field)) {
      return 'color-blue';
    }

    const campoColor = CAMPO_COLOR[col.field];
    if (!campoColor) return '';

    const valor = row[campoColor] ?? row[campoColor.toLowerCase()];
    if (valor === 'rojo') return 'color-red';
    if (valor === 'azul') return 'color-blue';
    return 'color-green';
  };

  consultar(): void {
    const apsId = this.aps();
    if (!apsId) return;

    this.loading.set(true);
    this.error.set(null);
    this.service.getResumen(apsId).subscribe({
      next: (res: any) => {
        this.data.set(res.data || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message || 'Error al consultar resumen PGIRS');
        this.loading.set(false);
      }
    });
  }

  consultarBarrido(): void {
    const apsId = this.aps();
    if (!apsId) return;

    this.loadingBarrido.set(true);
    this.errorBarrido.set(null);
    this.service.getBarrido(apsId).subscribe({
      next: (res: any) => {
        this.dataBarrido.set(res.data || []);
        this.loadingBarrido.set(false);
      },
      error: (err: any) => {
        this.errorBarrido.set(err?.message || 'Error al consultar barrido PGIRS');
        this.loadingBarrido.set(false);
      }
    });
  }
}

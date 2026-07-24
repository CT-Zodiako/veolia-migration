import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './dashboard-gerencial.component.html',
  styleUrl: './dashboard-gerencial.component.css'
})
export class DashboardGerencialComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly filteredRows = computed(() => {
    const apsSel = this.aps();
    const rows = this.rows();
    return apsSel === null ? rows : rows.filter((row) => Number(row['APSA_ID']) === apsSel);
  });

  readonly columnas: TablaColumn[] = [
    { field: 'APSA_ID', header: 'Id' },
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'TARI_FECHACREACION', header: 'Estado Cálculo' },
    { field: 'SISU_CORREO', header: 'Usuario' }
  ];

  readonly cellClass = (row: Record<string, unknown>, col: TablaColumn): string =>
    col.field === 'TARI_FECHACREACION' ? (row['TARI_FECHACREACION'] === 'N/A' ? 'color-red' : 'color-green') : '';

  constructor(private readonly service: InfoGerencialService) {}

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
        const filas = (r.data || []).map((fila: Record<string, unknown>) => ({
          ...fila,
          TARI_FECHACREACION: this.formatearFecha(fila['TARI_FECHACREACION'])
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

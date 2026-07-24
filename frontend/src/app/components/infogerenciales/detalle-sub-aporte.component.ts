import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { redondearFilas } from '../../shared/redondeo.util';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-detalle-sub-aporte',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './detalle-sub-aporte.component.html',
  styleUrl: './detalle-sub-aporte.component.css'
})
export class DetalleSubAporteComponent {
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
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Predio', filtrable: true },
    { field: 'SUCO_VALOR', header: 'Valor', numero: true }
  ];

  private readonly decimales: Record<string, number> = { SUCO_VALOR: 6 };

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
    this.service.detsubaporte(periodo.anno, periodo.mes).subscribe({
      next: (r) => {
        this.rows.set(redondearFilas(r.data || [], this.decimales));
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }
}

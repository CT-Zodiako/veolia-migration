import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { periodoInicial } from './periodo-inicial.util';
import { redondearFilas } from '../../shared/redondeo.util';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

@Component({
  selector: 'app-detalle-sub-aporte',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './detalle-sub-aporte.component.html',
  styleUrl: './detalle-sub-aporte.component.css'
})
export class DetalleSubAporteComponent implements OnInit {
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly loading = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  readonly columnas: TablaColumn[] = [
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Predio', filtrable: true },
    { field: 'SUCO_VALOR', header: 'Valor', numero: true }
  ];

  private readonly decimales: Record<string, number> = { SUCO_VALOR: 6 };

  constructor(
    private readonly service: InfoGerencialService,
    private readonly parametrosState: ParametrosConsultaStateService
  ) {}

  // Informe gerencial: todas las APS (el legacy ocultaba el selector #ddAps) y carga al entrar
  // con el período guardado o el mes actual, como el legacy created() con stDate ?? new Date().
  ngOnInit(): void {
    const periodo = periodoInicial(this.parametrosState);
    this.anno.set(periodo.anno);
    this.mes.set(periodo.mes);
    this.consultarSiCompleto();
  }

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

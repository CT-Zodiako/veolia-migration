import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TarifaRow, TarifasService } from '../../services/tarifas.service';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { periodoInicial } from '../infogerenciales/periodo-inicial.util';

@Component({
  selector: 'app-detalle-tarifas-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './detalle-tarifas-gen.component.html',
  styleUrl: './detalle-tarifas-gen.component.css'
})
export class DetalleTarifasGenComponent implements OnInit {
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly loading = signal(false);
  readonly rows = signal<TarifaRow[]>([]);

  readonly columnasPlena: TablaColumn[] = [
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'TIPO_FACT', header: 'Tipo Fac', filtrable: true },
    { field: 'TARI_CARGOFIJO', header: 'Cargo fijo', numero: true },
    { field: 'TARI_TC', header: 'Tc', numero: true },
    { field: 'TARI_TBL', header: 'Tbl', numero: true },
    { field: 'TARI_TLU', header: 'Tlu', numero: true },
    { field: 'TARI_CVARIABLE', header: 'C. Variable', numero: true },
    { field: 'TARI_TRT', header: 'Trt', numero: true },
    { field: 'TARI_TDT', header: 'Tdt', numero: true },
    { field: 'TARI_TTL', header: 'Ttl', numero: true },
    { field: 'TARI_TA', header: 'Ta', numero: true },
    { field: 'TARI_PLENA', header: 'Plena', numero: true }
  ];

  readonly columnasSubCon: TablaColumn[] = [
    { field: 'APSA_NOMAPS', header: 'APS', filtrable: true },
    { field: 'CLAS_NOMBRE', header: 'Clase Uso', filtrable: true },
    { field: 'PARA_NOMBRE', header: 'Tipo Tarifa', filtrable: true },
    { field: 'TIPO_FACT', header: 'Tipo Fac', filtrable: true },
    { field: 'TARI_CARGOFIJOSC', header: 'Cargo fijo', numero: true },
    { field: 'TARI_TCSC', header: 'Tc', numero: true },
    { field: 'TARI_TBLSC', header: 'Tbl', numero: true },
    { field: 'TARI_TLUSC', header: 'Tlu', numero: true },
    { field: 'TARI_CVARIABLESC', header: 'C. Variable', numero: true },
    { field: 'TARI_TRTSC', header: 'Trt', numero: true },
    { field: 'TARI_TDTSC', header: 'Tdt', numero: true },
    { field: 'TARI_TTLSC', header: 'Ttl', numero: true },
    { field: 'TARI_TASC', header: 'Ta', numero: true },
    { field: 'TARI_SUBCON', header: 'S/C', numero: true }
  ];

  constructor(
    private readonly tarifasService: TarifasService,
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
    this.tarifasService.getTarxCosGeneral(periodo.anno, periodo.mes).subscribe({
      next: data => {
        this.rows.set(data || []);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }
}

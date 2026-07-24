import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TarifaRow, TarifasService } from '../../services/tarifas.service';
import { ParametrosConsultaComponent } from '../shared/parametros-consulta.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

@Component({
  selector: 'app-detalle-tarifas',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ParametrosConsultaComponent, TablaAvanzadaComponent],
  templateUrl: './detalle-tarifas.component.html',
  styleUrl: './detalle-tarifas.component.css'
})
export class DetalleTarifasComponent {
  aps: number | null = null;
  anno: number | null = null;
  mes: number | null = null;

  activeTab = 0;
  rows: TarifaRow[] = [];
  loading = false;
  error = '';

  readonly columnasPlena: TablaColumn[] = [
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
    private readonly cdr: ChangeDetectorRef
  ) {}

  consultar(): void {
    if (this.aps === null || this.anno === null || this.mes === null) {
      this.error = 'Debe seleccionar APS, año y mes';
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = '';

    const periodo = periodoAnterior(this.anno, this.mes);
    this.tarifasService.getTarxCos(this.aps, periodo.anno, periodo.mes).subscribe({
      next: data => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.error = err?.error?.data || 'Error al consultar detalle tarifario';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  limpiar(): void {
    this.rows = [];
    this.error = '';
    this.cdr.detectChanges();
  }
}

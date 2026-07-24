import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { TarifaRow, TarifasService } from '../../services/tarifas.service';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { periodoAnterior } from '../../shared/periodo-anterior.util';

@Component({
  selector: 'app-detalle-tarifas-gen',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ApsSelectorComponent, AnnoSelectorComponent, MesSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './detalle-tarifas-gen.component.html',
  styleUrl: './detalle-tarifas-gen.component.css'
})
export class DetalleTarifasGenComponent {
  readonly aps = signal<number | null>(null);
  readonly anno = signal<number | null>(null);
  readonly mes = signal<number | null>(null);

  readonly loading = signal(false);
  readonly rows = signal<TarifaRow[]>([]);
  readonly filteredRows = computed(() => {
    const apsSel = this.aps();
    const rows = this.rows();
    return apsSel === null ? rows : rows.filter((row) => Number(row['APSA_ID']) === apsSel);
  });

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

  constructor(private readonly tarifasService: TarifasService) {}

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

import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { TabsModule } from 'primeng/tabs';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { Proyeccion } from '../../models/proyecciones.models';
import { ApsSelectorComponent } from '../shared/aps-selector.component';
import { ProyeccionSelectorComponent } from '../shared/proyeccion-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COLUMNAS_ENERGIA: TablaColumn[] = [
  { field: 'CLAS_NOMBRE', header: 'Clase', filtrable: true },
  { field: 'FACTOR_PROD', header: 'Factor Prod' },
  { field: 'TIPOTAR', header: 'Tipo Tar' },
  { field: 'FAEN_ANNO', header: 'Año' },
  { field: 'FAEN_MES', header: 'Mes' },
  { field: 'FAEN_SUBCON', header: 'Subcon', numero: true },
  { field: 'FAEN_USUARIOS', header: 'Usuarios', numero: true },
  { field: 'FAEN_TCPROP', header: 'TC Prop', numero: true },
  { field: 'FAEN_TCTERC', header: 'TC Terc', numero: true },
  { field: 'FAEN_TCAPRO', header: 'TC Apro', numero: true },
  { field: 'FAEN_TBL', header: 'TBL', numero: true },
  { field: 'FAEN_TLU', header: 'TLU', numero: true },
  { field: 'FAEN_TRT', header: 'TRT', numero: true },
  { field: 'FAEN_TDF', header: 'TDF', numero: true },
  { field: 'FAEN_TINC', header: 'TInc', numero: true },
  { field: 'FAEN_TIAT', header: 'TIAT', numero: true },
  { field: 'FAEN_TTL', header: 'TTL', numero: true },
  { field: 'FAEN_TA', header: 'TA', numero: true },
  { field: 'FAEN_TOTAL', header: 'Total', numero: true },
  { field: 'FAEN_TOTSC', header: 'Tot SC', numero: true },
  { field: 'FAEN_TOTPROPLENO', header: 'Tot Prop Leno', numero: true },
  { field: 'FAEN_TOTPROSUBCON', header: 'Tot Prop Subcon', numero: true }
];

const COLUMNAS_ACUEDUCTO: TablaColumn[] = [
  { field: 'CLAS_NOMBRE', header: 'Clase', filtrable: true },
  { field: 'FACTOR_PROD', header: 'Factor Prod' },
  { field: 'TIPOTAR', header: 'Tipo Tar' },
  { field: 'FACU_ANNO', header: 'Año' },
  { field: 'FACU_MES', header: 'Mes' },
  { field: 'FACU_SUBCON', header: 'Subcon', numero: true },
  { field: 'FACU_USUARIOS', header: 'Usuarios', numero: true },
  { field: 'FACU_TCPROP', header: 'TC Prop', numero: true },
  { field: 'FACU_TCTERC', header: 'TC Terc', numero: true },
  { field: 'FACU_TCAPRO', header: 'TC Apro', numero: true },
  { field: 'FACU_TBL', header: 'TBL', numero: true },
  { field: 'FACU_TLU', header: 'TLU', numero: true },
  { field: 'FACU_TRT', header: 'TRT', numero: true },
  { field: 'FACU_TDF', header: 'TDF', numero: true },
  { field: 'FACU_TINC', header: 'TInc', numero: true },
  { field: 'FACU_TIAT', header: 'TIAT', numero: true },
  { field: 'FACU_TTL', header: 'TTL', numero: true },
  { field: 'FACU_TA', header: 'TA', numero: true },
  { field: 'FACU_TOTAL', header: 'Total', numero: true },
  { field: 'FACU_TOTSC', header: 'Tot SC', numero: true },
  { field: 'FACU_TOTPROPLENO', header: 'Tot Prop Leno', numero: true },
  { field: 'FACU_TOTPROSUBCON', header: 'Tot Prop Subcon', numero: true }
];

const COLUMNAS_COSTOS: TablaColumn[] = [
  { field: 'TIPO_FACT', header: 'Tipo Fact', filtrable: true },
  { field: 'COST_ANNO', header: 'Año' },
  { field: 'COST_MES', header: 'Mes' },
  { field: 'COST_CCS', header: 'CCS', numero: true },
  { field: 'COST_CCSAPRO', header: 'CCS Apro', numero: true },
  { field: 'COST_CBL', header: 'CBL', numero: true },
  { field: 'COST_CLUS', header: 'CLUS', numero: true },
  { field: 'COST_CRT', header: 'CRT', numero: true },
  { field: 'COST_CDF', header: 'CDF', numero: true },
  { field: 'COST_INC', header: 'Inc', numero: true },
  { field: 'COST_IAT', header: 'IAT', numero: true },
  { field: 'COST_CTL', header: 'CTL', numero: true },
  { field: 'COST_VBA', header: 'VBA', numero: true }
];

const COLUMNAS_TARIFAS: TablaColumn[] = [
  { field: 'PROY_ID', header: 'Proy ID' },
  { field: 'APSA_ID', header: 'APS ID' },
  { field: 'CLAS_NOMBRE', header: 'Clase', filtrable: true },
  { field: 'TIPO_TAR', header: 'Tipo Tar' },
  { field: 'TIPO_FACT', header: 'Tipo Fact' },
  { field: 'TARI_ANNO', header: 'Año' },
  { field: 'TARI_MES', header: 'Mes' },
  { field: 'TARI_SUBCON', header: 'Subcon', numero: true },
  { field: 'TARI_TCPROP', header: 'TC Prop', numero: true },
  { field: 'TARI_TCTERC', header: 'TC Terc', numero: true },
  { field: 'TARI_TCAPRO', header: 'TC Apro', numero: true },
  { field: 'TARI_TBL', header: 'TBL', numero: true },
  { field: 'TARI_TLU', header: 'TLU', numero: true },
  { field: 'TARI_TRT', header: 'TRT', numero: true },
  { field: 'TARI_TDF', header: 'TDF', numero: true },
  { field: 'TARI_INC', header: 'Inc', numero: true },
  { field: 'TARI_TIAT', header: 'TIAT', numero: true },
  { field: 'TARI_TTL', header: 'TTL', numero: true },
  { field: 'TARI_TA', header: 'TA', numero: true },
  { field: 'TARI_TOTAL', header: 'Total', numero: true },
  { field: 'TARI_TOTSC', header: 'Tot SC', numero: true }
];

@Component({
  selector: 'app-informe-proyecciones',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    ToastModule, TabsModule, InputTextModule, TextareaModule, ApsSelectorComponent, ProyeccionSelectorComponent, TablaAvanzadaComponent
  ],
  providers: [MessageService],
  templateUrl: './informe-proyecciones.component.html',
  styleUrls: ['./informe-proyecciones.component.css']
})
export class InformeProyeccionesComponent {
  readonly columnasEnergia = COLUMNAS_ENERGIA;
  readonly columnasAcueducto = COLUMNAS_ACUEDUCTO;
  readonly columnasCostos = COLUMNAS_COSTOS;
  readonly columnasTarifas = COLUMNAS_TARIFAS;

  aps = signal<number | null>(null);
  proyId = signal<number | null>(null);
  proyeccionSeleccionada = signal<Proyeccion | null>(null);
  activeTab = signal(0);

  horizonteDesde = computed(() => {
    const p = this.proyeccionSeleccionada();
    return p ? `${MESES[p.proyMesDes - 1] ?? p.proyMesDes} ${p.proyAnnoDes}` : '';
  });

  horizonteHasta = computed(() => {
    const p = this.proyeccionSeleccionada();
    return p ? `${MESES[p.proyMesHas - 1] ?? p.proyMesHas} ${p.proyAnnoHas}` : '';
  });

  // Estados por pestaña
  energiaLoading = signal(false);
  energiaData = signal<any[]>([]);
  energiaError = signal<string | null>(null);

  acueductoLoading = signal(false);
  acueductoData = signal<any[]>([]);
  acueductoError = signal<string | null>(null);

  costosLoading = signal(false);
  costosData = signal<any[]>([]);
  costosError = signal<string | null>(null);

  tarifasLoading = signal(false);
  tarifasData = signal<any[]>([]);
  tarifasError = signal<string | null>(null);

  constructor(
    private readonly service: InfoGeneralesService,
    private readonly messages: MessageService
  ) {}

  onApsChange(apsId: number | null): void {
    this.aps.set(apsId);
    this.proyId.set(null);
    this.proyeccionSeleccionada.set(null);
  }

  onProyChange(proyId: number | null): void {
    this.proyId.set(proyId);
    if (proyId) {
      this.loadTabData(this.activeTab());
    }
  }

  onTabChange(index: number | string | undefined): void {
    if (index === undefined) return;
    const idx = typeof index === 'string' ? parseInt(index, 10) : index;
    this.activeTab.set(idx);
    if (this.proyId()) {
      this.loadTabData(idx);
    }
  }

  loadTabData(tabIndex: number): void {
    const apsId = this.aps();
    const pId = this.proyId();
    if (!apsId || !pId) return;

    switch (tabIndex) {
      case 0:
        this.loadEnergia(apsId, pId);
        break;
      case 1:
        this.loadAcueducto(apsId, pId);
        break;
      case 2:
        this.loadCostos(apsId, pId);
        break;
      case 3:
        this.loadTarifas(apsId, pId);
        break;
    }
  }

  private loadEnergia(apsId: number, proyId: number): void {
    this.energiaLoading.set(true);
    this.energiaError.set(null);
    this.service.consultaEnergia(apsId, proyId).subscribe({
      next: (res) => {
        this.energiaData.set(res.data || []);
        this.energiaLoading.set(false);
      },
      error: (err) => {
        this.energiaError.set(err?.message || 'Error al consultar energía');
        this.energiaLoading.set(false);
      }
    });
  }

  private loadAcueducto(apsId: number, proyId: number): void {
    this.acueductoLoading.set(true);
    this.acueductoError.set(null);
    this.service.consultaAcueducto(apsId, proyId).subscribe({
      next: (res) => {
        this.acueductoData.set(res.data || []);
        this.acueductoLoading.set(false);
      },
      error: (err) => {
        this.acueductoError.set(err?.message || 'Error al consultar acueducto');
        this.acueductoLoading.set(false);
      }
    });
  }

  private loadCostos(apsId: number, proyId: number): void {
    this.costosLoading.set(true);
    this.costosError.set(null);
    this.service.consultaCostos(apsId, proyId).subscribe({
      next: (res) => {
        this.costosData.set(res.data || []);
        this.costosLoading.set(false);
      },
      error: (err) => {
        this.costosError.set(err?.message || 'Error al consultar costos');
        this.costosLoading.set(false);
      }
    });
  }

  private loadTarifas(apsId: number, proyId: number): void {
    this.tarifasLoading.set(true);
    this.tarifasError.set(null);
    this.service.consultaTarifas(apsId, proyId).subscribe({
      next: (res) => {
        this.tarifasData.set(res.data || []);
        this.tarifasLoading.set(false);
      },
      error: (err) => {
        this.tarifasError.set(err?.message || 'Error al consultar tarifas');
        this.tarifasLoading.set(false);
      }
    });
  }
}

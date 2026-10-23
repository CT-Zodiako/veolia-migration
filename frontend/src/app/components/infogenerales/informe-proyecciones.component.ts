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

// Legacy components/infogenerales/{Energia,Acueducto,Costos,Tarifas}.vue: headers and order as legacy, "contains"
// filters on the text/period columns and redondearDosDecimales (Math.round(n * 100) / 100) on every numeric column.
function numericas(columnas: [string, string][]): TablaColumn[] {
  return columnas.map(([field, header]) => ({ field, header, numero: true, decimales: 2 }));
}

// Energia.vue:30-265
const COLUMNAS_ENERGIA: TablaColumn[] = [
  { field: 'FAEN_ANNO', header: 'Año', filtrable: true },
  { field: 'FAEN_MES', header: 'Mes', filtrable: true },
  { field: 'CLAS_NOMBRE', header: 'Clase uso', filtrable: true },
  { field: 'TIPOTAR', header: 'Tipo tarifa', filtrable: true },
  { field: 'FACTOR_PROD', header: 'Factor prod', filtrable: true },
  ...numericas([
    ['FAEN_SUBCON', 'SUB/CON'], ['FAEN_USUARIOS', 'Cant usuarios'], ['FAEN_TCPROP', 'TC'],
    ['FAEN_TCTERC', 'Tc Aprov Terc'], ['FAEN_TCAPRO', 'TC Aprov Pro'], ['FAEN_TBL', 'TBL'], ['FAEN_TLU', 'TLU'],
    ['FAEN_TRT', 'TRT'], ['FAEN_TDF', 'TDF'], ['FAEN_TINC', 'Tinc'], ['FAEN_TIAT', 'Tiat'], ['FAEN_TTL', 'TTL'],
    ['FAEN_TA', 'TA'], ['FAEN_TOTAL', 'Total'], ['FAEN_TOTSC', 'Total S/C'],
    ['FAEN_TOTPROPLENO', 'TOT PROP PLENO'], ['FAEN_TOTPROSUBCON', 'TOT PROP S/C']
  ])
];

// Acueducto.vue:30-266
const COLUMNAS_ACUEDUCTO: TablaColumn[] = [
  { field: 'FACU_ANNO', header: 'Año', filtrable: true },
  { field: 'FACU_MES', header: 'Mes', filtrable: true },
  { field: 'CLAS_NOMBRE', header: 'Clase uso', filtrable: true },
  { field: 'TIPOTAR', header: 'Tipo tarifa', filtrable: true },
  { field: 'FACTOR_PROD', header: 'Factor prod', filtrable: true },
  ...numericas([
    ['FACU_SUBCON', 'SUB/CON'], ['FACU_USUARIOS', 'Cant usuarios'], ['FACU_TCPROP', 'TC'],
    ['FACU_TCTERC', 'Tc Aprov Terc'], ['FACU_TCAPRO', 'TC Aprov Pro'], ['FACU_TBL', 'TBL'], ['FACU_TLU', 'TLU'],
    ['FACU_TRT', 'TRT'], ['FACU_TDF', 'TDF'], ['FACU_TINC', 'Tinc'], ['FACU_TIAT', 'Tiat'], ['FACU_TTL', 'TTL'],
    ['FACU_TA', 'TA'], ['FACU_TOTAL', 'Total'], ['FACU_TOTSC', 'Total S/C'],
    ['FACU_TOTPROPLENO', 'TOT PROP PLENO'], ['FACU_TOTPROSUBCON', 'TOT PROP S/C']
  ])
];

// Costos.vue:29-152
const COLUMNAS_COSTOS: TablaColumn[] = [
  { field: 'COST_ANNO', header: 'Año', filtrable: true },
  { field: 'COST_MES', header: 'Mes', filtrable: true },
  { field: 'TIPO_FACT', header: 'Tipo factura', filtrable: true },
  ...numericas([
    ['COST_CCS', 'CCS'], ['COST_CCSAPRO', 'CCSaprov'], ['COST_CBL', 'CBL'], ['COST_CLUS', 'CLUS'], ['COST_CRT', 'CRT'],
    ['COST_CDF', 'CDF'], ['COST_INC', 'INC'], ['COST_IAT', 'IAT'], ['COST_CTL', 'CTL'], ['COST_VBA', 'VBA']
  ])
];

// Tarifas.vue:29-218 (no PROY_ID, APSA_ID nor TARI_TCTERC column)
const COLUMNAS_TARIFAS: TablaColumn[] = [
  { field: 'TARI_ANNO', header: 'Año', filtrable: true },
  { field: 'TARI_MES', header: 'Mes', filtrable: true },
  { field: 'CLAS_NOMBRE', header: 'Clase uso', filtrable: true },
  { field: 'TIPO_TAR', header: 'Tipo tarifa', filtrable: true },
  { field: 'TIPO_FACT', header: 'Tipo factura', filtrable: true },
  ...numericas([
    ['TARI_SUBCON', 'SUB/CON'], ['TARI_TCPROP', 'TC'], ['TARI_TCAPRO', 'TCaprov'], ['TARI_TBL', 'TBL'], ['TARI_TLU', 'TLU'],
    ['TARI_TRT', 'TRT'], ['TARI_TDF', 'TDF'], ['TARI_INC', 'Tinc'], ['TARI_TIAT', 'Tiat'], ['TARI_TTL', 'TTL'],
    ['TARI_TA', 'TA'], ['TARI_TOTAL', 'TARIFA PLENA'], ['TARI_TOTSC', 'TARIDA S/C']
  ])
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

  // seleccionarProyeccion.vue:29-36 Calendar view="month" dateFormat="MM/yy" (Spanish month names).
  horizonteDesde = computed(() => {
    const p = this.proyeccionSeleccionada();
    return p ? `${MESES[p.proyMesDes - 1] ?? p.proyMesDes}/${p.proyAnnoDes}` : '';
  });

  // Shows the end month itself; legacy seleccionarProyeccion.vue:137 showed the following month (legacy bug not
  // replicated, accepted in legacy-characterization-tests S9).
  horizonteHasta = computed(() => {
    const p = this.proyeccionSeleccionada();
    return p ? `${MESES[p.proyMesHas - 1] ?? p.proyMesHas}/${p.proyAnnoHas}` : '';
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

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { InformeProyeccionesComponent } from './informe-proyecciones.component';
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import '../infogerenciales/informes-gerenciales.spec-helpers';

// Legacy 1001 "Generales" (/generales): front-tarificador/src/views/infogenerales/InformeProyecciones.vue with
// components/infogenerales/{seleccionarProyeccion,Energia,Acueducto,Costos,Tarifas}.vue. Each tab posts
// {apsaid, proyid} of the selected APS + projection (service/InfoGeneralesService.js:15-85).

const proyeccion = {
  proyId: 31, apsaId: 5, proyNombre: 'PROY 2025', proyDescripcion: 'Escenario base', proyTipo100: 1,
  proyAnnoDes: 2025, proyMesDes: 1, proyAnnoHas: 2025, proyMesHas: 12, proyEstado: 1
};
const energia = [{ FAEN_ANNO: 2025, FAEN_MES: 1, CLAS_NOMBRE: 'RESIDENCIAL', TIPOTAR: 'PLENA', FACTOR_PROD: 'F1', FAEN_TOTAL: 1250.556 }];

function crear() {
  const service = {
    consultaEnergia: vi.fn(() => of({ status: 'success', data: energia, message: 'OK' })),
    consultaAcueducto: vi.fn(() => of({ status: 'success', data: [], message: 'OK' })),
    consultaCostos: vi.fn(() => of({ status: 'success', data: [], message: 'OK' })),
    consultaTarifas: vi.fn(() => of({ status: 'success', data: [], message: 'OK' }))
  };
  TestBed.configureTestingModule({
    imports: [InformeProyeccionesComponent],
    providers: [
      { provide: InfoGeneralesService, useValue: service },
      { provide: ProyeccionesService, useValue: { consulta: vi.fn(() => of({ status: 'success', data: [proyeccion], message: 'OK' })) } },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: {
          getAps: vi.fn(() => 5), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), getProyeccion: vi.fn(() => 31),
          setAps: vi.fn(), setAnno: vi.fn(), setMes: vi.fn(), setProyeccion: vi.fn()
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(InformeProyeccionesComponent);
  fixture.detectChanges();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

const LEGACY_COLUMNAS: Record<string, string[]> = {
  // Energia.vue:30-260
  energia: [
    'FAEN_ANNO:Año', 'FAEN_MES:Mes', 'CLAS_NOMBRE:Clase uso', 'TIPOTAR:Tipo tarifa', 'FACTOR_PROD:Factor prod',
    'FAEN_SUBCON:SUB/CON', 'FAEN_USUARIOS:Cant usuarios', 'FAEN_TCPROP:TC', 'FAEN_TCTERC:Tc Aprov Terc',
    'FAEN_TCAPRO:TC Aprov Pro', 'FAEN_TBL:TBL', 'FAEN_TLU:TLU', 'FAEN_TRT:TRT', 'FAEN_TDF:TDF', 'FAEN_TINC:Tinc',
    'FAEN_TIAT:Tiat', 'FAEN_TTL:TTL', 'FAEN_TA:TA', 'FAEN_TOTAL:Total', 'FAEN_TOTSC:Total S/C',
    'FAEN_TOTPROPLENO:TOT PROP PLENO', 'FAEN_TOTPROSUBCON:TOT PROP S/C'
  ],
  // Acueducto.vue (same layout as Energia.vue with FACU_*)
  acueducto: [
    'FACU_ANNO:Año', 'FACU_MES:Mes', 'CLAS_NOMBRE:Clase uso', 'TIPOTAR:Tipo tarifa', 'FACTOR_PROD:Factor prod',
    'FACU_SUBCON:SUB/CON', 'FACU_USUARIOS:Cant usuarios', 'FACU_TCPROP:TC', 'FACU_TCTERC:Tc Aprov Terc',
    'FACU_TCAPRO:TC Aprov Pro', 'FACU_TBL:TBL', 'FACU_TLU:TLU', 'FACU_TRT:TRT', 'FACU_TDF:TDF', 'FACU_TINC:Tinc',
    'FACU_TIAT:Tiat', 'FACU_TTL:TTL', 'FACU_TA:TA', 'FACU_TOTAL:Total', 'FACU_TOTSC:Total S/C',
    'FACU_TOTPROPLENO:TOT PROP PLENO', 'FACU_TOTPROSUBCON:TOT PROP S/C'
  ],
  // Costos.vue
  costos: [
    'COST_ANNO:Año', 'COST_MES:Mes', 'TIPO_FACT:Tipo factura', 'COST_CCS:CCS', 'COST_CCSAPRO:CCSaprov', 'COST_CBL:CBL',
    'COST_CLUS:CLUS', 'COST_CRT:CRT', 'COST_CDF:CDF', 'COST_INC:INC', 'COST_IAT:IAT', 'COST_CTL:CTL', 'COST_VBA:VBA'
  ],
  // Tarifas.vue (no PROY_ID, APSA_ID nor TARI_TCTERC column)
  tarifas: [
    'TARI_ANNO:Año', 'TARI_MES:Mes', 'CLAS_NOMBRE:Clase uso', 'TIPO_TAR:Tipo tarifa', 'TIPO_FACT:Tipo factura',
    'TARI_SUBCON:SUB/CON', 'TARI_TCPROP:TC', 'TARI_TCAPRO:TCaprov', 'TARI_TBL:TBL', 'TARI_TLU:TLU', 'TARI_TRT:TRT',
    'TARI_TDF:TDF', 'TARI_INC:Tinc', 'TARI_TIAT:Tiat', 'TARI_TTL:TTL', 'TARI_TA:TA', 'TARI_TOTAL:TARIFA PLENA',
    'TARI_TOTSC:TARIDA S/C'
  ]
};

function columnasNuevas(component: InformeProyeccionesComponent): Record<string, string[]> {
  const enc = (cols: { field: string; header: string }[]) => cols.map((c) => `${c.field}:${c.header}`);
  return {
    energia: enc(component.columnasEnergia),
    acueducto: enc(component.columnasAcueducto),
    costos: enc(component.columnasCostos),
    tarifas: enc(component.columnasTarifas)
  };
}

describe('InformeProyeccionesComponent (1001) - legacy InformeProyecciones.vue', () => {
  // InformeProyecciones.vue:17-26 tabs; seleccionarProyeccion.vue:132-148 stores the projection and every tab queries
  // (stapsSeleccionado, stProyId) (Energia.vue:296-301); seleccionarProyeccion.vue:19-21,135 shows its description.
  it('queries each tab with the selected APS and projection and shows the projection description', async () => {
    const { fixture, component, service } = crear();
    await fixture.whenStable();
    fixture.detectChanges();

    const tabs = Array.from(fixture.nativeElement.querySelectorAll('p-tab') as NodeListOf<HTMLElement>).map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['FACT Ene', 'FACT Acu', 'Costos', 'Tarifas']);
    expect(service.consultaEnergia).toHaveBeenCalledWith(5, 31);
    expect(component.energiaData()).toEqual(energia);
    expect(component.proyeccionSeleccionada()).toEqual(proyeccion);
    expect((fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Escenario base');

    component.onTabChange(1);
    component.onTabChange(2);
    component.onTabChange(3);
    expect(service.consultaAcueducto).toHaveBeenCalledWith(5, 31);
    expect(service.consultaCostos).toHaveBeenCalledWith(5, 31);
    expect(service.consultaTarifas).toHaveBeenCalledWith(5, 31);
  });

  // Every column the legacy tabs showed is still shown (field coverage only; labels/order are a separate finding).
  it('shows every legacy column of the four tabs', () => {
    const { component } = crear();
    const nuevas = columnasNuevas(component);

    for (const [tab, legacy] of Object.entries(LEGACY_COLUMNAS)) {
      const campos = nuevas[tab].map((c) => c.split(':')[0]);
      expect(legacy.map((c) => c.split(':')[0]).filter((campo) => !campos.includes(campo))).toEqual([]);
    }
  });

  it.skip('PARITY-FINDING: column headers/order differ in the four tabs and Tarifas adds PROY_ID, APSA_ID and TARI_TCTERC; legacy Energia/Acueducto/Costos/Tarifas.vue', () => {
    const { component } = crear();

    expect(columnasNuevas(component)).toEqual(LEGACY_COLUMNAS);
  });

  // Energia.vue:303-305 redondearDosDecimales on every numeric column (same in Acueducto/Costos/Tarifas.vue).
  it.skip('PARITY-FINDING: numeric cells are not rounded to 2 decimals; legacy Energia.vue:303-305 redondearDosDecimales', () => {
    const { fixture } = crear();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('1250.56');
    expect(texto).not.toContain('1250.556');
  });

  // Energia.vue:9-16 (and the other three tabs): 24 rows per page; "contains" filters on Año, Mes, Clase uso,
  // Tipo tarifa and Factor prod (Energia.vue:30-115).
  it.skip('PARITY-FINDING: paginator shows 10 rows and only Clase is filterable; legacy Energia.vue:10,30-115 showed 24 rows and filtered Año, Mes, Clase uso, Tipo tarifa, Factor prod', () => {
    const { fixture, component } = crear();

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.filasPorPagina).toBe(24);
    expect(component.columnasEnergia.filter((c) => c.filtrable).map((c) => c.field)).toEqual(['FAEN_ANNO', 'FAEN_MES', 'CLAS_NOMBRE', 'TIPOTAR', 'FACTOR_PROD']);
  });

  // seleccionarProyeccion.vue:29-36 Calendar view="month" dateFormat="MM/yy" with Spanish month names (:96-109).
  it.skip('PARITY-FINDING: horizonte shows "Enero 2025"; legacy seleccionarProyeccion.vue:29-36 Calendar MM/yy showed "Enero/2025"', () => {
    const { component } = crear();

    expect(component.horizonteDesde()).toBe('Enero/2025');
  });

  // seleccionarProyeccion.vue:137 new Date(PROYANNOHAS, PROYMESHAS) (no -1): legacy showed the month after "hasta"
  // (likely a legacy defect; reported for the user's decision).
  it.skip('PARITY-FINDING: horizonte hasta shows the projection end month; legacy seleccionarProyeccion.vue:137 showed the following month (Diciembre 2025 -> Enero/2026)', () => {
    const { component } = crear();

    expect(component.horizonteHasta()).toBe('Enero/2026');
  });
});

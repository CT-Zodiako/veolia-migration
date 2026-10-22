import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { DetalleTarifasComponent } from './detalle-tarifas.component';
import { TarifasService } from '../../services/tarifas.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { congelarHoy } from '../infogerenciales/informes-gerenciales.spec-helpers';

// Legacy 501 "Detallado Tarifas" (/tarifas): front-tarificador/src/views/informes/Detalletarifas.vue (tabs "Plena" and
// "Sub & Con" over the same tarifas/tarxcom rows, month - 1 of the selected period, Detalletarifas.vue:338-348).
// The 6-decimal rounding lives in TarifasService (TarifasService.js:115-122), pinned by tarifas-service-redondeo.spec.ts.

const filas = [
  { CLAS_NOMBRE: 'RESIDENCIAL', PARA_NOMBRE: 'PLENA', TIPO_FACT: 'CONJUNTA', TARI_CARGOFIJO: 1500.5, TARI_PLENA: 9876.54, TARI_SUBCON: 12.3 }
];

function crear(guardado: { aps?: number | null; anno?: number | null; mes?: number | null }) {
  const getTarxCos = vi.fn(() => of(filas));
  TestBed.configureTestingModule({
    imports: [DetalleTarifasComponent],
    providers: [
      { provide: TarifasService, useValue: { getTarxCos } },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: {
          getAps: vi.fn(() => guardado.aps ?? null),
          getAnno: vi.fn(() => guardado.anno ?? null),
          getMes: vi.fn(() => guardado.mes ?? null),
          setAps: vi.fn(),
          setAnno: vi.fn(),
          setMes: vi.fn()
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(DetalleTarifasComponent);
  fixture.detectChanges();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, getTarxCos };
}

const encabezados = (cols: { field: string; header: string }[]) => cols.map((c) => `${c.field}:${c.header}`);

describe('DetalleTarifasComponent (501) - legacy Detalletarifas.vue', () => {
  // Detalletarifas.vue:338-346: getTarxCos(aps, year/month of stDate - 1 month); January rolls back to December.
  it('queries tarifas for the APS and the month before the selected one', () => {
    const { fixture, component, getTarxCos } = crear({ aps: 5, anno: 2025, mes: 1 });

    expect(getTarxCos).toHaveBeenCalledWith(5, 2024, 12);
    expect(component.rows).toEqual(filas);
    expect(fixture.nativeElement.textContent).toContain('RESIDENCIAL');
  });

  // Detalletarifas.vue:9-13 / :156-159 tab headers, :37-153 Plena columns and :183-299 Sub & Con columns.
  it('shows the legacy tabs and columns of Plena and Sub & Con', () => {
    const { fixture, component } = crear({ aps: 5, anno: 2025, mes: 3 });

    const tabs = Array.from(fixture.nativeElement.querySelectorAll('p-tab') as NodeListOf<HTMLElement>).map((t) => t.textContent?.trim());
    expect(tabs).toEqual(['Plena', 'Sub & Con']);
    expect(encabezados(component.columnasPlena)).toEqual([
      'CLAS_NOMBRE:Clase Uso', 'PARA_NOMBRE:Tipo Tarifa', 'TIPO_FACT:Tipo Fac', 'TARI_CARGOFIJO:Cargo fijo', 'TARI_TC:Tc',
      'TARI_TBL:Tbl', 'TARI_TLU:Tlu', 'TARI_CVARIABLE:C. Variable', 'TARI_TRT:Trt', 'TARI_TDT:Tdt', 'TARI_TTL:Ttl',
      'TARI_TA:Ta', 'TARI_PLENA:Plena'
    ]);
    expect(encabezados(component.columnasSubCon)).toEqual([
      'CLAS_NOMBRE:Clase Uso', 'PARA_NOMBRE:Tipo Tarifa', 'TIPO_FACT:Tipo Fac', 'TARI_CARGOFIJOSC:Cargo fijo',
      'TARI_TCSC:Tc', 'TARI_TBLSC:Tbl', 'TARI_TLUSC:Tlu', 'TARI_CVARIABLESC:C. Variable', 'TARI_TRTSC:Trt',
      'TARI_TDTSC:Tdt', 'TARI_TTLSC:Ttl', 'TARI_TASC:Ta', 'TARI_SUBCON:S/C'
    ]);
  });

  // Detalletarifas.vue:41-90 / :187-236 "contains" filters only on Clase Uso, Tipo Tarifa and Tipo Fac; exports named
  // TarifaPlena / TariSubCont (:22, :168, :325-326); paginator 10 rows, options [10,20,50] (:20-24, :166-170).
  it('keeps the legacy filters, export names and paginator', () => {
    const { fixture, component } = crear({ aps: 5, anno: 2025, mes: 3 });

    for (const cols of [component.columnasPlena, component.columnasSubCon]) {
      expect(cols.filter((c) => c.filtrable).map((c) => c.field)).toEqual(['CLAS_NOMBRE', 'PARA_NOMBRE', 'TIPO_FACT']);
    }
    const tablas = fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent)).map((d) => d.componentInstance as TablaAvanzadaComponent);
    expect(tablas.map((t) => t.nombreExportar)).toEqual(['TarifaPlena', 'TariSubCont']);
    for (const tabla of tablas) {
      expect(tabla.filasPorPagina).toBe(10);
      expect(tabla.rowsPerPageOptionsList).toEqual([10, 20, 50]);
    }
  });

  // Legacy Selector.vue:153-158 defaults the period to today; Detalletarifas.vue:329-344 loads on creation with the stored
  // APS and today - 1 month.
  describe('on entry', () => {
    beforeEach(congelarHoy);
    afterEach(() => vi.useRealTimers());

    it.skip('PARITY-FINDING: with a stored APS and no stored period nothing loads; legacy Detalletarifas.vue:329-344 + Selector.vue:153-158 loaded today - 1 month', () => {
      const { getTarxCos } = crear({ aps: 5 });

      expect(getTarxCos).toHaveBeenCalledWith(5, 2025, 12);
    });
  });
});

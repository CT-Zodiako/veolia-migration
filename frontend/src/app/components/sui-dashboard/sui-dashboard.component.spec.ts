import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SortIcon } from 'primeng/table';
import { of } from 'rxjs';
import { SuiDashboardComponent } from './sui-dashboard.component';
import { SuiDashboardService } from '../../services/sui-dashboard.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

// Legacy screen: front-tarificador/src/views/sui/DashBoard.vue ("Tablero de Control Sui", 803), which posts
// sui/getDashBoardSui {anno, mes} (now /sui/dashboard, parity-review T18/T19/T20 "803/804 renamed").

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const FILAS = [
  { APSID: 7, APSNOM: 'Tunja', F19: 'PROCESADO', F23: 'Pendiente', F24: 'NO APLICA', F35: 'PROCESADO', F36: 'PROCESADO', USUARIO: 'a@v.com' }
];

function crear() {
  localStorage.clear();
  const service = { getDashboard: vi.fn(() => of(FILAS)) };
  TestBed.configureTestingModule({
    imports: [SuiDashboardComponent],
    providers: [
      { provide: SuiDashboardService, useValue: service },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => 2026), getMes: vi.fn(() => 1), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(SuiDashboardComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

function tabla(fixture: ReturnType<typeof crear>['fixture']): TablaAvanzadaComponent {
  return fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
}

describe('SuiDashboardComponent (803, legacy DashBoard.vue)', () => {
  // DashBoard.vue:144-155: the dashboard asks for the month before the selected one (Jan 2026 -> Dec 2025).
  it('queries the previous month and shows every row', () => {
    const { fixture, component, service } = crear();

    component.consultar();
    fixture.detectChanges();

    expect(service.getDashboard).toHaveBeenCalledWith(2025, 12);
    expect(component.rows()).toEqual(FILAS);
    const celdas = Array.from(fixture.nativeElement.querySelectorAll('tbody td') as NodeListOf<HTMLElement>).map((td) => td.textContent?.trim());
    expect(celdas).toEqual(['7', 'Tunja', 'PROCESADO', 'Pendiente', 'NO APLICA', 'PROCESADO', 'PROCESADO', 'a@v.com']);
  });

  // DashBoard.vue:29-108: columns Id, APS, F19, F23, F24, F35, F36, Usuario, all sortable.
  it('shows the legacy columns, all sortable', () => {
    const { fixture, component } = crear();
    component.consultar();
    fixture.detectChanges();

    expect(component.columnas.map((c) => [c.field, c.header])).toEqual([
      ['APSID', 'Id'], ['APSNOM', 'APS'], ['F19', 'F19'], ['F23', 'F23'], ['F24', 'F24'], ['F35', 'F35'], ['F36', 'F36'], ['USUARIO', 'Usuario']
    ]);
    const sortables = fixture.debugElement.queryAll(By.directive(SortIcon)).map((d) => (d.componentInstance as SortIcon).field);
    expect(sortables).toEqual(['APSID', 'APSNOM', 'F19', 'F23', 'F24', 'F35', 'F36', 'USUARIO']);
  });

  // DashBoard.vue:157-163 definirColor (case-insensitive): PENDIENTE red, NO APLICA grey, anything else green; only the
  // format columns are coloured (:52-99).
  it('colours the format states like legacy', () => {
    const { component } = crear();
    const clase = (field: string) => component.cellClass(FILAS[0], { field, header: field });

    expect(['F19', 'F23', 'F24', 'F35', 'F36'].map(clase)).toEqual(['color-green', 'color-red', 'color-gray', 'color-green', 'color-green']);
    expect(['APSID', 'APSNOM', 'USUARIO'].map(clase)).toEqual(['', '', '']);
  });

  // DashBoard.vue:14-22: 15 rows per page, [15, 30, 50, 100]; the legacy grid has no column filters.
  it.skip('PARITY-FINDING: legacy SUI dashboard pages 15 rows with [15,30,50,100] and has no column filters (DashBoard.vue:14-108); new uses the tabla default 10/[10,20,50] and filters every column', () => {
    const { fixture, component } = crear();
    component.consultar();
    fixture.detectChanges();

    expect(tabla(fixture).filasPorPagina).toBe(15);
    expect(tabla(fixture).rowsPerPageOptionsList).toEqual([15, 30, 50, 100]);
    expect(component.columnas.filter((c) => c.filtrable)).toEqual([]);
  });
});

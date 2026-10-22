import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { PgirsInformeVariablesComponent } from './pgirs-informe-variables.component';
import { PgirsService } from '../../services/pgirs.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

// Legacy screen: front-tarificador/src/views/pgirs/ResumenPgirs.vue ("Resumen variables PGIRS", route /informepgirs), which
// calls pgirsService.resumenPgirs -> POST pgirs/informePgirs (vpgir_infvariables).

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const ROWS = [
  { APSA_NOMAPS: 'Tunja', PERIODO: '2025-03', PGRINGRESO: 'MANUAL', PGRIFECHA: '2025-04-02T05:00:00.000Z', SISU_CORREO: 'a@v.com' },
  { APSA_NOMAPS: 'Tunja', PERIODO: '2025-02', PGRINGRESO: 'AUTOMATICO', PGRIFECHA: null, SISU_CORREO: 'b@v.com' }
];

function crear() {
  localStorage.clear();
  const service = { getInformeVariables: vi.fn(() => of({ status: true, data: ROWS, message: 'OK' })) };
  TestBed.configureTestingModule({
    imports: [PgirsInformeVariablesComponent],
    providers: [
      { provide: PgirsService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(PgirsInformeVariablesComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

function filas(fixture: ReturnType<typeof crear>['fixture']): string[][] {
  return Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>)
    .map((tr) => Array.from(tr.cells).map((td) => td.textContent?.trim() ?? ''));
}

describe('PgirsInformeVariablesComponent (Resumen variables PGIRS, legacy ResumenPgirs.vue)', () => {
  // ResumenPgirs.vue:101-104: selecting the APS loads resumenPgirs(aps) (informePgirs -> vpgir_infvariables).
  it('loads the variables report of the selected APS', () => {
    const { fixture, component, service } = crear();

    component.onApsChange(7);
    fixture.detectChanges();

    expect(service.getInformeVariables).toHaveBeenCalledWith(7);
    expect(component.data()).toEqual(ROWS);
    expect(filas(fixture).map((r) => r[0])).toEqual(['Tunja', 'Tunja']);
  });

  // ResumenPgirs.vue:25-55: column fields in order; filters on APSA_NOMAPS, PERIODO and PGRINGRESO (:26-41).
  it('shows the legacy column fields and filters', () => {
    const { component } = crear();

    expect(component.columnasResumen.map((c) => c.field)).toEqual(['APSA_NOMAPS', 'PERIODO', 'PGRINGRESO', 'PGRIFECHA', 'SISU_CORREO']);
    expect(component.columnasResumen.filter((c) => c.filtrable).map((c) => c.field)).toEqual(['APSA_NOMAPS', 'PERIODO', 'PGRINGRESO']);
  });

  // ResumenPgirs.vue:43-46,107-111: TIPO INGRESO "MANUAL" is highlighted orange, any other value is not.
  it('highlights MANUAL entries like legacy definirColor', () => {
    const { component } = crear();
    const col = { field: 'PGRINGRESO', header: 'TIPO INGRESO' };

    expect(component.cellClassResumen(ROWS[0], col)).toBe('color-orange');
    expect(component.cellClassResumen(ROWS[1], col)).toBe('');
    expect(component.cellClassResumen(ROWS[0], { field: 'PERIODO', header: 'PERIODO' })).toBe('');
  });

  // ResumenPgirs.vue:25,31,37,49,54: headers "APS", "INGRESO", "TIPO INGRESO", "FECHA INGRESO", "USUARIO".
  it('legacy Resumen variables PGIRS headers are APS / INGRESO / TIPO INGRESO / FECHA INGRESO / USUARIO (ResumenPgirs.vue:25-54)', () => {
    const { component } = crear();

    expect(component.columnasResumen.map((c) => c.header)).toEqual(['APS', 'INGRESO', 'TIPO INGRESO', 'FECHA INGRESO', 'USUARIO']);
  });

  // ResumenPgirs.vue:49-53,112-124 formatDateColumn: FECHA INGRESO is shown as dd/mm/yyyy and "N/A" when empty.
  it('legacy FECHA INGRESO is dd/mm/yyyy and "N/A" when empty (ResumenPgirs.vue:112-124)', () => {
    const { fixture, component } = crear();
    component.onApsChange(7);
    fixture.detectChanges();

    expect(filas(fixture).map((r) => r[3])).toEqual(['02/04/2025', 'N/A']);
  });

  // ResumenPgirs.vue:14-17: 15 rows per page with [15, 30, 50, 100].
  it('legacy Resumen variables PGIRS pages 15 rows with [15,30,50,100] (ResumenPgirs.vue:14-17)', () => {
    const { fixture, component } = crear();
    component.onApsChange(7);
    fixture.detectChanges();

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.filasPorPagina).toBe(15);
    expect(tabla.rowsPerPageOptionsList).toEqual([15, 30, 50, 100]);
  });
});

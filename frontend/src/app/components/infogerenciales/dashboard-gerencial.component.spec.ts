import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardGerencialComponent } from './dashboard-gerencial.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { congelarHoy, estadoParametros } from './informes-gerenciales.spec-helpers';

const filas = [
  { APSA_ID: 1, APSA_NOMAPS: 'APS Uno', TARI_FECHACREACION: '2025-01-15T10:20:00', SISU_CORREO: 'a@x.co' },
  { APSA_ID: 2, APSA_NOMAPS: 'APS Dos', TARI_FECHACREACION: null, SISU_CORREO: 'b@x.co' }
];

function crear(anno: number | null = null, mes: number | null = null) {
  const getDashBoardGerencial = vi.fn(() => of({ status: 'ok', data: filas, message: '' }));
  TestBed.configureTestingModule({
    imports: [DashboardGerencialComponent],
    providers: [{ provide: InfoGerencialService, useValue: { getDashBoardGerencial } }, estadoParametros(anno, mes)]
  });
  const fixture = TestBed.createComponent(DashboardGerencialComponent);
  fixture.detectChanges();
  return { fixture, getDashBoardGerencial };
}

// Legacy informesgerenciales/DashBoard.vue: created() loads stDate ?? today - 1 month for every APS;
// "Estado calculo" is sortable by the raw date and only the cell shows dd/mm/yyyy (formatDateColumn).
describe('DashboardGerencialComponent (604)', () => {
  beforeEach(congelarHoy);
  afterEach(() => vi.useRealTimers());

  it('loads today - 1 month on entry, once, and shows every APS without an APS selector', () => {
    const { fixture, getDashBoardGerencial } = crear();

    expect(getDashBoardGerencial).toHaveBeenCalledTimes(1);
    expect(getDashBoardGerencial).toHaveBeenCalledWith(2025, 12);
    expect(fixture.componentInstance.rows().map((r) => r['APSA_NOMAPS'])).toEqual(['APS Uno', 'APS Dos']);
    expect(fixture.nativeElement.querySelector('app-aps-selector')).toBeNull();
  });

  it('keeps the raw date in the row (sortable) and formats it only in the cell', () => {
    const { fixture } = crear();
    const component = fixture.componentInstance;
    const columna = component.columnas.find((c) => c.field === 'TARI_FECHACREACION')!;

    expect(component.rows()[0]['TARI_FECHACREACION']).toBe('2025-01-15T10:20:00');
    expect(component.rows()[1]['TARI_FECHACREACION']).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('15/01/2025');
    expect(fixture.nativeElement.textContent).toContain('N/A');
    expect(component.cellClass(component.rows()[0], columna)).toBe('color-green');
    expect(component.cellClass(component.rows()[1], columna)).toBe('color-red');
  });

  it('uses the saved año/mes when the user already picked one', () => {
    const { getDashBoardGerencial } = crear(2025, 6);

    expect(getDashBoardGerencial).toHaveBeenCalledWith(2025, 5);
  });
});

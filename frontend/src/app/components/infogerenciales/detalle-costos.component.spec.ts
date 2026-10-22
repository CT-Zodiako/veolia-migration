import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DetalleCostosComponent } from './detalle-costos.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { congelarHoy, estadoParametros } from './informes-gerenciales.spec-helpers';

const filas = [
  { APSCOSTO: 1, APSA_NOMAPS: 'APS Uno', NOMCOSTO: 'CRT', ACOBRAR: 1.236, VALOR: 2, VARIACION: 0.12345678 },
  { APSCOSTO: 2, APSA_NOMAPS: 'APS Dos', NOMCOSTO: 'CDF', ACOBRAR: 3, VALOR: 4, VARIACION: 0 }
];

function crear(anno: number | null = null, mes: number | null = null) {
  const detcostos = vi.fn(() => of({ status: 'ok', data: filas, message: '' }));
  TestBed.configureTestingModule({
    imports: [DetalleCostosComponent],
    providers: [{ provide: InfoGerencialService, useValue: { detcostos } }, estadoParametros(anno, mes)]
  });
  const fixture = TestBed.createComponent(DetalleCostosComponent);
  fixture.detectChanges();
  return { fixture, detcostos };
}

// Legacy informesgerenciales/DetalleCostos.vue: APS dropdown hidden (#ddAps display:none), loads on created()
// with stDate ?? today, month - 1, and lists every APS.
describe('DetalleCostosComponent (602) - management report over all APS', () => {
  beforeEach(congelarHoy);
  afterEach(() => vi.useRealTimers());

  it('loads today - 1 month on entry, once, and shows every APS without an APS selector', () => {
    const { fixture, detcostos } = crear();

    expect(detcostos).toHaveBeenCalledTimes(1);
    expect(detcostos).toHaveBeenCalledWith(2025, 12);
    expect(fixture.componentInstance.rows().map((r) => r['APSA_NOMAPS'])).toEqual(['APS Uno', 'APS Dos']);
    expect(fixture.componentInstance.rows()[0]['VARIACION']).toBe(0.123457);
    expect(fixture.nativeElement.querySelector('app-aps-selector')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('APS Dos');
  });

  it('uses the saved año/mes when the user already picked one', () => {
    const { detcostos } = crear(2025, 6);

    expect(detcostos).toHaveBeenCalledTimes(1);
    expect(detcostos).toHaveBeenCalledWith(2025, 5);
  });
});

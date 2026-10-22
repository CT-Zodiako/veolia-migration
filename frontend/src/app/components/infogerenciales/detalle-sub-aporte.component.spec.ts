import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DetalleSubAporteComponent } from './detalle-sub-aporte.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { congelarHoy, estadoParametros } from './informes-gerenciales.spec-helpers';

const filas = [
  { APSA_ID: 1, APSA_NOMAPS: 'APS Uno', CLAS_NOMBRE: 'Residencial', PARA_NOMBRE: 'E1', SUCO_VALOR: 0.1234567 },
  { APSA_ID: 2, APSA_NOMAPS: 'APS Dos', CLAS_NOMBRE: 'Comercial', PARA_NOMBRE: 'C', SUCO_VALOR: 1 }
];

function crear(anno: number | null = null, mes: number | null = null) {
  const detsubaporte = vi.fn(() => of({ status: 'ok', data: filas, message: '' }));
  TestBed.configureTestingModule({
    imports: [DetalleSubAporteComponent],
    providers: [{ provide: InfoGerencialService, useValue: { detsubaporte } }, estadoParametros(anno, mes)]
  });
  const fixture = TestBed.createComponent(DetalleSubAporteComponent);
  fixture.detectChanges();
  return { fixture, detsubaporte };
}

// Legacy informesgerenciales/DetalleSubAporte.vue: APS hidden, created() loads stDate ?? today - 1 month for all APS.
describe('DetalleSubAporteComponent (603) - management report over all APS', () => {
  beforeEach(congelarHoy);
  afterEach(() => vi.useRealTimers());

  it('loads today - 1 month on entry, once, and shows every APS without an APS selector', () => {
    const { fixture, detsubaporte } = crear();

    expect(detsubaporte).toHaveBeenCalledTimes(1);
    expect(detsubaporte).toHaveBeenCalledWith(2025, 12);
    expect(fixture.componentInstance.rows().map((r) => r['APSA_NOMAPS'])).toEqual(['APS Uno', 'APS Dos']);
    expect(fixture.componentInstance.rows()[0]['SUCO_VALOR']).toBe(0.123457);
    expect(fixture.nativeElement.querySelector('app-aps-selector')).toBeNull();
  });

  it('uses the saved año/mes when the user already picked one', () => {
    const { detsubaporte } = crear(2024, 1);

    expect(detsubaporte).toHaveBeenCalledWith(2023, 12);
  });
});

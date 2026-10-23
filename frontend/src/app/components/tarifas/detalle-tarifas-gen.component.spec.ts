import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DetalleTarifasGenComponent } from './detalle-tarifas-gen.component';
import { TarifasService } from '../../services/tarifas.service';
import { congelarHoy, estadoParametros } from '../infogerenciales/informes-gerenciales.spec-helpers';

const filas = [
  { APSA_ID: 1, APSA_NOMAPS: 'APS Uno', CLAS_NOMBRE: 'Residencial', TARI_PLENA: 10.123457 },
  { APSA_ID: 2, APSA_NOMAPS: 'APS Dos', CLAS_NOMBRE: 'Comercial', TARI_PLENA: 20 }
];

function crear(anno: number | null = null, mes: number | null = null) {
  const getTarxCosGeneral = vi.fn(() => of(filas));
  TestBed.configureTestingModule({
    imports: [DetalleTarifasGenComponent],
    providers: [{ provide: TarifasService, useValue: { getTarxCosGeneral } }, estadoParametros(anno, mes)]
  });
  const fixture = TestBed.createComponent(DetalleTarifasGenComponent);
  fixture.detectChanges();
  return { fixture, getTarxCosGeneral };
}

// Legacy informesgerenciales/DetalletarifasGen.vue: APS hidden (#ddAps display:none), created() loads
// stDate ?? today - 1 month and lists every APS.
describe('DetalleTarifasGenComponent (601) - management report over all APS', () => {
  beforeEach(congelarHoy);
  afterEach(() => vi.useRealTimers());

  it('loads today - 1 month on entry, once, and shows every APS without an APS selector', () => {
    const { fixture, getTarxCosGeneral } = crear();

    expect(getTarxCosGeneral).toHaveBeenCalledTimes(1);
    expect(getTarxCosGeneral).toHaveBeenCalledWith(2025, 12);
    expect(fixture.componentInstance.rows().map((r) => r['APSA_NOMAPS'])).toEqual(['APS Uno', 'APS Dos']);
    expect(fixture.nativeElement.querySelector('app-aps-selector')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('APS Dos');
  });

  it('uses the saved año/mes when the user already picked one', () => {
    const { getTarxCosGeneral } = crear(2025, 6);

    expect(getTarxCosGeneral).toHaveBeenCalledWith(2025, 5);
  });
});

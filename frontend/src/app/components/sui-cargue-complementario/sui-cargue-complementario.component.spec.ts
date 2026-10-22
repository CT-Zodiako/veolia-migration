import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { SuiCargueComplementarioComponent } from './sui-cargue-complementario.component';
import { SuiIntegracionService } from '../../services/sui-integracion.service';

const F35_F36 = ['F35_CAMRERS', 'F35_QRS_MES', 'F35_DISPALT9', 'F35_INCCDFALT9', 'F35_PRCTCRRCP', 'F35_V0', 'F35_VM',
  'F35_MCRS', 'F35_ICRSM', 'F35_ICCRS', 'F35_FREIN', 'F35_CAPPERDF', 'F36_VL_MES'];

function filaCsv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    APSA_ID: '7', COM_ANNO: '2025', COM_MES: '3',
    F24_DET: '1.5', F24_F1ET: '', F24_CPEET: '', F24_PRTZET: '', F24_CEG: '',
    ...Object.fromEntries(F35_F36.map((c) => [c, ''])),
    ...extra
  };
}

function crear() {
  const setCargueInfComplemento = vi.fn((_payload: unknown) => of({ guardado: true, filasAfectadas: 1 }));
  const existenArchivosGenerados = vi.fn(() => of({ existen: false, cantidad: 0 }));
  const confirm = vi.fn((opts: { accept: () => void }) => opts.accept());
  TestBed.configureTestingModule({
    imports: [SuiCargueComplementarioComponent],
    providers: [
      { provide: SuiIntegracionService, useValue: { setCargueInfComplemento, existenArchivosGenerados } },
      { provide: ConfirmationService, useValue: { confirm } }
    ]
  });
  TestBed.overrideComponent(SuiCargueComplementarioComponent, { set: { template: '', imports: [] } });
  const component = TestBed.createComponent(SuiCargueComplementarioComponent).componentInstance;
  component.aps.set(7);
  component.anno.set(2025);
  component.mes.set(3);
  const procesarCsv = (rows: Record<string, string>[]) => (component as unknown as { procesarCsv(r: unknown[]): void }).procesarCsv(rows);
  return { component, procesarCsv, setCargueInfComplemento, confirm };
}

describe('SuiCargueComplementarioComponent (802)', () => {
  // S6 — legacy CargueComplemento.vue:142-167 compares COM_ANNO/COM_MES with the SELECTED month (stDate)...
  it('accepts a file whose año/mes is the selected month', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv()]);

    expect(component.errores()).toEqual([]);
    expect(component.filas()).toHaveLength(1);
  });

  it('rejects a file whose año/mes is not the selected month (month - 1 included)', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv({ COM_MES: '2' })]);

    expect(component.errores()).toEqual(['Fila 1: el año/mes del archivo (2025/2) no coincide con el período seleccionado.']);
    expect(component.filas()).toEqual([]);
  });

  it('still rejects a file for another APS', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv({ APSA_ID: '8' })]);

    expect(component.errores()).toEqual(['Fila 1: el APS del archivo (8) no coincide con el APS seleccionado.']);
  });

  // S5 — F35/F36 only apply to APS with own relleno; legacy sent them as TO_NUMBER(null).
  it('accepts blank F35/F36 values', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv()]);

    expect(component.errores()).toEqual([]);
  });

  it('rejects a non-numeric value instead of silently storing NULL', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv({ F35_V0: 'abc' })]);

    expect(component.errores()).toEqual(['Fila 1: el valor de V0 (abc) no es numérico.']);
  });

  // S6 save period + S5 nulls + S2 no usuario in the body (legacy :68-82 saved under stDate - 1 month).
  it('saves under the selected month - 1, with NULL for blank values and without a usuario field', () => {
    const { component, procesarCsv, setCargueInfComplemento, confirm } = crear();
    procesarCsv([filaCsv({ F35_V0: '4.5' })]);

    component.guardar();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(setCargueInfComplemento).toHaveBeenCalledTimes(1);
    const payload = setCargueInfComplemento.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      aps: 7, anno: 2025, mes: 2,
      filas: [{
        aps: 7, det: 1.5, f1et: null, cpeet: null, prtzet: null, ceg: null,
        camrers: null, inccdfalt9: null, prctcrrcp: null, v0: 4.5, vm: null, mcrs: null, icrsm: null, iccrs: null,
        frein: null, capperdf: null, qrsMes: null, dispalt9: null, vlMes: null
      }]
    });
    expect('usuario' in payload).toBe(false);
  });

  it('saves January files under December of the previous year', () => {
    const { component, procesarCsv, setCargueInfComplemento } = crear();
    component.mes.set(1);
    procesarCsv([filaCsv({ COM_MES: '1' })]);

    component.guardar();

    expect(setCargueInfComplemento).toHaveBeenCalledWith(expect.objectContaining({ anno: 2024, mes: 12 }));
  });
});

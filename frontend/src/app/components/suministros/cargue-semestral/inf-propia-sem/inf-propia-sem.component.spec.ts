import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfPropiaSemComponent } from './inf-propia-sem.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';

// Header of public/assets/layout/planos/plano_propio_semestral.csv (';'), linked by InfPropiaSemestral.vue.
const HEADER = 'CODAPS;CODEMPRESA;ANNO;MES;QRT;QLU;QNA;QBL;QR;QRS;LBL;VL;ESCE;CTLMX;CPE;NAA;TAFA;CRTPRO;CDFPRO;QRSmunrecp';
const FILA = '1014;1023;2026;3;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16';

function csv(...rows: string[]): Event {
  const file = new File([[HEADER, ...rows].join('\n')], 'plano_propio_semestral.csv', { type: 'text/csv' });
  return { target: { files: [file] } } as unknown as Event;
}

function setup(aps = 1014, anno = 2026, semestre = 1) {
  const service = { setCargueInfPropiaSem: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1023, EMPR_NOMBRE: 'VEOLIA PROPIA' }])) };
  TestBed.configureTestingModule({
    imports: [InfPropiaSemComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(InfPropiaSemComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
  fixture.detectChanges();
  fixture.componentInstance.empresaSeleccionada.set(1023);
  return { fixture, component: fixture.componentInstance, service, empresas };
}

async function load(fixture: ReturnType<typeof setup>['fixture'], event: Event): Promise<void> {
  const component = fixture.componentInstance;
  component.onArchivoSeleccionado(event);
  await vi.waitFor(() => expect(component.filas().length + component.errores().length).toBeGreaterThan(0));
  fixture.detectChanges();
}

describe('InfPropiaSemComponent (702 Inf. Propia) — legacy InfPropiaSemestral.vue', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  afterAll(() => {
    globalThis.ResizeObserver = originalResizeObserver;
  });
  beforeEach(() => localStorage.clear());

  // Legacy InfPropiaSemestral.vue (initCombo): getEmpresasPropias(aps, 1).
  it('lists the APS own companies (propia = 1)', () => {
    const { empresas } = setup();

    expect(empresas.getEmpresasPropias).toHaveBeenCalledWith(1014, 1);
  });

  // Legacy InfPropiaSemestral.vue (generarPreviewMonth + guardarData -> CargueService.js:108-120): rows keep the file MES (no shift)
  // and are posted as resumesem.
  it('saves the template rows as read (file month, no period shift)', async () => {
    const { fixture, component, service } = setup();

    await load(fixture, csv(FILA));
    component.guardar();

    expect(component.errores()).toEqual([]);
    const { resumesem } = service.setCargueInfPropiaSem.mock.calls[0][0] as { resumesem: Record<string, unknown>[] };
    expect(resumesem[0]).toMatchObject({
      aps: 1014, empr: 1023, anno: 2026, mes: 3, qrt: 1, qlu: 2, qna: 3, qbl: 4, qr: 5, qrs: 6, lbl: 7, vl: 8, esce: 9,
      ctlmx: 10, cpe: 11, naa: 12, tafa: 13, crtpro: 14, cdfpro: 15
    });
  });

  // Legacy InfPropiaSemestral.vue (procesarMonthArchivo): every row needs CODAPS, CODEMPRESA, ANNO (stYear) and
  // ceil(MES / 6) == semestre.
  it.each([
    ['APS', '1099;1023;2026;3;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16'],
    ['empresa', '1014;9999;2026;3;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16'],
    ['year', '1014;1023;2025;3;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16'],
    ['semester month', '1014;1023;2026;7;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16']
  ])('blocks the preview when the %s differs', async (_campo, fila) => {
    const { fixture, component, service } = setup();

    await load(fixture, csv(fila));

    expect(component.filas()).toEqual([]);
    component.guardar();
    expect(service.setCargueInfPropiaSem).not.toHaveBeenCalled();
  });

  it.skip('PARITY-FINDING: validation messages differ from legacy ("Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!")', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1014;1023;2026;7;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16'));

    expect(component.errores()).toEqual(['Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!']);
  });

  // Legacy InfPropiaSemestral.vue:107-206 column order: ..., QRS, QRSmunrecp, LBL, VL, ... CDFPRO.
  it.skip('PARITY-FINDING: preview column order/header differs (legacy shows QRSmunrecp right after QRS)', async () => {
    const { fixture } = setup();
    await load(fixture, csv(FILA));

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.columnas.map((c) => c.header)).toEqual([
      'APS', 'EMPRESA', 'AÑO', 'MES', 'QRT', 'QLU', 'QNA', 'QBL', 'QR', 'QRS', 'QRSmunrecp', 'LBL', 'VL', 'ESCE', 'CTLMX',
      'CPE', 'NAA', 'TAFA', 'CRTPRO', 'CDFPRO'
    ]);
  });

  // Legacy InfPropiaSemestral.vue reads element.QRSMUNRECP while the template header is QRSmunrecp: legacy sent no value
  // (undefined dropped by JSON) so PROP_QRSMUNRECP stayed empty.
  it.skip('PARITY-FINDING: the unread QRSmunrecp column is sent as 0 instead of being left empty', async () => {
    const { fixture, component, service } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    const { resumesem } = service.setCargueInfPropiaSem.mock.calls[0][0] as { resumesem: Record<string, unknown>[] };
    expect(resumesem[0]['qrsmunrecp']).toBeUndefined();
  });
});

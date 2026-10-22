import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfPropiaComponent } from './inf-propia.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';

// Header of public/assets/layout/planos/plano_propio_mensual.csv (UTF-8 BOM, ';'), linked by InfPropiaMensual.vue:9-13.
const HEADER = '﻿CODAPS;CODEMPRESA;ANNO;MES;CP;MT3AGUA;M2CC;M2LAV;TI;TM;KLP;T;QA';

function csv(...rows: string[]): Event {
  const file = new File([[HEADER, ...rows].join('\n')], 'plano_propio_mensual.csv', { type: 'text/csv' });
  return { target: { files: [file] } } as unknown as Event;
}

function setup(aps = 1014, anno = 2026, mes = 1) {
  const service = { setCargueInfPropia: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1023, EMPR_NOMBRE: 'VEOLIA PROPIA' }])) };
  TestBed.configureTestingModule({
    imports: [InfPropiaComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(InfPropiaComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('mes', mes);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, empresas };
}

async function load(fixture: ReturnType<typeof setup>['fixture'], event: Event): Promise<void> {
  const component = fixture.componentInstance;
  component.onArchivoSeleccionado(event);
  await vi.waitFor(() => expect(component.filas().length + component.errores().length).toBeGreaterThan(0));
  fixture.detectChanges();
}

describe('InfPropiaComponent (701 Inf. Propia) — legacy InfPropiaMensual.vue', () => {
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

  // Legacy InfPropiaMensual.vue:398-411: getEmpresasPropias(aps, 1) feeds the empresa dropdown.
  it('lists the APS own companies (propia = 1)', () => {
    const { component, empresas } = setup();

    expect(empresas.getEmpresasPropias).toHaveBeenCalledWith(1014, 1);
    expect(component.empresas()).toEqual([{ EMPR_EMPR: 1023, EMPR_NOMBRE: 'VEOLIA PROPIA' }]);
  });

  // Legacy InfPropiaMensual.vue:99-169: preview columns APS, EMPRESA, AÑO, MES, CP, MT3AGUA, M2CC, M2LAV, TI, TM, KLP, T, QA, ESCENARIO.
  it('previews the template rows with the legacy columns', async () => {
    const { fixture, component } = setup();
    component.empresaSeleccionada.set(1023);

    await load(fixture, csv('1014;1023;2026;01;10;20;30;40;50;60;70;80;90'));

    expect(component.errores()).toEqual([]);
    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.columnas.map((c) => [c.field, c.header])).toEqual([
      ['aps', 'APS'], ['empr', 'EMPRESA'], ['anno', 'AÑO'], ['mes', 'MES'], ['cp', 'CP'], ['mt3agua', 'MT3AGUA'], ['m2cc', 'M2CC'],
      ['m2lav', 'M2LAV'], ['ti', 'TI'], ['tm', 'TM'], ['klp', 'KLP'], ['t', 'T'], ['qa', 'QA'], ['escenario', 'ESCENARIO']
    ]);
  });

  // Legacy InfPropiaMensual.vue:336-359: APS, empresa and AÑO/MES (selected month) must match the file; otherwise no preview.
  it.each([
    ['APS', '1099;1023;2026;1;10;20;30;40;50;60;70;80;90'],
    ['empresa', '1014;9999;2026;1;10;20;30;40;50;60;70;80;90'],
    ['period', '1014;1023;2025;12;10;20;30;40;50;60;70;80;90']
  ])('blocks the preview when the %s of the file differs', async (_campo, fila) => {
    const { fixture, component, service } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);

    await load(fixture, csv(fila));

    expect(component.filas()).toEqual([]);
    expect(component.errores().length).toBeGreaterThan(0);
    component.guardar();
    expect(service.setCargueInfPropia).not.toHaveBeenCalled();
  });

  it.skip('PARITY-FINDING: validation messages differ from legacy (one message, APS -> empresa -> AÑO y MES)', async () => {
    const { fixture, component } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);

    await load(fixture, csv('1014;9999;2026;1;10;20;30;40;50;60;70;80;90'));

    // Legacy InfPropiaMensual.vue:341-346.
    expect(component.errores()).toEqual(['La Empresa Seleccionada no concuerda con la Empresa del archivo!']);
  });

  // Legacy InfPropiaMensual.vue:246-266 + CargueService.js:209-228: empr = { emprempr, emprnombre }, resumemes rows with mes
  // shifted back one month (January -> December of the previous year).
  it('saves the selected empresa and shifts every row back one month', async () => {
    const { fixture, component, service } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);
    await load(fixture, csv('1014;1023;2026;01;10;20;30;40;50;60;70;80;90'));

    component.guardar();

    const payload = service.setCargueInfPropia.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['aps']).toBe(1014);
    expect(payload['empr']).toEqual({ emprempr: 1023, emprnombre: 'VEOLIA PROPIA' });
    const [fila] = payload['resumemes'] as Record<string, unknown>[];
    expect(fila).toMatchObject({ aps: 1014, empr: 1023, anno: 2025, mes: 12, cp: 10, mt3agua: 20, m2cc: 30, m2lav: 40, ti: 50, tm: 60, klp: 70, t: 80, qa: 90 });
  });

  // Legacy InfPropiaMensual.vue:253-266 sends anno/mes = selected month - 1.
  it.skip('PARITY-FINDING: the request anno/mes is the selected month instead of the previous one', async () => {
    const { fixture, component, service } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);
    await load(fixture, csv('1014;1023;2026;01;10;20;30;40;50;60;70;80;90'));

    component.guardar();

    const payload = service.setCargueInfPropia.mock.calls[0][0] as Record<string, unknown>;
    expect({ anno: payload['anno'], mes: payload['mes'] }).toEqual({ anno: 2025, mes: 12 });
  });

  // Legacy InfPropiaMensual.vue:380 maps escenario from the ESCENARIO column; plano_propio_mensual.csv has none, so legacy sent no
  // value (undefined is dropped by JSON) and PROP_ESCENARIO stayed empty.
  it.skip('PARITY-FINDING: a missing ESCENARIO column is sent as 0 instead of being left empty', async () => {
    const { fixture, component, service } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);
    await load(fixture, csv('1014;1023;2026;01;10;20;30;40;50;60;70;80;90'));

    component.guardar();

    const [fila] = (service.setCargueInfPropia.mock.calls[0][0] as Record<string, unknown>)['resumemes'] as Record<string, unknown>[];
    expect(fila['escenario']).toBeUndefined();
  });

  // Legacy InfPropiaMensual.vue:363-384 previews the file values (ANNO/MES of the file).
  it.skip('PARITY-FINDING: the preview shows the shifted previous period instead of the file ANNO/MES', async () => {
    const { fixture, component } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);
    await load(fixture, csv('1014;1023;2026;01;10;20;30;40;50;60;70;80;90'));

    expect({ anno: component.filas()[0].anno, mes: component.filas()[0].mes }).toEqual({ anno: 2026, mes: 1 });
  });

  // CargueService.js:247-250 toasts "Guardado Correctamente".
  it.skip('PARITY-FINDING: the success message is not the legacy "Guardado Correctamente"', async () => {
    const { fixture, component } = setup(1014, 2026, 1);
    component.empresaSeleccionada.set(1023);
    await load(fixture, csv('1014;1023;2026;01;10;20;30;40;50;60;70;80;90'));

    component.guardar();

    expect(component.estado()).toBe('Guardado Correctamente');
  });
});

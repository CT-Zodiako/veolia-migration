import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfCompetidorComponent } from './inf-competidor.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';

// Header of public/assets/layout/planos/plano_competidor_mensual.csv (UTF-8 BOM, ';'), linked by InfCompetidorMensual.vue.
const HEADER = '﻿CODAPS;CODEMPRESA;ANNO;MES;CP;MT3AGUA;M2CC;M2LAV;TI;TM;KLP;CBLJ';
const FILA = '1014;1024;2026;1;10;20;30;40;50;60;70;48480.20';

function csv(...rows: string[]): Event {
  const file = new File([[HEADER, ...rows].join('\n')], 'plano_competidor_mensual.csv', { type: 'text/csv' });
  return { target: { files: [file] } } as unknown as Event;
}

function setup(aps = 1014, anno = 2026, mes = 1) {
  const service = { setCargueInfCompetidor: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1024, EMPR_NOMBRE: 'COMPETIDOR' }])) };
  TestBed.configureTestingModule({
    imports: [InfCompetidorComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(InfCompetidorComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('mes', mes);
  fixture.detectChanges();
  fixture.componentInstance.empresaSeleccionada.set(1024);
  return { fixture, component: fixture.componentInstance, service, empresas };
}

async function load(fixture: ReturnType<typeof setup>['fixture'], event: Event): Promise<void> {
  const component = fixture.componentInstance;
  component.onArchivoSeleccionado(event);
  await vi.waitFor(() => expect(component.filas().length + component.errores().length).toBeGreaterThan(0));
  fixture.detectChanges();
}

describe('InfCompetidorComponent (701 Inf. Competidor) — legacy InfCompetidorMensual.vue', () => {
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

  // Legacy InfCompetidorMensual.vue:377: getEmpresasPropias(aps, 0) (competitor companies).
  it('lists the competitor companies (propia = 0)', () => {
    const { empresas } = setup();

    expect(empresas.getEmpresasPropias).toHaveBeenCalledWith(1014, 0);
  });

  // Legacy InfCompetidorMensual.vue:99-158: APS, EMPRESA, AÑO, MES, CP, MT3AGUA, M2CC, M2LAV, TI, TM, KLP, CBLJ.
  it('previews the template rows with the legacy columns', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv(FILA));

    expect(component.errores()).toEqual([]);
    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.columnas.map((c) => c.header)).toEqual(['APS', 'EMPRESA', 'AÑO', 'MES', 'CP', 'MT3AGUA', 'M2CC', 'M2LAV', 'TI', 'TM', 'KLP', 'CBLJ']);
  });

  // Legacy InfCompetidorMensual.vue:301-340: APS (CODAPS), empresa (CODEMPRESA) and AÑO/MES must match.
  it('blocks the preview when the file belongs to another company', async () => {
    const { fixture, component, service } = setup();

    await load(fixture, csv('1014;9999;2026;1;10;20;30;40;50;60;70;1'));

    expect(component.filas()).toEqual([]);
    component.guardar();
    expect(service.setCargueInfCompetidor).not.toHaveBeenCalled();
  });

  it('shows the legacy validation message "La Empresa Seleccionada no concuerda con la Empresa del archivo!"', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1014;9999;2026;1;10;20;30;40;50;60;70;1'));

    // Legacy InfCompetidorMensual.vue:322-325.
    expect(component.errores()).toEqual(['La Empresa Seleccionada no concuerda con la Empresa del archivo!']);
  });

  // Legacy CargueService.js:304-334 (setCargueInfCompe): rows with mes shifted back one month, empr = { emprempr, emprnombre }.
  it('saves the selected company and shifts every row back one month', async () => {
    const { fixture, component, service } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    const payload = service.setCargueInfCompetidor.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['empr']).toEqual({ emprempr: 1024, emprnombre: 'COMPETIDOR' });
    expect(payload['resumemes']).toEqual([{ aps: 1014, empr: 1024, anno: 2025, mes: 12, cp: 10, mt3agua: 20, m2cc: 30, m2lav: 40, ti: 50, tm: 60, klp: 70, cblj: 48480.2 }]);
  });

  // Legacy InfCompetidorMensual.vue (guardarData) sends anno/mes = selected month - 1.
  it('sends the request anno/mes of the previous month like legacy', async () => {
    const { fixture, component, service } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    const payload = service.setCargueInfCompetidor.mock.calls[0][0] as Record<string, unknown>;
    expect({ anno: payload['anno'], mes: payload['mes'] }).toEqual({ anno: 2025, mes: 12 });
  });

  // CargueService.js:351-354 toasts "Guardado Correctamente".
  it('shows the legacy success message "Guardado Correctamente"', async () => {
    const { fixture, component } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    expect(component.estado()).toBe('Guardado Correctamente');
  });
});

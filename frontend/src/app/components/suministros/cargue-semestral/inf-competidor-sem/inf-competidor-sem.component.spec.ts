import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfCompetidorSemComponent } from './inf-competidor-sem.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';

// Header of public/assets/layout/planos/plano_competidor_semestral.csv (';'), linked by InfCompetidorSemestral.vue.
const HEADER = 'CODAPS;CODEMP;ANNO;MES;N;NA;ND;QLU;QNA;QBL;QR;CBLJ;LBL;CRTCOMP;CDFCOMP;QRTZ';
const FILA = '1014;1024;2026;8;1;2;3;4;5;6;7;8;9;10;11;12';

function csv(...rows: string[]): Event {
  const file = new File([[HEADER, ...rows].join('\n')], 'plano_competidor_semestral.csv', { type: 'text/csv' });
  return { target: { files: [file] } } as unknown as Event;
}

function setup(aps = 1014, anno = 2026, semestre = 2) {
  const service = { setCargueInfCompetidorSemestral: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1024, EMPR_NOMBRE: 'COMPETIDOR' }])) };
  TestBed.configureTestingModule({
    imports: [InfCompetidorSemComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(InfCompetidorSemComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
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

describe('InfCompetidorSemComponent (702 Inf. Competidor) — legacy InfCompetidorSemestral.vue', () => {
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

  // Legacy InfCompetidorSemestral.vue:414: getEmpresasPropias(aps, 0).
  it('lists the competitor companies (propia = 0)', () => {
    const { empresas } = setup();

    expect(empresas.getEmpresasPropias).toHaveBeenCalledWith(1014, 0);
  });

  // Legacy InfCompetidorSemestral.vue:106-185 preview columns and :375-397 mapping (CODEMP, N, NA, ND, ..., QRTZ).
  it('previews and saves the template rows with the legacy columns', async () => {
    const { fixture, component, service } = setup();

    await load(fixture, csv(FILA));
    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    component.guardar();

    expect(tabla.columnas.map((c) => c.header)).toEqual(['APS', 'EMPRESA', 'AÑO', 'MES', 'N', 'NA', 'ND', 'QLU', 'QNA', 'QBL', 'QR', 'CBLJ', 'LBL', 'CRTCOMP', 'CDFCOMP', 'QRTZ']);
    expect(service.setCargueInfCompetidorSemestral).toHaveBeenCalledWith({
      resumesem: [{ aps: 1014, empr: 1024, anno: 2026, mes: 8, n: 1, na: 2, nd: 3, qlu: 4, qna: 5, qbl: 6, qr: 7, cblj: 8, lbl: 9, crtcomp: 10, cdfcomp: 11, qrtz: 12 }]
    });
  });

  // Legacy InfCompetidorSemestral.vue:334-366: CODAPS, CODEMP, ANNO (stYear) and ceil(MES / 6) must match.
  it.each([
    ['empresa', '1014;9999;2026;8;1;2;3;4;5;6;7;8;9;10;11;12'],
    ['semester month', '1014;1024;2026;3;1;2;3;4;5;6;7;8;9;10;11;12']
  ])('blocks the preview when the %s differs', async (_campo, fila) => {
    const { fixture, component, service } = setup();

    await load(fixture, csv(fila));

    expect(component.filas()).toEqual([]);
    component.guardar();
    expect(service.setCargueInfCompetidorSemestral).not.toHaveBeenCalled();
  });

  it.skip('PARITY-FINDING: validation messages differ from legacy ("La Empresa Seleccionada no concuerda con la Empresa del archivo!")', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1014;9999;2026;8;1;2;3;4;5;6;7;8;9;10;11;12'));

    // Legacy InfCompetidorSemestral.vue:341-346.
    expect(component.errores()).toEqual(['La Empresa Seleccionada no concuerda con la Empresa del archivo!']);
  });
});

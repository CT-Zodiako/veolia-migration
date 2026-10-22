import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { CargueComercialSemComponent } from './cargue-comercial-sem.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';

// public/assets/layout/planos/plano_usuarios_semestral.csv (header + sample row), linked by CargueComercialSemestral.vue.
const HEADER = 'CODAPS;NOMAPS;ANNO;SEMESTRE;CODUSO;NOMUSO;COD_FACTOR;NOM_FACT;COD_TIPO;NOM_TIPO;SUS_M1;SUS_M2;SUS_M3;SUS_M4;SUS_M5;SUS_M6;AFO_M1;AFO_M2;AFO_M3;AFO_M4;AFO_M5;AFO_M6';
const FILA = '1024;BARRANCABERMEJA;2020;2;4;ESTRATO 4;1;4;1;TOTALES;6359;6361;6359;6361;6359;6361;0;0;0;0;0;0';

function csv(...rows: string[]): Event {
  const file = new File([[HEADER, ...rows].join('\n')], 'plano_usuarios_semestral.csv', { type: 'text/csv' });
  return { target: { files: [file] } } as unknown as Event;
}

function setup(aps = 1024, anno = 2020, semestre = 2) {
  const service = { filecarguecomercialsemestral: vi.fn((_payload: unknown) => of({ data: 1 })) };
  TestBed.configureTestingModule({
    imports: [CargueComercialSemComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const fixture = TestBed.createComponent(CargueComercialSemComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

async function load(fixture: ReturnType<typeof setup>['fixture'], event: Event): Promise<void> {
  const component = fixture.componentInstance;
  component.onArchivoSeleccionado(event);
  await vi.waitFor(() => expect(component.filas().length + component.errores().length).toBeGreaterThan(0));
  fixture.detectChanges();
}

describe('CargueComercialSemComponent (702 Inf. Usuarios) — legacy CargueComercialSemestral.vue', () => {
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

  // Legacy CargueComercialSemestral.vue (generarPreview) maps CODAPS, NOMAPS, ANNO, SEMESTRE, CODUSO, NOMUSO, COD_FACTOR,
  // NOM_FACT, COD_TIPO, NOM_TIPO, SUS_M1..6, AFO_M1..6 and enviarCargue posts them as filecontent without period shift
  // (CargueService.js:7-25).
  it('maps the template columns and saves the rows as read', async () => {
    const { fixture, component, service } = setup();

    await load(fixture, csv(FILA));
    component.guardar();

    expect(component.errores()).toEqual([]);
    expect(service.filecarguecomercialsemestral).toHaveBeenCalledWith({
      filecontent: [{
        codaps: 1024, aps: 'BARRANCABERMEJA', anno: 2020, semestre: 2, coduso: 4, nomuso: 'ESTRATO 4', codfactor: 1, nomfact: 4,
        codtipo: 1, nomtipo: 'TOTALES', susm1: 6359, susm2: 6361, susm3: 6359, susm4: 6361, susm5: 6359, susm6: 6361,
        afom1: 0, afom2: 0, afom3: 0, afom4: 0, afom5: 0, afom6: 0
      }]
    });
  });

  // Legacy CargueComercialSemestral.vue (procesarArchivo): every row's CODAPS, ANNO (stYear) and SEMESTRE (stSemester) must match.
  it.each([
    ['APS', '1099;X;2020;2;4;E;1;4;1;T;1;1;1;1;1;1;0;0;0;0;0;0'],
    ['year', '1024;X;2019;2;4;E;1;4;1;T;1;1;1;1;1;1;0;0;0;0;0;0'],
    ['semester', '1024;X;2020;1;4;E;1;4;1;T;1;1;1;1;1;1;0;0;0;0;0;0']
  ])('blocks the preview when the %s differs', async (_campo, fila) => {
    const { fixture, component, service } = setup();

    await load(fixture, csv(fila));

    expect(component.filas()).toEqual([]);
    component.guardar();
    expect(service.filecarguecomercialsemestral).not.toHaveBeenCalled();
  });

  it.skip('PARITY-FINDING: validation messages differ from legacy ("Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!")', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1024;X;2020;1;4;E;1;4;1;T;1;1;1;1;1;1;0;0;0;0;0;0'));

    expect(component.errores()).toEqual(['Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!']);
  });

  // Legacy CargueComercialSemestral.vue:85-224 preview headers.
  it.skip('PARITY-FINDING: preview headers differ from legacy (Cod. Aps, APS, Año, Semestre, Cod. CU, Nombre CU, ... Sus M1, Afo M1)', async () => {
    const { fixture } = setup();
    await load(fixture, csv(FILA));

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.columnas.map((c) => c.header)).toEqual([
      'Cod. Aps', 'APS', 'Año', 'Semestre', 'Cod. CU', 'Nombre CU', 'Cod. Factor', 'Nom. Factor', 'Cod. Tipo', 'Nom. Tipo',
      'Sus M1', 'Sus M2', 'Sus M3', 'Sus M4', 'Sus M5', 'Sus M6', 'Afo M1', 'Afo M2', 'Afo M3', 'Afo M4', 'Afo M5', 'Afo M6'
    ]);
  });

  // CargueService.js:31-36 toasts "Guardado Correctamente".
  it.skip('PARITY-FINDING: the success message is not the legacy "Guardado Correctamente"', async () => {
    const { fixture, component } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    expect(component.estado()).toBe('Guardado Correctamente');
  });
});

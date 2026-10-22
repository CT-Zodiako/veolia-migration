import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { CargueComercialComponent } from './cargue-comercial.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';

// Header of public/assets/layout/planos/plano_usuarios.csv (UTF-8 BOM, ';' separated), the legacy guide file
// linked by CargueComercial.vue:9-12.
const HEADER = '\uFEFFCODAPS;APS;ANNO;MES;CODUSO;NOMUSO;CODFACTOR;CODTIPO;TIPO;TIPONOM;CANTIDAD;TONELADAS';

function csv(...rows: string[]): Event {
  const file = new File([[HEADER, ...rows].join('\n')], 'plano_usuarios.csv', { type: 'text/csv' });
  return { target: { files: [file] } } as unknown as Event;
}

function setup(aps = 1033, anno = 2026, mes = 1) {
  const service = { filecarguecomercial: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };
  TestBed.configureTestingModule({
    imports: [CargueComercialComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  const fixture = TestBed.createComponent(CargueComercialComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('mes', mes);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, confirmation };
}

async function load(fixture: ReturnType<typeof setup>['fixture'], event: Event): Promise<void> {
  const component = fixture.componentInstance;
  component.onArchivoSeleccionado(event);
  await vi.waitFor(() => expect(component.filas().length + component.errores().length).toBeGreaterThan(0));
  fixture.detectChanges();
}

function text(fixture: ReturnType<typeof setup>['fixture']): string {
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('CargueComercialComponent (701 Inf. Usuarios) — legacy CargueComercial.vue', () => {
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

  // Legacy CargueComercial.vue:343-380: TIPO 1 -> N, TIPO 2/3/4 -> NA, TIPO 5 -> ND, TAFNA = sum of TONELADAS,
  // shown as the rows N, ND, NA, TAFNA (:369-372).
  it('parses the plano_usuarios.csv template and computes N, ND, NA and TAFNA like legacy', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv(
      '1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5',
      '1033;SAN PEDRO;2026;1;7;COMERCIAL;1;2;2;PEQUENO;3;0.5',
      '1033;SAN PEDRO;2026;1;8;INDUSTRIAL;1;3;4;GRANDE;1;0.25',
      '1033;SAN PEDRO;2026;1;9;OFICIAL;1;5;5;DESOCUPADO;2;0'
    ));

    expect(component.errores()).toEqual([]);
    expect(component.resumenVariables()).toEqual({ n: 10, na: 4, nd: 2, tafna: 2.25 });
    const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.resumen-card')[0].querySelectorAll('tr'))
      .map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim()));
    expect(filas).toEqual([['N', '10'], ['ND', '2'], ['NA', '4'], ['TAFNA', '2.25']]);
  });

  // Legacy CargueComercial.vue:120-179 preview columns, in order.
  it('previews the legacy fields in the legacy order', async () => {
    const { fixture } = setup();

    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.columnas.map((c) => c.field)).toEqual(['codaps', 'aps', 'anno', 'mes', 'coduso', 'nomuso', 'codfactor', 'codtipo', 'tipo', 'tiponom', 'cantidad', 'toneladas']);
  });

  it.skip('PARITY-FINDING: preview headers differ from legacy (COD APS/AÑO/COD USO/NOM USO/... instead of Cod. Aps/Año/Cod. CU/Nombre CU/...)', async () => {
    const { fixture } = setup();

    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    // Legacy CargueComercial.vue:120-179.
    expect(tabla.columnas.map((c) => c.header)).toEqual(['Cod. Aps', 'APS', 'Año', 'Mes', 'Cod. CU', 'Nombre CU', 'Cod. Factor', 'Cod. Tipo', 'Tipo', 'Nom. Tipo', 'Cantidad', 'Toneladas']);
  });

  // Legacy CargueComercial.vue:292-306: an APS or AÑO/MES (selected month, not the previous one) that differs from the file
  // blocks the preview and the save button.
  it('blocks the preview when the file APS or period differs from the selection', async () => {
    const { fixture, component, service } = setup(1033, 2026, 1);

    await load(fixture, csv('1033;SAN PEDRO;2025;12;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    expect(component.filas()).toEqual([]);
    expect(component.errores().length).toBeGreaterThan(0);
    expect(text(fixture)).not.toContain('Guardar Información de Usuarios');
    expect(service.filecarguecomercial).not.toHaveBeenCalled();
  });

  it.skip('PARITY-FINDING: validation messages differ from legacy ("El APS Seleccionado no concuerda con el APS del archivo!" / "El AÑO y MES Seleccionado no concuerda con los del archivo!")', async () => {
    const apsDistinto = setup(1033, 2026, 1);
    await load(apsDistinto.fixture, csv('1099;OTRA;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));
    // Legacy CargueComercial.vue:292-301: one message, APS checked first.
    expect(apsDistinto.component.errores()).toEqual(['El APS Seleccionado no concuerda con el APS del archivo!']);

    TestBed.resetTestingModule();
    const periodoDistinto = setup(1033, 2026, 1);
    await load(periodoDistinto.fixture, csv('1033;SAN PEDRO;2025;12;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));
    expect(periodoDistinto.component.errores()).toEqual(['El AÑO y MES Seleccionado no concuerda con los del archivo!']);
  });

  // Legacy CargueComercial.vue:391-406 + CargueService.js:58-79: aps, anno/mes = selected month - 1 and every row's mes shifted
  // back one month (January -> December of the previous year).
  it('saves the previous period and shifts every row back one month', async () => {
    const { fixture, component, service } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    component.guardar();

    expect(service.filecarguecomercial).toHaveBeenCalledTimes(1);
    const payload = service.filecarguecomercial.mock.calls[0][0] as Record<string, unknown>;
    expect({ aps: payload['aps'], anno: payload['anno'], mes: payload['mes'] }).toEqual({ aps: 1033, anno: 2025, mes: 12 });
    expect(payload['filecontent']).toEqual([{
      codaps: 1033, aps: 'SAN PEDRO', anno: 2025, mes: 12, coduso: 1, nomuso: 'ESTRATO 1', codfactor: 1, codtipo: 1,
      tipo: 1, tiponom: 'RESIDENCIAL', cantidad: 10, toneladas: 1.5
    }]);
  });

  // Legacy CargueComercial.vue:374-379 sends resume as { N, NA, ND, TAFNA }.
  it.skip('PARITY-FINDING: resume is sent with lowercase keys { n, nd, na, tafna } instead of legacy { N, NA, ND, TAFNA }', async () => {
    const { fixture, component, service } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    component.guardar();

    const payload = service.filecarguecomercial.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['resume']).toEqual({ N: 10, NA: 0, ND: 0, TAFNA: 1.5 });
  });

  // Legacy CargueComercial.vue:310-329 previews the file values as read (ANNO/MES of the file, i.e. the selected month).
  it.skip('PARITY-FINDING: the preview shows the shifted previous period instead of the file ANNO/MES', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    expect({ anno: component.filas()[0].anno, mes: component.filas()[0].mes }).toEqual({ anno: 2026, mes: 1 });
  });

  // Legacy CargueComercial.vue:330-342 lists every TIPO 1 row (no aggregation by CODUSO).
  it.skip('PARITY-FINDING: Resumen x Estratos aggregates rows by CODUSO; legacy listed every TIPO 1 row', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv(
      '1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5',
      '1033;SAN PEDRO;2026;1;1;ESTRATO 1;2;1;1;RESIDENCIAL;5;0.5'
    ));

    expect(component.resumenEstratos().map((e) => [e.nomuso, e.cantidad, e.toneladas])).toEqual([['ESTRATO 1', 10, 1.5], ['ESTRATO 1', 5, 0.5]]);
  });

  // Legacy CargueComercial.vue:410 shows "GUARDADO EXITOSAMENTE" after saving.
  it.skip('PARITY-FINDING: the success message is "Información de usuarios guardada correctamente." instead of legacy "GUARDADO EXITOSAMENTE"', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    component.guardar();
    fixture.detectChanges();

    expect(component.estado()).toBe('GUARDADO EXITOSAMENTE');
  });
});

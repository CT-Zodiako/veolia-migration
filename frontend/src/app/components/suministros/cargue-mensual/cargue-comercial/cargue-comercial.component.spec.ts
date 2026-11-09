import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { CargueComercialComponent } from './cargue-comercial.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoPasosComponent } from '../../../shared/cargue-archivo-pasos.component';

// Header of public/assets/layout/planos/plano_usuarios.csv (UTF-8 BOM, ';' separated), the legacy guide file
// linked by CargueComercial.vue:9-12.
const HEADER = '\uFEFFCODAPS;APS;ANNO;MES;CODUSO;NOMUSO;CODFACTOR;CODTIPO;TIPO;TIPONOM;CANTIDAD;TONELADAS';

function csv(...rows: string[]): File {
  return new File([[HEADER, ...rows].join('\n')], 'plano_usuarios.csv', { type: 'text/csv' });
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

function pasos(fixture: ReturnType<typeof setup>['fixture']): CargueArchivoPasosComponent {
  return fixture.debugElement.query(By.directive(CargueArchivoPasosComponent)).componentInstance as CargueArchivoPasosComponent;
}

// The file is picked through the shared guided upload (its archivoSeleccionado output).
async function load(fixture: ReturnType<typeof setup>['fixture'], file: File): Promise<void> {
  const component = fixture.componentInstance;
  fixture.detectChanges();
  pasos(fixture).archivoSeleccionado.emit(file);
  await vi.waitFor(() => expect(component.filas().length + component.errores().length).toBeGreaterThan(0));
  fixture.detectChanges();
}

// Picks a file through the shared component's own hidden input (runs its client checks).
function elegirEnPasos(fixture: ReturnType<typeof setup>['fixture'], file: File): void {
  const input = fixture.debugElement.query(By.directive(CargueArchivoPasosComponent)).nativeElement
    .querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
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

  it('uses the legacy preview headers Cod. Aps/Año/Cod. CU/Nombre CU/...', async () => {
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

  it('shows the legacy validation messages "El APS Seleccionado no concuerda con el APS del archivo!" / "El AÑO y MES Seleccionado no concuerda con los del archivo!"', async () => {
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
  // Accepted deviation: legacy-characterization-tests S8/S9 (group D, legacy request field names renamed; the backend
  // CargueComercialResumen reads { n, nd, na, tafna }).
  it('sends resume with the lowercase keys { n, nd, na, tafna } of the new API', async () => {
    const { fixture, component, service } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    component.guardar();

    const payload = service.filecarguecomercial.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['resume']).toEqual({ n: 10, na: 0, nd: 0, tafna: 1.5 });
  });

  // Legacy CargueComercial.vue:310-329 previews the file values as read (ANNO/MES of the file, i.e. the selected month).
  it('previews the file ANNO/MES like legacy', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    expect({ anno: component.filas()[0].anno, mes: component.filas()[0].mes }).toEqual({ anno: 2026, mes: 1 });
  });

  // Legacy CargueComercial.vue:330-342 lists every TIPO 1 row (no aggregation by CODUSO).
  it('lists every TIPO 1 row in Resumen x Estratos like legacy', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv(
      '1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5',
      '1033;SAN PEDRO;2026;1;1;ESTRATO 1;2;1;1;RESIDENCIAL;5;0.5'
    ));

    expect(component.resumenEstratos().map((e) => [e.nomuso, e.cantidad, e.toneladas])).toEqual([['ESTRATO 1', 10, 1.5], ['ESTRATO 1', 5, 0.5]]);
  });

  // Legacy CargueComercial.vue:410 shows "GUARDADO EXITOSAMENTE" after saving.
  it('shows the legacy success message "GUARDADO EXITOSAMENTE"', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    component.guardar();
    fixture.detectChanges();

    expect(component.estado()).toBe('GUARDADO EXITOSAMENTE');
  });

  // cargue-archivos-pasos S2/S3: the native file input, the ⚡ link and the loose Cancelar/Guardar buttons are replaced by
  // the shared guided upload, with the same Plano Guía file.
  it('uses the shared guided upload with the same Plano Guía and no native file input of its own', () => {
    const { fixture } = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(pasos(fixture).planoGuiaUrl).toBe('assets/layout/planos/plano_usuarios.csv');

    // descargas-estandar S3: step 1 offers the same file with the standard download button and its real name.

    expect(pasos(fixture).planoGuiaMeta).toBe('CSV · < 1 KB · 12 columnas');

    expect((fixture.nativeElement as HTMLElement).querySelector('app-boton-descarga a')?.getAttribute('download')).toBe('plano_usuarios.csv');
    expect(pasos(fixture).accept).toBe('.csv');
    const propios = Array.from(host.querySelectorAll('input[type="file"]')).filter((i) => !i.closest('app-cargue-archivo-pasos'));
    expect(propios).toEqual([]);
    expect(host.textContent).not.toContain('⚡');
  });

  // S3/S5: a valid file is ready in step 3 with its row count and the real destination period (previous month).
  it('reports listo with the row count and the previous month as destination period', async () => {
    const { fixture } = setup(1033, 2026, 1);

    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    expect(pasos(fixture).estado).toBe('listo');
    expect(pasos(fixture).resumen?.filas).toBe(1);
    expect(pasos(fixture).periodoDestino).toBe('Diciembre 2025');
    expect(pasos(fixture).guardarLabel).toBe('Guardar Información de Usuarios');
  });

  // S5: the screen errors are shown once, inside the shared component.
  it('passes the validation errors to the shared component (error estado) and shows them once', async () => {
    const { fixture } = setup(1033, 2026, 1);

    await load(fixture, csv('1033;SAN PEDRO;2025;12;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    expect(pasos(fixture).estado).toBe('error');
    expect(pasos(fixture).errores).toEqual(['El AÑO y MES Seleccionado no concuerda con los del archivo!']);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto.split('El AÑO y MES Seleccionado no concuerda con los del archivo!').length - 1).toBe(1);
  });

  // S5: Guardar of the shared component goes through the existing confirm dialog and save call; then it is cleared.
  it('Guardar of the shared component confirms, saves and clears the upload', async () => {
    const { fixture, component, service, confirmation } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    pasos(fixture).guardar.emit();
    fixture.detectChanges();

    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    expect(service.filecarguecomercial).toHaveBeenCalledTimes(1);
    expect(component.filas()).toEqual([]);
    expect(pasos(fixture).estado).toBe('vacio');
  });

  // cargue-archivos-pasos: a headers-only file is an error state like the semestral screens (no silent reset, no Guardar).
  it('a headers-only CSV shows "El archivo no tiene filas de datos." in the error state', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv());

    expect(component.filas()).toEqual([]);
    expect(pasos(fixture).estado).toBe('error');
    expect(pasos(fixture).errores).toEqual(['El archivo no tiene filas de datos.']);
    expect((fixture.nativeElement as HTMLElement).querySelector('button.btn-guardar')).toBeNull();
  });

  // cargue-archivos-pasos: a replacement rejected by the client checks also drops the previous preview and Guardar.
  it('a rejected replacement (wrong extension) clears the previous preview', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    elegirEnPasos(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));
    await vi.waitFor(() => expect(component.filas()).toHaveLength(1));
    fixture.detectChanges();

    elegirEnPasos(fixture, new File(['x'], 'plano_usuarios.xlsx'));

    expect(component.filas()).toEqual([]);
    expect(pasos(fixture).estado).toBe('vacio');
    expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.msg-error')!.textContent).toContain('El archivo no es CSV');
  });

  // S5: Cancelar / quitar of the shared component clear the preview like the old Cancelar button.
  it('Cancelar and quitar of the shared component clear the preview', async () => {
    const { fixture, component } = setup(1033, 2026, 1);
    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));

    pasos(fixture).cancelar.emit();
    expect(component.filas()).toEqual([]);

    await load(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));
    pasos(fixture).archivoQuitado.emit();
    fixture.detectChanges();
    expect(component.filas()).toEqual([]);
    expect(pasos(fixture).estado).toBe('vacio');
  });
  // cargue-archivos-pasos L5: a parse that finishes after Cancelar is stale; a read failure is an error, not a hang.
  describe('stale parses and read errors', () => {
    function elegirPorInput(fixture: ReturnType<typeof setup>['fixture'], file: File): void {
      fixture.detectChanges();
      const input = fixture.debugElement.query(By.directive(CargueArchivoPasosComponent)).nativeElement
        .querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    function preparar() {
      const ctx = setup(1033, 2026, 1);
      ctx.fixture.detectChanges();
      return ctx;
    }

    it('ignores a parse that completes after Cancelar (no preview, no Guardar)', async () => {
      const { fixture, component } = preparar();
      elegirPorInput(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));
      expect(component.validando()).toBe(true);

      pasos(fixture).onCancelar();
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 300));
      fixture.detectChanges();

      expect(component.filas()).toEqual([]);
      expect(component.validando()).toBe(false);
      expect(pasos(fixture).estado).toBe('vacio');
      expect((fixture.nativeElement as HTMLElement).querySelector('button.btn-guardar')).toBeNull();
    });

    it('shows "No fue posible leer el archivo." when the file cannot be read', async () => {
      const { fixture, component } = preparar();
      const lectura = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
        setTimeout(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>));
      });
      try {
        elegirPorInput(fixture, csv('1033;SAN PEDRO;2026;1;1;ESTRATO 1;1;1;1;RESIDENCIAL;10;1.5'));
        await vi.waitFor(() => expect(component.validando()).toBe(false));
      } finally {
        lectura.mockRestore();
      }
      fixture.detectChanges();

      expect(component.filas()).toEqual([]);
      expect(pasos(fixture).estado).toBe('error');
      expect(pasos(fixture).errores).toEqual(['No fue posible leer el archivo.']);
    });
  });
});

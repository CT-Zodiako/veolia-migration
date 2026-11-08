import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfCompetidorComponent } from './inf-competidor.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoPasosComponent } from '../../../shared/cargue-archivo-pasos.component';

// Header of public/assets/layout/planos/plano_competidor_mensual.csv (UTF-8 BOM, ';'), linked by InfCompetidorMensual.vue.
const HEADER = '﻿CODAPS;CODEMPRESA;ANNO;MES;CP;MT3AGUA;M2CC;M2LAV;TI;TM;KLP;CBLJ';
const FILA = '1014;1024;2026;1;10;20;30;40;50;60;70;48480.20';

function csv(...rows: string[]): File {
  return new File([[HEADER, ...rows].join('\n')], 'plano_competidor_mensual.csv', { type: 'text/csv' });
}

function setup(aps = 1014, anno = 2026, mes = 1) {
  const service = { setCargueInfCompetidor: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1024, EMPR_NOMBRE: 'COMPETIDOR' }])) };
  TestBed.configureTestingModule({
    imports: [InfCompetidorComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  const fixture = TestBed.createComponent(InfCompetidorComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('mes', mes);
  fixture.detectChanges();
  fixture.componentInstance.empresaSeleccionada.set(1024);
  return { fixture, component: fixture.componentInstance, service, empresas, confirmation };
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

  // cargue-archivos-pasos S2/S3: the native file input, the ⚡ link and the loose Cancelar/Guardar buttons are replaced by
  // the shared guided upload, with the same Plano Guía file.
  it('uses the shared guided upload with the same Plano Guía and no native file input of its own', () => {
    const { fixture } = setup();
    const host = fixture.nativeElement as HTMLElement;

    expect(pasos(fixture).planoGuiaUrl).toBe('assets/layout/planos/plano_competidor_mensual.csv');
    expect(pasos(fixture).accept).toBe('.csv');
    const propios = Array.from(host.querySelectorAll('input[type="file"]')).filter((i) => !i.closest('app-cargue-archivo-pasos'));
    expect(propios).toEqual([]);
    expect(host.textContent).not.toContain('⚡');
  });

  // S3/S5: a valid file is ready in step 3 with its row count and the real destination period (previous month).
  it('reports listo with the row count and the previous month as destination period', async () => {
    const { fixture } = setup(1014, 2026, 1);

    await load(fixture, csv(FILA));

    expect(pasos(fixture).estado).toBe('listo');
    expect(pasos(fixture).resumen?.filas).toBe(1);
    expect(pasos(fixture).periodoDestino).toBe('Diciembre 2025');
    expect(pasos(fixture).guardarLabel).toBe('Guardar Información Competidor');
  });

  // S5: the screen errors are shown once, inside the shared component.
  it('passes the validation errors to the shared component (error estado) and shows them once', async () => {
    const { fixture } = setup(1014, 2026, 1);

    await load(fixture, csv('1014;1024;2025;12;10;20;30;40;50;60;70;1'));

    expect(pasos(fixture).estado).toBe('error');
    expect(pasos(fixture).errores).toEqual(['El AÑO y MES Seleccionado no concuerda con los del archivo!']);
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto.split('El AÑO y MES Seleccionado no concuerda con los del archivo!').length - 1).toBe(1);
  });

  // S5: Guardar of the shared component goes through the existing confirm dialog and save call; then it is cleared.
  it('Guardar of the shared component confirms, saves and clears the upload', async () => {
    const { fixture, component, service, confirmation } = setup(1014, 2026, 1);
    await load(fixture, csv(FILA));

    pasos(fixture).guardar.emit();
    fixture.detectChanges();

    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    expect(service.setCargueInfCompetidor).toHaveBeenCalledTimes(1);
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

  // S5: Cancelar / quitar of the shared component clear the preview like the old Cancelar button.
  it('Cancelar and quitar of the shared component clear the preview', async () => {
    const { fixture, component } = setup(1014, 2026, 1);
    await load(fixture, csv(FILA));

    pasos(fixture).cancelar.emit();
    expect(component.filas()).toEqual([]);

    await load(fixture, csv(FILA));
    pasos(fixture).archivoQuitado.emit();
    fixture.detectChanges();
    expect(component.filas()).toEqual([]);
    expect(pasos(fixture).estado).toBe('vacio');
  });

  // S4: Empresa first — step 2 is disabled with the message until an empresa is selected.
  it('keeps the shared upload disabled until an empresa is selected', () => {
    const { fixture, component } = setup();
    component.empresaSeleccionada.set(null);
    fixture.detectChanges();

    expect(pasos(fixture).disabled).toBe(true);
    expect(pasos(fixture).disabledMessage).toBe('Seleccioná una empresa primero');

    component.empresaSeleccionada.set(1024);
    fixture.detectChanges();
    expect(pasos(fixture).disabled).toBe(false);
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
      const ctx = setup();
      ctx.fixture.detectChanges();
      return ctx;
    }

    it('ignores a parse that completes after Cancelar (no preview, no Guardar)', async () => {
      const { fixture, component } = preparar();
      elegirPorInput(fixture, csv(FILA));
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
        elegirPorInput(fixture, csv(FILA));
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

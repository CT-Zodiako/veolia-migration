import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfCompetidorSemComponent } from './inf-competidor-sem.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoPasosComponent } from '../../../shared/cargue-archivo-pasos.component';

// Header of public/assets/layout/planos/plano_competidor_semestral.csv (';'), linked by InfCompetidorSemestral.vue.
const HEADER = 'CODAPS;CODEMP;ANNO;MES;N;NA;ND;QLU;QNA;QBL;QR;CBLJ;LBL;CRTCOMP;CDFCOMP;QRTZ';
const FILA = '1014;1024;2026;8;1;2;3;4;5;6;7;8;9;10;11;12';

function csv(...rows: string[]): File {
  return new File([[HEADER, ...rows].join('\n')], 'plano_competidor_semestral.csv', { type: 'text/csv' });
}

function setup(aps = 1014, anno = 2026, semestre = 2) {
  const service = { setCargueInfCompetidorSemestral: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1024, EMPR_NOMBRE: 'COMPETIDOR' }])) };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };
  TestBed.configureTestingModule({
    imports: [InfCompetidorSemComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  const fixture = TestBed.createComponent(InfCompetidorSemComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
  fixture.detectChanges();
  fixture.componentInstance.empresaSeleccionada.set(1024);
  return { fixture, component: fixture.componentInstance, confirmation, service, empresas };
}

function pasos(fixture: ReturnType<typeof setup>['fixture']): CargueArchivoPasosComponent {
  return fixture.debugElement.query(By.directive(CargueArchivoPasosComponent)).componentInstance as CargueArchivoPasosComponent;
}

// The file is picked through the shared guided upload (app-cargue-archivo-pasos), like the user does.
async function load(fixture: ReturnType<typeof setup>['fixture'], file: File): Promise<void> {
  const component = fixture.componentInstance;
  fixture.detectChanges();
  pasos(fixture).archivoSeleccionado.emit(file);
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

  it('shows the legacy validation message "La Empresa Seleccionada no concuerda con la Empresa del archivo!"', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1014;9999;2026;8;1;2;3;4;5;6;7;8;9;10;11;12'));

    // Legacy InfCompetidorSemestral.vue:341-346.
    expect(component.errores()).toEqual(['La Empresa Seleccionada no concuerda con la Empresa del archivo!']);
  });
  describe('guided upload (app-cargue-archivo-pasos)', () => {
    it('replaces the native file input and keeps the Plano Guía URL', () => {
      const { fixture } = setup();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const inputs = Array.from(el.querySelectorAll('input[type="file"]'));
      expect(inputs.length).toBe(1);
      expect(inputs[0].closest('app-cargue-archivo-pasos')).not.toBeNull();
      expect(el.querySelector('.descarga-plano')).toBeNull();
      expect(pasos(fixture).planoGuiaUrl).toBe('assets/layout/planos/plano_competidor_semestral.csv');
      // descargas-estandar S3: step 1 offers the same file with the standard download button and its real name.
      expect(pasos(fixture).planoGuiaMeta).toBe('CSV · < 1 KB · 16 columnas');
      expect((fixture.nativeElement as HTMLElement).querySelector('app-boton-descarga a')?.getAttribute('download')).toBe('plano_competidor_semestral.csv');
      expect(pasos(fixture).titulo).toBe('Cargue de Información Competidor Semestral');
      expect(pasos(fixture).accept).toBe('.csv');
    });

  // The native input was disabled until an Empresa was chosen; the guided upload keeps step 2 locked the same way.
  it('keeps the file step disabled with "Seleccioná una empresa primero" until an Empresa is chosen', () => {
    const { fixture, component } = setup();
    component.empresaSeleccionada.set(null);
    fixture.detectChanges();

    expect(pasos(fixture).disabled).toBe(true);
    expect(pasos(fixture).disabledMessage).toBe('Seleccioná una empresa primero');

    component.empresaSeleccionada.set(1024);
    fixture.detectChanges();
    expect(pasos(fixture).disabled).toBe(false);
  });

    it('reports the parsed rows and the destination semester to step 3', async () => {
      const { fixture } = setup();

      await load(fixture, csv(FILA));

      expect(pasos(fixture).estado).toBe('listo');
      expect(pasos(fixture).resumen).toEqual({ filas: 1 });
      expect(pasos(fixture).periodoDestino).toBe('Semestre 2 de 2026 (julio a diciembre)');
      expect(pasos(fixture).guardarLabel).toBe('Guardar Información Competidor');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).not.toBeNull();
    });

    it('saves through the existing confirm dialog when step 3 emits Guardar, then clears the upload', async () => {
      const { fixture, component, confirmation, service } = setup();
      await load(fixture, csv(FILA));

      pasos(fixture).guardar.emit();
      fixture.detectChanges();

      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
      expect(service.setCargueInfCompetidorSemestral).toHaveBeenCalledTimes(1);
      expect(component.estado()).toBe('Información de competidor semestral guardada correctamente.');
      expect(pasos(fixture).estado).toBe('vacio');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).toBeNull();
    });

    it('shows the validation errors once, inside the guided upload', async () => {
      const { fixture } = setup();

      await load(fixture, csv('1014;9999;2026;8;1;2;3;4;5;6;7;8;9;10;11;12'));

      expect(pasos(fixture).estado).toBe('error');
      expect(pasos(fixture).errores).toEqual(['La Empresa Seleccionada no concuerda con la Empresa del archivo!']);
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('.errores-box, p-message[severity="error"]').length).toBe(0);
    });

    it('clears the preview when the guided upload cancels or removes the file', async () => {
      const { fixture, component } = setup();
      await load(fixture, csv(FILA));

      pasos(fixture).cancelar.emit();
      fixture.detectChanges();
      expect(component.filas()).toEqual([]);
      expect(pasos(fixture).estado).toBe('vacio');

      await load(fixture, csv(FILA));
      pasos(fixture).archivoQuitado.emit();
      fixture.detectChanges();
      expect(component.filas()).toEqual([]);
    });
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
      expect(component.procesando()).toBe(true);

      pasos(fixture).onCancelar();
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 300));
      fixture.detectChanges();

      expect(component.filas()).toEqual([]);
      expect(component.procesando()).toBe(false);
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
        await vi.waitFor(() => expect(component.procesando()).toBe(false));
      } finally {
        lectura.mockRestore();
      }
      fixture.detectChanges();

      expect(component.filas()).toEqual([]);
      expect(pasos(fixture).estado).toBe('error');
      expect(pasos(fixture).errores).toEqual(['No fue posible leer el archivo.']);
    });

    it('clears the previous preview as soon as a replacement file starts validating', async () => {
      const { fixture, component } = preparar();
      elegirPorInput(fixture, csv(FILA));
      await vi.waitFor(() => expect(component.filas()).toHaveLength(1));
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).not.toBeNull();

      elegirPorInput(fixture, csv(FILA));

      expect(component.procesando()).toBe(true);
      expect(component.filas()).toEqual([]);
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).toBeNull();
      await vi.waitFor(() => expect(component.filas()).toHaveLength(1));
    });
  });
});

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { InfPropiaSemComponent } from './inf-propia-sem.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { EmpresasService } from '../../../../services/empresas.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoPasosComponent } from '../../../shared/cargue-archivo-pasos.component';

// Header of public/assets/layout/planos/plano_propio_semestral.csv (';'), linked by InfPropiaSemestral.vue.
const HEADER = 'CODAPS;CODEMPRESA;ANNO;MES;QRT;QLU;QNA;QBL;QR;QRS;LBL;VL;ESCE;CTLMX;CPE;NAA;TAFA;CRTPRO;CDFPRO;QRSmunrecp';
const FILA = '1014;1023;2026;3;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16';

function csv(...rows: string[]): File {
  return new File([[HEADER, ...rows].join('\n')], 'plano_propio_semestral.csv', { type: 'text/csv' });
}

function setup(aps = 1014, anno = 2026, semestre = 1) {
  const service = { setCargueInfPropiaSem: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const empresas = { getEmpresasPropias: vi.fn(() => of([{ EMPR_EMPR: 1023, EMPR_NOMBRE: 'VEOLIA PROPIA' }])) };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };
  TestBed.configureTestingModule({
    imports: [InfPropiaSemComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: EmpresasService, useValue: empresas },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  const fixture = TestBed.createComponent(InfPropiaSemComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
  fixture.detectChanges();
  fixture.componentInstance.empresaSeleccionada.set(1023);
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

  it('shows the legacy validation message "Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!"', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1014;1023;2026;7;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16'));

    expect(component.errores()).toEqual(['Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!']);
  });

  // Legacy InfPropiaSemestral.vue:107-206 column order: ..., QRS, QRSmunrecp, LBL, VL, ... CDFPRO.
  it('shows QRSmunrecp right after QRS like legacy', async () => {
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
  it('leaves the unread QRSmunrecp column empty like legacy', async () => {
    const { fixture, component, service } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    const { resumesem } = service.setCargueInfPropiaSem.mock.calls[0][0] as { resumesem: Record<string, unknown>[] };
    expect(resumesem[0]['qrsmunrecp']).toBeUndefined();
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
      expect(pasos(fixture).planoGuiaUrl).toBe('assets/layout/planos/plano_propio_semestral.csv');
      // descargas-estandar S3: step 1 offers the same file with the standard download button and its real name.
      expect(pasos(fixture).planoGuiaMeta).toBe('CSV · < 1 KB · 20 columnas');
      expect((fixture.nativeElement as HTMLElement).querySelector('app-boton-descarga a')?.getAttribute('download')).toBe('plano_propio_semestral.csv');
      expect(pasos(fixture).titulo).toBe('Cargue de Información Propia Semestral');
      expect(pasos(fixture).accept).toBe('.csv');
    });

  // The native input was disabled until an Empresa was chosen; the guided upload keeps step 2 locked the same way.
  it('keeps the file step disabled with "Seleccioná una empresa primero" until an Empresa is chosen', () => {
    const { fixture, component } = setup();
    component.empresaSeleccionada.set(null);
    fixture.detectChanges();

    expect(pasos(fixture).disabled).toBe(true);
    expect(pasos(fixture).disabledMessage).toBe('Seleccioná una empresa primero');

    component.empresaSeleccionada.set(1023);
    fixture.detectChanges();
    expect(pasos(fixture).disabled).toBe(false);
  });

    it('reports the parsed rows and the destination semester to step 3', async () => {
      const { fixture } = setup();

      await load(fixture, csv(FILA));

      expect(pasos(fixture).estado).toBe('listo');
      expect(pasos(fixture).resumen).toEqual({ filas: 1 });
      expect(pasos(fixture).periodoDestino).toBe('Semestre 1 de 2026 (enero a junio)');
      expect(pasos(fixture).guardarLabel).toBe('Guardar Información Propia');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).not.toBeNull();
    });

    it('saves through the existing confirm dialog when step 3 emits Guardar, then clears the upload', async () => {
      const { fixture, component, confirmation, service } = setup();
      await load(fixture, csv(FILA));

      pasos(fixture).guardar.emit();
      fixture.detectChanges();

      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
      expect(service.setCargueInfPropiaSem).toHaveBeenCalledTimes(1);
      expect(component.estado()).toBe('Información propia semestral guardada correctamente.');
      expect(pasos(fixture).estado).toBe('vacio');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).toBeNull();
    });

    it('shows the validation errors once, inside the guided upload', async () => {
      const { fixture } = setup();

      await load(fixture, csv('1014;1023;2026;7;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16'));

      expect(pasos(fixture).estado).toBe('error');
      expect(pasos(fixture).errores).toEqual(['Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!']);
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

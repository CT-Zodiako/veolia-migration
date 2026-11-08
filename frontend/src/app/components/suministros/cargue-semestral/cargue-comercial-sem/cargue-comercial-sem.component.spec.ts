import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { CargueComercialSemComponent } from './cargue-comercial-sem.component';
import { SuministrosService } from '../../../../services/suministros.service';
import { TablaAvanzadaComponent } from '../../../shared/tabla-avanzada.component';
import { CargueArchivoPasosComponent } from '../../../shared/cargue-archivo-pasos.component';

// public/assets/layout/planos/plano_usuarios_semestral.csv (header + sample row), linked by CargueComercialSemestral.vue.
const HEADER = 'CODAPS;NOMAPS;ANNO;SEMESTRE;CODUSO;NOMUSO;COD_FACTOR;NOM_FACT;COD_TIPO;NOM_TIPO;SUS_M1;SUS_M2;SUS_M3;SUS_M4;SUS_M5;SUS_M6;AFO_M1;AFO_M2;AFO_M3;AFO_M4;AFO_M5;AFO_M6';
const FILA = '1024;BARRANCABERMEJA;2020;2;4;ESTRATO 4;1;4;1;TOTALES;6359;6361;6359;6361;6359;6361;0;0;0;0;0;0';

function csv(...rows: string[]): File {
  return new File([[HEADER, ...rows].join('\n')], 'plano_usuarios_semestral.csv', { type: 'text/csv' });
}

function setup(aps = 1024, anno = 2020, semestre = 2) {
  const service = { filecarguecomercialsemestral: vi.fn((_payload: unknown) => of({ data: 1 })) };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };
  TestBed.configureTestingModule({
    imports: [CargueComercialSemComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  const fixture = TestBed.createComponent(CargueComercialSemComponent);
  fixture.componentRef.setInput('aps', aps);
  fixture.componentRef.setInput('anno', anno);
  fixture.componentRef.setInput('semestre', semestre);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, confirmation, service };
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

// Picks a file through the shared component's own hidden input (runs its client checks).
function elegirEnPasos(fixture: ReturnType<typeof setup>['fixture'], file: File): void {
  const input = fixture.debugElement.query(By.directive(CargueArchivoPasosComponent)).nativeElement
    .querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
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

  it('shows the legacy validation message "Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!"', async () => {
    const { fixture, component } = setup();

    await load(fixture, csv('1024;X;2020;1;4;E;1;4;1;T;1;1;1;1;1;1;0;0;0;0;0;0'));

    expect(component.errores()).toEqual(['Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!']);
  });

  // Legacy CargueComercialSemestral.vue:85-224 preview headers.
  it('uses the legacy preview headers Cod. Aps, APS, Año, Semestre, Cod. CU, Nombre CU, ... Sus M1, Afo M1', async () => {
    const { fixture } = setup();
    await load(fixture, csv(FILA));

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.columnas.map((c) => c.header)).toEqual([
      'Cod. Aps', 'APS', 'Año', 'Semestre', 'Cod. CU', 'Nombre CU', 'Cod. Factor', 'Nom. Factor', 'Cod. Tipo', 'Nom. Tipo',
      'Sus M1', 'Sus M2', 'Sus M3', 'Sus M4', 'Sus M5', 'Sus M6', 'Afo M1', 'Afo M2', 'Afo M3', 'Afo M4', 'Afo M5', 'Afo M6'
    ]);
  });

  // CargueService.js:31-36 toasts "Guardado Correctamente".
  it('shows the legacy success message "Guardado Correctamente"', async () => {
    const { fixture, component } = setup();
    await load(fixture, csv(FILA));

    component.guardar();

    expect(component.estado()).toBe('Guardado Correctamente');
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
      expect(pasos(fixture).planoGuiaUrl).toBe('assets/layout/planos/plano_usuarios_semestral.csv');
      expect(pasos(fixture).titulo).toBe('Cargue de Información de Usuarios Semestral');
      expect(pasos(fixture).accept).toBe('.csv');
    });

    it('reports the parsed rows and the destination semester to step 3', async () => {
      const { fixture } = setup();

      await load(fixture, csv(FILA));

      expect(pasos(fixture).estado).toBe('listo');
      expect(pasos(fixture).resumen).toEqual({ filas: 1 });
      expect(pasos(fixture).periodoDestino).toBe('Semestre 2 de 2020 (julio a diciembre)');
      expect(pasos(fixture).guardarLabel).toBe('Guardar Información de Usuarios');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).not.toBeNull();
    });

    it('saves through the existing confirm dialog when step 3 emits Guardar, then clears the upload', async () => {
      const { fixture, component, confirmation, service } = setup();
      await load(fixture, csv(FILA));

      pasos(fixture).guardar.emit();
      fixture.detectChanges();

      expect(confirmation.confirm).toHaveBeenCalledTimes(1);
      expect(service.filecarguecomercialsemestral).toHaveBeenCalledTimes(1);
      expect(component.estado()).toBe('Guardado Correctamente');
      expect(pasos(fixture).estado).toBe('vacio');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).toBeNull();
    });

    it('shows the validation errors once, inside the guided upload', async () => {
      const { fixture } = setup();

      await load(fixture, csv('1024;X;2020;1;4;E;1;4;1;T;1;1;1;1;1;1;0;0;0;0;0;0'));

      expect(pasos(fixture).estado).toBe('error');
      expect(pasos(fixture).errores).toEqual(['Existen meses fuera del rango del semestre Seleccionado no concuerda con los del archivo!']);
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('.errores-box, p-message[severity="error"]').length).toBe(0);
    });

    // cargue-archivos-pasos: a replacement rejected by the client checks also drops the previous preview and Guardar.
    it('a rejected replacement (empty file) clears the previous preview', async () => {
      const { fixture, component } = setup();
      elegirEnPasos(fixture, csv(FILA));
      await vi.waitFor(() => expect(component.filas()).toHaveLength(1));
      fixture.detectChanges();

      elegirEnPasos(fixture, new File([], 'plano_usuarios_semestral.csv'));

      expect(component.filas()).toEqual([]);
      expect(pasos(fixture).estado).toBe('vacio');
      expect(fixture.debugElement.query(By.directive(TablaAvanzadaComponent))).toBeNull();
      expect((fixture.nativeElement as HTMLElement).querySelector('.msg-error')!.textContent).toContain('El archivo está vacío');
    });

    it('a headers-only CSV keeps showing "El archivo no tiene filas de datos." (pinned for the other screens)', async () => {
      const { fixture, component } = setup();
      elegirEnPasos(fixture, csv());
      await vi.waitFor(() => expect(component.procesando()).toBe(false));
      fixture.detectChanges();

      expect(pasos(fixture).estado).toBe('error');
      expect(pasos(fixture).errores).toEqual(['El archivo no tiene filas de datos.']);
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

import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CargueArchivoPasosComponent } from '../shared/cargue-archivo-pasos.component';
import { ConfirmationService } from 'primeng/api';
import { SuiCargueComplementarioComponent } from './sui-cargue-complementario.component';
import { SuiIntegracionService } from '../../services/sui-integracion.service';

const F35_F36 = ['F35_CAMRERS', 'F35_QRS_MES', 'F35_DISPALT9', 'F35_INCCDFALT9', 'F35_PRCTCRRCP', 'F35_V0', 'F35_VM',
  'F35_MCRS', 'F35_ICRSM', 'F35_ICCRS', 'F35_FREIN', 'F35_CAPPERDF', 'F36_VL_MES'];

function filaCsv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    APSA_ID: '7', COM_ANNO: '2025', COM_MES: '3',
    F24_DET: '1.5', F24_F1ET: '', F24_CPEET: '', F24_PRTZET: '', F24_CEG: '',
    ...Object.fromEntries(F35_F36.map((c) => [c, ''])),
    ...extra
  };
}

function crear(render = false) {
  const setCargueInfComplemento = vi.fn((_payload: unknown) => of({ guardado: true, filasAfectadas: 1 }));
  const existenArchivosGenerados = vi.fn(() => of({ existen: false, cantidad: 0 }));
  const confirm = vi.fn((opts: { accept: () => void }) => opts.accept());
  TestBed.configureTestingModule({
    imports: [SuiCargueComplementarioComponent],
    providers: [
      { provide: SuiIntegracionService, useValue: { setCargueInfComplemento, existenArchivosGenerados } },
      { provide: ConfirmationService, useValue: { confirm } }
    ]
  });
  TestBed.overrideComponent(SuiCargueComplementarioComponent, render
    ? { set: { imports: [CommonModule, CargueArchivoPasosComponent], schemas: [NO_ERRORS_SCHEMA] } }
    : { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(SuiCargueComplementarioComponent);
  const component = fixture.componentInstance;
  component.aps.set(7);
  component.anno.set(2025);
  component.mes.set(3);
  const procesarCsv = (rows: Record<string, string>[]) => (component as unknown as { procesarCsv(r: unknown[]): void }).procesarCsv(rows);
  return { fixture, component, procesarCsv, setCargueInfComplemento, confirm };
}

function csvFile(filas: Record<string, string>[]): File {
  const headers = Object.keys(filas[0]);
  const lineas = [headers.join(','), ...filas.map((f) => headers.map((h) => f[h]).join(','))];
  return new File([lineas.join('\n')], 'complemento.csv', { type: 'text/csv' });
}

/** Picks a file through the shared component's own hidden input (runs its client checks). */
function elegirEnPasos(pasosEl: HTMLElement, file: File): void {
  const input = pasosEl.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

/** Renders the real template with the form visible (filters set, no generated files). */
function crearRenderizado() {
  const ctx = crear(true);
  ctx.component.archivosExistentes.set(false);
  ctx.fixture.detectChanges();
  const pasos = () => ctx.fixture.debugElement.query(By.directive(CargueArchivoPasosComponent));
  const el = ctx.fixture.nativeElement as HTMLElement;
  return { ...ctx, el, pasos };
}

describe('SuiCargueComplementarioComponent (802)', () => {
  // S6 — legacy CargueComplemento.vue:142-167 compares COM_ANNO/COM_MES with the SELECTED month (stDate)...
  it('accepts a file whose año/mes is the selected month', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv()]);

    expect(component.errores()).toEqual([]);
    expect(component.filas()).toHaveLength(1);
  });

  it('rejects a file whose año/mes is not the selected month (month - 1 included)', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv({ COM_MES: '2' })]);

    expect(component.errores()).toEqual(['Fila 1: el año/mes del archivo (2025/2) no coincide con el período seleccionado.']);
    expect(component.filas()).toEqual([]);
  });

  // cargue-archivos-pasos: a headers-only file is an error like in the semestral screens, not a silent reset.
  it('rejects a file with headers and no data rows', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([]);

    expect(component.errores()).toEqual(['El archivo no tiene filas de datos.']);
    expect(component.filas()).toEqual([]);
    expect(component.estadoCargue()).toBe('error');
    expect(component.hayPreview()).toBe(false);
  });

  it('still rejects a file for another APS', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv({ APSA_ID: '8' })]);

    expect(component.errores()).toEqual(['Fila 1: el APS del archivo (8) no coincide con el APS seleccionado.']);
  });

  // S5 — F35/F36 only apply to APS with own relleno; legacy sent them as TO_NUMBER(null).
  it('accepts blank F35/F36 values', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv()]);

    expect(component.errores()).toEqual([]);
  });

  it('rejects a non-numeric value instead of silently storing NULL', () => {
    const { component, procesarCsv } = crear();

    procesarCsv([filaCsv({ F35_V0: 'abc' })]);

    expect(component.errores()).toEqual(['Fila 1: el valor de V0 (abc) no es numérico.']);
  });

  // S6 save period + S5 nulls + S2 no usuario in the body (legacy :68-82 saved under stDate - 1 month).
  it('saves under the selected month - 1, with NULL for blank values and without a usuario field', () => {
    const { component, procesarCsv, setCargueInfComplemento, confirm } = crear();
    procesarCsv([filaCsv({ F35_V0: '4.5' })]);

    component.guardar();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(setCargueInfComplemento).toHaveBeenCalledTimes(1);
    const payload = setCargueInfComplemento.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toEqual({
      aps: 7, anno: 2025, mes: 2,
      filas: [{
        aps: 7, det: 1.5, f1et: null, cpeet: null, prtzet: null, ceg: null,
        camrers: null, inccdfalt9: null, prctcrrcp: null, v0: 4.5, vm: null, mcrs: null, icrsm: null, iccrs: null,
        frein: null, capperdf: null, qrsMes: null, dispalt9: null, vlMes: null
      }]
    });
    expect('usuario' in payload).toBe(false);
  });

  it('saves January files under December of the previous year', () => {
    const { component, procesarCsv, setCargueInfComplemento } = crear();
    component.mes.set(1);
    procesarCsv([filaCsv({ COM_MES: '1' })]);

    component.guardar();

    expect(setCargueInfComplemento).toHaveBeenCalledWith(expect.objectContaining({ anno: 2024, mes: 12 }));
  });

  // S2/S3/S5 — guided upload (shared app-cargue-archivo-pasos) replaces the native input, same behavior.
  describe('guided upload (app-cargue-archivo-pasos)', () => {
    it('renders the shared component with the same Plano Guía and no native file input of its own', () => {
      const { el, pasos } = crearRenderizado();

      expect(pasos()).not.toBeNull();
      const cargue = pasos().componentInstance as CargueArchivoPasosComponent;
      expect(cargue.planoGuiaUrl).toBe('assets/layout/planos/sui_complemento.csv');
      // descargas-estandar S3: step 1 offers the same file with the standard download button and its real name.
      expect(cargue.planoGuiaMeta).toBe('CSV · < 1 KB · 21 columnas');
      expect((el as HTMLElement).querySelector('app-boton-descarga a')?.getAttribute('download')).toBe('sui_complemento.csv');
      expect(cargue.accept).toBe('.csv');
      expect(cargue.disabled).toBe(false);
      // The only file input is the shared component's hidden one.
      const inputs = el.querySelectorAll('input[type="file"]');
      expect(inputs.length).toBe(1);
      expect(pasos().nativeElement.contains(inputs[0])).toBe(true);
      expect(el.textContent).not.toContain('⚡');
    });

    it('picking a file through the component parses it and shows the preview with rows, columns and destination period', async () => {
      const { fixture, component, el, pasos } = crearRenderizado();

      (pasos().componentInstance as CargueArchivoPasosComponent).archivoSeleccionado.emit(csvFile([filaCsv(), filaCsv()]));
      await vi.waitFor(() => expect(component.filas()).toHaveLength(2));
      fixture.detectChanges();

      const cargue = pasos().componentInstance as CargueArchivoPasosComponent;
      expect(cargue.estado).toBe('listo');
      expect(cargue.resumen).toEqual({ filas: 2, columnas: 21, columnasEsperadas: 21 });
      expect(cargue.periodoDestino).toBe('Febrero 2025');
      expect(component.nombreArchivo()).toBe('complemento.csv');
      expect(el.querySelector('app-tabla-avanzada')).not.toBeNull();
    });

    it('validation errors go to the component error list only (not duplicated in the screen)', async () => {
      const { fixture, component, el, pasos } = crearRenderizado();

      (pasos().componentInstance as CargueArchivoPasosComponent).archivoSeleccionado.emit(csvFile([filaCsv({ APSA_ID: '8' })]));
      await vi.waitFor(() => expect(component.errores()).toHaveLength(1));
      fixture.detectChanges();

      const cargue = pasos().componentInstance as CargueArchivoPasosComponent;
      expect(cargue.estado).toBe('error');
      expect(cargue.errores).toEqual(['Fila 1: el APS del archivo (8) no coincide con el APS seleccionado.']);
      expect(el.querySelector('.errores-box')).toBeNull();
      expect(el.querySelector('app-tabla-avanzada')).toBeNull();
    });

    it('Guardar from the component goes through the confirm and saves under month - 1, then clears', () => {
      const { fixture, component, procesarCsv, pasos, confirm, setCargueInfComplemento } = crearRenderizado();
      procesarCsv([filaCsv()]);
      fixture.detectChanges();

      (pasos().componentInstance as CargueArchivoPasosComponent).guardar.emit();
      fixture.detectChanges();

      expect(confirm).toHaveBeenCalledTimes(1);
      expect(setCargueInfComplemento).toHaveBeenCalledWith(expect.objectContaining({ aps: 7, anno: 2025, mes: 2 }));
      expect(component.filas()).toEqual([]);
      expect((pasos().componentInstance as CargueArchivoPasosComponent).estado).toBe('vacio');
      expect(component.estado()).toBe('Información guardada correctamente: 1 fila(s) afectada(s).');
    });

    it('a headers-only CSV picked through the component shows the error state without Guardar', async () => {
      const { fixture, component, pasos } = crearRenderizado();
      const soloEncabezados = new File([Object.keys(filaCsv()).join(',') + '\n'], 'complemento.csv', { type: 'text/csv' });

      elegirEnPasos(pasos().nativeElement, soloEncabezados);
      await vi.waitFor(() => expect(component.validando()).toBe(false));
      fixture.detectChanges();

      const cargue = pasos().componentInstance as CargueArchivoPasosComponent;
      expect(cargue.estado).toBe('error');
      expect(cargue.errores).toEqual(['El archivo no tiene filas de datos.']);
      expect((pasos().nativeElement as HTMLElement).querySelector('button.btn-guardar')).toBeNull();
    });

    it('a rejected replacement (wrong extension) clears the previous preview', async () => {
      const { fixture, component, el, pasos } = crearRenderizado();
      elegirEnPasos(pasos().nativeElement, csvFile([filaCsv()]));
      await vi.waitFor(() => expect(component.filas()).toHaveLength(1));
      fixture.detectChanges();

      elegirEnPasos(pasos().nativeElement, new File(['x'], 'complemento.xlsx'));
      fixture.detectChanges();

      expect(component.filas()).toEqual([]);
      expect(component.nombreArchivo()).toBe('');
      expect(el.querySelector('app-tabla-avanzada')).toBeNull();
      expect((pasos().nativeElement as HTMLElement).querySelector('.msg-error')!.textContent).toContain('El archivo no es CSV');
    });

    it('Cancelar or quitar from the component clears the loaded file', () => {
      const { fixture, component, procesarCsv, pasos } = crearRenderizado();
      procesarCsv([filaCsv()]);
      fixture.detectChanges();

      (pasos().componentInstance as CargueArchivoPasosComponent).cancelar.emit();
      expect(component.filas()).toEqual([]);

      procesarCsv([filaCsv()]);
      (pasos().componentInstance as CargueArchivoPasosComponent).archivoQuitado.emit();
      expect(component.filas()).toEqual([]);
    });

    // cargue-archivos-pasos L5: a parse that finishes after Cancelar is stale and must not bring back Guardar.
    it('ignores a parse that completes after Cancelar (no preview, no Guardar)', async () => {
      const { fixture, component, pasos } = crearRenderizado();
      elegirEnPasos(pasos().nativeElement, csvFile([filaCsv()]));
      fixture.detectChanges();
      expect(component.validando()).toBe(true);

      (pasos().componentInstance as CargueArchivoPasosComponent).onCancelar();
      fixture.detectChanges();
      await new Promise((r) => setTimeout(r, 300));
      fixture.detectChanges();

      expect(component.filas()).toEqual([]);
      expect(component.validando()).toBe(false);
      expect((pasos().componentInstance as CargueArchivoPasosComponent).estado).toBe('vacio');
      expect((pasos().nativeElement as HTMLElement).querySelector('button.btn-guardar')).toBeNull();
    });

    it('shows "No fue posible leer el archivo." when the file cannot be read', async () => {
      const { fixture, component, pasos } = crearRenderizado();
      const lectura = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: FileReader) {
        setTimeout(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>));
      });
      try {
        elegirEnPasos(pasos().nativeElement, csvFile([filaCsv()]));
        await vi.waitFor(() => expect(component.validando()).toBe(false));
      } finally {
        lectura.mockRestore();
      }
      fixture.detectChanges();

      const cargue = pasos().componentInstance as CargueArchivoPasosComponent;
      expect(cargue.estado).toBe('error');
      expect(cargue.errores).toEqual(['No fue posible leer el archivo.']);
    });
  });
});

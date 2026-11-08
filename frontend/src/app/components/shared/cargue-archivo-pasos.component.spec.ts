import { TestBed } from '@angular/core/testing';
import { CargueArchivoPasosComponent } from './cargue-archivo-pasos.component';

// No legacy equivalent: the legacy upload screens used a bare <input type="file">. These tests pin the
// shared guided-steps UI (design/cargue-archivos/03-pasos-guiados.html) and its client checks.

function setup(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ imports: [CargueArchivoPasosComponent] });
  const fixture = TestBed.createComponent(CargueArchivoPasosComponent);
  fixture.componentRef.setInput('planoGuiaUrl', 'assets/layout/planos/plano_usuarios.csv');
  Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const seleccionados: File[] = [];
  let quitados = 0;
  let cancelados = 0;
  component.archivoSeleccionado.subscribe((f) => seleccionados.push(f));
  component.archivoQuitado.subscribe(() => quitados++);
  component.cancelar.subscribe(() => cancelados++);
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    component,
    el,
    seleccionados,
    quitados: () => quitados,
    cancelados: () => cancelados
  };
}

function csv(nombre = 'datos.csv', contenido = 'A,B\n1,2'): File {
  return new File([contenido], nombre, { type: 'text/csv' });
}

function elegir(el: HTMLElement, file: File): void {
  const input = el.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
}

function dragEvent(tipo: string, files: File[] = []): Event {
  const ev = new Event(tipo, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: { types: ['Files'], files } });
  return ev;
}

describe('CargueArchivoPasosComponent', () => {
  it('renders the 3 steps and the Plano Guía link with the given URL', () => {
    const { el } = setup();
    const pasos = el.querySelectorAll('ol.steps > li.step');
    expect(pasos.length).toBe(3);
    expect(pasos[0].textContent).toContain('Descargar plano guía');
    expect(pasos[1].textContent).toContain('Seleccionar archivo');
    expect(pasos[2].textContent).toContain('Revisar y cargar');
    const link = el.querySelector('a.plano-guia') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('assets/layout/planos/plano_usuarios.csv');
    expect(link.textContent).toContain('Descargar Plano Guía');
    expect(el.querySelector('.pi-download')).not.toBeNull();
  });

  it('picking a valid .csv emits archivoSeleccionado and shows the name/size chip', () => {
    const { el, fixture, seleccionados } = setup();
    const file = csv('usuarios_2026.csv');
    elegir(el, file);
    fixture.detectChanges();
    expect(seleccionados).toEqual([file]);
    const chip = el.querySelector('.file-tile') as HTMLElement;
    expect(chip.textContent).toContain('usuarios_2026.csv');
    expect(chip.textContent).toContain('7 B');
  });

  it('a non-.csv file shows an error with a Plano Guía link and does not emit', () => {
    const { el, fixture, seleccionados } = setup();
    elegir(el, new File(['x'], 'datos.xlsx'));
    fixture.detectChanges();
    expect(seleccionados).toEqual([]);
    const msg = el.querySelector('.msg-error') as HTMLElement;
    expect(msg.textContent).toContain('El archivo no es CSV');
    expect(msg.textContent).toContain('datos.xlsx');
    expect((msg.querySelector('a.plano-guia') as HTMLAnchorElement).getAttribute('href'))
      .toBe('assets/layout/planos/plano_usuarios.csv');
    expect(el.querySelector('li.step.is-error')).not.toBeNull();
  });

  it('an empty (0 bytes) file shows an error and does not emit', () => {
    const { el, fixture, seleccionados } = setup();
    elegir(el, csv('vacio.csv', ''));
    fixture.detectChanges();
    expect(seleccionados).toEqual([]);
    expect(el.querySelector('.msg-error')!.textContent).toContain('El archivo está vacío');
  });

  it('adds the drag-over class on dragenter and selects the dropped file', () => {
    const { el, fixture, seleccionados } = setup();
    const zona = el.querySelector('.drop-zone') as HTMLElement;
    zona.dispatchEvent(dragEvent('dragenter'));
    fixture.detectChanges();
    expect(zona.classList).toContain('is-over');
    expect(zona.textContent).toContain('Soltá el archivo');

    const file = csv();
    zona.dispatchEvent(dragEvent('drop', [file]));
    fixture.detectChanges();
    expect(seleccionados).toEqual([file]);
    expect(el.querySelector('.drop-zone.is-over')).toBeNull();
  });

  it('disabled shows the message and blocks picking and dropping', () => {
    const { el, fixture, seleccionados } = setup({ disabled: true });
    expect(el.textContent).toContain('Seleccioná una empresa primero');
    const zona = el.querySelector('.drop-zone') as HTMLButtonElement;
    expect(zona.disabled).toBe(true);
    expect((el.querySelector('input[type="file"]') as HTMLInputElement).disabled).toBe(true);
    zona.dispatchEvent(dragEvent('drop', [csv()]));
    elegir(el, csv());
    fixture.detectChanges();
    expect(seleccionados).toEqual([]);
  });

  it('quitar emits archivoQuitado and goes back to the empty drop zone', () => {
    const { el, fixture, quitados } = setup();
    elegir(el, csv());
    fixture.detectChanges();
    (el.querySelector('button[aria-label^="Quitar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(quitados()).toBe(1);
    expect(el.querySelector('.file-tile')).toBeNull();
    expect(el.querySelector('.drop-zone')).not.toBeNull();
  });

  // Keyboard users keep their place: the removed chip's button is gone, so focus goes to the drop zone.
  it('after Quitar or Cancelar the focus moves to the drop zone', () => {
    const { el, fixture } = setup();
    elegir(el, csv());
    fixture.detectChanges();
    (el.querySelector('button[aria-label^="Quitar"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(el.querySelector('.drop-zone'));

    (document.activeElement as HTMLElement).blur();
    elegir(el, csv());
    fixture.componentRef.setInput('estado', 'validando');
    fixture.detectChanges();
    (el.querySelector('button.btn-inline') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(el.querySelector('.drop-zone'));
  });

  it('reset() clears the file and the client error', () => {
    const { el, fixture, component } = setup();
    elegir(el, new File(['x'], 'a.txt'));
    fixture.detectChanges();
    expect(el.querySelector('.msg-error')).not.toBeNull();
    component.reset();
    fixture.detectChanges();
    expect(el.querySelector('.msg-error')).toBeNull();
    expect(el.querySelector('.file-tile')).toBeNull();
  });

  it('estado changing back to vacio clears the chosen file (screens clear after save)', () => {
    const { el, fixture } = setup();
    elegir(el, csv());
    fixture.componentRef.setInput('estado', 'listo');
    fixture.detectChanges();
    expect(el.querySelector('.file-tile')).not.toBeNull();
    fixture.componentRef.setInput('estado', 'vacio');
    fixture.detectChanges();
    expect(el.querySelector('.file-tile')).toBeNull();
  });

  it('listo shows the summary and destination period; cancelar emits and guardar emits', () => {
    const { el, fixture, component, cancelados } = setup({ periodoDestino: '2026-09 (mes anterior)' });
    let guardados = 0;
    component.guardar.subscribe(() => guardados++);
    elegir(el, csv());
    fixture.componentRef.setInput('estado', 'listo');
    fixture.componentRef.setInput('resumen', { filas: 12, columnas: 21 });
    fixture.detectChanges();
    const paso3 = el.querySelectorAll('li.step')[2] as HTMLElement;
    expect(paso3.textContent).toContain('12');
    expect(paso3.textContent).toContain('21');
    expect(paso3.textContent).toContain('2026-09 (mes anterior)');
    (paso3.querySelector('button.btn-guardar') as HTMLButtonElement).click();
    expect(guardados).toBe(1);
    (paso3.querySelector('button.btn-cancelar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cancelados()).toBe(1);
    expect(el.querySelector('.file-tile')).toBeNull();
  });

  // A rejected replacement must also drop the previous file in the screen (its preview and Guardar).
  it('rejecting a replacement of an already selected file shows the error and emits archivoQuitado', () => {
    const { el, fixture, quitados } = setup();
    elegir(el, csv());
    fixture.componentRef.setInput('estado', 'listo');
    fixture.detectChanges();

    elegir(el, new File(['x'], 'datos.xlsx'));
    fixture.detectChanges();
    expect(el.querySelector('.msg-error')!.textContent).toContain('El archivo no es CSV');
    expect(quitados()).toBe(1);

    // The screen clears in response (estado back to vacio): the client error stays visible.
    fixture.componentRef.setInput('estado', 'vacio');
    fixture.detectChanges();
    expect(el.querySelector('.msg-error')!.textContent).toContain('El archivo no es CSV');

    elegir(el, csv('vacio.csv', ''));
    fixture.detectChanges();
    expect(el.querySelector('.msg-error')!.textContent).toContain('El archivo está vacío');
  });

  it('a rejected file with nothing selected before does not emit archivoQuitado', () => {
    const { el, fixture, quitados } = setup();
    elegir(el, csv('vacio.csv', ''));
    fixture.detectChanges();
    expect(quitados()).toBe(0);
  });

  it('error estado lists the screen errors in step 2', () => {
    const { el, fixture } = setup();
    elegir(el, csv());
    fixture.componentRef.setInput('estado', 'error');
    fixture.componentRef.setInput('errores', ['El APS Seleccionado no concuerda con el APS del archivo!']);
    fixture.detectChanges();
    expect(el.querySelector('.msg-error')!.textContent).toContain('El APS Seleccionado no concuerda');
  });
});

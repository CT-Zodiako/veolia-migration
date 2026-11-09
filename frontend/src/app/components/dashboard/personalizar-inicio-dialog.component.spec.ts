import { TestBed } from '@angular/core/testing';
import { PersonalizarInicioDialogComponent } from './personalizar-inicio-dialog.component';

// No legacy counterpart: legacy Inicio (front-tarificador/src/views/Home.vue) was an empty card, so there is no legacy
// customization dialog. These tests pin the new behavior; the dialog only lists the permitted options it receives
// (legacy permission rule, front-tarificador/src/service/MenuService.js:655-671, applied by DashboardComponent).

const disponibles = [
  { label: 'Usuarios', path: '/usuarios', icon: 'users', grupo: 'Configuración' },
  { label: 'Detallado Tarifas', path: '/tarifas', icon: 'file-text', grupo: 'Informes Comerciales' },
  { label: 'Verificación', path: '/suministros/verificacion', icon: 'search-check', grupo: 'Suministros' }
];

function abrir(seleccionadosIniciales: string[]) {
  TestBed.configureTestingModule({ imports: [PersonalizarInicioDialogComponent] });
  const fixture = TestBed.createComponent(PersonalizarInicioDialogComponent);
  fixture.componentRef.setInput('disponibles', disponibles);
  fixture.componentRef.setInput('seleccionadosIniciales', seleccionadosIniciales);
  fixture.componentRef.setInput('visible', true);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

describe('PersonalizarInicioDialogComponent (new, no legacy counterpart)', () => {
  it('lists only the received options with their menu group and preselects the current shortcuts when opened', () => {
    const { fixture, component } = abrir(['/tarifas', '/no-permitida']);

    expect(component.seleccionados.map((s) => s.path)).toEqual(['/tarifas']);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Personalizar accesos');
    const filas = Array.from(el.querySelectorAll('.opcion-check') as NodeListOf<HTMLElement>);
    expect(filas.map((f) => [f.querySelector('.opcion-titulo')?.textContent?.trim(), f.querySelector('.opcion-grupo')?.textContent?.trim()]))
      .toEqual(disponibles.map((d) => [d.label, d.grupo]));
    const marcados = filas.map((f) => (f.querySelector('input[type=checkbox]') as HTMLInputElement).checked);
    expect(marcados).toEqual([false, true, false]);
    fixture.destroy();
  });

  it('closes without emitting on Cancelar', () => {
    const { fixture, component } = abrir(['/tarifas']);
    const guardar = vi.fn();
    const visible = vi.fn();
    component.guardar.subscribe(guardar);
    component.visibleChange.subscribe(visible);

    const cancelar = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.trim() === 'Cancelar')!;
    cancelar.click();

    expect(guardar).not.toHaveBeenCalled();
    expect(visible).toHaveBeenCalledWith(false);
    fixture.destroy();
  });

  it('emits the selected paths in toggle order and closes on Guardar', () => {
    const { fixture, component } = abrir(['/tarifas']);
    const guardar = vi.fn();
    const visible = vi.fn();
    component.guardar.subscribe(guardar);
    component.visibleChange.subscribe(visible);

    component.toggle(disponibles[0]);
    component.toggle(disponibles[1]);
    component.confirmar();

    expect(guardar).toHaveBeenCalledWith(['/usuarios']);
    expect(visible).toHaveBeenCalledWith(false);
    fixture.destroy();
  });

  it('selects all / none', () => {
    const { fixture, component } = abrir([]);

    component.seleccionarTodas();
    expect(component.seleccionados.map((s) => s.path)).toEqual(disponibles.map((d) => d.path));
    component.seleccionarNinguna();
    expect(component.seleccionados).toEqual([]);
    fixture.destroy();
  });
});

import { TestBed } from '@angular/core/testing';
import { PersonalizarInicioDialogComponent } from './personalizar-inicio-dialog.component';

// No legacy counterpart: legacy Inicio (front-tarificador/src/views/Home.vue) was an empty card, so there is no legacy
// customization dialog. These tests pin the new behavior; the dialog only lists the permitted options it receives
// (legacy permission rule, front-tarificador/src/service/MenuService.js:655-671, applied by DashboardComponent).

const disponibles = [
  { label: 'Usuarios', path: '/usuarios', icon: 'users' },
  { label: 'Detallado Tarifas', path: '/tarifas', icon: 'file-text' },
  { label: 'Verificación', path: '/suministros/verificacion', icon: 'search-check' }
];

function abrir(seleccionadosIniciales: string[]) {
  TestBed.configureTestingModule({ imports: [PersonalizarInicioDialogComponent] });
  const fixture = TestBed.createComponent(PersonalizarInicioDialogComponent);
  fixture.componentRef.setInput('disponibles', disponibles);
  fixture.componentRef.setInput('seleccionadosIniciales', seleccionadosIniciales);
  fixture.componentRef.setInput('columnas', 4);
  fixture.componentRef.setInput('visible', true);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance };
}

describe('PersonalizarInicioDialogComponent (new, no legacy counterpart)', () => {
  it('lists only the received options and preselects the current shortcuts when opened', () => {
    const { fixture, component } = abrir(['/tarifas', '/no-permitida']);

    expect(component.seleccionados.map((s) => s.path)).toEqual(['/tarifas']);
    const texto = document.body.textContent as string;
    expect(texto).toContain('Accesos disponibles (1 de 3)');
    for (const item of disponibles) expect(texto).toContain(item.label);
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

  it('selects all / none and offers 3 to 6 grid columns', () => {
    const { fixture, component } = abrir([]);
    const columnas = vi.fn();
    component.columnasChange.subscribe(columnas);

    component.seleccionarTodas();
    expect(component.seleccionados.map((s) => s.path)).toEqual(disponibles.map((d) => d.path));
    component.seleccionarNinguna();
    expect(component.seleccionados).toEqual([]);

    expect(component.columnasOpciones).toEqual([3, 4, 5, 6]);
    component.onColumnasChange(5);
    expect(columnas).toHaveBeenCalledWith(5);
    expect(component.columnas).toBe(5);
    fixture.destroy();
  });
});

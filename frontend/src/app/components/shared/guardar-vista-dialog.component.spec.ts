import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GuardarVistaDialogComponent } from './guardar-vista-dialog.component';

// No legacy equivalent: legacy grids (e.g. front-tarificador/src/components/GenericTable.vue) had no saved views.
// These tests pin the current behavior of the "Guardar vista" dialog used by tabla-avanzada.

function setup() {
  TestBed.configureTestingModule({ imports: [GuardarVistaDialogComponent] });
  TestBed.overrideComponent(GuardarVistaDialogComponent, { set: { template: '', imports: [] } });
  const component = TestBed.createComponent(GuardarVistaDialogComponent).componentInstance;
  const guardados: string[] = [];
  const visibles: boolean[] = [];
  component.guardar.subscribe(n => guardados.push(n));
  component.visibleChange.subscribe(v => visibles.push(v));
  return { component, guardados, visibles };
}

describe('GuardarVistaDialogComponent (no legacy equivalent — pinned)', () => {
  it('emits the trimmed name and closes on confirm', () => {
    const { component, guardados, visibles } = setup();
    component.visible = true;
    component.nombre = '  Solo lo esencial  ';
    component.confirmar();
    expect(guardados).toEqual(['Solo lo esencial']);
    expect(visibles).toEqual([false]);
    expect(component.visible).toBe(false);
  });

  it('ignores a blank name and stays open', () => {
    const { component, guardados, visibles } = setup();
    component.visible = true;
    component.nombre = '   ';
    component.confirmar();
    expect(guardados).toEqual([]);
    expect(visibles).toEqual([]);
  });

  it('clears the name each time it opens', () => {
    const { component } = setup();
    component.nombre = 'anterior';
    component.visible = true;
    component.ngOnChanges({ visible: new SimpleChange(false, true, false) });
    expect(component.nombre).toBe('');
  });

  it('cancel closes without saving', () => {
    const { component, guardados, visibles } = setup();
    component.nombre = 'algo';
    component.cerrar();
    expect(guardados).toEqual([]);
    expect(visibles).toEqual([false]);
  });
});

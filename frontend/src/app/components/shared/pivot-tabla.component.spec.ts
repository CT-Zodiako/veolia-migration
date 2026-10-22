import { TestBed } from '@angular/core/testing';
import { PivotTablaComponent } from './pivot-tabla.component';
import { PivotColumnDef } from '../../shared/pivot.util';

// Legacy: front-tarificador/src/lib/TablaPivot.vue (+ ModalPivoy.vue, SelectorOperacion.vue). "Pivotar" disabled
// without data (:4-10), groupings/operation fields added once each (:129-140), pivot with no grouping restores
// (:156-159), aggregation functions Suma/Promedio/Conteo/Máximo/Mínimo (SelectorOperacion.vue:19-23), restore resets
// everything (:263-277), paginator 10 rows, 5 when pivoted (:20-21,160,276), top-level columns = group keys first (:247-256).

const COLS: PivotColumnDef[] = [
  { field: 'VALOR', headerName: 'Valor', agrupable: false },
  { field: 'APS', headerName: 'APS', agrupable: true },
  { field: 'ANNO', headerName: 'Año', agrupable: true }
];
const DATOS = [
  { ANNO: 2025, APS: 'Norte', VALOR: 10 },
  { ANNO: 2025, APS: 'Sur', VALOR: 20 },
  { ANNO: 2026, APS: 'Norte', VALOR: 5 }
];

function setup(datos: Record<string, unknown>[] = DATOS, render = false) {
  TestBed.configureTestingModule({ imports: [PivotTablaComponent] });
  if (!render) TestBed.overrideComponent(PivotTablaComponent, { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(PivotTablaComponent);
  fixture.componentRef.setInput('datos', datos);
  fixture.componentRef.setInput('columnas', COLS);
  return { fixture, component: fixture.componentInstance };
}

describe('PivotTablaComponent (legacy lib/TablaPivot.vue)', () => {
  // Legacy SelectorOperacion.vue:19-23.
  it('offers the legacy aggregation functions, Suma by default', () => {
    const { component } = setup();
    expect(component.funciones.map(f => [f.label, f.value])).toEqual([
      ['Suma', 'sum'], ['Promedio', 'avg'], ['Conteo', 'count'], ['Máximo', 'max'], ['Mínimo', 'min']
    ]);
    expect(component.funcionAgregacion()).toBe('sum');
  });

  // Legacy TablaPivot.vue:129-140: a field is added to groupings/operations only once.
  it('adds each grouping and operation field once and separates groupable from measurable columns', () => {
    const { component } = setup();
    expect(component.columnasAgrupables.map(c => c.field)).toEqual(['APS', 'ANNO']);
    expect(component.columnasMedibles.map(c => c.field)).toEqual(['VALOR']);
    for (const campo of ['ANNO', 'ANNO', 'APS']) {
      component.campoAgrupacionSeleccionado = campo;
      component.agregarAgrupacion();
    }
    component.campoOperacionSeleccionado = 'VALOR';
    component.agregarCampoOperacion();
    component.campoOperacionSeleccionado = 'VALOR';
    component.agregarCampoOperacion();
    expect(component.agrupaciones()).toEqual(['ANNO', 'APS']);
    expect(component.camposOperacion()).toEqual(['VALOR']);
    component.quitarAgrupacion(0);
    expect(component.agrupaciones()).toEqual(['APS']);
  });

  // Legacy TablaPivot.vue:161-243: hierarchical groups in grouping order with the aggregate on each level.
  it('pivots hierarchically and sums the operation field per group', () => {
    const { component } = setup();
    component.agrupaciones.set(['ANNO', 'APS']);
    component.camposOperacion.set(['VALOR']);
    component.pivotar();
    const filas = component.filasMostradas;
    expect(filas.map(f => [f['ANNO'], f['VALOR']])).toEqual([['2025', 30], ['2026', 5]]);
    expect(filas[0].children!.map(c => [c['APS'], c['VALOR']])).toEqual([['Norte', 10], ['Sur', 20]]);
    expect(component.agrupacionesActivas).toEqual(['ANNO', 'APS']);
    expect(component.dialogVisible()).toBe(false);
  });

  // Legacy TablaPivot.vue:156-159 (no grouping -> restore) and :263-277 (restore resets everything).
  it('restores the original rows when pivoting without groupings or on Restaurar', () => {
    const { component } = setup();
    component.agrupaciones.set(['APS']);
    component.camposOperacion.set(['VALOR']);
    component.funcionAgregacion.set('max');
    component.pivotar();
    component.restaurar();
    expect(component.filasMostradas).toEqual(DATOS);
    expect(component.agrupaciones()).toEqual([]);
    expect(component.camposOperacion()).toEqual([]);
    expect(component.funcionAgregacion()).toBe('sum');
    component.pivotar();
    expect(component.filasPivotadas()).toBeNull();
  });

  // Legacy TablaPivot.vue:4-10: "Pivotar" disabled without data.
  it('disables "Pivotar" without data', () => {
    const { fixture } = setup([], true);
    fixture.detectChanges();
    const boton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.pivot-toolbar button'))
      .find(b => b.textContent?.trim() === 'Pivotar') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
  });

  // Legacy TablaPivot.vue:20-21,276 (10 rows) and :160 (5 rows when pivoted).
  it('the pivot grid pages 10 rows (5 when pivoted) like legacy TablaPivot.vue:20-21,160,276', () => {
    const { fixture } = setup(Array.from({ length: 12 }, (_, i) => ({ ANNO: 2025, APS: `A${i}`, VALOR: i })), true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.p-paginator')).not.toBeNull();
    expect(el.querySelectorAll('app-pivot-nivel tbody tr').length).toBe(10);
  });

  // Legacy TablaPivot.vue:247-256: pivoted top-level columns = all grouping keys first (grouping order), then the rest.
  it('pivoted top-level columns are the grouping keys first then the rest like legacy TablaPivot.vue:247-256', () => {
    const { fixture, component } = setup(DATOS, true);
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    component.agrupaciones.set(['ANNO', 'APS']);
    component.pivotar();
    fixture.detectChanges();
    const headers = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-pivot-nivel thead th'))
      .map(th => th.textContent?.trim()).slice(1);
    expect(headers).toEqual(['Año', 'APS', 'Valor']);
  });
});

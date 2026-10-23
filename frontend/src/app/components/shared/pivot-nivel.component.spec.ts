import { TestBed } from '@angular/core/testing';
import { PivotNivelComponent } from './pivot-nivel.component';
import { PivotColumnDef, PivotRow } from '../../shared/pivot.util';

// Legacy: front-tarificador/src/lib/ColumnasGenericas.vue — nested level of TablaPivot: group columns other than the
// current level are hidden (filteredColumns :31-41), header = headerName (:89), numeric cells right-aligned (:47-53,90-91),
// expander per row (:79-84) showing the children (:95-109).

const COLS: PivotColumnDef[] = [
  { field: 'ANNO', headerName: 'Año', agrupable: true },
  { field: 'APS', headerName: 'APS', agrupable: true },
  { field: 'VALOR', headerName: 'Valor', agrupable: false }
];

function render(filas: PivotRow[], agrupaciones: string[], nivel = 0) {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  TestBed.configureTestingModule({ imports: [PivotNivelComponent] });
  const fixture = TestBed.createComponent(PivotNivelComponent);
  fixture.componentRef.setInput('filas', filas);
  fixture.componentRef.setInput('columnas', COLS);
  fixture.componentRef.setInput('agrupaciones', agrupaciones);
  fixture.componentRef.setInput('nivel', nivel);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const texts = (sel: string) => Array.from(el.querySelectorAll(sel)).map(n => n.textContent?.trim());
  return { fixture, component: fixture.componentInstance, el, texts };
}

describe('PivotNivelComponent (legacy lib/ColumnasGenericas.vue)', () => {
  // Legacy ColumnasGenericas.vue:31-34: without groupings every column is shown.
  it('shows every column and the rows when not pivoted', () => {
    const { texts } = render([{ ANNO: 2025, APS: 'Norte', VALOR: 10 }], []);
    expect(texts(':scope > p-table thead th').slice(1)).toEqual(['Año', 'APS', 'Valor']);
    expect(texts(':scope > p-table tbody tr td').slice(1)).toEqual(['2025', 'Norte', '10']);
  });

  // Legacy ColumnasGenericas.vue:35-40: only the grouping column of this level stays visible.
  it('hides grouping columns that are not the current level', () => {
    expect(render([], ['ANNO', 'APS'], 0).component.columnasVisibles.map(c => c.field)).toEqual(['ANNO', 'VALOR']);
    TestBed.resetTestingModule();
    expect(render([], ['ANNO', 'APS'], 1).component.columnasVisibles.map(c => c.field)).toEqual(['APS', 'VALOR']);
  });

  // Legacy ColumnasGenericas.vue:90: numeric values right-aligned.
  it('right-aligns numeric cells', () => {
    const { el } = render([{ ANNO: '2025', APS: 'Norte', VALOR: 10 }], []);
    const tds = Array.from(el.querySelectorAll(':scope > p-table tbody tr td')).slice(1);
    expect(tds.map(td => td.classList.contains('text-right'))).toEqual([false, false, true]);
  });

  // Legacy ColumnasGenericas.vue:79-84,95-109: rows with children expand into the next level.
  it('expands a row with children into the next level', () => {
    const filas: PivotRow[] = [{ id: 'n0-0', ANNO: '2025', VALOR: 30, children: [{ APS: 'Norte', VALOR: 10 }, { APS: 'Sur', VALOR: 20 }] }];
    const { fixture, component, el } = render(filas, ['ANNO']);
    expect(el.querySelectorAll('app-pivot-nivel').length).toBe(0);
    component.toggleFila(filas[0]);
    fixture.detectChanges();
    expect(component.expandedRowKeys).toEqual({ 'n0-0': true });
    expect(el.querySelectorAll('app-pivot-nivel').length).toBe(1);
    component.toggleFila(filas[0]);
    expect(component.expandedRowKeys).toEqual({});
  });

  // Pinned: empty data shows "Sin datos.".
  it('shows "Sin datos." without rows', () => {
    const { texts } = render([], []);
    expect(texts('tbody td')).toEqual(['Sin datos.']);
  });
});

import { TestBed } from '@angular/core/testing';
import { TablaGenericaComponent, ColumnaGenerica } from './tabla-generica.component';

// Legacy: front-tarificador/src/components/GenericTable.vue (procesos Costos/Calculo, sui) and
// reliq/components/CompararTarifas/GenericTable.vue — header = column name (:89-95), numeric cells right-aligned
// (NumericValue, :66-68 / :114-116), thousands via es-MX with "." decimals (formateoMiles :72-77), "%" cells as ProgressBar (:17-24).

const COLS: ColumnaGenerica[] = [{ field: 'VARIABLE', header: 'VARIABLE' }, { field: 'VALOR', header: 'VALOR' }];

function render(rows: Record<string, unknown>[], columnas = COLS) {
  TestBed.configureTestingModule({ imports: [TablaGenericaComponent] });
  const fixture = TestBed.createComponent(TablaGenericaComponent);
  fixture.componentInstance.columnas = columnas;
  fixture.componentInstance.rows = rows;
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const cells = (sel: string) => Array.from(el.querySelectorAll(sel)).map(n => n.textContent?.trim());
  return { el, cells, component: fixture.componentInstance };
}

describe('TablaGenericaComponent (legacy components/GenericTable.vue)', () => {
  // Legacy GenericTable.vue:89-95: one column per name, header = name; rows in order.
  it('renders the headers and the rows in order', () => {
    const { cells } = render([{ VARIABLE: 'CRT', VALOR: 'texto' }, { VARIABLE: 'CDF', VALOR: 'otro' }]);
    expect(cells('thead th')).toEqual(['VARIABLE', 'VALOR']);
    expect(cells('tbody td')).toEqual(['CRT', 'texto', 'CDF', 'otro']);
  });

  // Legacy GenericTable.vue:27,66-68: numeric values right-aligned, text left.
  it('right-aligns numeric cells only', () => {
    const { el } = render([{ VARIABLE: 'CRT', VALOR: '12,5' }]);
    const tds = el.querySelectorAll('tbody td');
    expect(tds[0].classList.contains('celda-numero')).toBe(false);
    expect(tds[1].classList.contains('celda-numero')).toBe(true);
  });

  // Pinned: no rows shows "Sin registros" across all columns.
  it('shows "Sin registros" when there are no rows', () => {
    const { el } = render([]);
    const td = el.querySelector('tbody td.tabla-generica-vacio');
    expect(td?.textContent?.trim()).toBe('Sin registros');
    expect(td?.getAttribute('colspan')).toBe('2');
  });

  // Legacy formateoMiles (GenericTable.vue:72-77): integer part grouped (es-MX), decimals kept after ".": "1234,56" -> "1,234.56".
  it('numbers show as "1,234.56" like legacy GenericTable.vue:72-77 es-MX', () => {
    const { cells } = render([{ VARIABLE: 'A', VALOR: '1234,56' }, { VARIABLE: 'B', VALOR: 1234567 }]);
    expect(cells('tbody tr td:nth-child(2)')).toEqual(['1,234.56', '1,234,567']);
  });

  // Legacy GenericTable.vue:17-24: a "%" value is drawn as a ProgressBar of that value.
  it('"%" values render as a progress bar like legacy GenericTable.vue:17-24', () => {
    const { el } = render([{ VARIABLE: 'A', VALOR: '45,5%' }]);
    expect(el.querySelector('tbody td:nth-child(2) [role="progressbar"], tbody td:nth-child(2) p-progressbar')).not.toBeNull();
  });

  // Legacy formateoMiles (GenericTable.vue:72-77) and ProgressBar value (:17-24); was pinned to es-CO before
  // legacy-characterization-tests S8 (group C fixed to legacy).
  it('formats numbers like legacy formateoMiles and reads "%" values for the progress bar', () => {
    const { component } = render([]);
    expect(component.formatearValor('1234,56')).toBe('1,234.56');
    expect(component.formatearValor('1.234,56')).toBe('1.234,56');
    expect(component.porcentaje('45,5%')).toBe(45.5);
    expect(component.porcentaje('12')).toBeNull();
    expect(component.formatearValor('texto')).toBe('texto');
    expect(component.formatearValor(null)).toBeNull();
  });
});

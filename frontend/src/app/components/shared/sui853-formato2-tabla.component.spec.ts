import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TablaAvanzadaComponent } from './tabla-avanzada.component';
import { SimpleChange } from '@angular/core';
import { Sui853Formato2TablaComponent } from './sui853-formato2-tabla.component';
import { Formato2Response } from '../../models/sui853-cft.model';

function render(data: Formato2Response | null) {
  const fixture = TestBed.createComponent(Sui853Formato2TablaComponent);
  const component = fixture.componentInstance;
  component.storageKey = 'spec-sui853-formato2';
  component.data = data;
  component.ngOnChanges({ data: new SimpleChange(null, data, true) });
  fixture.detectChanges();
  return { fixture, component, element: fixture.nativeElement as HTMLElement };
}

const header = (field: string, extra: Record<string, unknown> = {}) => ({
  field,
  header: field,
  formato: null,
  decimal: null,
  alineacion: null,
  backgroundColor: null,
  filter: null,
  mouse_over: null,
  ...extra
});

describe('Sui853Formato2TablaComponent', () => {
  beforeAll(() => {
    // jsdom has no ResizeObserver; PrimeNG frozen columns observe their size.
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Sui853Formato2TablaComponent] });
  });

  // F6: f_render_formato2 can return "data": null; legacy hasData used Array.isArray(config.data).
  it('shows the empty state instead of crashing when data is null', () => {
    const { element } = render({ title: 'SG1 - CVA', SIN_MOVIMIENTO: null, CON_MOVIMIENTO: null, data: null });

    expect(element.textContent).toContain('Sin datos');
    expect(element.querySelector('app-tabla-avanzada')).toBeNull();
  });

  it('shows the empty state for a null payload and an empty data array', () => {
    expect(render(null).element.textContent).toContain('Sin datos');
    expect(render({ title: 'T', SIN_MOVIMIENTO: null, CON_MOVIMIENTO: null, data: [] }).element.textContent).toContain('Sin datos');
  });

  // F1: lossless payload -- legacy TablaScrollHorizontal.vue dialogHeaderValue prefers meta.dialogHeader.
  it('titles the table with meta.dialogHeader and falls back to title', () => {
    const conMeta = render({
      title: 'SG1 - CVA',
      meta: { dialogHeader: 'F853S104 | SG1 - CVA | Generado' },
      SIN_MOVIMIENTO: { tableTitle: null, tableColor: null, headers: [header('A')] },
      CON_MOVIMIENTO: null,
      data: [{ A: 'x' }]
    });
    expect(conMeta.element.querySelector('.formato2-titulo')?.textContent?.trim()).toBe('F853S104 | SG1 - CVA | Generado');
    expect(conMeta.component.nombreExportarEfectivo).toBe('F853S104 | SG1 - CVA | Generado');

    const sinMeta = render({
      title: 'SG1 - CVA',
      SIN_MOVIMIENTO: { tableTitle: null, tableColor: null, headers: [header('A')] },
      CON_MOVIMIENTO: null,
      data: [{ A: 'x' }]
    });
    expect(sinMeta.element.querySelector('.formato2-titulo')?.textContent?.trim()).toBe('SG1 - CVA');
  });

  // F1: legacy leftHeaders/rightHeaders read headersConFiltro/headersSinFiltro when present.
  it('builds columns from headersConFiltro/headersSinFiltro when a section has no headers', () => {
    const { component } = render({
      title: 'T',
      SIN_MOVIMIENTO: { tableTitle: null, tableColor: null, headersConFiltro: [header('A', { filter: true })] },
      CON_MOVIMIENTO: {
        tableTitle: null,
        tableColor: null,
        headersConFiltro: [header('B', { filter: true })],
        headersSinFiltro: [header('C', { formato: 'numero', decimal: 1 })]
      },
      data: [{ A: 'a', B: 'b', C: 1.25 }]
    });

    expect(component.columnas.map((c) => c.field)).toEqual(['A', 'B', 'C']);
    expect(component.columnas.map((c) => c.filtrable)).toEqual([true, true, false]);
    expect(component.columnasFijadasPorDefecto).toEqual(['A']);
    expect(component.displayValue(component.columnas[2], 1.25)).toBe((1.25).toFixed(1));
  });

  // F3 (kept): every SIN_MOVIMIENTO and CON_MOVIMIENTO header is shown, filtered or not.
  it('keeps showing all headers of both sections', () => {
    const { component } = render({
      title: 'T',
      SIN_MOVIMIENTO: { tableTitle: null, tableColor: null, headers: [header('A', { filter: true }), header('B')] },
      CON_MOVIMIENTO: { tableTitle: null, tableColor: null, headers: [header('C'), header('D', { filter: true })] },
      data: [{ A: 1 }]
    });

    expect(component.columnas.map((c) => c.field)).toEqual(['A', 'B', 'C', 'D']);
    expect(component.columnasFijadasPorDefecto).toEqual(['A', 'B']);
  });

  // Legacy TablaScrollHorizontal.vue formatValue()/displayValue().
  it('formats values like the legacy table', () => {
    const { component } = render({
      title: 'T',
      SIN_MOVIMIENTO: {
        tableTitle: null,
        tableColor: null,
        headers: [
          header('N', { formato: 'numero', decimal: 3 }),
          header('P', { formato: 'porcentaje', decimal: 1 }),
          header('F', { formato: 'fecha' }),
          header('M', { formato: 'moneda' }),
          header('T', { formato: 'texto' })
        ]
      },
      CON_MOVIMIENTO: null,
      data: [{ N: 1 }]
    });
    const col = (field: string) => component.columnas.find((c) => c.field === field)!;

    expect(component.displayValue(col('N'), -1)).toBe('NA');
    expect(component.displayValue(col('N'), 2.5)).toBe('2.500');
    expect(component.displayValue(col('N'), null)).toBe('');
    expect(component.displayValue(col('P'), 0.125)).toBe('12.5%');
    expect(component.displayValue(col('P'), 45)).toBe('45.0%');
    expect(component.displayValue(col('F'), '2024-03-05T12:00:00')).toBe('2024-03-05');
    expect(component.displayValue(col('M'), 10)).toBe('10.00');
    expect(component.displayValue(col('T'), 'abc')).toBe('abc');
    expect(component.displayValue({ field: 'X', header: 'X' }, 7)).toBe('7.00');
  });

  // Legacy TablaScrollHorizontal.vue:156 `:rowsPerPageOptions="[10, 24, 50]"` with rows: 10 (:220).
  it('uses the legacy paginator options 10/24/50 with 10 rows by default', () => {
    const { fixture } = render({
      title: 'T',
      SIN_MOVIMIENTO: { tableTitle: null, tableColor: null, headers: [header('A')] },
      CON_MOVIMIENTO: { tableTitle: null, tableColor: null, headers: [header('B')] },
      data: [{ A: 1, B: 2 }]
    });

    const tabla = fixture.debugElement.query(By.directive(TablaAvanzadaComponent)).componentInstance as TablaAvanzadaComponent;
    expect(tabla.rowsPerPageOptionsList).toEqual([10, 24, 50]);
    expect(tabla.filasPorPagina).toBe(10);
  });
});

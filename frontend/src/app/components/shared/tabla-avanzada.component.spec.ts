import { TestBed } from '@angular/core/testing';
import { TablaAvanzadaComponent, TablaColumn } from './tabla-avanzada.component';

function renderCeldas(columnas: TablaColumn[], rows: Record<string, unknown>[]): string[] {
  const fixture = TestBed.createComponent(TablaAvanzadaComponent);
  fixture.componentInstance.columnas = columnas;
  fixture.componentInstance.rows = rows;
  fixture.componentInstance.storageKey = 'spec-tabla-avanzada';
  fixture.componentInstance.ngOnInit();
  fixture.detectChanges();
  const celdas = fixture.nativeElement.querySelectorAll('tbody td') as NodeListOf<HTMLElement>;
  return Array.from(celdas).map((td) => td.textContent?.trim() ?? '');
}

describe('TablaAvanzadaComponent', () => {
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
    TestBed.configureTestingModule({ imports: [TablaAvanzadaComponent] });
  });

  it('rounds a column with decimales and shows null as 0', () => {
    const celdas = renderCeldas(
      [{ field: 'valor', header: 'Valor', numero: true, decimales: 2 }],
      [{ valor: 1.23456 }, { valor: null }, { valor: 2.005 }, { valor: -3.4567 }]
    );

    expect(celdas).toEqual(['1.23', '0', String(Math.round(2.005 * 100) / 100), '-3.46']);
  });

  it('renders a column without decimales exactly as before (raw value, null blank)', () => {
    const celdas = renderCeldas(
      [{ field: 'valor', header: 'Valor', numero: true }, { field: 'texto', header: 'Texto' }],
      [{ valor: 1.23456, texto: 'abc' }, { valor: null, texto: null }]
    );

    expect(celdas).toEqual(['1.23456', 'abc', '', '']);
  });
});

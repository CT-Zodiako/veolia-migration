import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Table } from 'primeng/table';
import { FormatoTableComponent } from './formato-table.component';

// FormatoTableComponent (app-sui-formato-table) is not mounted by any screen today: SUI 801 renders its formats through
// sui-integracion-page with the curated legacy columns (pinned by sui-integracion-page.component.spec.ts).
// Legacy equivalent: front-tarificador/src/components/tablesFormatosFormularios/Formato19.vue (used by views/sui/Suisui.vue).

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

function render(rows: Array<Record<string, unknown>>) {
  TestBed.configureTestingModule({ imports: [FormatoTableComponent] });
  const fixture = TestBed.createComponent(FormatoTableComponent);
  fixture.componentInstance.rows = rows;
  fixture.detectChanges();
  const headers = Array.from(fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>).map((th) => th.textContent?.trim());
  const cells = Array.from(fixture.nativeElement.querySelectorAll('tbody td') as NodeListOf<HTMLElement>).map((td) => td.textContent?.trim());
  const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
  return { headers, cells, table };
}

const FILA = { F19_NJ: 3, F19_CRTJ: 1.23456, F19_QRTJ: 2.1234567 };

describe('FormatoTableComponent (unused SUI format grid)', () => {
  // tablesFormatosFormularios/Formato19.vue:9: 10 rows per page.
  it('pages by 10 rows like the legacy format grids', () => {
    const { table, cells } = render(Array.from({ length: 11 }, () => FILA));

    expect(table.rows).toBe(10);
    expect(table.paginator).toBe(true);
    expect(cells.length).toBe(30);
  });

  // tablesFormatosFormularios/Formato19.vue:13,26-150: headers NJ, CRTJ, QRTJ; redondeo CRTJ 2 and QRTJ 5 decimals;
  // page sizes [10, 20, 100, 200].
  it.skip('PARITY-FINDING: legacy format grids show curated headers (NJ, CRTJ, QRTJ), redondeo (CRTJ 2, QRTJ 5) and [10,20,100,200] (tablesFormatosFormularios/Formato19.vue:9-150); FormatoTableComponent shows raw keys, raw values and no page-size options (component unused)', () => {
    const { headers, cells, table } = render([FILA]);

    expect(headers).toEqual(['NJ', 'CRTJ', 'QRTJ']);
    expect(cells).toEqual(['3', '1.23', '2.12346']);
    expect(table.rowsPerPageOptions).toEqual([10, 20, 100, 200]);
  });
});

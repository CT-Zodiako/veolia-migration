import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { CargaGenericaComponent } from './carga-generica.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';
import { LayoutComponent } from '../layout/layout.component';

const PREVIEW = {
  driveHeaders: ['ID', 'VALOR', 'EXTRA'],
  tableColumns: [
    { COLUMN_NAME: 'ID', DATA_TYPE: 'NUMBER', COLUMN_ID: 1 },
    { COLUMN_NAME: 'VALOR', DATA_TYPE: 'NUMBER', COLUMN_ID: 2 }
  ],
  commonColumns: ['ID', 'VALOR']
};

function setup(sheets = [{ sheetId: 7, title: 'Hoja 1', index: 0, rowCount: 10, columnCount: 3 }, { sheetId: 8, title: 'Hoja 2', index: 1, rowCount: 5, columnCount: 2 }]) {
  const service = {
    tablasSui: vi.fn(() => of({ status: 200, data: ['TGEN_A', 'TGEN_B'] })),
    listarHojasDrive: vi.fn(() => of({ status: 200, data: { ok: true, source: 'DRIVE_SHEETS', sheets } })),
    cargaDriveDinamica: vi.fn((request: { previewOnly: boolean }) => of(request.previewOnly
      ? { status: 200, data: PREVIEW }
      : { status: 200, data: { ok: true, source: 'DB_INSERT', insertResult: { ok: true, code: 'OK', inserted: 42 } } })),
    truncateTable: vi.fn(() => of({ status: 200, data: { ok: true } }))
  };
  const confirmations: Confirmation[] = [];
  const confirmation = { confirm: vi.fn((options: Confirmation) => { confirmations.push(options); }) };
  TestBed.configureTestingModule({
    imports: [CargaGenericaComponent],
    providers: [
      { provide: Sui853ConfiguracionService, useValue: service },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  const fixture = TestBed.createComponent(CargaGenericaComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, component, element, service, confirmations };
}

function optionTexts(element: HTMLElement, selector: string): string[] {
  return Array.from(element.querySelectorAll<HTMLOptionElement>(`${selector} option`)).map(option => option.textContent?.trim() ?? '');
}

// Drives the screen up to a listed sheet + selected table, as legacy onBuscarHojas + table dropdown do.
function selectSource(ctx: ReturnType<typeof setup>, sheetTitle = 'Hoja 1') {
  ctx.component.sheetId = ' abc123 ';
  ctx.component.listSheets();
  ctx.component.sheetTitle = sheetTitle;
  ctx.component.tableName = 'TGEN_A';
  ctx.fixture.detectChanges();
}

describe('CargaGenericaComponent (30006, legacy sui853/views/configuracion/cargueGenerico.vue)', () => {
  // cargueGenerico.vue:mounted → loadTables(): POST tablasSui once; each SUI table becomes a destination option.
  it('loads the SUI tables once on init and offers each one as destination', () => {
    const { service, element } = setup();

    expect(service.tablasSui).toHaveBeenCalledTimes(1);
    expect(optionTexts(element, '#sui-table')).toEqual(expect.arrayContaining([expect.stringContaining('TGEN_A'), expect.stringContaining('TGEN_B')]));
  });

  // cargueGenerico.vue:loadTables labels each option with row["OWNER||'.'||TABLE_NAME"] ("SUI.TGEN_A") under
  // "Tabla destino (OWNER.TABLA)".
  it.skip('PARITY-FINDING: destination options show "TGEN_A" instead of the legacy "SUI.TGEN_A" (OWNER.TABLA)', () => {
    const { element } = setup();

    expect(optionTexts(element, '#sui-table').slice(1)).toEqual(['SUI.TGEN_A', 'SUI.TGEN_B']);
  });

  // cargueGenerico.vue:onBuscarHojas + configuracionService.js:144-157: POST listarHojasDrive { sheetId }; every
  // returned sheet title becomes an option (label = value = title).
  it('lists the Drive tabs of the sheetId as source options', () => {
    const ctx = setup();
    ctx.component.sheetId = 'abc123';
    ctx.component.listSheets();
    ctx.fixture.detectChanges();

    expect(ctx.service.listarHojasDrive).toHaveBeenCalledWith('abc123');
    expect(optionTexts(ctx.element, '#sheet-title').slice(1)).toEqual(['Hoja 1', 'Hoja 2']);
  });

  // cargueGenerico.vue:onBuscarHojas — "if (this.sheetOptions.length === 1) this.form.sheetTitle = this.sheetOptions[0].value".
  it.skip('PARITY-FINDING: a spreadsheet with a single tab is not auto-selected (legacy selects it after "Buscar")', () => {
    const ctx = setup([{ sheetId: 7, title: 'Única', index: 0, rowCount: 10, columnCount: 3 }]);
    ctx.component.sheetId = 'abc123';
    ctx.component.listSheets();

    expect(ctx.component.sheetTitle).toBe('Única');
  });

  // cargueGenerico.vue:previewColumns: cargaDriveDinamica { sheetId, sheetTitle, owner, tableName, previewOnly: true };
  // the common columns come back pre-selected (selectedColumns = [...commonColumns]).
  it('previews the columns with the legacy request and preselects the common columns', () => {
    const ctx = setup();
    selectSource(ctx);

    ctx.component.showPreview();
    ctx.fixture.detectChanges();

    expect(ctx.service.cargaDriveDinamica).toHaveBeenCalledWith({ sheetId: 'abc123', sheetTitle: 'Hoja 1', owner: 'SUI', tableName: 'TGEN_A', previewOnly: true });
    expect(ctx.component.selectedColumns).toEqual(['ID', 'VALOR']);
    expect(ctx.element.textContent).toContain('EXTRA');
  });

  // cargueGenerico.vue (template "Selecciona columnas"): a table "Usar | Columna | Estado" with one row per Drive header,
  // Estado "Coincide ✔" for common columns and "No existe ⚠" otherwise, and the footer "Seleccionadas: N".
  it.skip('PARITY-FINDING: the column step lacks the legacy "Usar | Columna | Estado" table with "Coincide ✔" / "No existe ⚠" per Drive header (new shows two lists and checkboxes for common columns only)', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.fixture.detectChanges();

    const headers = Array.from(ctx.element.querySelectorAll('th')).map(th => th.textContent?.trim());
    expect(headers).toEqual(['Usar', 'Columna', 'Estado']);
    expect(ctx.element.textContent).toContain('Coincide ✔');
    expect(ctx.element.textContent).toContain('No existe ⚠');
    expect(ctx.element.textContent).toContain('Seleccionadas: 2');
  });

  // cargueGenerico.vue:onSubmit: cargaDriveDinamica { sheetId, sheetTitle, owner, tableName, selectedColumns } (load).
  it('loads the selected columns of the previewed sheet', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.component.toggleColumn('VALOR', false);

    ctx.component.load();

    expect(ctx.service.cargaDriveDinamica).toHaveBeenLastCalledWith({
      sheetId: 'abc123', sheetTitle: 'Hoja 1', owner: 'SUI', tableName: 'TGEN_A', previewOnly: false, selectedColumns: ['ID']
    });
  });

  // cargueGenerico.vue:successMessage — "Proceso ejecutado correctamente. Filas insertadas: " + insertResult.inserted.
  it.skip('PARITY-FINDING: load success message is "Carga completada: 42 filas insertadas. ..." instead of legacy "Proceso ejecutado correctamente. Filas insertadas: 42"', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.component.load();
    ctx.fixture.detectChanges();

    expect(ctx.element.textContent).toContain('Proceso ejecutado correctamente. Filas insertadas: 42');
  });

  // cargueGenerico.vue:onSubmit + configuracionService.js:9-20: truncateTable(owner, tableName) for the selected table.
  // The confirmation dialog before emptying the table is the new screen's safeguard.
  it('truncates the selected SUI table after confirmation', () => {
    const ctx = setup();
    selectSource(ctx);

    ctx.component.confirmTruncate();
    expect(ctx.service.truncateTable).not.toHaveBeenCalled();
    ctx.confirmations[0].accept!();

    expect(ctx.service.truncateTable).toHaveBeenCalledWith('TGEN_A');
  });

  // cargueGenerico.vue (truncate-card + onSubmit step 1): an InputSwitch "Truncar tabla antes de cargar" makes the
  // same "Cargar datos e insertar" submit TRUNCATE the table first and then insert.
  it.skip('PARITY-FINDING: no "Truncar tabla antes de cargar" switch; legacy truncated and then inserted in one submit, new needs a separate "Vaciar" action', () => {
    const { element } = setup();

    expect(element.textContent).toContain('Truncar tabla antes de cargar');
  });

  // Approved: the legacy <h1> is shown as the top-bar title (parity-review-all L20); legacy text "Carga genérica desde Google Drive".
  it.skip('PARITY-FINDING: top-bar title "SUI 853 - Carga genérica" differs from legacy <h1> "Carga genérica desde Google Drive" (cargueGenerico.vue:8)', () => {
    expect(LayoutComponent.prototype.getPageTitle.call({ router: { url: '/cargaGenerica' } } as unknown as LayoutComponent))
      .toContain('Carga genérica desde Google Drive');
  });
});

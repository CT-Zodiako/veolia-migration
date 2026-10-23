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
  it('labels each destination option OWNER.TABLA ("SUI.TGEN_A")', () => {
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
  it('auto-selects the only tab of a spreadsheet after "Buscar"', () => {
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
  it('shows the "Usar | Columna | Estado" table with "Coincide ✔" / "No existe ⚠" per Drive header', () => {
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
  it('shows the legacy load success message "Proceso ejecutado correctamente. Filas insertadas: 42"', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.component.load();
    ctx.fixture.detectChanges();

    expect(ctx.element.textContent).toContain('Proceso ejecutado correctamente. Filas insertadas: 42');
  });

  // cargueGenerico.vue:onSubmit + configuracionService.js:9-20: truncateTable(owner, tableName) for the selected table.
  // The confirmation dialog before emptying the table is the new screen's safeguard (group E): rejecting it truncates
  // and loads nothing.
  it('neither truncates nor loads when the truncate confirmation is rejected', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.component.truncateBeforeInsert = true;

    ctx.component.load();
    ctx.confirmations[0].reject!();

    expect(ctx.service.truncateTable).not.toHaveBeenCalled();
    expect(ctx.service.cargaDriveDinamica).toHaveBeenCalledTimes(1);
  });

  // cargueGenerico.vue lets the user tick a "No existe ⚠" header; legacy controller.js:1222-1226 dropped it, so only
  // the common columns are sent (the new API rejects non-common ones, accepted S8/S9 group D).
  it('sends only the common columns when a "No existe ⚠" header is ticked', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.component.toggleColumn('EXTRA', true);

    ctx.component.load();

    expect(ctx.service.cargaDriveDinamica).toHaveBeenLastCalledWith({
      sheetId: 'abc123', sheetTitle: 'Hoja 1', owner: 'SUI', tableName: 'TGEN_A', previewOnly: false, selectedColumns: ['ID', 'VALOR']
    });
  });

  // cargueGenerico.vue (truncate-card + onSubmit step 1): an InputSwitch "Truncar tabla antes de cargar" makes the
  // same "Cargar datos e insertar" submit TRUNCATE the table first and then insert.
  it('offers the "Truncar tabla antes de cargar" switch', () => {
    const { element } = setup();

    expect(element.textContent).toContain('Truncar tabla antes de cargar');
  });

  // cargueGenerico.vue:onSubmit — with truncateBeforeInsert on, the same submit truncates SUI.TABLE first and then
  // inserts. The confirmation before truncating is approved (odd/tasks/sui853-carga-generica.md, group E).
  it('truncates after confirmation and then loads when the switch is on', () => {
    const ctx = setup();
    selectSource(ctx);
    ctx.component.showPreview();
    ctx.component.truncateBeforeInsert = true;

    ctx.component.load();
    expect(ctx.service.truncateTable).not.toHaveBeenCalled();
    expect(ctx.service.cargaDriveDinamica).toHaveBeenCalledTimes(1);
    ctx.confirmations[0].accept!();
    ctx.fixture.detectChanges();

    expect(ctx.service.truncateTable).toHaveBeenCalledWith('TGEN_A');
    expect(ctx.service.cargaDriveDinamica).toHaveBeenLastCalledWith({
      sheetId: 'abc123', sheetTitle: 'Hoja 1', owner: 'SUI', tableName: 'TGEN_A', previewOnly: false, selectedColumns: ['ID', 'VALOR']
    });
    expect(ctx.element.textContent).toContain('Proceso ejecutado correctamente. Filas insertadas: 42');
  });

  // Approved: the legacy <h1> is shown as the top-bar title (parity-review-all L20); legacy text "Carga genérica desde Google Drive".
  it('shows the legacy <h1> "Carga genérica desde Google Drive" as top-bar title (cargueGenerico.vue:8)', () => {
    expect(LayoutComponent.prototype.getPageTitle.call({ router: { url: '/cargaGenerica' } } as unknown as LayoutComponent))
      .toContain('Carga genérica desde Google Drive');
  });
});

import { TestBed } from '@angular/core/testing';
import { Sui853ExportCsvDialogComponent } from './sui853-export-csv-dialog.component';

const COLUMNS = [
  { field: 'APS', header: 'APS' },
  { field: 'NUAP', header: 'NUAP' },
  { field: 'PLACA', header: 'PLACA VEHICULO' },
  { field: 'USU_REG', header: 'USUARIO REGISTRO' }
];
const ROWS = [
  { APS: '17', NUAP: '440', PLACA: 'ABC 123', USU_REG: 'admin' },
  { APS: '17', NUAP: null, PLACA: 'línea\r\nnueva', USU_REG: 'admin' }
];

function setup() {
  TestBed.configureTestingModule({ imports: [Sui853ExportCsvDialogComponent] });
  TestBed.overrideComponent(Sui853ExportCsvDialogComponent, { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(Sui853ExportCsvDialogComponent);
  const component = fixture.componentInstance;
  component.columns = COLUMNS;
  component.rows = ROWS;
  component.defaultFilename = 'APS Norte marzo 2024';
  component.initiallyUnchecked = ['APS', 'usuario registro'];
  return { fixture, component };
}

function open(component: Sui853ExportCsvDialogComponent): void {
  component.visible = true;
  component.ngOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } });
}

function captureDownload() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  URL.createObjectURL = vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:csv'; }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
  return { blobs, names, click };
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe('Sui853ExportCsvDialogComponent (legacy ExportCsvDialog.vue)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens with the legacy default-unchecked columns (matched by field or header) and the default file name', () => {
    const { component } = setup();
    open(component);

    expect(component.selectedFields).toEqual(['NUAP', 'PLACA']);
    expect(component.filename).toBe('APS Norte marzo 2024');
    expect(component.separator).toBe(',');
  });

  it('falls back to "archivo" when there is no default file name', () => {
    const { component } = setup();
    component.defaultFilename = '  ';
    open(component);

    expect(component.filename).toBe('archivo');
  });

  it('downloads an unquoted CSV of the selected columns in column order, CRLF lines, newlines flattened', async () => {
    const { component } = setup();
    const { blobs, names } = captureDownload();
    const emitted: unknown[] = [];
    component.exported.subscribe(value => emitted.push(value));
    open(component);
    component.exportar();

    expect(names).toEqual(['APS Norte marzo 2024.csv']);
    expect(await readBlob(blobs[0])).toBe('NUAP,PLACA VEHICULO\r\n440,ABC 123\r\n,línea nueva');
    expect(blobs[0].type).toBe('text/csv;charset=utf-8;');
    expect(emitted).toEqual([{ filename: 'APS Norte marzo 2024.csv', columns: ['NUAP', 'PLACA'], separator: ',' }]);
    expect(component.visible).toBe(false);
  });

  it('honours the chosen separator, toggles and an explicit .csv file name', async () => {
    const { component } = setup();
    const { blobs, names } = captureDownload();
    open(component);
    component.toggleField('USU_REG', true);
    component.toggleField('PLACA', false);
    component.separator = ';';
    component.filename = 'salida.CSV';
    component.exportar();

    expect(names).toEqual(['salida.CSV']);
    expect(await readBlob(blobs[0])).toBe('NUAP;USUARIO REGISTRO\r\n440;admin\r\n;admin');
  });

  it('selects all / none and filters the column list by header or field', () => {
    const { component } = setup();
    open(component);
    component.toggleAll(true);
    expect(component.selectedFields).toEqual(['APS', 'NUAP', 'PLACA', 'USU_REG']);
    component.toggleAll(false);
    expect(component.selectedFields).toEqual([]);
    expect(component.exportDisabled).toBe(true);
    component.search = 'vehic';
    expect(component.filteredColumns.map(c => c.field)).toEqual(['PLACA']);
  });
});

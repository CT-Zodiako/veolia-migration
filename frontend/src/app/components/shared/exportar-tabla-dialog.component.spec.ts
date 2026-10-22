import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ExportarTablaDialogComponent } from './exportar-tabla-dialog.component';

// No direct legacy equivalent: this is the generic export of app-tabla-avanzada. The closest legacy dialog is
// front-tarificador/src/sui853/components/ExportCsvDialog.vue (all columns preselected :197-200, header = column
// header :300-305, ".csv" appended to the file name :330-332); SUI853 Comercial uses its own migrated dialog.
// These tests pin the current behavior (";" separator, quoted cells, UTF-8 BOM).

const COLS = [{ field: 'APS', header: 'APS' }, { field: 'VALOR', header: 'Valor "neto"' }];
const ROWS = [{ APS: 'Norte', VALOR: 10 }, { APS: 'Sur', VALOR: null }];

function setup() {
  TestBed.configureTestingModule({ imports: [ExportarTablaDialogComponent] });
  TestBed.overrideComponent(ExportarTablaDialogComponent, { set: { template: '', imports: [] } });
  const component = TestBed.createComponent(ExportarTablaDialogComponent).componentInstance;
  component.columnas = COLS;
  component.rows = ROWS;
  component.nombreSugerido = 'tarifas';
  component.visible = true;
  component.ngOnChanges({ visible: new SimpleChange(false, true, true) });
  const visibles: boolean[] = [];
  component.visibleChange.subscribe(v => visibles.push(v));
  return { component, visibles };
}

function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}

function captureDownload() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  URL.createObjectURL = vi.fn((b: Blob) => { blobs.push(b); return 'blob:x'; }) as typeof URL.createObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.getAttribute('download') ?? '');
  });
  return { blobs, names };
}

describe('ExportarTablaDialogComponent (no direct legacy equivalent — pinned)', () => {
  afterEach(() => vi.restoreAllMocks());

  // Nearest legacy ExportCsvDialog.vue:197-200: every column preselected; suggested file name.
  it('opens with the suggested name and every column selected', () => {
    const { component } = setup();
    expect(component.nombreArchivo).toBe('tarifas');
    expect(component.columnasSeleccionadas).toEqual(COLS);
  });

  it('toggles columns and selects all / none', () => {
    const { component } = setup();
    component.toggleColumna(COLS[0]);
    expect(component.estaSeleccionada(COLS[0])).toBe(false);
    component.seleccionarNinguna();
    expect(component.columnasSeleccionadas).toEqual([]);
    component.seleccionarTodas();
    expect(component.columnasSeleccionadas).toEqual(COLS);
  });

  // Pinned CSV format; ".csv" appended like legacy ExportCsvDialog.vue:330-332.
  it('downloads <name>.csv with BOM, ";" separator and quoted, escaped cells, then closes', async () => {
    const { component, visibles } = setup();
    const { blobs, names } = captureDownload();
    component.nombreArchivo = '  tarifas-2025  ';
    component.confirmar();
    expect(names).toEqual(['tarifas-2025.csv']);
    const bytes = await bytesOf(blobs[0]);
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder().decode(bytes.slice(3));
    expect(text).toBe('"APS";"Valor ""neto"""\n"Norte";"10"\n"Sur";""');
    expect(visibles).toEqual([false]);
  });

  it('exports only the selected columns', async () => {
    const { component } = setup();
    const { blobs } = captureDownload();
    component.toggleColumna(COLS[1]);
    component.confirmar();
    const text = new TextDecoder().decode((await bytesOf(blobs[0])).slice(3));
    expect(text).toBe('"APS"\n"Norte"\n"Sur"');
  });
});

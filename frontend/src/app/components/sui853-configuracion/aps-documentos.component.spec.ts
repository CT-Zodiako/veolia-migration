import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Table } from 'primeng/table';
import { ApsDocumentosComponent } from './aps-documentos.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

const ROWS = [
  { NOMAPS: 'APS Norte', SEGMENTO: 'Recolección', CODFORMATO: 'F1', NOMFORMATO: 'Formato uno' },
  { NOMAPS: 'APS Sur', SEGMENTO: 'Barrido', CODFORMATO: 'F2', NOMFORMATO: 'Formato dos' }
];

function setup() {
  const service = { vcfgApsDocumento: vi.fn(() => of({ status: 200, data: ROWS })) };
  TestBed.configureTestingModule({
    imports: [ApsDocumentosComponent],
    providers: [{ provide: Sui853ConfiguracionService, useValue: service }]
  });
  const fixture = TestBed.createComponent(ApsDocumentosComponent);
  fixture.detectChanges();
  return { fixture, service, el: fixture.nativeElement as HTMLElement };
}

function texts(el: HTMLElement, selector: string): string[] {
  return Array.from(el.querySelectorAll(selector)).map(node => node.textContent?.trim() ?? '');
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe('ApsDocumentosComponent (30002, legacy configuracion/apsDocumentos.vue)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads SUI.VCFGAPSDOCUMENTO and shows 24 rows per page with 10/24/50 options', () => {
    const { fixture, service } = setup();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;

    expect(service.vcfgApsDocumento).toHaveBeenCalledTimes(1);
    expect(table.rows).toBe(24);
    expect(table.rowsPerPageOptions).toEqual([10, 24, 50]);
  });

  it('renders the legacy sortable headers', () => {
    const { el } = setup();

    expect(texts(el, 'thead tr:first-child th')).toEqual(['NOMAPS', 'SEGMENTO', 'CODFORMATO', 'NOMFORMATO']);
    expect(el.querySelectorAll('thead tr:first-child th.p-datatable-sortable-column')).toHaveLength(4);
  });

  it('offers the legacy "Contiene" filters on NOMAPS, SEGMENTO and NOMFORMATO and filters by contains', () => {
    const { fixture, el } = setup();
    const inputs = Array.from(el.querySelectorAll<HTMLInputElement>('input[placeholder="Contiene"]'));
    expect(inputs.map(input => input.getAttribute('aria-label'))).toEqual(['Filtrar NOMAPS', 'Filtrar SEGMENTO', 'Filtrar NOMFORMATO']);

    const input = el.querySelector<HTMLInputElement>('input[aria-label="Filtrar NOMFORMATO"]')!;
    input.value = 'DOS';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(texts(el, 'tbody tr td:first-child')).toEqual(['APS Sur']);
  });

  it('exports the filtered rows to CSV with the legacy headers', async () => {
    const { fixture, el } = setup();
    const blobs: Blob[] = [];
    const names: string[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:csv'; }) as typeof URL.createObjectURL;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Filtrar SEGMENTO"]')!;
    input.value = 'recol';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('button[aria-label="Exportar CSV"]')!.click();

    expect(names).toEqual(['download.csv']);
    const csv = (await readBlob(blobs[0])).replace(/^\uFEFF/, '');
    expect(csv).toBe('"NOMAPS","SEGMENTO","CODFORMATO","NOMFORMATO"\n"APS Norte","Recolección","F1","Formato uno"');
  });
});

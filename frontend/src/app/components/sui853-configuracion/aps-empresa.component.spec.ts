import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Table } from 'primeng/table';
import { ApsEmpresaComponent } from './aps-empresa.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

const ROWS = [
  { TCFG_APS_ID: 12345, NOMAPS: 'APS Norte', NUAP: '440', EMPRESA: 'Veolia Norte', CODSUI: '1', DEPARTAMENTO: 'Antioquia', MUNICIPIO: 'Medellín' },
  { TCFG_APS_ID: 7, NOMAPS: 'APS Sur', NUAP: '441', EMPRESA: 'Veolia Sur', CODSUI: '2', DEPARTAMENTO: 'Valle', MUNICIPIO: 'Cali' }
];

function setup() {
  const service = { vcfgApsEmpresa: vi.fn(() => of({ status: 200, data: ROWS })) };
  TestBed.configureTestingModule({
    imports: [ApsEmpresaComponent],
    providers: [{ provide: Sui853ConfiguracionService, useValue: service }]
  });
  const fixture = TestBed.createComponent(ApsEmpresaComponent);
  fixture.detectChanges();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { fixture, component: fixture.componentInstance as any, service, el: fixture.nativeElement as HTMLElement };
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

describe('ApsEmpresaComponent (30001, legacy configuracion/apsEmpresa.vue)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads SUI.VCFGAPSEMPRESA and shows 24 rows per page with 10/24/50 options', () => {
    const { fixture, service } = setup();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;

    expect(service.vcfgApsEmpresa).toHaveBeenCalledTimes(1);
    expect(table.rows).toBe(24);
    expect(table.rowsPerPageOptions).toEqual([10, 24, 50]);
  });

  it('renders the legacy sortable headers and the thousands separator on COD APS', () => {
    const { el } = setup();

    expect(texts(el, 'thead tr:first-child th')).toEqual(['COD APS', 'NOMAPS', 'NUAP', 'EMPRESA', 'CODSUI', 'DEPARTAMENTO', 'MUNICIPIO']);
    expect(el.querySelectorAll('thead tr:first-child th.p-datatable-sortable-column')).toHaveLength(7);
    expect(texts(el, 'tbody tr:first-child td')[0]).toBe('12.345');
  });

  it('sorts by a column when its header is clicked', () => {
    const { fixture, el } = setup();
    const header = Array.from(el.querySelectorAll<HTMLElement>('thead tr:first-child th')).find(th => th.textContent?.trim() === 'MUNICIPIO')!;
    header.click();
    fixture.detectChanges();
    expect(texts(el, 'tbody tr td:nth-child(7)')).toEqual(['Cali', 'Medellín']);
    header.click();
    fixture.detectChanges();
    expect(texts(el, 'tbody tr td:nth-child(7)')).toEqual(['Medellín', 'Cali']);
  });

  it('offers the legacy "Contiene" filters on NOMAPS, EMPRESA, DEPARTAMENTO and MUNICIPIO only', () => {
    const { el } = setup();
    const inputs = Array.from(el.querySelectorAll<HTMLInputElement>('input[placeholder="Contiene"]'));

    expect(inputs.map(input => input.getAttribute('aria-label'))).toEqual([
      'Filtrar NOMAPS', 'Filtrar EMPRESA', 'Filtrar DEPARTAMENTO', 'Filtrar MUNICIPIO'
    ]);
  });

  it('filters rows by case-insensitive "contains" on the typed column', () => {
    const { fixture, el } = setup();
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Filtrar MUNICIPIO"]')!;
    input.value = 'CAL';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(texts(el, 'tbody tr td:nth-child(2)')).toEqual(['APS Sur']);
  });

  it('exports the filtered rows to CSV with the legacy headers', async () => {
    const { fixture, el } = setup();
    const blobs: Blob[] = [];
    const names: string[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => { blobs.push(blob); return 'blob:csv'; }) as typeof URL.createObjectURL;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    const input = el.querySelector<HTMLInputElement>('input[aria-label="Filtrar NOMAPS"]')!;
    input.value = 'norte';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('button[aria-label="Exportar CSV"]')!.click();

    expect(names).toEqual(['download.csv']);
    const csv = (await readBlob(blobs[0])).replace(/^\uFEFF/, '');
    expect(csv).toBe('"COD APS","NOMAPS","NUAP","EMPRESA","CODSUI","DEPARTAMENTO","MUNICIPIO"\n'
      + '"12345","APS Norte","440","Veolia Norte","1","Antioquia","Medellín"');
  });
});

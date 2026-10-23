import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Sui853ComercialComponent } from './sui853-comercial.component';
import { Sui853ComercialService } from '../../services/sui853-comercial.service';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';

// Detail row as the backend sends it: OracleDecimal values as "."-decimal strings, dates as ISO.
const DETAIL_ROW = {
  APS: '17', NOMAPS: 'APS Norte', ANNO: '2024', MES: '3', EMPRESA: 'Veolia', NUID: 'ABC', CUENTA: '99',
  DEPTO: '5', MUNI: '1', POBLADO: '0', INF_PREDIAL: 'S', NUMPRED: '123', DIRECCION: 'Calle 1',
  FECHAEXA: '2024-03-05T00:00:00', METODOL: '1', NUAP: '440', FECHAINI: '2024-02-01T00:00:00',
  NUMFAC: '1', MULTIUSU: '0', CAUSALREFA: '0', FACTREF: '0', UBICACION: '1', CODIGOCLAS: '2',
  TIPOAFORO: '1', RECOL: '1', CODPRODUC: '1', FACPRODUC: '0.5', INQUILINA: '0', PRIORIT: '0', HCOMUN: '0',
  DIASFAC: '30.4', PRODUCCION: '1.5', TRLU: '2', TRBL: '2.1', TRA: '0.25', TRRA: '1', FACTCONJUN: '1.6',
  TFC: '1234.5', TLU: '1', TBL: '1', TRT: '1', TTE: '1', TDT: '1', TTL: '1', TA: '1', FACTORSUBC: '0.1234',
  VLRSUB: '10', VLTARIF: '10', VLRMORA: '0', VLRMINOR: '0', DTOXCAL: '0', DTOXRECL: '0', DTOXCOMP: '0',
  DEVFEXCOE: '0', DEVEPENXCOE: '0', DEVEPENXOTR: '3.456', DEVFEXOTR: '0', VLRTOTAL: '100.556', PAGOSUSUC: '0'
};
const SECOND_ROW = { ...DETAIL_ROW, NUID: 'XYZ', CUENTA: '100' };

const SUMMARY = {
  title: 'F853GR02',
  meta: { dialogHeader: 'F853GR02 | Resumen' },
  SIN_MOVIMIENTO: { headers: [{ field: 'APS', header: 'APS' }, { field: 'ANNO', header: 'Año' }, { field: 'MES', header: 'Mes' }] },
  data: [
    { APS: 'APS Norte', ANNO: '2024', MES: ' 3' },
    { APS: 'APS Sur', ANNO: '2024', MES: '3' },
    { APS: 'APS Norte', ANNO: '2023', MES: '3' },
    { APS: 'APS Norte', ANNO: '2024', MES: '4' }
  ]
};

function setup(options: { render?: boolean } = {}) {
  const catalog = {
    tcfgAps: vi.fn(() => of({ status: 200, data: [{ TCFG_APS_ID: 17, NOMBRE_APS: 'APS Norte' }, { TCFG_APS_ID: 18, NOMBRE_APS: 'APS Sur' }] }))
  };
  const service = {
    detail: vi.fn(() => of({ status: 'success', data: [DETAIL_ROW, SECOND_ROW], message: '' })),
    summary: vi.fn(() => of({ status: 'success', data: SUMMARY, message: '' }))
  };
  TestBed.configureTestingModule({
    imports: [Sui853ComercialComponent],
    providers: [
      { provide: Sui853ConfiguracionService, useValue: catalog },
      { provide: Sui853ComercialService, useValue: service }
    ]
  });
  if (!options.render) TestBed.overrideComponent(Sui853ComercialComponent, { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(Sui853ComercialComponent);
  fixture.detectChanges();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component = fixture.componentInstance as any;
  return { fixture, component, catalog, service };
}

function query(component: any): void {
  component.selectedApsId = '17';
  component.year = 2024;
  component.month = 3;
  component.consultar();
}

describe('Sui853ComercialComponent', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => localStorage.clear());

  describe('M1 - APS selector uses the SUI catalog tcfgAps', () => {
    it('loads the APS options from tcfgAps (TCFG_APS_ID / NOMBRE_APS)', () => {
      const { component, catalog } = setup();

      expect(catalog.tcfgAps).toHaveBeenCalledTimes(1);
      expect(component.options).toEqual([
        { label: 'APS Norte (17)', value: '17' },
        { label: 'APS Sur (18)', value: '18' }
      ]);
    });

    it('queries the detail with the selected TCFG_APS_ID, year and month', () => {
      const { component, service } = setup();
      query(component);

      expect(service.detail).toHaveBeenCalledWith({ apsId: '17', year: 2024, month: 3 });
      expect(service.summary).toHaveBeenCalledTimes(1);
    });

    it('does not query while the selection is incomplete', () => {
      const { component, service } = setup();
      component.selectedApsId = '17';
      component.year = 2024;
      component.consultar();

      expect(service.detail).not.toHaveBeenCalled();
      expect(component.queried).toBe(false);
    });
  });

  describe('M2 - F853GR02 summary filtered by APS name, year and month (legacy resumenFilteredData)', () => {
    it('keeps only the summary rows of the selected APS name, year and month (string ANNO/MES)', () => {
      const { component } = setup();
      query(component);

      expect(component.summaryRows).toEqual([{ APS: 'APS Norte', ANNO: '2024', MES: ' 3' }]);
    });

    it('does not show the old "no filtra" note on the summary tab', () => {
      const { fixture, component } = setup({ render: true });
      query(component);
      component.tab = 'summary';
      fixture.detectChanges();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(text).not.toContain('no filtra');
      expect(text).toContain('F853GR02 | Resumen');
    });
  });

  describe('Formats and headers (legacy tgenComercial.vue columns)', () => {
    it('shows the legacy columns with numbered headers and hides EMPRESA and DEVEPENXOTR', () => {
      const { component } = setup();
      query(component);
      const columns = component.detailColumns as { field: string; header: string }[];

      expect(columns).toHaveLength(57);
      expect(columns.slice(0, 6).map(c => c.header)).toEqual(['APS', 'NOMAPS', 'ANNO', 'MES', '1. NUID', '2. CUENTA']);
      expect(columns.find(c => c.field === 'PRODUCCION')?.header).toBe('27. PRODUCCION');
      expect(columns.find(c => c.field === 'DEVFEXOTR')?.header).toBe('51. DEVFEXOTR');
      expect(columns[56]).toMatchObject({ field: 'PAGOSUSUC', header: '53. PAGOSUSUC' });
      expect(columns.map(c => c.field)).not.toContain('EMPRESA');
      expect(columns.map(c => c.field)).not.toContain('DEVEPENXOTR');
    });

    it('formats values on screen like the legacy template (dates MM-DD-YYYY, per-field decimals)', () => {
      const { component } = setup();
      query(component);
      const row = component.displayRows[0];

      expect(row).toMatchObject({
        FECHAEXA: '03-05-2024', FECHAINI: '02-01-2024', PRODUCCION: '1.5000000', FACPRODUC: '0.500',
        TRLU: '2.000', TRBL: '2.100', TRA: '0.250', TRRA: '1.000', FACTORSUBC: '0.123',
        DIASFAC: '30', FACTCONJUN: '2', TFC: '1234.50', VLRTOTAL: '100.56', ANNO: '2024', MUNI: '1', DEPTO: '5'
      });
    });

    it('applies the legacy per-column filters (APS, NOMAPS, ANNO, MES, NUID, CUENTA) by exact, case-insensitive match', () => {
      const { component } = setup();
      query(component);

      expect(component.filterFields).toEqual(['APS', 'NOMAPS', 'ANNO', 'MES', 'NUID', 'CUENTA']);
      component.filters.NUID = 'abc';
      component.applyFilters();
      expect(component.filteredRows.map((r: { NUID: string }) => r.NUID)).toEqual(['ABC']);
      component.filters.NUID = 'ab';
      component.applyFilters();
      expect(component.filteredRows).toEqual([]);
    });
  });

  describe('M3 - legacy custom export', () => {
    it('exports every backend field with the field name as header and the legacy default-unchecked columns', () => {
      const { component } = setup();
      query(component);

      expect(component.exportColumns).toEqual(Object.keys(DETAIL_ROW).map(field => ({ field, header: field })));
      expect(component.exportUnchecked).toEqual(['APS', 'NOMAPS', 'ANNO', 'MES', 'EMPRESA', 'DEVFEXOTR']);
    });

    it('formats export rows: MUNI/POBLADO padded to 3, dates, per-field decimals', () => {
      const { component } = setup();
      query(component);
      const row = component.exportRows[0];

      expect(row).toMatchObject({
        MUNI: '001', POBLADO: '000', FECHAEXA: '03-05-2024', FECHAINI: '02-01-2024',
        ANNO: '2024', MES: '3', DEPTO: '5', METODOL: '1', DIASFAC: '30', FACTCONJUN: '2',
        PRODUCCION: '1.5000000', TRLU: '2.000', FACTORSUBC: '0.123', FACPRODUC: '0.500',
        TFC: '1234.50', DEVEPENXOTR: '3.46', VLRTOTAL: '100.56', EMPRESA: 'Veolia', NUID: 'ABC'
      });
    });

    it('exports only the rows left by the column filters', () => {
      const { component } = setup();
      query(component);
      component.filters.CUENTA = '100';
      component.applyFilters();

      expect(component.exportRows.map((r: { NUID: string }) => r.NUID)).toEqual(['XYZ']);
    });

    it('names the file "APS mes año" and falls back to "archivo"', () => {
      const { component } = setup();
      expect(component.exportFileName).toBe('archivo');
      query(component);

      expect(component.exportFileName).toBe('APS Norte marzo 2024');
    });
  });
});

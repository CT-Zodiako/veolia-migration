import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ResiduosGeneradosComponent } from './residuos-generados.component';
import { Sui853ConfiguracionService } from '../../services/sui853-configuracion.service';
import { Sui853OperacionesService } from '../../services/sui853-operaciones.service';

// Detail row as the backend sends it: OracleDecimal values as "."-decimal strings, dates as ISO.
const ROW = {
  APS: '17', NOMAPS: 'APS Norte', ANNO: '2024', MES: '3', NUAP: '440', TIP_SITIO: '1.000', NRO_SITIO: '7',
  PLACA: 'ABC123', FEC_ENTRADA: '2024-03-05T00:00:00', HOR_ENTRADA: '7:5:00', HOR_SALIDA: '1433', NUM_MICRO: '2',
  TON_RBU: '1.23456', TON_RBR: '2', TON_RSOU: '0.5', TON_RSOR: '10', SIS_MEDICION: '1', TON_APROVE: '3.1',
  VLR_PEAJES: '1500.6', FEC_REGIST: '2024-04-01T10:00:00', USU_REG: 'admin'
};
const OTHER = { ...ROW, NUAP: '441', PLACA: 'XYZ999', TIP_SITIO: '2' };

const SUMMARY = {
  title: 'F853GR02',
  SIN_MOVIMIENTO: { title: 'Sin movimiento', headers: [{ field: 'APS', header: 'APS' }, { field: 'ANNO', header: 'Año' }, { field: 'MES', header: 'Mes' }] },
  data: [
    { APS: 'APS Norte', ANNO: '2024', MES: '3' },
    { APS: 'APS Sur', ANNO: '2024', MES: '3' },
    { APS: 'APS Norte', ANNO: '2024', MES: '03 ' },
    { APS: 'APS Norte', ANNO: '2022', MES: '3' }
  ]
};

function setup(options: { render?: boolean } = {}) {
  const catalog = {
    tcfgAps: vi.fn(() => of({ status: 200, data: [{ TCFG_APS_ID: 17, NOMBRE_APS: 'APS Norte' }, { TCFG_APS_ID: 18, NOMBRE_APS: 'APS Sur' }] }))
  };
  const service = {
    detail: vi.fn(() => of({ status: 'success', data: [ROW, OTHER] })),
    summary: vi.fn(() => of({ status: 'success', data: SUMMARY }))
  };
  TestBed.configureTestingModule({
    imports: [ResiduosGeneradosComponent],
    providers: [
      { provide: Sui853ConfiguracionService, useValue: catalog },
      { provide: Sui853OperacionesService, useValue: service }
    ]
  });
  if (!options.render) TestBed.overrideComponent(ResiduosGeneradosComponent, { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(ResiduosGeneradosComponent);
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

describe('ResiduosGeneradosComponent (20001, legacy operaciones/residuosGenerados.vue)', () => {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => localStorage.clear());

  it('keeps the SUI tcfgAps catalog and queries with the selected TCFG_APS_ID', () => {
    const { component, catalog, service } = setup();
    query(component);

    expect(catalog.tcfgAps).toHaveBeenCalledTimes(1);
    expect(service.detail).toHaveBeenCalledWith({ apsId: '17', year: 2024, month: 3 });
  });

  it('shows the legacy columns in legacy order with the descriptive numbered headers', () => {
    const { component } = setup();
    query(component);

    expect((component.detailColumns as { field: string; header: string }[]).map(c => [c.field, c.header])).toEqual([
      ['APS', 'APS'], ['NOMAPS', 'NOMAPS'], ['ANNO', 'ANNO'], ['MES', 'MES'],
      ['NUAP', '1. NUAP'], ['TIP_SITIO', '2. TIPO DE SITIO DE DESTINO'], ['NRO_SITIO', '3. NÚMERO DEL SITIO DE DESTINO'],
      ['PLACA', '4. PLACA VEHICULO'], ['FEC_ENTRADA', '5. FECHA DE ENTRADA DEL VEHÍCULO'],
      ['HOR_ENTRADA', '6. HORA DE ENTRADA DEL VEHICULO'], ['NUM_MICRO', '7. NUMICRO'],
      ['TON_RBU', '8. TONELADAS DE LIMPIEZA URBANA'], ['TON_RBR', '9. TONELADAS DE BARRIDO Y LIMPIEZA'],
      ['TON_RSOU', '10. TONELADAS DE RESIDUOS NO APROVECHABLES'], ['TON_RSOR', '11. TONELADAS DE RECHAZO DEL APROVECHAMIENTO'],
      ['TON_APROVE', '12. TONELADAS APROVECHADAS'], ['SIS_MEDICION', '13. SISTEMA DE MEDICIÓN'], ['VLR_PEAJES', '14. VLR_PEAJES'],
      ['HOR_SALIDA', 'HOR_SALIDA'], ['FEC_REGIST', 'FEC_REGIST'], ['USU_REG', 'USU_REG']
    ]);
  });

  it('formats values like legacy: TON_* 3 decimals, VLR_PEAJES 0, HH:MM, MM-DD-YYYY dates, TIP_SITIO integer', () => {
    const { component } = setup();
    query(component);

    expect(component.displayRows[0]).toMatchObject({
      TON_RBU: '1.235', TON_RBR: '2.000', TON_RSOU: '0.500', TON_RSOR: '10.000', TON_APROVE: '3.100',
      VLR_PEAJES: '1501', HOR_ENTRADA: '07:05', HOR_SALIDA: '14:33', FEC_ENTRADA: '03-05-2024',
      FEC_REGIST: '04-01-2024', TIP_SITIO: '1', NRO_SITIO: '7', USU_REG: 'admin'
    });
    expect(component.displayRows[1].TIP_SITIO).toBe('2');
  });

  it('applies the legacy per-column filters (APS, NOMAPS, ANNO, MES, NUAP, PLACA) by exact, case-insensitive match', () => {
    const { component } = setup();
    query(component);

    expect(component.filterFields).toEqual(['APS', 'NOMAPS', 'ANNO', 'MES', 'NUAP', 'PLACA']);
    component.filters.PLACA = 'xyz999';
    component.applyFilters();
    expect(component.displayRows.map((r: { NUAP: string }) => r.NUAP)).toEqual(['441']);
    expect(component.exportRows.map((r: { NUAP: string }) => r.NUAP)).toEqual(['441']);
    component.filters.PLACA = 'xyz';
    component.applyFilters();
    expect(component.displayRows).toEqual([]);
  });

  it('O1: filters the F853GR02 summary by the selected APS name, year and month', () => {
    const { component } = setup();
    query(component);

    expect(component.summaryTables).toHaveLength(1);
    expect(component.summaryTables[0].rows).toEqual([
      { APS: 'APS Norte', ANNO: '2024', MES: '3' },
      { APS: 'APS Norte', ANNO: '2024', MES: '03 ' }
    ]);
  });

  it('does not show the old "no se limita" note', () => {
    const { fixture, component } = setup({ render: true });
    query(component);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('no se limita');
    expect(text).toContain('Sin movimiento');
  });

  it('exports with the legacy column list, headers, default-unchecked columns, formatted rows and "APS mes año" name', () => {
    const { component } = setup();
    expect(component.exportFileName).toBe('archivo');
    query(component);

    expect(component.exportColumns).toEqual([
      { field: 'APS', header: 'APS' }, { field: 'NOMAPS', header: 'NOMAPS' }, { field: 'ANNO', header: 'ANNO' },
      { field: 'MES', header: 'MES' }, { field: 'NUAP', header: 'NUAP' },
      { field: 'TIP_SITIO', header: 'TIPO DE SITIO DE DESTINO' }, { field: 'NRO_SITIO', header: 'NÚMERO DEL SITIO DE DESTINO' },
      { field: 'PLACA', header: 'PLACA VEHICULO' }, { field: 'FEC_ENTRADA', header: 'FECHA DE ENTRADA DEL VEHÍCULO' },
      { field: 'HOR_ENTRADA', header: 'HORA DE ENTRADA DEL VEHICULO' }, { field: 'NUM_MICRO', header: 'NUMICRO' },
      { field: 'TON_RBU', header: 'TONELADAS DE LIMPIEZA URBANA' }, { field: 'TON_RBR', header: 'TONELADAS DE BARRIDO Y LIMPIEZA' },
      { field: 'TON_RSOU', header: 'TONELADAS DE RESIDUOS NO APROVECHABLES' },
      { field: 'TON_RSOR', header: 'TONELADAS DE RECHAZO DEL APROVECHAMIENTO' },
      { field: 'TON_APROVE', header: 'TONELADAS APROVECHADAS' }, { field: 'SIS_MEDICION', header: 'SISTEMA DE MEDICIÓN' },
      { field: 'HOR_SALIDA', header: 'HORA DE SALIDA DEL VEHICULO' }, { field: 'VLR_PEAJES', header: 'VALOR DE PEAJES ($)' },
      { field: 'FEC_REGIST', header: 'FECHA DE REGISTRO' }, { field: 'USU_REG', header: 'USUARIO REGISTRO' }
    ]);
    expect(component.exportUnchecked).toEqual(['USU_REG', 'APS', 'NOMAPS', 'ANNO', 'MES', 'HOR_SALIDA', 'FEC_REGIST']);
    expect(component.exportRows[0]).toMatchObject({ TON_RBU: '1.235', VLR_PEAJES: '1501', HOR_ENTRADA: '07:05', FEC_ENTRADA: '03-05-2024', TIP_SITIO: '1' });
    expect(component.exportFileName).toBe('APS Norte marzo 2024');
  });
});

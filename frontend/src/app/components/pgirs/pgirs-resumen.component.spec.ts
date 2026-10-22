import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { PgirsResumenComponent } from './pgirs-resumen.component';
import { PgirsService } from '../../services/pgirs.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';

// Legacy screen: front-tarificador/src/views/pgirs/InformePgirs.vue ("Informe PGIRS", route /infopgirs), which calls
// pgirsService.informePgirs -> POST pgirs/infoPgirs (vgirs_informe) and getBarridoVariablesPgirs (VGIRS_INFORMELBL).

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const CLUS_ROW = {
  APSID: 7, APSA_NOMAPS: 'Tunja', PERIODO: '2025-03',
  PODA: 1.23456, PODACOLOR: 'rojo', PODAPGIRS: 2,
  CESPED: 3.14159, CESPEDCOLOR: 'azul', CESPEDPGIRS: 4,
  LAVADO: 5.5, LAVADOCOLOR: 'verde', LAVADOPGIRS: 6,
  PLAYAS: 7, PLAYASCOLOR: 'rojo', PLAYASPGIRS: 8,
  CESTASINS: 9.999, CESTASINSCOLOR: 'verde', CESTASINSPGIRS: 10,
  CESTASMAN: 1.23456, CESTASMANCOLOR: 'verde', CESTASMANPGIRS: 12.345
};
const BARRIDO_ROW = { APSID: 7, APSA_NOMAPS: 'Tunja', PERIODO: '2025-03', SEMESTRE: 1, BARRIDO: 2.345, BARRIDOCOLOR: 'rojo', BARRIDOPGIRS: 3 };

function crear() {
  localStorage.clear();
  const service = {
    getResumen: vi.fn(() => of({ status: true, data: [CLUS_ROW], message: 'OK' })),
    getBarrido: vi.fn(() => of({ status: true, data: [BARRIDO_ROW], message: 'OK' }))
  };
  TestBed.configureTestingModule({
    imports: [PgirsResumenComponent],
    providers: [
      { provide: PgirsService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(PgirsResumenComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service };
}

function tablas(fixture: ReturnType<typeof crear>['fixture']): TablaAvanzadaComponent[] {
  return fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent)).map((d) => d.componentInstance as TablaAvanzadaComponent);
}

function celdas(fixture: ReturnType<typeof crear>['fixture'], tabla: number): string[] {
  const hosts = fixture.nativeElement.querySelectorAll('app-tabla-avanzada') as NodeListOf<HTMLElement>;
  return Array.from(hosts[tabla].querySelectorAll('tbody td') as NodeListOf<HTMLElement>).map((td) => td.textContent?.trim() ?? '');
}

describe('PgirsResumenComponent (Informe PGIRS, legacy InformePgirs.vue)', () => {
  // InformePgirs.vue:217-224: selecting the APS loads infoPgirs (Clus tab) and barridoVariablesPgirs (Barrido tab).
  it('loads the Clus and Barrido data of the selected APS', () => {
    const { fixture, component, service } = crear();

    component.onApsChange(7);
    fixture.detectChanges();

    expect(service.getResumen).toHaveBeenCalledWith(7);
    expect(service.getBarrido).toHaveBeenCalledWith(7);
    expect(component.data()).toEqual([CLUS_ROW]);
    expect(component.dataBarrido()).toEqual([BARRIDO_ROW]);
  });

  // InformePgirs.vue:26-123 (Clus) and 142-172 (Barrido): column fields, headers and order; every column sortable.
  it('shows the legacy Clus and Barrido columns in legacy order', () => {
    const { component } = crear();

    expect(component.columnasClus.map((c) => [c.field, c.header])).toEqual([
      ['APSID', 'APS'], ['APSA_NOMAPS', 'NOM APS'], ['PERIODO', 'PERIODO'], ['PODA', 'PODA'], ['PODAPGIRS', 'PODA PGIRS'],
      ['CESPED', 'CESPED'], ['CESPEDPGIRS', 'CESPED PGIRS'], ['LAVADO', 'LAVADO'], ['LAVADOPGIRS', 'LAVADO PGIRS'],
      ['PLAYAS', 'PLAYA'], ['PLAYASPGIRS', 'PLAYA PGIRS'], ['CESTASINS', 'I CEST'], ['CESTASINSPGIRS', 'I CEST PGIRS'],
      ['CESTASMAN', 'M CEST'], ['CESTASMANPGIRS', 'M CEST PGIRS']
    ]);
    expect(component.columnasBarrido.map((c) => [c.field, c.header])).toEqual([
      ['APSID', 'APS'], ['APSA_NOMAPS', 'NOM APS'], ['PERIODO', 'PERIODO'], ['SEMESTRE', 'SEMESTRE'],
      ['BARRIDO', 'BARRIDO'], ['BARRIDOPGIRS', 'BARRIDO PGIRS']
    ]);
  });

  // InformePgirs.vue:227-233 definirColor: the *COLOR field of the row ("rojo" -> red, "azul" -> blue, else green) colours
  // each measured value; every "... PGIRS" target column is blue; APS/NOM APS/PERIODO/SEMESTRE are not coloured.
  it('colours the cells with the legacy definirColor rule', () => {
    const { component } = crear();
    const clase = (field: string, row: Record<string, unknown> = CLUS_ROW) =>
      component.cellClassMedido(row, { field, header: field });

    expect(clase('PODA')).toBe('color-red');
    expect(clase('CESPED')).toBe('color-blue');
    expect(clase('LAVADO')).toBe('color-green');
    expect(clase('PODAPGIRS')).toBe('color-blue');
    expect(clase('CESTASMANPGIRS')).toBe('color-blue');
    expect(clase('BARRIDO', BARRIDO_ROW)).toBe('color-red');
    expect(clase('BARRIDOPGIRS', BARRIDO_ROW)).toBe('color-blue');
    expect(['APSID', 'APSA_NOMAPS', 'PERIODO', 'SEMESTRE'].map((f) => clase(f))).toEqual(['', '', '', '']);
  });

  // InformePgirs.vue:38-121,161-169 + fourDecimalPlaces (:234-236, parseFloat(n).toFixed(2)): every measured column shows
  // 2 decimals except M CEST (:112-114), which is rendered raw.
  it.skip('PARITY-FINDING: legacy Informe PGIRS shows every measure with toFixed(2) (InformePgirs.vue:234-236) except M CEST; new tabla shows raw values (no decimales on COLUMNAS_CLUS/COLUMNAS_BARRIDO)', () => {
    const { fixture, component } = crear();
    component.onApsChange(7);
    fixture.detectChanges();

    const fix2 = (n: number) => parseFloat(String(n)).toFixed(2);
    expect(celdas(fixture, 0)).toEqual([
      '7', 'Tunja', '2025-03', fix2(1.23456), fix2(2), fix2(3.14159), fix2(4), fix2(5.5), fix2(6), fix2(7), fix2(8),
      fix2(9.999), fix2(10), '1.23456', fix2(12.345)
    ]);
    component.onTabChange(1);
    fixture.detectChanges();
    expect(celdas(fixture, 1)).toEqual(['7', 'Tunja', '2025-03', '1', fix2(2.345), fix2(3)]);
  });

  // InformePgirs.vue:17-19,134-136: 15 rows per page, [15, 30, 50, 100]; column filters only on PERIODO (Clus, :29-34)
  // and on PERIODO + SEMESTRE (Barrido, :145-156).
  it.skip('PARITY-FINDING: legacy Informe PGIRS grids page 15 rows with [15,30,50,100] and filter only PERIODO (Clus) / PERIODO+SEMESTRE (Barrido) (InformePgirs.vue:17-34,134-156); new uses the tabla default 10/[10,20,50] and also filters NOM APS', () => {
    const { fixture, component } = crear();
    component.onApsChange(7);
    fixture.detectChanges();

    const [clus] = tablas(fixture);
    expect(clus.filasPorPagina).toBe(15);
    expect(clus.rowsPerPageOptionsList).toEqual([15, 30, 50, 100]);
    expect(component.columnasClus.filter((c) => c.filtrable).map((c) => c.field)).toEqual(['PERIODO']);
    expect(component.columnasBarrido.filter((c) => c.filtrable).map((c) => c.field)).toEqual(['PERIODO', 'SEMESTRE']);
  });
});

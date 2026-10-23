import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HistoricoReversionComponent } from './historico-reversion.component';
import { SuministrosService } from '../../services/suministros.service';

const FILAS = [
  { id: 2, aps: 5, anno: 2026, mes: 2, motivo: 'Error de cargue', fecha: '2026-02-03T10:30:00', usuario: 'ana@veolia.co', nombreAps: 'SAN PEDRO' },
  { id: 1, aps: 7, anno: 2025, mes: 11, motivo: 'Ajuste', fecha: '2025-11-20T08:00:00', usuario: 'luis@veolia.co', nombreAps: 'CARTAGENA' }
];

function setup() {
  const service = { getReversion: vi.fn(() => of(FILAS)) };
  TestBed.configureTestingModule({
    imports: [HistoricoReversionComponent],
    providers: [{ provide: SuministrosService, useValue: service }]
  });
  const fixture = TestBed.createComponent(HistoricoReversionComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, service, el: fixture.nativeElement as HTMLElement };
}

function headers(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('thead tr:first-child th')).map((th) => th.textContent?.trim() ?? '');
}

describe('HistoricoReversionComponent (3002) — legacy views/informes/DetaReversion.vue', () => {
  // Legacy DetaReversion.vue (created -> getReversar): loads the whole history once, 10 rows per page.
  it('loads the reversal history on start and pages by 10', () => {
    const { component, service, el } = setup();

    expect(service.getReversion).toHaveBeenCalledTimes(1);
    expect(component.rows).toEqual(FILAS);
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.querySelector('.p-paginator')).not.toBeNull();
  });

  // Legacy DetaReversion.vue:35-45 filters APS by "contains".
  it('filters by APS name with "contains"', () => {
    const { fixture, component } = setup();

    component.apsFilter = 'cart';
    fixture.detectChanges();

    expect(component.filteredRows.map((r) => r.nombreAps)).toEqual(['CARTAGENA']);
  });

  // Legacy DetaReversion.vue:31-135 columns APS, AÑO, MES, FECHA, MOTIVO, USUARIO.
  it('shows the legacy columns APS, AÑO, MES, FECHA, MOTIVO, USUARIO', () => {
    const { el } = setup();

    expect(headers(el)).toEqual(['APS', 'AÑO', 'MES', 'FECHA', 'MOTIVO', 'USUARIO']);
  });

  // Legacy DetaReversion.vue:9-30: Exportar button (CSV ';', file DetalleReversiones) and rows per page 10/20/50.
  it('offers Exportar and the legacy 10/20/50 rows-per-page selector', () => {
    const { el } = setup();

    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Exportar'))).toBe(true);
    expect(el.querySelector('.p-paginator p-select, .p-paginator .p-select')).not.toBeNull();
  });
});

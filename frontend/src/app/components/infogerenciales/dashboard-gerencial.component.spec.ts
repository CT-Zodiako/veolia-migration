import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardGerencialComponent } from './dashboard-gerencial.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { congelarHoy, estadoParametros } from './informes-gerenciales.spec-helpers';

const filas = [
  { APSA_ID: 1, APSA_NOMAPS: 'APS Uno', TARI_FECHACREACION: '2025-01-15T10:20:00', SISU_CORREO: 'a@x.co' },
  { APSA_ID: 2, APSA_NOMAPS: 'APS Dos', TARI_FECHACREACION: null, SISU_CORREO: null },
  { APSA_ID: 3, APSA_NOMAPS: 'APS Tres', TARI_FECHACREACION: '2025-01-15T08:00:00', SISU_CORREO: 'c@x.co' },
  { APSA_ID: 4, APSA_NOMAPS: 'APS Cuatro', TARI_FECHACREACION: '2025-01-20T09:00:00', SISU_CORREO: 'd@x.co' }
];

function crear(anno: number | null = null, mes: number | null = null) {
  const getDashBoardGerencial = vi.fn(() => of({ status: 'ok', data: filas, message: '' }));
  TestBed.configureTestingModule({
    imports: [DashboardGerencialComponent],
    providers: [{ provide: InfoGerencialService, useValue: { getDashBoardGerencial } }, estadoParametros(anno, mes)]
  });
  const fixture = TestBed.createComponent(DashboardGerencialComponent);
  fixture.detectChanges();
  return { fixture, getDashBoardGerencial };
}

const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function filasTabla(fixture: ReturnType<typeof crear>['fixture']): HTMLTableRowElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('app-tabla-avanzada tbody tr'));
}

function chip(fixture: ReturnType<typeof crear>['fixture'], etiqueta: string): HTMLButtonElement {
  const chips: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.estado-chip'));
  return chips.find((c) => texto(c).startsWith(etiqueta))!;
}

// Legacy informesgerenciales/DashBoard.vue: created() loads stDate ?? today - 1 month for every APS;
// "Estado calculo" is sortable by the raw date and only the cell shows dd/mm/yyyy (formatDateColumn).
describe('DashboardGerencialComponent (604)', () => {
  beforeEach(congelarHoy);
  afterEach(() => vi.useRealTimers());

  it('loads today - 1 month on entry, once, and shows every APS without an APS selector', () => {
    const { fixture, getDashBoardGerencial } = crear();

    expect(getDashBoardGerencial).toHaveBeenCalledTimes(1);
    expect(getDashBoardGerencial).toHaveBeenCalledWith(2025, 12);
    expect(fixture.componentInstance.rows().map((r) => r['APSA_NOMAPS'])).toEqual(['APS Uno', 'APS Dos', 'APS Tres', 'APS Cuatro']);
    expect(fixture.nativeElement.querySelector('app-aps-selector')).toBeNull();
  });

  it('uses the saved año/mes when the user already picked one', () => {
    const { getDashBoardGerencial } = crear(2025, 6);

    expect(getDashBoardGerencial).toHaveBeenCalledWith(2025, 5);
  });

  it('requests the previous month again when año or mes change', () => {
    const { fixture, getDashBoardGerencial } = crear(2025, 6);

    fixture.componentInstance.onMesChange(3);
    expect(getDashBoardGerencial).toHaveBeenLastCalledWith(2025, 2);
    fixture.componentInstance.onAnnoChange(2024);
    expect(getDashBoardGerencial).toHaveBeenLastCalledWith(2024, 2);
  });

  it('keeps the raw date in the row (sortable) and formats it only in the cell', () => {
    const { fixture } = crear();
    const component = fixture.componentInstance;

    expect(component.rows()[0]['TARI_FECHACREACION']).toBe('2025-01-15T10:20:00');
    expect(component.rows()[1]['TARI_FECHACREACION']).toBeNull();
    expect(texto(filasTabla(fixture)[0])).toContain('15/01/2025');
  });

  it('renders the estado pill with the date, or Pendiente with "Sin cálculo", and "—" for an empty user', () => {
    const { fixture } = crear();
    const [uno, dos] = filasTabla(fixture);

    const pillUno = uno.querySelector('.estado-pill')!;
    expect(pillUno.classList).toContain('estado-calculado');
    expect(texto(pillUno)).toBe('Calculado');
    expect(texto(uno.querySelector('.estado-detalle'))).toBe('15/01/2025');
    expect(texto(uno)).toContain('a@x.co');

    const pillDos = dos.querySelector('.estado-pill')!;
    expect(pillDos.classList).toContain('estado-pendiente');
    expect(texto(pillDos)).toBe('Pendiente');
    expect(texto(dos.querySelector('.estado-detalle'))).toBe('Sin cálculo');
    expect(texto(dos)).toContain('—');
    expect(texto(dos)).not.toContain('N/A');
  });

  it('tints every cell of a pending row and none of a calculated row', () => {
    const { fixture } = crear();
    const [uno, dos] = filasTabla(fixture);

    expect(uno.querySelectorAll('td.fila-pendiente').length).toBe(0);
    expect(dos.querySelectorAll('td').length).toBeGreaterThan(0);
    expect(dos.querySelectorAll('td.fila-pendiente').length).toBe(dos.querySelectorAll('td').length);
  });

  it('shows the KPI cards from all the rows of the period', () => {
    const { fixture } = crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(texto(el.querySelector('.kpi-calculados .kpi-valor'))).toBe('3');
    expect(texto(el.querySelector('.kpi-calculados .kpi-total'))).toBe('de 4');
    expect(texto(el.querySelector('.kpi-calculados .kpi-pie'))).toBe('75 % con cálculo');
    expect((el.querySelector('.kpi-calculados .progreso-relleno') as HTMLElement).style.width).toBe('75%');
    expect(texto(el.querySelector('.kpi-pendientes .kpi-valor'))).toBe('1');
    expect(Array.from(el.querySelectorAll('.kpi-pendientes .chip-pendiente')).map(texto)).toEqual(['APS Dos']);
    expect(texto(el.querySelector('.kpi-ultimo .kpi-fecha'))).toBe('20/01/2025');
    expect(texto(el.querySelector('.kpi-ultimo .kpi-pie'))).toBe('APS Cuatro');
    expect(el.textContent).not.toContain('10 primeros APS');
  });

  it('shows the first pending names and "+N" for the rest', () => {
    const { fixture } = crear();
    fixture.componentInstance.rows.set(
      ['A', 'B', 'C', 'D', 'E'].map((n, i) => ({ APSA_ID: i, APSA_NOMAPS: n, TARI_FECHACREACION: null, SISU_CORREO: null }))
    );
    fixture.detectChanges();

    const chips = Array.from<Element>(fixture.nativeElement.querySelectorAll('.kpi-pendientes .chip-pendiente')).map(texto);
    expect(chips).toEqual(['A', 'B', 'C', '+2']);
  });

  it('draws one bar per day ascending, Pendiente last, proportional to the max', () => {
    const { fixture } = crear();
    const barras: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.barra-fila'));

    expect(barras.map((b) => [texto(b.querySelector('.barra-etiqueta')), texto(b.querySelector('.barra-cantidad'))])).toEqual([
      ['15/01', '2'],
      ['20/01', '1'],
      ['Pendiente', '1']
    ]);
    expect(barras.map((b) => (b.querySelector('.barra-relleno') as HTMLElement).style.width)).toEqual(['100%', '50%', '50%']);
    expect(barras[2].classList).toContain('barra-pendiente');
  });

  it('filters the table rows with the chips and shows their counts', () => {
    const { fixture } = crear();

    expect(texto(chip(fixture, 'Todos'))).toBe('Todos · 4');
    expect(texto(chip(fixture, 'Calculados'))).toBe('Calculados · 3');
    expect(texto(chip(fixture, 'Pendientes'))).toBe('Pendientes · 1');
    expect(chip(fixture, 'Todos').getAttribute('aria-pressed')).toBe('true');
    expect(filasTabla(fixture).length).toBe(4);

    chip(fixture, 'Pendientes').click();
    fixture.detectChanges();
    expect(filasTabla(fixture).map((tr) => texto(tr))).toEqual([expect.stringContaining('APS Dos')]);
    expect(chip(fixture, 'Pendientes').getAttribute('aria-pressed')).toBe('true');
    expect(chip(fixture, 'Todos').getAttribute('aria-pressed')).toBe('false');

    chip(fixture, 'Calculados').click();
    fixture.detectChanges();
    expect(filasTabla(fixture).length).toBe(3);
    expect(filasTabla(fixture).some((tr) => texto(tr).includes('APS Dos'))).toBe(false);

    chip(fixture, 'Todos').click();
    fixture.detectChanges();
    expect(filasTabla(fixture).length).toBe(4);
  });
});

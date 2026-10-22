import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ParametrosConsultaComponent } from './parametros-consulta.component';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// Legacy: front-tarificador/src/components/Selector.vue — APS dropdown + month/year calendar in one bar (:3-26);
// every change stores { aps, date } and emits ChangeSelector (:171-180); with no stored date it defaults to the
// current month (:153-158). The "Consultar" button, autoConsultar and parametrosIncompletos have no legacy
// equivalent (pinned current behavior).

function setup(inputs: Partial<ParametrosConsultaComponent> = {}) {
  localStorage.setItem('usuario', JSON.stringify({ SISU_ID: 7 }));
  const state = {
    getAps: vi.fn(() => null), setAps: vi.fn(),
    getAnno: vi.fn(() => null), setAnno: vi.fn(),
    getMes: vi.fn(() => null), setMes: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [ParametrosConsultaComponent],
    providers: [
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [], sinAsignar: [] })) } },
      { provide: ParametrosConsultaStateService, useValue: state }
    ]
  });
  const fixture = TestBed.createComponent(ParametrosConsultaComponent);
  Object.assign(fixture.componentInstance, inputs);
  const c = fixture.componentInstance;
  const log: string[] = [];
  c.apsChange.subscribe(v => log.push(`aps:${v}`));
  c.annoChange.subscribe(v => log.push(`anno:${v}`));
  c.mesChange.subscribe(v => log.push(`mes:${v}`));
  c.consultar.subscribe(() => log.push('consultar'));
  c.parametrosIncompletos.subscribe(() => log.push('incompletos'));
  fixture.detectChanges();
  return { fixture, component: c, log, el: fixture.nativeElement as HTMLElement };
}

describe('ParametrosConsultaComponent (legacy components/Selector.vue)', () => {
  afterEach(() => localStorage.clear());

  // Legacy Selector.vue:3-26: APS + period selectors in one bar; pinned labels APS / Año / Mes and the Consultar button.
  it('renders APS, Año and Mes selectors and the Consultar button', () => {
    const { el } = setup();
    expect(Array.from(el.querySelectorAll('label')).map(l => l.textContent?.trim()).filter(Boolean)).toEqual(['APS', 'Año', 'Mes']);
    expect(el.querySelector('p-button button')?.textContent?.trim()).toBe('Consultar');
  });

  // Pinned: mostrarAps=false hides the APS selector (screens without APS).
  it('hides the APS selector when mostrarAps is false', () => {
    const { el } = setup({ mostrarAps: false });
    expect(el.querySelector('app-aps-selector')).toBeNull();
  });

  // Legacy Selector.vue:171-180 forwards each change; pinned: incomplete params emit parametrosIncompletos.
  // The period starts on the current month (legacy Selector.vue:153-158), so clearing the year makes it incomplete.
  it('forwards each change and reports incomplete parameters', () => {
    const { component, log } = setup();
    log.length = 0;
    component.onAnnoChange(null);
    component.onApsChange(1);
    expect(log).toEqual(['anno:null', 'incompletos', 'aps:1', 'incompletos']);
  });

  // Pinned: with autoConsultar, completing APS/año/mes triggers consultar and hides the button.
  it('auto-queries when all parameters are complete with autoConsultar', () => {
    const { fixture, component, log, el } = setup({ autoConsultar: true });
    fixture.detectChanges();
    expect(el.querySelector('p-button')).toBeNull();
    component.onApsChange(1);
    component.onAnnoChange(2025);
    component.onMesChange(6);
    expect(log.at(-1)).toBe('consultar');
  });

  // Pinned: without autoConsultar complete parameters do not query by themselves.
  // Legacy Selector.vue:153-158 announces the default period without querying (no ChangeSelector on mount).
  it('does not query by itself without autoConsultar', () => {
    const { component, log } = setup({ mostrarAps: false });
    const hoy = new Date();
    expect(log).toEqual([`anno:${hoy.getFullYear()}`, `mes:${hoy.getMonth() + 1}`]);
    log.length = 0;
    component.onAnnoChange(2025);
    component.onMesChange(6);
    expect(log).toEqual(['anno:2025', 'mes:6']);
  });

  // Pinned: the button emits consultar.
  it('emits consultar when the button is clicked', () => {
    const { log, el } = setup();
    log.length = 0;
    (el.querySelector('p-button button') as HTMLButtonElement).click();
    expect(log).toEqual(['consultar']);
  });

  // Legacy Selector.vue:153-158: with no stored period the selector starts on the current month.
  it('with no saved period it starts on the current year/month like legacy Selector.vue:153-158', () => {
    const { component } = setup();
    const hoy = new Date();
    expect(component.anno).toBe(hoy.getFullYear());
    expect(component.mes).toBe(hoy.getMonth() + 1);
  });
});

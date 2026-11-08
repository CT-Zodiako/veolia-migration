import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TablaAvanzadaComponent } from '../shared/tabla-avanzada.component';
import { of, throwError } from 'rxjs';
import { FacturacionPageComponent } from './facturacion-page.component';
import { FacturacionService } from '../../services/facturacion.service';
import { AuthService } from '../../services/auth.service';
import { estadoParametros } from '../infogerenciales/informes-gerenciales.spec-helpers';

// First render compiles PrimeNG tabs + several tabla-avanzada grids; slow under a loaded jsdom run.
const RENDER_TIMEOUT_MS = 30000;

// C2: a failed query must be visible (the error signal was set but never rendered).
describe('FacturacionPageComponent (502)', () => {
  it('renders the backend error message when the visible tab fails', () => {
    const facturacion = vi.fn(() => throwError(() => new Error('No fue posible consultar facturación.')));
    TestBed.configureTestingModule({
      imports: [FacturacionPageComponent],
      providers: [
        { provide: FacturacionService, useValue: { facturacion } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
        estadoParametros()
      ]
    });
    const fixture = TestBed.createComponent(FacturacionPageComponent);
    const component = fixture.componentInstance;
    component.aps = 7;
    component.anno = 2025;
    component.mes = 3;
    fixture.detectChanges();

    component.consultar();
    fixture.detectChanges();

    expect(facturacion).toHaveBeenCalledWith({ aps: 7, mes: 3, anno: 2025 });
    expect(component.error()).toBe('No fue posible consultar facturación.');
    expect(fixture.nativeElement.querySelector('.error-message')?.textContent).toContain('No fue posible consultar facturación.');
  }, RENDER_TIMEOUT_MS);

  // C2: legacy Facturación grids offered 10/20/100/200 rows per page.
  it('uses the legacy paginator options 10/20/100/200', () => {
    TestBed.configureTestingModule({
      imports: [FacturacionPageComponent],
      providers: [
        { provide: FacturacionService, useValue: { facturacion: vi.fn(() => of({ periodo: null, filas: [] })) } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
        estadoParametros()
      ]
    });
    const fixture = TestBed.createComponent(FacturacionPageComponent);
    fixture.detectChanges();

    const tablas = fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent));
    expect(tablas.length).toBeGreaterThan(0);
    for (const tabla of tablas) {
      expect((tabla.componentInstance as TablaAvanzadaComponent).rowsPerPageOptionsList).toEqual([10, 20, 100, 200]);
    }
  }, RENDER_TIMEOUT_MS);
});

// odd/tasks/facturacion-detallado.md S2-S7: cards and charts of the design, only on the Facturación tab.
describe('FacturacionPageComponent — detallado de facturación', () => {
  const filas = [
    { CLAS_NOMBRE: 'ESTRATO 1', PARA_NOMBRE: 'Aforo Ordinario', TIPO_FACT: 'Acueducto', TARIFAPLENA: 238594.26, TARIFASYC: 71578.28, TARI_TAFNA: 3364.61 },
    { CLAS_NOMBRE: 'ESTRATO 4', PARA_NOMBRE: 'Aforo Ordinario', TIPO_FACT: 'Acueducto', TARIFAPLENA: 238594.26, TARIFASYC: 238594.26, TARI_TAFNA: 3364.61, TARI_TRT: 579, TARI_TDF: 195, TARI_TBL: 148, TARI_TLU: 45, TARI_TTL: 19, TARI_TC: 12, TARI_TA: 2 },
    { CLAS_NOMBRE: 'ESTRATO 6', PARA_NOMBRE: 'Aforo Ordinario', TIPO_FACT: 'Acueducto', TARIFAPLENA: 238594.26, TARIFASYC: 823150.19, TARI_TAFNA: 3364.61 },
    { CLAS_NOMBRE: 'ESTRATO 1', PARA_NOMBRE: 'Sin Aforo', TIPO_FACT: 'Acueducto', TARIFAPLENA: 62326.23, TARIFASYC: 18697.87, TARI_TAFNA: 3364.61 }
  ];

  beforeEach(() => {
    // jsdom has no canvas: the charts are skipped instead of logging "Not implemented".
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    localStorage.removeItem('facturacion-resumen-abierto');
  });

  function montar(respuesta = { periodo: null, filas }, abrir = true) {
    const detafacturacion = vi.fn(() => of({ periodo: null, filas: [] }));
    TestBed.configureTestingModule({
      imports: [FacturacionPageComponent],
      providers: [
        { provide: FacturacionService, useValue: { facturacion: vi.fn(() => of(respuesta)), detafacturacion } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of([])) } },
        estadoParametros()
      ]
    });
    const fixture = TestBed.createComponent(FacturacionPageComponent);
    const component = fixture.componentInstance;
    component.aps = 7;
    component.anno = 2025;
    component.mes = 9;
    fixture.detectChanges();
    component.consultar();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    if (abrir) {
      el.querySelector<HTMLButtonElement>('.resumen-toggle')!.click();
      fixture.detectChanges();
    }
    return { fixture, component, el };
  }

  const textos = (el: HTMLElement, selector: string) =>
    Array.from(el.querySelectorAll(selector)).map((n) => n.textContent?.replace(/\s+/g, ' ').trim());

  it('shows the selectors, the note, the cards and the three charts on the Facturación tab', () => {
    const { el } = montar();

    expect(textos(el, '.filtros-resumen label')).toEqual(['Tipo de factura', 'Tipo de tarifa']);
    expect(el.querySelector('.nota-resumen')?.textContent?.trim()).toBe('Tarjetas y gráficas se calculan con las filas que ya devuelve la tabla.');
    const tarjetas = Array.from(el.querySelectorAll('.resumen-tarjeta:not(.resumen-toneladas)')).map((t) =>
      Array.from(t.children).map((c) => c.textContent?.trim()).join(' | '));
    expect(tarjetas).toEqual([
      'Estrato 4 · tarifa plena | 238.594,26 | Sin subsidio ni contribución',
      'Estrato 1 paga | 71.578,28 | −70 % frente a la tarifa plena',
      'Estrato 6 paga | 823.150,19 | +245 % frente a la tarifa plena',
      'Brecha estrato 6 / estrato 1 | 11,5 veces | Lo que paga cada uno'
    ]);
    // User: "esto quitalo" (the TAFNA card): the summary keeps only the four tariff cards.
    // User: "de esto quiero un card un reusmen de estas [TRA TRBL TRLU TRRA]".
    const ton = el.querySelector('.resumen-toneladas') as HTMLElement;
    expect(ton.querySelector('.etiqueta')?.textContent?.trim()).toBe('Toneladas por suscriptor');
    expect(textos(ton, '.ton-codigo')).toEqual(['TRA', 'TRBL', 'TRLU', 'TRRA']);
    expect(el.textContent).not.toContain('TAFNA · residuos no aprovechables');
    expect(el.querySelector('.resumen-tarjeta .tono-subsidio')?.textContent?.trim()).toBe('−70 % frente a la tarifa plena');
    expect(el.querySelector('.resumen-tarjeta .tono-contribucion')?.textContent?.trim()).toBe('+245 % frente a la tarifa plena');
    expect(textos(el, '.resumen-grafica h2')).toEqual([
      'Tarifa plena y lo que paga cada clase',
      'De qué se compone la tarifa plena',
      'Lo que paga según el tipo de tarifa'
    ]);
    expect(textos(el, '.resumen-grafica .subtitulo')).toEqual([
      'Aforo Ordinario · Acueducto',
      'Estrato 4 · parte de cada componente',
      'Estratos 1, 4 y 6 · Acueducto'
    ]);
    expect(el.querySelectorAll('.resumen-grafica canvas').length).toBe(3);
    expect(el.querySelector('.resumen-vacio')).toBeNull();
  }, RENDER_TIMEOUT_MS);

  it('recomputes the cards when another tipo de tarifa is chosen', () => {
    const { fixture, component, el } = montar();

    component.tipoTarifa.set('Sin Aforo');
    fixture.detectChanges();

    expect(textos(el, '.resumen-tarjeta .valor')).toEqual(['—', '18.697,87', '—', '—']);
    expect(textos(el, '.resumen-grafica .subtitulo')[0]).toBe('Sin Aforo · Acueducto');
  }, RENDER_TIMEOUT_MS);

  it('shows an empty state instead of cards and charts when the query returns no rows', () => {
    const { el } = montar({ periodo: null, filas: [] });

    expect(el.querySelector('.resumen-vacio')?.textContent).toContain('No hay filas de facturación');
    expect(el.querySelectorAll('.resumen-tarjeta').length).toBe(0);
    expect(el.querySelectorAll('.resumen-grafica').length).toBe(0);
  }, RENDER_TIMEOUT_MS);

  it('is absent on another tab, which keeps its table', () => {
    const { fixture, component, el } = montar();

    component.onTabChange('detafacturacion');
    fixture.detectChanges();

    expect(el.querySelector('.resumen-toggle')).toBeNull();
    expect(el.querySelector('.facturacion-resumen')).toBeNull();
    expect(el.querySelector('.filtros-resumen')).toBeNull();
    expect(el.querySelector('.nota-resumen')).toBeNull();
    expect(fixture.debugElement.queryAll(By.directive(TablaAvanzadaComponent)).length).toBeGreaterThan(0);

    component.onTabChange('facturacion');
    fixture.detectChanges();
    expect(el.querySelector('.facturacion-resumen')).not.toBeNull();
  }, RENDER_TIMEOUT_MS);

  // User L3: the new filters, cards and charts live inside one collapsible block.
  it('starts collapsed: only the toggle shows, the table stays right below it', () => {
    const { el } = montar(undefined, false);

    const toggle = el.querySelector<HTMLButtonElement>('.resumen-toggle')!;
    expect(toggle.textContent).toContain('Resumen de tarifas');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.filtros-resumen')).toBeNull();
    expect(el.querySelector('.facturacion-resumen')).toBeNull();
  }, RENDER_TIMEOUT_MS);

  it('opens and closes the block with the toggle and remembers the choice', () => {
    const { fixture, el } = montar(undefined, false);
    const toggle = el.querySelector<HTMLButtonElement>('.resumen-toggle')!;

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.filtros-resumen')).not.toBeNull();
    expect(el.querySelectorAll('.resumen-tarjeta').length).toBeGreaterThan(0);
    expect(localStorage.getItem('facturacion-resumen-abierto')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.facturacion-resumen')).toBeNull();
    expect(localStorage.getItem('facturacion-resumen-abierto')).toBe('false');
  }, RENDER_TIMEOUT_MS);

  it('reopens expanded when the user left it open', () => {
    localStorage.setItem('facturacion-resumen-abierto', 'true');
    const { el } = montar(undefined, false);

    expect(el.querySelector('.resumen-toggle')!.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.facturacion-resumen')).not.toBeNull();
  }, RENDER_TIMEOUT_MS);
});

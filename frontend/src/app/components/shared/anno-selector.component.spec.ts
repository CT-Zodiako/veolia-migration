import { TestBed } from '@angular/core/testing';
import { AnnoSelectorComponent } from './anno-selector.component';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// Legacy: front-tarificador/src/components/SelectorOnlyYear.vue:12-13 and Selector.vue:22-23
// (Calendar yearNavigator, yearRange="2000:2030"); the selection lives in the shared Vuex store
// (Selector.vue:129-135 setDate), so it carries over between screens.

function setup(guardado: number | null = null, inputs: Partial<AnnoSelectorComponent> = {}) {
  const state = { getAnno: vi.fn(() => guardado), setAnno: vi.fn() };
  TestBed.configureTestingModule({
    imports: [AnnoSelectorComponent],
    providers: [{ provide: ParametrosConsultaStateService, useValue: state }]
  });
  const fixture = TestBed.createComponent(AnnoSelectorComponent);
  Object.assign(fixture.componentInstance, inputs);
  const emitted: (number | null)[] = [];
  fixture.componentInstance.selectedAnnoChange.subscribe(v => emitted.push(v));
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, state, emitted, el: fixture.nativeElement as HTMLElement };
}

describe('AnnoSelectorComponent (legacy SelectorOnlyYear.vue / Selector.vue)', () => {
  // Legacy shared store: the year chosen on one screen is preselected on the next.
  it('restores the saved year and emits it', () => {
    const { component, emitted } = setup(2024);
    expect(component.selectedAnno).toBe(2024);
    expect(emitted).toEqual([2024]);
  });

  // Pinned: an explicit input wins over the saved year.
  it('keeps an explicit year over the saved one', () => {
    const { component, emitted } = setup(2024, { selectedAnno: 2022 });
    expect(component.selectedAnno).toBe(2022);
    expect(emitted).toEqual([]);
  });

  // Legacy store mutation on change (Selector.vue:129-135).
  it('emits and saves the chosen year; clearing emits null', () => {
    const { component, state, emitted } = setup();
    component.onSelect('2023');
    component.onSelect(null);
    expect(emitted).toEqual([2023, null]);
    expect(state.setAnno).toHaveBeenNthCalledWith(1, 2023);
    expect(state.setAnno).toHaveBeenNthCalledWith(2, null);
  });

  // Pinned: options are descending; callers can widen the range (e.g. cdft-page 2018-2030).
  it('lists years in descending order within the given range', () => {
    const { component } = setup(null, { rangoInicio: 2018, rangoFin: 2020 });
    expect(component.annoOptions).toEqual([
      { label: '2020', value: 2020 },
      { label: '2019', value: 2019 },
      { label: '2018', value: 2018 }
    ]);
  });

  // Pinned label rendering.
  it('renders the "Año" label', () => {
    const { el } = setup();
    expect(el.querySelector('label')?.textContent?.trim()).toBe('Año');
  });

  // Legacy yearRange="2000:2030" (SelectorOnlyYear.vue:13, Selector.vue:23); new default is 2020-2026, so 2027+ cannot be chosen.
  it.skip('PARITY-FINDING: default year range is 2000-2030 (legacy SelectorOnlyYear.vue:13, Selector.vue:23); new default 2020-2026 drops 2027-2030', () => {
    const { component } = setup();
    const values = component.annoOptions.map(o => o.value);
    expect(Math.max(...values)).toBe(2030);
    expect(Math.min(...values)).toBe(2000);
  });
});

import { TestBed } from '@angular/core/testing';
import { MesSelectorComponent } from './mes-selector.component';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// Legacy: front-tarificador/src/components/Selector.vue:15-26 (Calendar view="month", locale es monthNames
// Selector.vue:78-91); selection kept in the shared Vuex store (Selector.vue:129-135).

function setup(guardado: number | null = null) {
  const state = { getMes: vi.fn(() => guardado), setMes: vi.fn() };
  TestBed.configureTestingModule({
    imports: [MesSelectorComponent],
    providers: [{ provide: ParametrosConsultaStateService, useValue: state }]
  });
  const fixture = TestBed.createComponent(MesSelectorComponent);
  const emitted: (number | null)[] = [];
  fixture.componentInstance.selectedMesChange.subscribe(v => emitted.push(v));
  fixture.detectChanges();
  return { component: fixture.componentInstance, state, emitted, el: fixture.nativeElement as HTMLElement };
}

describe('MesSelectorComponent (legacy Selector.vue month calendar)', () => {
  // Legacy Selector.vue:78-91 month names, value = month number 1..12.
  it('offers the 12 legacy month names with values 1..12', () => {
    const { component } = setup();
    expect(component.meses.map(m => m.label)).toEqual([
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]);
    expect(component.meses.map(m => m.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  // Legacy shared store: the month chosen on one screen is preselected on the next.
  it('restores the saved month and emits it', () => {
    const { component, emitted } = setup(11);
    expect(component.selectedMes).toBe(11);
    expect(emitted).toEqual([11]);
  });

  // Legacy store mutation on change.
  it('emits and saves the chosen month as a number; clearing emits null', () => {
    const { component, state, emitted } = setup();
    component.onSelect('3');
    component.onSelect(null);
    expect(emitted).toEqual([3, null]);
    expect(state.setMes).toHaveBeenNthCalledWith(1, 3);
    expect(state.setMes).toHaveBeenNthCalledWith(2, null);
  });

  // Pinned label rendering.
  it('renders the "Mes" label', () => {
    expect(setup().el.querySelector('label')?.textContent?.trim()).toBe('Mes');
  });
});

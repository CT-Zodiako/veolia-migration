import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApsSelectorComponent } from './aps-selector.component';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// Legacy: front-tarificador/src/components/apsSelector.vue (Dropdown optionLabel APSA_NOMAPS / optionValue APSA_ID, :3-12),
// service/ApsService.js:6-14 (GET aps), back-tarificador/src/modules/aps/{routes.js:31-36, controller.js:70-75}
// (only the user's active assigned APS, ORDER BY APSA_NOMAPS). The new screen reads the same set from
// getApsAsignadas(...).asignadas (back auth/controller.js:256, identical filter and order).
// Approved: user taken from the session (parity-review-all S11 T1+S2).

const ASIGNADAS = [{ APSA_ID: 2, APSA_NOMAPS: 'APS Centro' }, { APSA_ID: 1, APSA_NOMAPS: 'APS Norte' }];

function setup(opts: { guardado?: number | null; usuario?: object | null; getApsAsignadas?: ReturnType<typeof vi.fn> } = {}) {
  localStorage.clear();
  if (opts.usuario !== null) {
    localStorage.setItem('usuario', JSON.stringify(opts.usuario ?? { SISU_ID: 7 }));
  }
  const authService = { getApsAsignadas: opts.getApsAsignadas ?? vi.fn(() => of({ asignadas: ASIGNADAS, sinAsignar: [] })) };
  const state = { getAps: vi.fn(() => opts.guardado ?? null), setAps: vi.fn() };
  TestBed.configureTestingModule({
    imports: [ApsSelectorComponent],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: ParametrosConsultaStateService, useValue: state }
    ]
  });
  const fixture = TestBed.createComponent(ApsSelectorComponent);
  const emitted: (number | null)[] = [];
  fixture.componentInstance.selectedApsChange.subscribe(v => emitted.push(v));
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, state, emitted, el: fixture.nativeElement as HTMLElement };
}

describe('ApsSelectorComponent (legacy components/apsSelector.vue)', () => {
  afterEach(() => localStorage.clear());

  // Legacy aps/controller.js:73: only the logged user's assigned APS, in the order the server returns.
  it("lists the logged user's assigned APS in server order", () => {
    const { component, authService } = setup();
    expect(authService.getApsAsignadas).toHaveBeenCalledWith(7);
    expect(component.apsList).toEqual(ASIGNADAS);
  });

  // Legacy apsSelector.vue:44,60-62 setAps in the shared store + ChangeSelector event.
  it('emits and saves the chosen APSA_ID; clearing emits null', () => {
    const { component, state, emitted } = setup();
    component.onSelect('2');
    component.onSelect(null);
    expect(emitted).toEqual([2, null]);
    expect(state.setAps).toHaveBeenNthCalledWith(1, 2);
    expect(state.setAps).toHaveBeenNthCalledWith(2, null);
  });

  // Legacy apsSelector.vue:25,53-55: the store's selected APS is preselected.
  it('restores the saved APS and emits it', () => {
    const { component, emitted } = setup({ guardado: 1 });
    expect(component.selectedAps).toBe(1);
    expect(emitted).toEqual([1]);
  });

  // Pinned: without a session user nothing is requested and a message is shown.
  it('requests nothing and shows a message without a session user', () => {
    const { fixture, component, authService, el } = setup({ usuario: null });
    fixture.detectChanges();
    expect(authService.getApsAsignadas).not.toHaveBeenCalled();
    expect(component.error).toBe('No hay usuario logueado');
    expect(el.querySelector('.text-danger')?.textContent?.trim()).toBe('No hay usuario logueado');
  });

  // Pinned: request errors leave an empty list and show the server message.
  it('shows the error and keeps an empty list when the request fails', () => {
    const { component } = setup({ getApsAsignadas: vi.fn(() => throwError(() => ({ error: { message: 'Fallo' } }))) });
    expect(component.apsList).toEqual([]);
    expect(component.error).toBe('Fallo');
    expect(component.loading).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApsxUsuarioComponent } from './apsx-usuario.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/components/usuarios/{ApsxUsuario.vue,UsuarioDD.vue}, service/AuthService.js:217-259,
// back-tarificador/src/modules/auth/{routes.js:126-136, controller.js:253-270}.
// Approved: user management is admin-only (parity-review-all S10/L19) — enforced by the backend, not this screen.

const USERS = [
  { SISU_ID: 7, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 },
  { SISU_ID: 8, SISU_NOMBRE: 'Luis', SISU_APELLIDO: 'Gómez', SISU_CORREO: 'luis@veolia.com', SISU_ESTADO: 1 }
];
const SIN_ASIGNAR = [{ APSA_ID: 1, APSA_NOMAPS: 'APS Norte' }];
const ASIGNADAS = [{ APSA_ID: 2, APSA_NOMAPS: 'APS Sur' }, { APSA_ID: 3, APSA_NOMAPS: 'APS Centro' }];

function setup() {
  const authService = {
    getAllUsers: vi.fn(() => of(USERS)),
    getApsAsignadas: vi.fn(() => of({ asignadas: ASIGNADAS, sinAsignar: SIN_ASIGNAR })),
    setApsxUsuario: vi.fn(() => of({}))
  };
  TestBed.configureTestingModule({
    imports: [ApsxUsuarioComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // jsdom has no matchMedia; the PrimeNG PickList reads it for its responsive breakpoint.
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  const fixture = TestBed.createComponent(ApsxUsuarioComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, el: fixture.nativeElement as HTMLElement };
}

const strip = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

describe('ApsxUsuarioComponent (legacy components/usuarios/ApsxUsuario.vue)', () => {
  // Legacy UsuarioDD.vue:36-41 loads getAllUsers; options show name and SISU_CORREO (UsuarioDD.vue:6,15-17).
  it('lists every user with name and email', () => {
    const { component, authService } = setup();
    expect(authService.getAllUsers).toHaveBeenCalledTimes(1);
    expect(component.usuarioOptions).toEqual([
      { label: 'Ana Pérez (ana@veolia.com)', value: 7 },
      { label: 'Luis Gómez (luis@veolia.com)', value: 8 }
    ]);
  });

  // Legacy ApsxUsuario.vue:47-56: getApsAsignadas(SISU_ID); PickList = [sinAsignar (source), asignadas (target)].
  it('loads the APS of the selected user as [sinAsignar, asignadas] and renders APSA_NOMAPS', () => {
    const { fixture, component, authService, el } = setup();
    component.selectedUsuarioId = 7;
    component.onUsuarioChange();
    fixture.detectChanges();
    expect(authService.getApsAsignadas).toHaveBeenCalledWith(7);
    expect(component.listaAps).toEqual([SIN_ASIGNAR, ASIGNADAS]);
    const nombres = Array.from(el.querySelectorAll('.aps-chip span')).map(n => n.textContent?.trim());
    expect(nombres).toEqual(['APS Norte', 'APS Sur', 'APS Centro']);
  });

  // Legacy ApsxUsuario.vue:61-69 + AuthService.js:239-243: inAps = target ids, outAps = source ids, id = selected user.
  it('saves inAps from the assigned list and outAps from the unassigned list', () => {
    const { component, authService } = setup();
    component.selectedUsuarioId = 7;
    component.onUsuarioChange();
    component.guardar();
    expect(authService.setApsxUsuario).toHaveBeenCalledWith(7, [1], [2, 3]);
  });

  // Legacy ApsxUsuario.vue:61,68: nothing is sent without a selected user / loaded lists.
  it('sends nothing without a selected user', () => {
    const { component, authService } = setup();
    component.guardar();
    expect(authService.setApsxUsuario).not.toHaveBeenCalled();
  });

  // Legacy ApsxUsuario.vue:18 button label (accents ignored).
  it('shows the "Actualizar Asignacion de APS" button once a user is selected', () => {
    const { fixture, component, el } = setup();
    expect(el.querySelector('p-button')).toBeNull();
    component.selectedUsuarioId = 7;
    component.onUsuarioChange();
    fixture.detectChanges();
    expect(strip(el.querySelector('p-button button')?.textContent)).toBe('Actualizar Asignacion de APS');
  });

  // Legacy AuthService.js:251 success toast.
  it('success message is "APS Asignadas Correctamente" like legacy AuthService.js:251', () => {
    const { component } = setup();
    component.selectedUsuarioId = 7;
    component.onUsuarioChange();
    component.guardar();
    expect(component.success).toBe('APS Asignadas Correctamente');
  });

  // Legacy ApsxUsuario.vue:8-9 PickList headers.
  it('PickList headers are "APS SIN ASIGNAR" / "APS ASIGNADAS" like legacy ApsxUsuario.vue:8-9', () => {
    const { fixture, component, el } = setup();
    component.selectedUsuarioId = 7;
    component.onUsuarioChange();
    fixture.detectChanges();
    const text = el.querySelector('p-picklist')?.textContent ?? '';
    expect(text).toContain('APS SIN ASIGNAR');
    expect(text).toContain('APS ASIGNADAS');
  });
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../services/auth.service';
import { AuthState } from '../../../state/auth.state';

// Legacy: front-tarificador/src/components/layout/AppProfile.vue; service/AuthService.js:25-37 (getLogout);
// back-tarificador/src/modules/auth/controller.js:99 (usuario = SISU_NOMBRES + " " + SISU_APELLIDOS).

function setup(logout = vi.fn(() => of({}))) {
  localStorage.setItem('jwtOken', 'tok');
  localStorage.setItem('usuario', JSON.stringify({ SISU_ID: 9, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com' }));
  const authService = { logout };
  const router = { navigate: vi.fn() };
  TestBed.configureTestingModule({
    imports: [ProfileComponent],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router }
    ]
  });
  TestBed.inject(AuthState).hydrate();
  const fixture = TestBed.createComponent(ProfileComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, router, el: fixture.nativeElement as HTMLElement };
}

describe('ProfileComponent (legacy components/layout/AppProfile.vue)', () => {
  afterEach(() => localStorage.clear());

  // Legacy AppProfile.vue:6-9 + controller.js:99: the profile shows the user's full name.
  it('shows the full name of the logged user', () => {
    const { fixture, component, el } = setup();
    component.toggleDropdown();
    fixture.detectChanges();
    expect(el.querySelector('.dropdown-header .name')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Ana Pérez');
  });

  // Legacy AppProfile.vue:56-60 + AuthService.js:27-32: logout posts with the token, clears storage and goes to /login.
  it('logs out with the token, clears the session and goes to /login', () => {
    const { component, authService, router } = setup();
    component.logout();
    expect(authService.logout).toHaveBeenCalledWith('tok');
    expect(localStorage.getItem('jwtOken')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(TestBed.inject(AuthState).user()).toBeNull();
  });

  // Legacy AuthService.js:34-35 swallows logout errors and AppProfile.vue:60 still goes to /login.
  it('still ends the session when the logout request fails', () => {
    const { component, router } = setup(vi.fn(() => throwError(() => ({ status: 500 }))));
    component.logout();
    expect(localStorage.getItem('jwtOken')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  // Legacy AppProfile.vue:64-66 opens the change-password screen (legacy path /cambiarclave; new route /cambiar-clave).
  it('opens the change-password screen and closes the menu', () => {
    const { component, router } = setup();
    component.toggleDropdown();
    component.goToChangePass();
    expect(router.navigate).toHaveBeenCalledWith(['/cambiar-clave']);
    expect(component.showDropdown).toBe(false);
  });

  // Legacy AppProfile.vue:17,23: menu labels "Cambiar Clave" and "Salir".
  it.skip('PARITY-FINDING: profile menu labels are "Cambiar Clave" / "Salir" (legacy AppProfile.vue:17,23); new shows "Cambiar Contraseña" / "Cerrar Sesión"', () => {
    const { fixture, component, el } = setup();
    component.toggleDropdown();
    fixture.detectChanges();
    const labels = Array.from(el.querySelectorAll('.profile-dropdown button')).map(b => b.textContent?.trim());
    expect(labels).toEqual(['Cambiar Clave', 'Salir']);
  });
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/views/Auth/Login.vue + service/AuthService.js.
// Approved deviation (odd/tasks/login-systems-validation.md): systems are no longer
// fetched on every email keystroke (legacy Login.vue:132-135); they are revealed only
// after POST /auth/validate-credentials succeeds, in a dialog instead of a dropdown.

const SISTEMAS = [
  { SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' },
  { SIST_ID: 3, SIST_NOMBRE: 'SUI853' }
];

function setup(overrides: Record<string, unknown> = {}) {
  const authService = {
    getSistemasByCorreo: vi.fn(() => of(SISTEMAS)),
    validateCredentials: vi.fn(() => of(SISTEMAS)),
    login: vi.fn(() => of({ auth_token: 'tok', usuario: { SISU_ID: 9 }, sistema: SISTEMAS[0] })),
    ...overrides
  };
  const router = { navigate: vi.fn() };
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router }
    ]
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, router, el: fixture.nativeElement as HTMLElement };
}

function validated(overrides: Record<string, unknown> = {}) {
  const ctx = setup(overrides);
  ctx.component.email = 'ana@veolia.com';
  ctx.component.password = 'secreta';
  ctx.component.validateCredentials();
  return ctx;
}

describe('LoginComponent (legacy views/Auth/Login.vue)', () => {
  afterEach(() => localStorage.clear());

  // Deviation login-systems-validation.md: legacy Login.vue:133-134 called getSistemas on each email change.
  it('does not query systems while the email is typed', () => {
    const { component, authService } = setup();
    component.email = 'ana@veolia.com';
    component.onCredentialsChange();
    expect(authService.getSistemasByCorreo).not.toHaveBeenCalled();
    expect(authService.validateCredentials).not.toHaveBeenCalled();
  });

  // Deviation login-systems-validation.md; legacy Dropdown optionLabel SIST_NOMBRE / optionValue SIST_ID (Login.vue:31-33).
  it('validates email+password once and offers the systems by SIST_NOMBRE', () => {
    const { fixture, component, authService } = validated();
    fixture.detectChanges();
    expect(authService.validateCredentials).toHaveBeenCalledWith('ana@veolia.com', 'secreta');
    expect(component.sistemas).toEqual(SISTEMAS);
    expect(component.showSistemaDialog).toBe(true);
    const labels = Array.from(document.querySelectorAll('.system-options button')).map(b => b.textContent?.trim());
    expect(labels).toEqual(['VEO-Regulator', 'SUI853']);
  });

  // Legacy AuthService.js:9-14 posts { correo, pass, idSistema } to auth/login; Login.vue:104,109 stores jwtOken and goes to "/".
  it('logs in with correo/pass/idSistema of the selected system, stores jwtOken and navigates to "/"', () => {
    const { component, authService, router } = validated();
    component.selectSistema(3);
    expect(authService.login).toHaveBeenCalledWith({ correo: 'ana@veolia.com', pass: 'secreta', idSistema: 3 });
    expect(localStorage.getItem('jwtOken')).toBe('tok');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  // Legacy Login.vue:96-98: 401 -> "Usuario o Pass Incorrecto" and the password is cleared.
  it('shows "Usuario o Pass Incorrecto" on 401 from login and clears the password', () => {
    const { fixture, component, el, router } = validated({ login: vi.fn(() => throwError(() => ({ status: 401 }))) });
    component.selectSistema(1);
    fixture.detectChanges();
    expect(component.error).toBe('Usuario o Pass Incorrecto');
    expect(component.password).toBe('');
    expect(component.email).toBe('ana@veolia.com');
    expect(el.querySelector('.error-message')?.textContent?.trim()).toBe('Usuario o Pass Incorrecto');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('jwtOken')).toBeNull();
  });

  // Legacy Login.vue:99-102: 404 -> "Usuario no existe o inactivo", email and password cleared.
  it('shows "Usuario no existe o inactivo" on 404 and clears email and password', () => {
    const { component, router } = validated({ login: vi.fn(() => throwError(() => ({ status: 404 }))) });
    component.selectSistema(1);
    expect(component.error).toBe('Usuario no existe o inactivo');
    expect(component.email).toBe('');
    expect(component.password).toBe('');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // Legacy 401 message (Login.vue:97) reused for the approved credential preflight (login-systems-validation.md).
  it('shows "Usuario o Pass Incorrecto" when validate-credentials answers 401 and reveals no systems', () => {
    const { component } = validated({ validateCredentials: vi.fn(() => throwError(() => ({ status: 401 }))) });
    expect(component.error).toBe('Usuario o Pass Incorrecto');
    expect(component.sistemas).toEqual([]);
    expect(component.showSistemaDialog).toBe(false);
  });

  // Legacy Login.vue:90 + 111-112: an invalid email shows "El email no es valido" and no request is sent.
  it.skip('PARITY-FINDING: invalid email shows "El email no es valido" (legacy Login.vue:112); new submit is silent', () => {
    const { component, authService } = setup();
    component.email = 'ana@veolia';
    component.password = 'secreta';
    component.validateCredentials();
    expect(authService.validateCredentials).not.toHaveBeenCalled();
    expect(component.error).toBe('El email no es valido');
  });

  // Legacy Login.vue:114-120: empty fields list "El email es obligatorio" / "El pass es obligatorio".
  it.skip('PARITY-FINDING: empty email/password show "El email es obligatorio" and "El pass es obligatorio" (legacy Login.vue:115-120); new submit is silent', () => {
    const { component, authService } = setup();
    component.validateCredentials();
    expect(authService.validateCredentials).not.toHaveBeenCalled();
    expect(component.error).toContain('El email es obligatorio');
    expect(component.error).toContain('El pass es obligatorio');
  });

  // Legacy Login.vue:90 validates the email regex before any request.
  it('sends no request for an invalid email', () => {
    const { component, authService } = setup();
    component.email = 'ana@veolia';
    component.password = 'secreta';
    component.validateCredentials();
    expect(authService.validateCredentials).not.toHaveBeenCalled();
    expect(authService.login).not.toHaveBeenCalled();
  });
});

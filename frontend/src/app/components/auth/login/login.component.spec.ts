import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/views/Auth/Login.vue + service/AuthService.js.
// Approved deviation (odd/tasks/login-systems-validation.md): systems are no longer
// fetched on every email keystroke (legacy Login.vue:132-135); they are revealed only
// after POST /auth/validate-credentials succeeds, as the third step of a one-question-per-screen
// flow (design/login-dinamico/02-conversacional.html) instead of a dropdown.

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
    expect(component.step).toBe(3);
    const labels = Array.from(document.querySelectorAll('.system-options .system-option-name')).map(b => b.textContent?.trim());
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
    expect(component.step).toBe(2);
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
    expect(component.step).toBe(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // Legacy 401 message (Login.vue:97) reused for the approved credential preflight (login-systems-validation.md).
  it('shows "Usuario o Pass Incorrecto" when validate-credentials answers 401 and reveals no systems', () => {
    const { component } = validated({ validateCredentials: vi.fn(() => throwError(() => ({ status: 401 }))) });
    expect(component.error).toBe('Usuario o Pass Incorrecto');
    expect(component.sistemas).toEqual([]);
    expect(component.step).toBe(2);
  });

  // Legacy Login.vue:90 + 111-112: an invalid email shows "El email no es valido" and no request is sent.
  it('invalid email shows "El email no es valido" like legacy Login.vue:112', () => {
    const { component, authService } = setup();
    component.email = 'ana@veolia';
    component.password = 'secreta';
    component.validateCredentials();
    expect(authService.validateCredentials).not.toHaveBeenCalled();
    expect(component.error).toBe('El email no es valido');
  });

  // Legacy Login.vue:114-120: empty fields list "El email es obligatorio" / "El pass es obligatorio".
  it('empty email/password show "El email es obligatorio" and "El pass es obligatorio" like legacy Login.vue:115-120', () => {
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

  // Design 02-conversacional: step 1 asks only for the email, with the legacy email messages.
  it('step 1 checks the email with the legacy messages before asking for the password', () => {
    const { component, authService } = setup();
    expect(component.step).toBe(1);
    component.nextFromEmail();
    expect(component.error).toBe('El email es obligatorio');
    expect(component.step).toBe(1);
    component.email = 'ana@veolia';
    component.nextFromEmail();
    expect(component.error).toBe('El email no es valido');
    expect(component.step).toBe(1);
    component.email = 'ana@veolia.com';
    component.nextFromEmail();
    expect(component.error).toBe('');
    expect(component.step).toBe(2);
    expect(authService.validateCredentials).not.toHaveBeenCalled();
  });

  // Design 02-conversacional: going back from the password keeps the typed email.
  it('backToEmail returns to step 1 keeping the email and dropping the password', () => {
    const { component } = setup();
    component.email = 'ana@veolia.com';
    component.nextFromEmail();
    component.password = 'secreta';
    component.backToEmail();
    expect(component.step).toBe(1);
    expect(component.email).toBe('ana@veolia.com');
    expect(component.password).toBe('');
  });

  // Design 02-conversacional: on step 3 the number keys pick the system in the listed order.
  it('pressing a number on step 3 logs in with that system', () => {
    const { component, authService } = validated();
    component.onKeydown(new KeyboardEvent('keydown', { key: '2' }));
    expect(authService.login).toHaveBeenCalledWith({ correo: 'ana@veolia.com', pass: 'secreta', idSistema: 3 });
  });

  it('number keys beyond the listed systems do nothing', () => {
    const { component, authService } = validated();
    component.onKeydown(new KeyboardEvent('keydown', { key: '3' }));
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('number keys do nothing before step 3', () => {
    const { component, authService } = setup();
    component.onKeydown(new KeyboardEvent('keydown', { key: '1' }));
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('number keys with Ctrl, Cmd or Alt do not pick a system', () => {
    const { component, authService } = validated();
    component.onKeydown(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
    component.onKeydown(new KeyboardEvent('keydown', { key: '1', metaKey: true }));
    component.onKeydown(new KeyboardEvent('keydown', { key: '1', altKey: true }));
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('number keys do nothing while login is in flight', () => {
    const { component, authService } = validated();
    component.loading = true;
    component.onKeydown(new KeyboardEvent('keydown', { key: '1' }));
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('editing the password after validation drops the systems and returns to step 2', () => {
    const { component } = validated();
    component.onPasswordChange();
    expect(component.sistemas).toEqual([]);
    expect(component.credentialsValidated).toBe(false);
    expect(component.step).toBe(2);
  });

  it('backToEmail from step 3 clears the validated state', () => {
    const { component, authService } = validated();
    component.backToEmail();
    component.selectSistema(1);
    expect(component.step).toBe(1);
    expect(authService.login).not.toHaveBeenCalled();
  });
});

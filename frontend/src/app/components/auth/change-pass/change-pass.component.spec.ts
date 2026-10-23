import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ChangePassComponent } from './change-pass.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/views/Auth/ChangePass.vue, service/AuthService.js:115-145,
// back-tarificador/src/modules/auth/{routes.js:96-106,controller.js:157-214}.

function setup(changePass = vi.fn(() => of({ status: 200, msg: 'Clave actualizada correctamente!' }))) {
  const authService = { changePass };
  const router = { navigate: vi.fn() };
  TestBed.configureTestingModule({
    imports: [ChangePassComponent],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router }
    ]
  });
  const fixture = TestBed.createComponent(ChangePassComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, router, el: fixture.nativeElement as HTMLElement };
}

describe('ChangePassComponent (legacy views/Auth/ChangePass.vue)', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  // Legacy ChangePass.vue:82-86 trims the three fields; AuthService.js:117-121 posts { oldPass, newPass, confirmPass } to auth/setChangePass.
  it('trims the fields and posts oldPass/newPass/confirmPass', () => {
    const { component, authService } = setup();
    component.oldPass = ' vieja ';
    component.newPass = ' nueva1 ';
    component.confirmPass = 'nueva1 ';
    component.changePassword();
    expect(authService.changePass).toHaveBeenCalledWith('vieja', 'nueva1', 'nueva1');
  });

  // Legacy ChangePass.vue:93-98: mismatch message, no request.
  it('rejects a mismatched confirmation with the legacy message and sends nothing', () => {
    const { fixture, component, authService, el } = setup();
    component.oldPass = 'vieja';
    component.newPass = 'nueva1';
    component.confirmPass = 'nueva2';
    component.changePassword();
    fixture.detectChanges();
    const msg = 'El campo de "Nueva Clave" y "Confirmar Nueva Clave" no son iguales';
    expect(component.error).toBe(msg);
    expect(el.querySelector('.error-message')?.textContent?.trim()).toBe(msg);
    expect(authService.changePass).not.toHaveBeenCalled();
  });

  // Legacy ChangePass.vue:87-91: blank (after trim) fields -> no request.
  it('sends nothing when a field is blank after trimming', () => {
    const { component, authService } = setup();
    component.oldPass = 'vieja';
    component.newPass = '   ';
    component.confirmPass = '';
    component.changePassword();
    expect(authService.changePass).not.toHaveBeenCalled();
    expect(component.error).not.toBe('');
  });

  // Legacy ChangePass.vue:90: toast "Todos los campos son obligatorios".
  it('blank fields show "Todos los campos son obligatorios" like legacy ChangePass.vue:90', () => {
    const { component } = setup();
    component.changePassword();
    expect(component.error).toBe('Todos los campos son obligatorios');
  });

  // Legacy controller.js:192 answers HTTP 403 { msg: "Clave Actual Erronea!" }; AuthService.js:137 intends "Clave Actual Erronea".
  // (Legacy actually toasted `${err.response.data}` = "[object Object]" because axios throws on 403 — AuthService.js:143.)
  it('shows "Clave Actual Erronea" on 403', () => {
    const { component } = setup(vi.fn(() => throwError(() => ({ status: 403, error: { status: 403, msg: 'Clave Actual Erronea!' } }))));
    component.oldPass = 'mala';
    component.newPass = 'nueva1';
    component.confirmPass = 'nueva1';
    component.changePassword();
    expect(component.error).toContain('Clave Actual Erronea');
    expect(component.success).toBe('');
  });

  // Legacy ChangePass.vue:103-104 clears localStorage (session ends) after status 200.
  it('ends the session after a successful change', () => {
    vi.useFakeTimers();
    localStorage.setItem('jwtOken', 'tok');
    const { component, router } = setup();
    component.oldPass = 'vieja';
    component.newPass = 'nueva1';
    component.confirmPass = 'nueva1';
    component.changePassword();
    vi.runAllTimers();
    expect(localStorage.getItem('jwtOken')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.error).toBe('');
  });

  // Legacy AuthService.js:134: success toast "Clave cambiada".
  it('success shows "Clave cambiada" like legacy AuthService.js:134', () => {
    const { component } = setup();
    component.oldPass = 'vieja';
    component.newPass = 'nueva1';
    component.confirmPass = 'nueva1';
    component.changePassword();
    expect(component.success).toBe('Clave cambiada');
  });
});

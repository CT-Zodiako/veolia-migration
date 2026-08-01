import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ErrorUxService } from '../services/error-ux.service';
import { NotificationService } from '../services/notification.service';
import { AuthState } from '../state/auth.state';
import { SupportErrorLogService } from '../services/support-error-log.service';
import { EXPECTED_ERROR_STATUSES } from './http-context.tokens';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorUx = inject(ErrorUxService);
  const notifications = inject(NotificationService);
  const authState = inject(AuthState);
  const supportErrorLog = inject(SupportErrorLogService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      // Paridad legacy AuthControl.verificarStatusCode: token inválido, muerto
      // o ausente -> limpiar sesión y volver al login (antes solo mostraba un
      // toast y la página quedaba "cargando sin datos" con el token muerto).
      if (esErrorDeAutenticacion(error, req.url)) {
        limpiarSesionLocal();
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login']);
        }
        return throwError(() => error);
      }

      // El consumidor declaró este status como estado válido (ej. 404 = "sin
      // datos para el período"). Sin toast ni log de soporte; el error sigue
      // llegando al suscriptor del componente, que decide cómo mostrarlo.
      if (req.context.get(EXPECTED_ERROR_STATUSES).includes(error.status)) {
        return throwError(() => error);
      }

      const message = req.url.includes('filecargue')
        ? errorUx.uploadMessage(error)
        : errorUx.toUserMessage(error);

      notifications.error(message);

      if (esUsuarioSoporte(authState)) {
        supportErrorLog.push({
          method: req.method,
          url: req.url,
          status: error.status,
          message: error.error?.message ?? error.message,
          oraCode: error.error?.oraCode
        });
      }

      return throwError(() => new Error(message));
    })
  );
};

// 401 = token inválido/muerto; 403 = token ausente (middleware parity).
// Se excluyen los endpoints públicos de auth (login, sistemas por correo):
// un 401 ahí es "credenciales inválidas", no sesión expirada.
function esErrorDeAutenticacion(error: { status?: number }, url: string): boolean {
  if (error.status !== 401 && error.status !== 403) {
    return false;
  }
  return !url.includes('/auth/login') && !url.includes('/auth/getSistemasByCorreo');
}

// Solo claves de sesión: no borrar tema oscuro, presets de tablas ni
// parámetros de consulta guardados (son preferencias, no sesión).
function limpiarSesionLocal(): void {
  localStorage.removeItem('jwtOken');
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('sistema');
}

// Igual que auth.guard.ts / auth-token.interceptor.ts: se lee localStorage
// directo en vez de depender de AuthState.user(), que solo se hidrata cuando
// AuthService/LayoutComponent se instancian (puede no haber corrido aún).
function esUsuarioSoporte(authState: AuthState): boolean {
  if (authState.user()?.esSoporte === true) {
    return true;
  }

  try {
    const usuarioStr = localStorage.getItem('usuario');
    return usuarioStr ? JSON.parse(usuarioStr)?.esSoporte === true : false;
  } catch {
    return false;
  }
}

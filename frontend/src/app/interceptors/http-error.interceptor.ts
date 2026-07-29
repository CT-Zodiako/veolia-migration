import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorUxService } from '../services/error-ux.service';
import { NotificationService } from '../services/notification.service';
import { AuthState } from '../state/auth.state';
import { SupportErrorLogService } from '../services/support-error-log.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorUx = inject(ErrorUxService);
  const notifications = inject(NotificationService);
  const authState = inject(AuthState);
  const supportErrorLog = inject(SupportErrorLogService);

  return next(req).pipe(
    catchError((error) => {
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

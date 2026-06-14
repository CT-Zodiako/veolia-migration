import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorUxService } from '../services/error-ux.service';
import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorUx = inject(ErrorUxService);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error) => {
      const message = req.url.includes('filecargue')
        ? errorUx.uploadMessage(error)
        : errorUx.toUserMessage(error);

      notifications.error(message);
      return throwError(() => new Error(message));
    })
  );
};

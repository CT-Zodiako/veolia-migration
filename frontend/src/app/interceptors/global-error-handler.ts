import { ErrorHandler, Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SupportErrorLogService } from '../services/support-error-log.service';

/** Captura global de errores JS del frontend (template, lógica de componentes,
 *  promesas rechazadas). Los errores HTTP ya pasan por httpErrorInterceptor,
 *  así que acá se descartan para no duplicar entradas en el log de soporte. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly supportErrorLog = inject(SupportErrorLogService);

  handleError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      const message = error instanceof Error ? error.message : String(error);
      this.supportErrorLog.pushFrontend(message);
    }
    console.error(error);
  }
}

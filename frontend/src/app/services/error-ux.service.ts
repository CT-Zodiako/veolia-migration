import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ErrorUxService {
  toUserMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }

    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
    }

    const backendMessage =
      error.error?.message ??
      error.error?.data ??
      (typeof error.error === 'string' ? error.error : null);

    if (backendMessage && typeof backendMessage === 'string') {
      return backendMessage;
    }

    if (error.status === 400) return 'Los datos enviados no son válidos. Revisá los campos obligatorios.';
    if (error.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
    if (error.status === 403) return 'No tenés permisos para realizar esta acción.';
    if (error.status === 404) return 'No se encontró la información solicitada.';
    if (error.status === 409) return 'La operación no se puede completar por el estado actual de los datos.';
    if (error.status >= 500) return 'Hubo un problema en el servidor. Intentá nuevamente en unos minutos.';

    return fallback;
  }

  uploadMessage(error: unknown): string {
    const base = this.toUserMessage(error, 'No fue posible procesar el archivo.');
    if (!(error instanceof HttpErrorResponse)) return base;
    const details = `${error.error?.message ?? ''}`.toLowerCase();

    if (details.includes('format') || details.includes('extensión') || details.includes('extension')) {
      return 'Formato de archivo inválido. Subí un archivo CSV válido.';
    }

    if (details.includes('parse') || details.includes('columna') || details.includes('fila')) {
      return 'Error al parsear el archivo. Revisá columnas, separador y contenido.';
    }

    if (details.includes('ora-') || details.includes('oracle') || error.status >= 500) {
      return 'El archivo llegó al servidor pero falló el guardado en base de datos. Intentá nuevamente o contactá soporte.';
    }

    return base;
  }
}

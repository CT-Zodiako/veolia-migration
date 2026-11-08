import { HttpContextToken } from '@angular/common/http';

/** Statuses HTTP que el consumidor declara como ESTADOS VÁLIDOS, no errores
 *  (ej. 404 = "esta reliquidación aún no tiene datos"). El httpErrorInterceptor
 *  no muestra toast ni los registra en el log de soporte para estos requests;
 *  el error sigue propagándose al suscriptor del componente. */
export const EXPECTED_ERROR_STATUSES = new HttpContextToken<number[]>(() => []);

/** El consumidor necesita el cuerpo del error (ej. la fila que falló en una carga
 *  desde Drive). El httpErrorInterceptor sigue mostrando el toast y registrando en
 *  el log de soporte, pero propaga el HttpErrorResponse original en vez de
 *  `new Error(message)`. */
export const KEEP_ERROR_BODY = new HttpContextToken<boolean>(() => false);

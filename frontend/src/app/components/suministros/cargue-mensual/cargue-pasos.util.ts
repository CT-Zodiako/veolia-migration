import { CargueArchivoEstado } from '../../shared/cargue-archivo-pasos.component';
import { periodoAnterior } from '../../../shared/periodo-anterior.util';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Error de un CSV con encabezados y sin filas de datos (mismo texto que los cargues semestrales). */
export const SIN_FILAS_DE_DATOS = 'El archivo no tiene filas de datos.';

/** Error cuando no se puede leer el CSV (mismo texto que el cargue complementario y los semestrales). */
export const ERROR_LECTURA = 'No fue posible leer el archivo.';

/** Período donde se guarda el cargue mensual (mes anterior al seleccionado), p. ej. "Diciembre 2025". */
export function periodoDestinoMensual(anno: number, mes: number): string {
  if (!anno || !mes) return '';
  const periodo = periodoAnterior(anno, mes);
  return `${MESES[periodo.mes - 1]} ${periodo.anno}`;
}

/** Traduce el estado de la pantalla al del cargue guiado (app-cargue-archivo-pasos). */
export function estadoCargueMensual(s: { validando: boolean; guardando: boolean; errores: number; filas: number }): CargueArchivoEstado {
  if (s.guardando) return 'guardando';
  if (s.validando) return 'validando';
  if (s.errores > 0) return 'error';
  if (s.filas > 0) return 'listo';
  return 'vacio';
}

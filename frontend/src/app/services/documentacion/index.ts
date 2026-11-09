import { InjectionToken } from '@angular/core';
import { ArticuloDocumentacion } from './documentacion.model';
import { DOCS_GENERAL } from './general.docs';

export * from './documentacion.model';

/** Contenido publicado del Centro de documentación, un archivo por área.
 *  Por ahora solo el área general (odd/tasks/documentacion-sistema.md, T2); las demás áreas
 *  (tarifas-suministros, reversiones-pgirs-informes, reliquidaciones-proyecciones, sui853)
 *  están escritas pero se publican después, sumándolas acá. */
export const DOCUMENTACION: ArticuloDocumentacion[] = [...DOCS_GENERAL];

/** Permite a los tests de la página usar artículos propios en vez del contenido real. */
export const DOCUMENTACION_ARTICULOS = new InjectionToken<ArticuloDocumentacion[]>('DOCUMENTACION_ARTICULOS', {
  providedIn: 'root',
  factory: () => DOCUMENTACION
});

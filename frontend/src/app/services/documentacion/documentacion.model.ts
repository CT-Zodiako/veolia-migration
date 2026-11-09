/** Un artículo del Centro de documentación (/documentacion). Uno por pantalla
 *  como regla general: `ruta` apunta a la pantalla real que explica. */
export interface ArticuloDocumentacion {
  /** Se calcula del título en AyudaService; no hace falta escribirlo. */
  slug?: string;
  /** Una de CATEGORIAS_DOCUMENTACION. */
  categoria: string;
  titulo: string;
  /** Resumen de 1–2 oraciones: lo muestran la búsqueda y las preguntas frecuentes. */
  contenido: string;
  /** Sistema donde vive la pantalla, ej. 'VEO-Regulator', 'Reliquidaciones', 'SUI 853'. */
  sistema?: string;
  /** Ruta de la pantalla, ej. '/suministros/reversion' — habilita "Ir a la pantalla". */
  ruta?: string;
  /** Bloques de explicación ("Para qué sirve", "Qué muestra", ...). */
  secciones?: SeccionDocumentacion[];
  /** Paso a paso, en orden. */
  pasos?: string[];
  /** "Tené en cuenta": validaciones, permisos, efectos irreversibles. */
  notas?: string[];
}

export interface SeccionDocumentacion {
  titulo: string;
  parrafos: string[];
}

export interface CapituloDocumentacion {
  categoria: string;
  articulos: ArticuloDocumentacion[];
}

/** Categoría que la página muestra como "Preguntas frecuentes" y no como módulo. */
export const CATEGORIA_FAQ = 'Preguntas frecuentes';

/** Orden en que la página muestra los módulos. */
export const CATEGORIAS_DOCUMENTACION = [
  'Primeros pasos',
  'Configuración',
  'Cálculo de Tarifas',
  'Suministros',
  'Reversiones',
  'Informes',
  'Proyecciones',
  'Reliquidaciones',
  'SUI 853',
  'PGIRS',
  CATEGORIA_FAQ
] as const;

/** "Crear una reliquidación y comparar costos" -> "crear-una-reliquidacion-y-comparar-costos". */
export function slugDocumentacion(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

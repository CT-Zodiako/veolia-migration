const ORDINALES = ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve', 'Diez'];

/**
 * Nunca mostrar el SIST_NOMBRE real (viene de datos de negocio) en la UI —
 * se deriva un nombre genérico estable a partir del SIST_ID.
 */
export function nombreSistemaGenerico(sistId: number | null | undefined): string {
  if (!sistId || sistId < 1) {
    return 'Sistema';
  }
  const ordinal = ORDINALES[sistId - 1] ?? String(sistId);
  return `Sistema ${ordinal}`;
}

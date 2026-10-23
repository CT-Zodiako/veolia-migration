/**
 * Legacy formatDateColumn (informesgerenciales/DashBoard.vue, CostoPoda.vue): dd/mm/yyyy from the
 * ISO date, "N/A" when missing. Only for display: the row keeps the raw value so the column sorts by date.
 */
export function formatearFechaLegacy(valor: unknown): string {
  if (!valor || typeof valor !== 'string') return 'N/A';
  const partes = valor.split('T')[0]?.split('-');
  if (partes?.length !== 3) return 'N/A';
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Legacy formatDateColumn (ResumenPgirs.vue:112-124, tableVariablesPGRIS.vue): "dd/mm/yyyy" from the ISO date, "N/A" if empty. */
export function fechaIngresoLegacy(fecha: unknown): string {
  if (typeof fecha === 'string' && fecha) {
    const partes = fecha.split('T')[0].split('-');
    if (partes.length === 3) {
      const [anno, mes, dia] = partes;
      return `${dia}/${mes}/${anno}`;
    }
  }
  return 'N/A';
}

/** Legacy traducirMes (tableVariablesPGRIS.vue): month number -> name; other values are shown as they come. */
export function nombreMesLegacy(mes: unknown): unknown {
  return typeof mes === 'number' && mes >= 1 && mes <= 12 ? MESES[mes - 1] : mes;
}

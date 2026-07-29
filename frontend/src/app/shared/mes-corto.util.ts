const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function mesCorto(mes: number): string {
  return MESES_CORTOS[mes - 1] ?? String(mes);
}

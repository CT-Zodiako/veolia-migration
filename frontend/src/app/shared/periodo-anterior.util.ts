/**
 * Convención heredada del legacy (patrón `date.setMonth(date.getMonth() - 1)`,
 * repetido en 50+ pantallas): el mes/año que el usuario ve y selecciona en los
 * selectores compartidos (app-anno-selector/app-mes-selector) representa el
 * "mes actual", pero las consultas de datos siempre operan sobre el período
 * YA CERRADO -- el mes anterior. Si el usuario elige Enero 2025, la consulta
 * real va contra Diciembre 2024.
 *
 * Se centraliza acá (en vez de repetir el cálculo en cada componente) para
 * que el rollover de año quede en un solo lugar, testeado una vez.
 */
export function periodoAnterior(anno: number, mes: number): { anno: number; mes: number } {
  return mes === 1 ? { anno: anno - 1, mes: 12 } : { anno, mes: mes - 1 };
}

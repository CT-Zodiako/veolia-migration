import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

/**
 * Período con el que los informes gerenciales cargan al entrar, como el legacy
 * (`stDate == null ? new Date() : stDate`, y luego la consulta va a mes - 1 vía periodoAnterior):
 * el año/mes guardado por el usuario o, si no hay, el mes actual.
 */
export function periodoInicial(state: ParametrosConsultaStateService, hoy = new Date()): { anno: number; mes: number } {
  return {
    anno: state.getAnno() ?? hoy.getFullYear(),
    mes: state.getMes() ?? hoy.getMonth() + 1
  };
}

import { periodoInicial } from './periodo-inicial.util';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

function estado(anno: number | null, mes: number | null): ParametrosConsultaStateService {
  return { getAnno: () => anno, getMes: () => mes } as unknown as ParametrosConsultaStateService;
}

describe('periodoInicial', () => {
  it('falls back to the current month when nothing is saved', () => {
    expect(periodoInicial(estado(null, null), new Date(2026, 0, 15))).toEqual({ anno: 2026, mes: 1 });
  });

  it('uses the saved año/mes', () => {
    expect(periodoInicial(estado(2023, 12), new Date(2026, 0, 15))).toEqual({ anno: 2023, mes: 12 });
  });
});

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReliqCompararCostoComponent } from './reliq-comparar-costo.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

function crear(): ReliqCompararCostoComponent {
  TestBed.configureTestingModule({
    imports: [ReliqCompararCostoComponent],
    providers: [
      { provide: ReliqCargueService, useValue: { compararCostos: vi.fn(() => of({ status: 'ok', data: [], message: '' })) } },
      { provide: ReliquidacionService, useValue: { getReliquidaciones: vi.fn(() => of({ status: 'ok', data: [], message: '' })) } },
      { provide: ParametrosConsultaStateService, useValue: { getReliquidacion: vi.fn(() => null), setReliquidacion: vi.fn() } }
    ]
  });
  TestBed.overrideComponent(ReliqCompararCostoComponent, { set: { template: '', imports: [] } });
  return TestBed.createComponent(ReliqCompararCostoComponent).componentInstance;
}

describe('ReliqCompararCostoComponent - legacy table cosmetics', () => {
  it('rounds to 2 decimals every value column the legacy rounded (all but RELQ_CLUS)', () => {
    const component = crear();
    const redondeadas = component.columnas.filter((c) => c.decimales === 2).map((c) => c.field);
    const valores = component.columnas.filter((c) => c.numero).map((c) => c.field);

    expect(redondeadas).toEqual(valores.filter((f) => f !== 'relqClus'));
    expect(redondeadas).toHaveLength(32);
    expect(component.columnas.find((c) => c.field === 'relqClus')?.decimales).toBeUndefined();
  });

  it('has no column filters, like the legacy screen (filter templates never displayed)', () => {
    const component = crear();

    expect(component.columnas.filter((c) => c.filtrable)).toEqual([]);
  });
});

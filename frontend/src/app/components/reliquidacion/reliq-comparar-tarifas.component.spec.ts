import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReliqCompararTarifasComponent } from './reliq-comparar-tarifas.component';
import { ReliqCargueService } from '../../services/reliquidacion/reliq-cargue.service';
import { ReliquidacionService } from '../../services/reliquidacion/reliquidacion.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

function crear(): ReliqCompararTarifasComponent {
  TestBed.configureTestingModule({
    imports: [ReliqCompararTarifasComponent],
    providers: [
      { provide: ReliqCargueService, useValue: { compararTarifas: vi.fn(() => of({ status: 'ok', data: [], message: '' })) } },
      { provide: ReliquidacionService, useValue: { getReliquidaciones: vi.fn(() => of({ status: 'ok', data: [], message: '' })) } },
      { provide: ParametrosConsultaStateService, useValue: { getReliquidacion: vi.fn(() => null), setReliquidacion: vi.fn() } }
    ]
  });
  TestBed.overrideComponent(ReliqCompararTarifasComponent, { set: { template: '', imports: [] } });
  return TestBed.createComponent(ReliqCompararTarifasComponent).componentInstance;
}

describe('ReliqCompararTarifasComponent - legacy table cosmetics', () => {
  it('enables the legacy "Contiene" filters on MES, ANNO, CLAS_NOMBRE, PARA_NOMBRE and FAPR_NOMBRE only', () => {
    const component = crear();

    expect(component.columnas.filter((c) => c.filtrable).map((c) => c.field))
      .toEqual(['mes', 'anno', 'clasNombre', 'paraNombre', 'faprNombre']);
  });

  it('rounds to 2 decimals every value column the legacy rounded (all but TBL_ORIG)', () => {
    const component = crear();
    const redondeadas = component.columnas.filter((c) => c.decimales === 2).map((c) => c.field);
    const valores = component.columnas.filter((c) => c.numero).map((c) => c.field);

    expect(redondeadas).toEqual(valores.filter((f) => f !== 'tblOrig'));
    expect(redondeadas).toHaveLength(35);
    expect(component.columnas.find((c) => c.field === 'tblOrig')?.decimales).toBeUndefined();
  });
});

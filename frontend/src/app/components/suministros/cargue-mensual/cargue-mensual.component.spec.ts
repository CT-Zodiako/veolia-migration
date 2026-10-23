import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { CargueMensualComponent } from './cargue-mensual.component';
import { SuministrosService } from '../../../services/suministros.service';

function setup(certificarData: number | null) {
  const service = {
    getcanCertificate: vi.fn(() => of({ data: [] })),
    certificar: vi.fn(() => of({ data: certificarData })),
    certificarMensual: vi.fn(() => of({ data: null }))
  };
  const confirmation = { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) };

  TestBed.configureTestingModule({
    imports: [CargueMensualComponent],
    providers: [
      { provide: SuministrosService, useValue: service },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });

  const component = TestBed.createComponent(CargueMensualComponent).componentInstance;
  component.aps.set(5);
  component.anno.set(2026);
  component.mes.set(1);
  component.tarifasExistentes.set(false);
  return { component, service };
}

describe('CargueMensualComponent certificar (701)', () => {
  // Legacy Cargue.vue:157-160 / CargueService.js:472: fauco_certificar returns an integer, 1 = certified.
  it('treats the integer result 1 as success and certifies the previous month', () => {
    const { component, service } = setup(1);

    component.certificar();

    expect(service.certificar).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12 });
    expect(component.estado()).toBe('Certificado correctamente.');
    expect(component.error()).toBe('');
    expect(service.certificarMensual).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12 });
  });

  it('reports an error for any other integer result', () => {
    const { component, service } = setup(0);

    component.certificar();

    expect(component.estado()).toBe('');
    expect(component.error()).toBe('Error al certificar tarifas.');
    expect(service.certificarMensual).toHaveBeenCalledTimes(1);
  });
});

describe('CargueMensualComponent tariffs check (701)', () => {
  // Legacy suministros/controller.js:550-555 answers [{ CANTIDAD }] and CargueService.js:382 returns
  // response.data[0].CANTIDAD > 0: a count of 0 means no tariffs yet, so CERTIFICAR stays enabled.
  it.each([
    [0, false],
    [3, true]
  ])('reads CANTIDAD %i as tariffs existing = %s', (cantidad, existing) => {
    const { component, service } = setup(1);
    service.getcanCertificate.mockReturnValue(of({ data: [{ CANTIDAD: cantidad }] }) as never);

    component.onGuardadoHijo();

    expect(service.getcanCertificate).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12 });
    expect(component.tarifasExistentes()).toBe(existing);
  });
});

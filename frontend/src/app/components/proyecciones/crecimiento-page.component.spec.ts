import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { CrecimientoPageComponent } from './crecimiento-page.component';
import { ProyeccionesService } from '../../services/proyecciones.service';

function setup() {
  const ok = () => of({ status: true, data: { success: true }, message: 'Guardado' });
  const service = {
    registrarCrecimientoUsuarios: vi.fn(ok),
    registrarCrecimientoInfPropia: vi.fn(ok),
    registrarCrecimientoInfTerceros: vi.fn(ok),
    registrarDescuento: vi.fn(ok)
  };
  TestBed.configureTestingModule({
    imports: [CrecimientoPageComponent],
    providers: [{ provide: ProyeccionesService, useValue: service }]
  });
  const fixture = TestBed.createComponent(CrecimientoPageComponent);
  const component = fixture.componentInstance;
  const messages = fixture.debugElement.injector.get(MessageService);
  const add = vi.spyOn(messages, 'add');
  component.apsaId.set(3);
  component.proyId.set(8);
  return { component, service, add };
}

// P2: the Drive rows (sheet headers) are mapped to the request DTOs before saving.
describe('CrecimientoPageComponent save', () => {
  it('sends the USUARIOS sheet rows mapped to the request items', () => {
    const { component, service, add } = setup();
    component.usuarios.set([{ COD_APS: 77, ANNO: 2025, MES: 2, CODUSO: 1, CANTIDAD: 10 }]);

    component.guardarUsuarios();

    expect(service.registrarCrecimientoUsuarios).toHaveBeenCalledWith({
      apsaId: 3, proyId: 8,
      items: [{
        codAps: 77, anno: 2025, semestre: 2, coduso: 1, nomclaseuso: null, codfactor: null, valorfactor: null,
        codtipopred: null, nomtipopred: null, cantidad: 10, toneladas: null
      }]
    });
    expect(add).toHaveBeenCalledWith({ severity: 'success', summary: 'Usuarios', detail: 'Guardado' });
    expect(component.guardando()).toBe(false);
  });

  it('sends the DESCUENTOS_COSTOS rows mapped (CCS -> dccs)', () => {
    const { component, service } = setup();
    component.descuentos.set([{ COD_APS: 77, NOM_APS: 'Tunja', ANNO: 2025, MES: 3, CCS: 0.1 }]);

    component.guardarDescuentos();

    expect(service.registrarDescuento).toHaveBeenCalledWith({
      apsaId: 3, proyId: 8,
      items: [{ codAps: 77, nomAps: 'Tunja', anno: 2025, mes: 3, dccs: 0.1, dcbl: null, dclus: null, dcrt: null, dcdf: null, dctl: null, dvba: null }]
    });
  });

  it('sends the propia and terceros rows mapped', () => {
    const { component, service } = setup();
    component.propia.set([{ COD_APS: 77, ANNO: 2025, MES: 1, V_N: 100 }]);
    component.terceros.set([{ COD_APS: 77, ANNO: 2025, MES: 1, C_N: 50 }]);

    component.guardarPropia();
    component.guardarTerceros();

    expect(service.registrarCrecimientoInfPropia).toHaveBeenCalledWith(expect.objectContaining({
      apsaId: 3, proyId: 8, items: [expect.objectContaining({ codAps: 77, anno: 2025, mes: 1, vN: 100, vNa: null })]
    }));
    expect(service.registrarCrecimientoInfTerceros).toHaveBeenCalledWith(expect.objectContaining({
      apsaId: 3, proyId: 8, items: [expect.objectContaining({ codAps: 77, anno: 2025, mes: 1, cN: 50, cNa: null })]
    }));
  });

  it('does not call the backend and shows the error when a numeric cell is not a number', () => {
    const { component, service, add } = setup();
    component.usuarios.set([{ COD_APS: 77, ANNO: 2025, MES: 1, CANTIDAD: 'diez' }]);

    component.guardarUsuarios();

    expect(service.registrarCrecimientoUsuarios).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith({ severity: 'error', summary: 'Usuarios', detail: 'Fila 2, columna CANTIDAD: "diez" no es un número.' });
    expect(component.guardando()).toBe(false);
  });
});

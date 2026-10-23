import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { IndicesCraComponent } from './indices-cra.component';
import { IndicesCraService } from '../../services/indices-cra.service';

describe('IndicesCraComponent new indices (301)', () => {
  // Legacy Cra.vue:158-161 starts every index as null and sends it untouched;
  // indicesCRA/controller.js:10 stores the value (and val/2) as-is.
  it('sends blank values as null instead of 0', () => {
    const service = {
      consultar: vi.fn(() => of({ data: [] })),
      catalogo: vi.fn(() => of({ data: [] })),
      crear: vi.fn(() => of({ data: { id: 1 } }))
    };
    TestBed.configureTestingModule({
      imports: [IndicesCraComponent],
      providers: [
        { provide: IndicesCraService, useValue: service },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
      ]
    });
    const component = TestBed.createComponent(IndicesCraComponent).componentInstance;
    component.anno.set(2026);
    component.mes.set(3);
    component.abrirModalAgregar();
    component.nuevoSmlv.set(1423500);

    component.guardarNuevo();

    expect(service.crear).toHaveBeenCalledWith({
      anno: 2026,
      mes: 2,
      valores: [
        { id: 1, val: null },
        { id: 2, val: 1423500 },
        { id: 3, val: null },
        { id: 4, val: null }
      ]
    });
  });
});

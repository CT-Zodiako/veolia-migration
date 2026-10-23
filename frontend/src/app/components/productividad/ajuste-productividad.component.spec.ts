import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { AjusteProductividadComponent } from './ajuste-productividad.component';
import { ProductividadService } from '../../services/productividad.service';

function setup(existente: boolean, anno: number, mes: number) {
  const item = existente ? { apsaId: 5, prodAnno: anno, prodMes: mes, prodValor: 0.8 } : null;
  const service = {
    consultar: vi.fn(() => of({ data: item })),
    crear: vi.fn(() => of({ data: null })),
    editar: vi.fn(() => of({ data: null }))
  };
  TestBed.configureTestingModule({
    imports: [AjusteProductividadComponent],
    providers: [
      { provide: ProductividadService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  const component = TestBed.createComponent(AjusteProductividadComponent).componentInstance;
  component.onAnnoChange(anno);
  component.onMesChange(mes);
  component.onApsChange(5);
  return { component, service };
}

describe('AjusteProductividadComponent (303)', () => {
  // Legacy Productividad.vue:171-178 reads the previous month.
  it('reads the previous month', () => {
    const { service } = setup(true, 2026, 1);

    expect(service.consultar).toHaveBeenLastCalledWith({ aps: 5, anno: 2025, mes: 12 });
  });

  // Legacy Productividad.vue:121-135 + suministros/controller.js:527 insert into the selected month.
  it('inserts a new value into the selected month', () => {
    const { component, service } = setup(false, 2026, 3);
    component.iniciarEdicion();
    component.editingValor.set(0.75);

    component.confirmarGuardar();

    expect(service.crear).toHaveBeenCalledWith({ aps: 5, anno: 2026, mes: 3, valor: 0.75 });
    expect(service.editar).not.toHaveBeenCalled();
  });

  // Legacy suministros/controller.js:536-540 (uptProductividad) updates the previous month.
  it('updates the previous month, rolling January back to December', () => {
    const { component, service } = setup(true, 2026, 1);
    component.iniciarEdicion();
    component.editingValor.set(0.9);

    component.confirmarGuardar();

    expect(service.editar).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12, valor: 0.9 });
    expect(service.crear).not.toHaveBeenCalled();
  });
});

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AjusteProductividadComponent } from './ajuste-productividad.component';
import { ProductividadService } from '../../services/productividad.service';
import { NotificationService } from '../../services/notification.service';

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

  // Legacy Productividad.vue:30-49: once APS/año/mes are set the screen always offers Agregar or Editar.
  describe('entry actions (S3)', () => {
    function render(consulta: Observable<unknown>) {
      const service = {
        consultar: vi.fn(() => consulta),
        crear: vi.fn((): Observable<unknown> => of({ data: null })),
        editar: vi.fn((): Observable<unknown> => of({ data: null }))
      };
      const confirm = vi.fn((opts: { accept: () => void }) => opts.accept());
      const notification = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
      TestBed.configureTestingModule({
        imports: [AjusteProductividadComponent],
        providers: [
          { provide: ProductividadService, useValue: service },
          { provide: ConfirmationService, useValue: { confirm } },
          { provide: NotificationService, useValue: notification }
        ]
      });
      // APS/año/mes selectors are out of scope: render them as plain elements.
      TestBed.overrideComponent(AjusteProductividadComponent, {
        set: { imports: [CommonModule, FormsModule, ToastModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
      });
      const fixture = TestBed.createComponent(AjusteProductividadComponent);
      const component = fixture.componentInstance;
      const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
      component.onAnnoChange(2026);
      component.onMesChange(3);
      component.onApsChange(5);
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;
      const button = (label: string) => host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      return { fixture, component, service, confirm, add, notification, host, button };
    }

    // httpErrorInterceptor already toasted the failure and rethrows new Error(message) (L4).
    it('still offers Agregar when the consulta fails, leaving the toast to the HTTP interceptor', () => {
      const { component, add, notification, button } = render(throwError(() => new Error('Error al consultar productividad.')));

      expect(add).not.toHaveBeenCalled();
      expect(notification.error).not.toHaveBeenCalled();
      expect(component.item()).toBeNull();
      expect(component.consultado()).toBe(true);
      expect(component.loading()).toBe(false);
      expect(button('Agregar')).not.toBeNull();
      expect(button('Agregar')!.disabled).toBe(false);
      expect(button('Editar')).toBeNull();
    });

    it.each(['crear', 'editar'] as const)('leaves the toast of a failed %s to the HTTP interceptor', (metodo) => {
      const existente = metodo === 'editar' ? { apsaId: 5, prodAnno: 2026, prodMes: 2, prodValor: 0.8 } : null;
      const { component, service, add, notification } = render(of({ data: existente }));
      service[metodo].mockReturnValue(throwError(() => new Error('No fue posible guardar.')));
      component.iniciarEdicion();
      component.editingValor.set(0.5);

      component.confirmarGuardar();

      expect(service[metodo]).toHaveBeenCalled();
      expect(add).not.toHaveBeenCalled();
      expect(notification.error).not.toHaveBeenCalled();
      expect(component.loading()).toBe(false);
      expect(component.editando()).toBe(true);
    });

    it('keeps the success toast after saving', () => {
      const { component, add } = render(of({ data: null }));
      component.iniciarEdicion();

      component.confirmarGuardar();

      expect(add).toHaveBeenCalledWith({ severity: 'success', summary: 'Ajuste Productividad', detail: 'Valor guardado correctamente.' });
    });

    it('Agregar starts the new value at 0 and saves it into the selected month', () => {
      const { fixture, component, service, button } = render(of({ data: null }));
      expect(button('Editar')).toBeNull();

      button('Agregar')!.click();
      fixture.detectChanges();

      expect(component.editando()).toBe(true);
      expect(component.editingValor()).toBe(0);
      expect(button('Guardar')!.disabled).toBe(false);

      button('Guardar')!.click();

      expect(service.crear).toHaveBeenCalledWith({ aps: 5, anno: 2026, mes: 3, valor: 0 });
      expect(service.editar).not.toHaveBeenCalled();
    });

    it('Editar pre-fills the stored value rounded to 6 decimals', () => {
      const { fixture, component, host, button } = render(
        of({ data: { apsaId: 5, prodAnno: 2026, prodMes: 2, prodValor: 0.123456789 } })
      );
      expect(button('Agregar')).toBeNull();
      // design/suministros-pantallas/16: read-only value in es-CO (decimal comma), still rounded to 6 decimals.
      expect(host.querySelector('td.text-right')!.textContent!.trim()).toBe('0,123457');

      button('Editar')!.click();
      fixture.detectChanges();

      expect(component.editando()).toBe(true);
      expect(component.editingValor()).toBe(0.123457);
    });

    it('disables the save button while the value is empty and does not save', () => {
      const { fixture, component, service, confirm, button } = render(of({ data: null }));
      button('Agregar')!.click();
      fixture.detectChanges();

      component.editingValor.set(null);
      fixture.detectChanges();

      expect(button('Guardar')!.disabled).toBe(true);
      component.confirmarGuardar();
      expect(confirm).not.toHaveBeenCalled();
      expect(service.crear).not.toHaveBeenCalled();
      expect(service.editar).not.toHaveBeenCalled();

      component.editingValor.set(1.5);
      fixture.detectChanges();
      expect(button('Guardar')!.disabled).toBe(false);
    });

    // design/suministros-pantallas/16-productividad-c-actual-mejorada.html: titled card, visible period in the row,
    // "Sin valor · Pendiente" instead of "-", and a footer explaining the state.
    it('titles the card, shows the period and a pending state instead of "-"', () => {
      const { host } = render(of({ data: null }));
      const txt = (sel: string) => host.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim();

      expect(txt('.prod-titulo')).toBe('Ajuste de productividad del período');
      expect(Array.from(host.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['Período', 'Valor', 'Acciones']);
      expect(txt('.prod-periodo')).toBe('Marzo 2026');
      expect(txt('.prod-sin-valor')).toBe('Sin valor');
      expect(txt('.prod-pendiente')).toBe('Pendiente');
      expect(txt('.prod-pie')).toBe('Este período aún no tiene ajuste de productividad.');
      expect(host.textContent).not.toContain(' - ');
    });

    it('shows the stored value with up to 6 decimals and a footer for an existing ajuste', () => {
      const { host } = render(of({ data: { apsaId: 5, prodAnno: 2026, prodMes: 2, prodValor: 0.9824101 } }));
      const txt = (sel: string) => host.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim();

      expect(txt('.prod-valor')).toBe('0,98241');
      expect(host.querySelector('.prod-pendiente')).toBeNull();
      expect(txt('.prod-pie')).toBe('Ajuste registrado para el período. Usá Editar para cambiarlo.');
    });
  });
});

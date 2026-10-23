import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { DescuentoCostosComponent } from './descuento-costos.component';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';
import { congelarHoy } from './informes-gerenciales.spec-helpers';

// Legacy 605 "Actualizacion de Costo" (/actualizacioncostos): front-tarificador/src/views/suministros/Descuentos.vue
// and service/DesCosService.js (suministros/getapsDesCost, getapsDesCostUnico, setapsDesCost, uptapsDesCost).
// Every legacy query used the month before the selected one (Descuentos.vue:186-191, 220-225, 277-282).

const descuentos = [{ DESC_ID: 55, PARA_COSTO20010: 20, PARA_NOMBRE: 'CBL', DESC_VALOR: 1.234567 }];
const catalogo = [
  { PARA_PARA: 20, PARA_NOMBRE: 'CBL', DESC_VALOR: 7 },
  { PARA_PARA: 21, PARA_NOMBRE: 'CLUS', DESC_VALOR: 0 }
];

function crear(guardado: { aps?: number | null; anno?: number | null; mes?: number | null } = {}) {
  const service = {
    getApsDesCost: vi.fn(() => of({ status: 'success', data: descuentos, message: 'OK' })),
    getApsDesCostUnico: vi.fn(() => of({ status: 'success', data: catalogo, message: 'OK' })),
    setApsDesCost: vi.fn(() => of({ status: 'success', data: {}, message: 'Descuento registrado correctamente.' })),
    uptApsDesCost: vi.fn(() => of({ status: 'success', data: {}, message: 'Descuento actualizado correctamente.' }))
  };
  TestBed.configureTestingModule({
    imports: [DescuentoCostosComponent],
    providers: [
      { provide: InfoGerencialService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: {
          getAps: vi.fn(() => guardado.aps ?? null),
          getAnno: vi.fn(() => guardado.anno ?? null),
          getMes: vi.fn(() => guardado.mes ?? null),
          setAps: vi.fn(),
          setAnno: vi.fn(),
          setMes: vi.fn()
        }
      }
    ]
  });
  const fixture = TestBed.createComponent(DescuentoCostosComponent);
  fixture.detectChanges();
  const messages = fixture.debugElement.injector.get(MessageService);
  vi.spyOn(messages, 'add');
  return { fixture, component: fixture.componentInstance, service, messages };
}

function seleccionarPeriodo(component: DescuentoCostosComponent): void {
  component.onApsChange(5);
  component.onAnnoChange(2025);
  component.onMesChange(1);
}

describe('DescuentoCostosComponent (605) - legacy Descuentos.vue', () => {
  // Descuentos.vue:277-289 getapsDesCost(aps, month-1); grid PARA_NOMBRE + DESC_VALOR rounded to 4 decimals
  // (Descuentos.vue:15-37 redondeo(DESC_VALOR, 4), :260-262).
  it('lists the discounts of the previous month with DESC_VALOR rounded to 4 decimals', () => {
    const { fixture, component, service } = crear();

    seleccionarPeriodo(component);
    fixture.detectChanges();

    expect(service.getApsDesCost).toHaveBeenLastCalledWith(5, 2024, 12);
    expect(component.columnas.map((c) => c.field)).toEqual(['PARA_NOMBRE', 'DESC_VALOR']);
    expect(component.rows()).toEqual([{ ...descuentos[0], DESC_VALOR: 1.2346 }]);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('CBL');
    expect(texto).toContain('1.2346');
  });

  // "Agregar" offers the costs without an active discount (suministros/controller.js:765-768) and saves with
  // setapsDesCost(aps, month-1, PARA_PARA, valor) (Descuentos.vue:226-238), then closes and reloads (:257-258).
  it('adds a discount for the selected cost in the previous month and reloads the grid', () => {
    const { fixture, component, service } = crear();
    seleccionarPeriodo(component);

    component.abrirNuevo();
    fixture.detectChanges();
    expect(service.getApsDesCostUnico).toHaveBeenLastCalledWith(0, 5, 2024, 12, true);
    expect(component.catalogoOptions()).toEqual(catalogo);

    component.dialogSeleccion.set(21);
    component.dialogValor.set(12.5);
    const consultasPrevias = service.getApsDesCost.mock.calls.length;
    component.guardar();

    expect(service.setApsDesCost).toHaveBeenCalledWith(5, 2024, 12, 21, 12.5);
    expect(service.uptApsDesCost).not.toHaveBeenCalled();
    expect(component.dialogVisible()).toBe(false);
    expect(service.getApsDesCost).toHaveBeenCalledTimes(consultasPrevias + 1);
  });

  // Edit: openBasic(false, DESC_ID) -> getapsDesCostUnico(DESC_ID, aps, month-1, false) and preselects the row's own
  // cost and value (Descuentos.vue:48, 182-209); save -> uptapsDesCost(aps, month-1, PARA_PARA, valor) (:239-250).
  it('edits a discount by its cost id in the previous month', () => {
    const { fixture, component, service } = crear();
    seleccionarPeriodo(component);

    component.abrirEdicion({ DESC_ID: 55, PARA_COSTO20010: 20, PARA_NOMBRE: 'CBL', DESC_VALOR: 7 });
    fixture.detectChanges();

    expect(service.getApsDesCostUnico).toHaveBeenLastCalledWith(55, 5, 2024, 12, false);
    expect(component.dialogSeleccion()).toBe(20);
    expect(component.dialogValor()).toBe(7);

    component.dialogValor.set(9.75);
    component.guardar();

    expect(service.uptApsDesCost).toHaveBeenCalledWith(5, 2024, 12, 20, 9.75);
    expect(service.setApsDesCost).not.toHaveBeenCalled();
  });

  // Descuentos.vue:18 header="COSTO", :29 header="DESCUENTO".
  it('shows the legacy grid headers COSTO and DESCUENTO', () => {
    const { fixture, component } = crear();
    seleccionarPeriodo(component);
    fixture.detectChanges();

    const headers = Array.from(fixture.nativeElement.querySelectorAll('th') as NodeListOf<HTMLElement>).map((th) => th.textContent ?? '');
    expect(headers.some((h) => h.includes('COSTO'))).toBe(true);
    expect(headers.some((h) => h.includes('DESCUENTO'))).toBe(true);
  });

  // Descuentos.vue:253-258: without a selected cost legacy showed "debe seleccionar un descuento!!", then reloaded and
  // closed the dialog.
  it('saving without a cost warns "debe seleccionar un descuento!!", reloads and closes the dialog', () => {
    const { component, service, messages } = crear();
    seleccionarPeriodo(component);
    component.abrirNuevo();
    const consultasPrevias = service.getApsDesCost.mock.calls.length;

    component.guardar();

    expect(messages.add).toHaveBeenCalledWith(expect.objectContaining({ detail: 'debe seleccionar un descuento!!' }));
    expect(component.dialogVisible()).toBe(false);
    expect(service.setApsDesCost).not.toHaveBeenCalled();
    expect(service.uptApsDesCost).not.toHaveBeenCalled();
    expect(service.getApsDesCost).toHaveBeenCalledTimes(consultasPrevias + 1);
  });

  // Legacy Selector.vue:153-158 defaults the period to today and Descuentos.vue:158-160 loads on mount with the stored
  // APS, i.e. today - 1 month.
  describe('on entry', () => {
    beforeEach(congelarHoy);
    afterEach(() => vi.useRealTimers());

    it('with a stored APS and no stored period loads today - 1 month', () => {
      const { service } = crear({ aps: 5 });

      expect(service.getApsDesCost).toHaveBeenCalledWith(5, 2025, 12);
    });
  });
});

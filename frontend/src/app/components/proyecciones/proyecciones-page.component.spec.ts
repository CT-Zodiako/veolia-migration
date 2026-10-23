import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ProyeccionesPageComponent } from './proyecciones-page.component';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { Proyeccion } from '../../models/proyecciones.models';

const proyeccion = (overrides: Partial<Proyeccion>): Proyeccion => ({
  proyId: 1, apsaId: 3, apsaNombre: 'Tunja', proyNombre: 'Base', proyDescripcion: 'Escenario', proyTipo100: 1,
  proyTipoNombre: 'Ingresos', proyAnnoDes: 2025, proyMesDes: 4, proyAnnoHas: 2026, proyMesHas: 3, proyEstado: 1,
  sisuCorreo: 'ana@veolia.com', ...overrides
});

function setup(ultimaTarifa: { anno: number; mes: number }[] = [{ anno: 2025, mes: 3 }]) {
  const rows = [
    proyeccion({ proyId: 1 }),
    proyeccion({ proyId: 22, apsaId: 4, apsaNombre: 'Sogamoso', proyNombre: 'Alterna', proyTipo100: 2, proyTipoNombre: 'Subsidios o Contribuciones', proyMesDes: 11, sisuCorreo: 'luis@veolia.com' })
  ];
  const service = {
    consultaGeneral: vi.fn(() => of({ status: true, data: rows, message: 'OK' })),
    ultimasTarifas: vi.fn(() => of({ status: true, data: ultimaTarifa, message: 'OK' })),
    crear: vi.fn(() => of({ status: true, data: { success: true }, message: 'Proyección creada correctamente.' })),
    editar: vi.fn(() => of({ status: true, data: { success: true }, message: 'Proyección actualizada correctamente.' })),
    eliminar: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [ProyeccionesPageComponent],
    providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: ProyeccionesService, useValue: service },
      { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(ProyeccionesPageComponent);
  const component = fixture.componentInstance;
  const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
  return { fixture, component, service, add };
}

describe('ProyeccionesPageComponent grid (P7)', () => {
  // Legacy creaGrid.vue:13-66: 15 rows, [15,30,50,100], every data column sortable,
  // filters on Id, APS, Tipo and Usuario; Desde/Hasta shown as YYYY/MM.
  it('restores legacy paging, sorting, filters and period format', () => {
    const { fixture, component } = setup();
    fixture.detectChanges();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    const sortables = Array.from(fixture.nativeElement.querySelectorAll('th[psortablecolumn]') as NodeListOf<HTMLElement>)
      .map((th) => th.getAttribute('psortablecolumn'));
    const ids = () => Array.from(fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>)
      .map((tr) => tr.cells[0]?.textContent?.trim());

    expect(table.rows).toBe(15);
    expect(table.rowsPerPageOptions).toEqual([15, 30, 50, 100]);
    expect(sortables).toEqual(['proyId', 'apsaNombre', 'proyNombre', 'proyDescripcion', 'proyTipoNombre', 'desde', 'hasta', 'sisuCorreo']);
    const primera = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    expect(primera.cells[5].textContent?.trim()).toBe('2025/04');
    expect(primera.cells[6].textContent?.trim()).toBe('2026/03');

    component.idFilter = '22';
    fixture.detectChanges();
    expect(ids()).toEqual(['22']);

    component.idFilter = '';
    component.tipoFilter = 'subsidios';
    fixture.detectChanges();
    expect(ids()).toEqual(['22']);

    component.tipoFilter = '';
    component.usuarioFilter = 'ANA@';
    fixture.detectChanges();
    expect(ids()).toEqual(['1']);

    component.usuarioFilter = '';
    component.apsFilter = 'sog';
    fixture.detectChanges();
    expect(ids()).toEqual(['22']);
  });
});

describe('ProyeccionesPageComponent create (P1/P6)', () => {
  // formCrear.vue:292-297 + controller.js:186-207: "Desde" = last tariff (vpro_lastarifa) shown as
  // new Date(anno, mes), i.e. the month after it; "Horizonte hasta" stores the picked month - 1 (:189-200).
  it('fixes Desde to the month after the last tariff and saves hasta = horizonte - 1 with the descripción', () => {
    const { component, service, add } = setup();
    component.nueva();
    component.onApsChange(3);
    component.form.proyNombre = 'Proy';
    component.form.proyDescripcion = 'Escenario base';
    component.form.proyTipo100 = 2;
    component.form.horizonteAnno = 2026;
    component.form.horizonteMes = 1;

    component.guardar();

    expect(service.ultimasTarifas).toHaveBeenCalledWith(3);
    expect(component.desdeTexto()).toBe('04/2025');
    expect(service.crear).toHaveBeenCalledWith({
      apsaId: 3, proyNombre: 'Proy', proyDescripcion: 'Escenario base', proyTipo100: 2,
      proyAnnoDes: 2025, proyMesDes: 4, proyAnnoHas: 2025, proyMesHas: 12
    });
    expect(add).toHaveBeenCalledWith({ severity: 'success', summary: 'Proyecciones', detail: 'Proyección creada correctamente.' });
    expect(component.showDialog()).toBe(false);
  });

  it('rolls a December last tariff over to January', () => {
    const { component } = setup([{ anno: 2024, mes: 12 }]);
    component.nueva();
    component.onApsChange(3);

    expect(component.form.proyAnnoDes).toBe(2025);
    expect(component.form.proyMesDes).toBe(1);
  });

  it('requires the descripción like legacy ("Todos los datos son obligatorios")', () => {
    const { component, service, add } = setup();
    component.nueva();
    component.onApsChange(3);
    component.form.proyNombre = 'Proy';
    component.form.proyDescripcion = '   ';

    component.guardar();

    expect(service.crear).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith({ severity: 'error', summary: 'Proyecciones', detail: 'Todos los datos son obligatorios' });
    expect(component.showDialog()).toBe(true);
  });

  it('blocks creation when the APS has no last tariff', () => {
    const { component, service, add } = setup([]);
    component.nueva();
    component.onApsChange(3);
    component.form.proyNombre = 'Proy';
    component.form.proyDescripcion = 'Desc';

    component.guardar();

    expect(component.form.proyAnnoDes).toBeNull();
    expect(add).toHaveBeenCalledWith({ severity: 'warn', summary: 'Proyecciones', detail: 'El APS seleccionado no tiene un último cálculo de tarifas.' });
    expect(add).toHaveBeenCalledWith({ severity: 'error', summary: 'Proyecciones', detail: 'Todos los datos son obligatorios' });
    expect(service.crear).not.toHaveBeenCalled();
  });
});

describe('ProyeccionesPageComponent edit (P1/P6)', () => {
  // formCrear.vue:20,271-289: APS disabled when editing, Desde kept, horizonte shown as stored hasta + 1.
  it('locks APS and Desde, shows horizonte = hasta + 1 and saves the descripción', () => {
    const { fixture, component, service } = setup();
    component.editar(proyeccion({ proyId: 8, proyAnnoHas: 2026, proyMesHas: 12 }));
    fixture.detectChanges();

    expect(component.form.horizonteAnno).toBe(2027);
    expect(component.form.horizonteMes).toBe(1);
    expect(component.desdeTexto()).toBe('04/2025');
    const apsBloqueado = document.querySelector('input[name="proyApsNombre"]') as HTMLInputElement;
    expect(apsBloqueado.readOnly).toBe(true);
    expect(apsBloqueado.value).toBe('Tunja');
    expect(document.querySelector('.p-dialog app-aps-selector')).toBeNull();

    component.onApsChange(99);
    component.form.proyDescripcion = 'Nueva';
    component.guardar();

    expect(service.ultimasTarifas).not.toHaveBeenCalled();
    expect(service.editar).toHaveBeenCalledWith(8, {
      apsaId: 3, proyNombre: 'Base', proyDescripcion: 'Nueva', proyTipo100: 1,
      proyAnnoDes: 2025, proyMesDes: 4, proyAnnoHas: 2026, proyMesHas: 12
    });
  });
});

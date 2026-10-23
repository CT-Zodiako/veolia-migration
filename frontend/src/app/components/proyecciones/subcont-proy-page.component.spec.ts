import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Table } from 'primeng/table';
import { SubcontProyPageComponent } from './subcont-proy-page.component';
import { ProyeccionesService } from '../../services/proyecciones.service';

function setup() {
  const service = {
    consulta: vi.fn(() => of({ status: true, data: [] })),
    consultarClasesUso: vi.fn(() => of({ status: true, data: [{ clasClase: 1, clasNombre: 'Estrato 1' }] })),
    consultaSubcont: vi.fn(() => of({ status: true, data: [{ clasClase: 1, sucoValor: 0.5 }] })),
    editarPorcSubCon: vi.fn(() => of({ status: true, data: { success: true }, message: 'ok' }))
  };
  TestBed.configureTestingModule({
    imports: [SubcontProyPageComponent],
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ProyeccionesService, useValue: service }]
  });
  const fixture = TestBed.createComponent(SubcontProyPageComponent);
  const component = fixture.componentInstance;
  component.apsaId.set(3);
  component.proyId.set(8);
  component.anno.set(2025);
  return { fixture, component, service };
}

describe('SubcontProyPageComponent (905)', () => {
  // P3: legacy SubsidiosContribuciones.vue:146-151 queries the month before the selected one,
  // but postDescuentoCosto (:170-173) saves to the SELECTED month.
  it('queries the previous month but saves to the selected month', () => {
    const { component, service } = setup();

    component.onMesChange(1);
    component.guardar();

    expect(service.consultaSubcont).toHaveBeenNthCalledWith(1, { apsaId: 3, proyId: 8, anno: 2024, mes: 12 });
    expect(service.editarPorcSubCon).toHaveBeenCalledWith({ apsaId: 3, proyId: 8, anno: 2025, mes: 1, items: [{ clasClase: 1, sucoValor: 0.5 }] });
    expect(service.consultaSubcont).toHaveBeenNthCalledWith(2, { apsaId: 3, proyId: 8, anno: 2024, mes: 12 });
    expect(component.editando()).toBe(false);
  });

  // P7: legacy grid pages by 15 with [15, 30, 50, 100] (SubsidiosContribuciones.vue:22-27).
  it('pages the grid like legacy', () => {
    const { fixture, component } = setup();
    component.onMesChange(5);
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    expect(table.paginator).toBe(true);
    expect(table.rows).toBe(15);
    expect(table.rowsPerPageOptions).toEqual([15, 30, 50, 100]);
  });
});

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { SubContPageComponent } from './subcont-page.component';
import { SubContService } from '../../services/subcont.service';
import { ProyeccionesService } from '../../services/proyecciones.service';

const CLASES = [
  { clasClase: 1, clasNombre: 'ESTRATO 1' },
  { clasClase: 2, clasNombre: 'ESTRATO 2' },
  { clasClase: 7, clasNombre: 'COMERCIAL' }
];
const EXISTENTE = { sucoId: 10, apsaId: 5, emprEmpr: 1002, diviDivi: 3, clasClase: 1, sucoAnno: 2025, sucoMes: 12, paraTippred20016: 2, sucoValor: -50, sucoEstado: 1, sucoFechacreacion: '', usuaUsua: 9 };

function setup(existentes = [EXISTENTE]) {
  const service = {
    consultar: vi.fn(() => of(existentes)),
    crear: vi.fn((_req: unknown) => of({ success: true, message: null })),
    editar: vi.fn((_req: unknown) => of({ success: true, message: null }))
  };
  const proyecciones = { consultarClasesUso: vi.fn(() => of({ data: CLASES })) };
  TestBed.configureTestingModule({
    imports: [SubContPageComponent],
    providers: [
      { provide: SubContService, useValue: service },
      { provide: ProyeccionesService, useValue: proyecciones },
      { provide: ConfirmationService, useValue: { confirm: vi.fn((opts: { accept: () => void }) => opts.accept()) } }
    ]
  });
  TestBed.overrideComponent(SubContPageComponent, {
    set: { imports: [CommonModule, FormsModule, ToastModule, ...CommonPrimeNgModules], schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(SubContPageComponent);
  const component = fixture.componentInstance;
  const add = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add');
  fixture.detectChanges();
  component.onAnnoChange(2026);
  component.onMesChange(1);
  component.onApsChange(5);
  fixture.detectChanges();
  return { fixture, component, service, add, el: fixture.nativeElement as HTMLElement };
}

function filas(el: HTMLElement): string[][] {
  return Array.from(el.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).slice(0, 2).map((td) => td.textContent?.trim() ?? ''));
}

describe('SubContPageComponent (302) — legacy views/suministros/SubCon.vue', () => {
  // Legacy SubCon.vue (actualizaInfoGeneral): subcon/consulta for the selected month - 1; class names from the clases-de-uso catalog.
  it('queries the previous month and names each class from the catalog', () => {
    const { component, service } = setup();

    expect(service.consultar).toHaveBeenLastCalledWith({ aps: 5, anno: 2025, mes: 12 });
    expect(component.clases()[0]).toMatchObject({ clase: 1, nombre: 'ESTRATO 1', valor: -50, existe: true });
  });

  // Legacy SubCon.vue (makeOperation): edit an existing period with subcon/editar for the previous month and { id, val } values.
  it('updates an existing value with editar for the previous month', () => {
    const { component, service } = setup();
    const item = component.clases()[0];

    component.iniciarEdicion(item);
    component.onEditingValorChange(-40);
    component.confirmarGuardar(item);

    expect(service.editar).toHaveBeenCalledWith({ aps: 5, anno: 2025, mes: 12, valores: [{ id: 1, val: -40 }] });
    expect(service.crear).not.toHaveBeenCalled();
  });

  // Legacy SubCon.vue:15-28: only the stored rows are listed, header "Valor", value "%{SUCO_VALOR.toFixed(4)}".
  it.skip('PARITY-FINDING: the grid lists every class with "Valor (%)" and "-50%" instead of only stored rows with "Valor" and "%-50.0000"', () => {
    const { el } = setup();

    expect(Array.from(el.querySelectorAll('thead th')).slice(0, 2).map((th) => th.textContent?.trim())).toEqual(['Clase de Uso', 'Valor']);
    expect(filas(el)).toEqual([['ESTRATO 1', '%-50.0000']]);
  });

  // Legacy SubCon.vue:291-302 (makeOperation): Agregar/Editar send the nine clases (est1..est6, com, indu, ofi) in one request.
  it.skip('PARITY-FINDING: values are saved one class at a time instead of the nine clases in one request', () => {
    const { component, service } = setup([]);
    const item = component.clases()[0];

    component.iniciarEdicion(item);
    component.onEditingValorChange(10);
    component.confirmarGuardar(item);

    expect((service.crear.mock.calls[0][0] as { valores: unknown[] }).valores).toHaveLength(9);
  });

  // Legacy SubConService.js:64 and :104 toast "Modificado Correctamente" / "Creada Correctamente".
  it.skip('PARITY-FINDING: the success toast is not the legacy "Modificado Correctamente"', () => {
    const { component, add } = setup();
    const item = component.clases()[0];

    component.iniciarEdicion(item);
    component.onEditingValorChange(-40);
    component.confirmarGuardar(item);

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Modificado Correctamente' }));
  });
});

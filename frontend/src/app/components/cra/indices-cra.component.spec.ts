import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { InputNumber } from 'primeng/inputnumber';
import { ConfirmationService } from 'primeng/api';
import { IndicesCraComponent } from './indices-cra.component';
import { IndicesCraService } from '../../services/indices-cra.service';

describe('IndicesCraComponent new indices (301)', () => {
  // User: "en indicees CRA debe dejar intriucir muhcos demasaidos decimales es alg contable". Legacy Cra.vue:79-124
  // used a free InputText and INDI_VALOR is FLOAT(126) (stored values reach 12 decimals): allow 15, the double limit.
  it('lets every índice input take up to 15 decimals', () => {
    const service = {
      consultar: vi.fn(() => of({ data: [{ paraIndice20011: 1, indiValor: 1.123456789012 }] })),
      catalogo: vi.fn(() => of({ data: [] })),
      crear: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [IndicesCraComponent],
      providers: [
        { provide: IndicesCraService, useValue: service },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(IndicesCraComponent);
    fixture.componentInstance.abrirModalAgregar();
    fixture.detectChanges();

    const inputs = fixture.debugElement.queryAll(By.directive(InputNumber)).map((d) => d.componentInstance as InputNumber);
    expect(inputs.length).toBe(4);
    expect(inputs.map((i) => i.maxFractionDigits)).toEqual([15, 15, 15, 15]);
  });

  // design/suministros-pantallas/18-indices-cra-c-actual-mejorada.html: titled card, Agregar in the header (disabled when
  // the period already has índices), full values in Colombian format without rounding, name under the code, footer.
  it('shows the índices titled, unrounded in Colombian format, with names and a footer', () => {
    const service = {
      consultar: vi.fn(() => of({ data: [{ paraIndice20011: 1, indiValor: 297.796882338083 }, { paraIndice20011: 2, indiValor: 1750905 }] })),
      catalogo: vi.fn(() => of({ data: [{ paraPara: 1, paraNombre: 'IPCC' }, { paraPara: 2, paraNombre: 'SMLV' }] })),
      crear: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [IndicesCraComponent],
      providers: [
        { provide: IndicesCraService, useValue: service },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } }
      ]
    });
    const fixture = TestBed.createComponent(IndicesCraComponent);
    fixture.detectChanges();
    fixture.componentInstance.onAnnoChange(2026);
    fixture.componentInstance.onMesChange(10);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const textos = (sel: string) => Array.from(el.querySelectorAll(sel)).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());

    expect(el.querySelector('.cra-titulo')?.textContent?.trim()).toBe('Índices del período');
    expect(textos('tbody .indice-codigo')).toEqual(['IPCC', 'SMLV']);
    expect(textos('tbody .indice-nombre')).toEqual(['Salario mínimo legal vigente (pesos)']);
    expect(textos('tbody .indice-valor')).toEqual(['297,796882338083', '1.750.905']);
    expect(el.querySelector('.cra-pie span:first-child')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('2 de 4 índices registrados · para corregir uno, usá Editar en su fila');
    const agregar = el.querySelector('.cra-header p-button button, .cra-header button') as HTMLButtonElement;
    expect(agregar.disabled).toBe(true);
  });

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

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Type } from '@angular/core';
import { of } from 'rxjs';
import { Select } from 'primeng/select';
import { ApsSelectorComponent } from './aps-selector.component';
import { AnnoSelectorComponent } from './anno-selector.component';
import { MesSelectorComponent } from './mes-selector.component';
import { ProyeccionSelectorComponent } from './proyeccion-selector.component';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// User: "quiero que quietes las X de eikinar aps y ano y mes ... de todos esos selectores quitalso".
describe('APS, Año and Mes selectors without the clear (X) button', () => {
  afterEach(() => localStorage.clear());

  it.each([
    ['APS', ApsSelectorComponent],
    ['Año', AnnoSelectorComponent],
    ['Mes', MesSelectorComponent],
    // User: "quitala tambien" (the Proyección selector kept its X).
    ['Proyección', ProyeccionSelectorComponent]
  ] as [string, Type<unknown>][])('%s does not offer a clear button', (_, componente) => {
    localStorage.setItem('usuario', JSON.stringify({ SISU_ID: 7 }));
    TestBed.configureTestingModule({
      imports: [componente],
      providers: [
        { provide: ProyeccionesService, useValue: { getProyecciones: vi.fn(() => of([])), consultar: vi.fn(() => of([])) } },
        { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [{ APSA_ID: 1, APSA_NOMAPS: 'Palmira' }], sinAsignar: [] })) } },
        {
          provide: ParametrosConsultaStateService,
          useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => 2026), setAnno: vi.fn(), getMes: vi.fn(() => 7), setMes: vi.fn(), getProyeccion: vi.fn(() => null), setProyeccion: vi.fn() }
        }
      ]
    });
    const fixture = TestBed.createComponent(componente);
    fixture.detectChanges();

    const select = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    // PrimeNG leaves showClear undefined when the input is not bound.
    expect(select.showClear).toBeFalsy();
  });
});

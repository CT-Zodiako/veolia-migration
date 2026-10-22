import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AutorizacionReversionesComponent } from './autorizacion-reversiones.component';
import { ReversionesService } from '../../services/reversiones.service';
import { AuthService } from '../../services/auth.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// Legacy screen: front-tarificador/src/views/reversion/AutorizacionReversiones.vue ("Autorización Reversiones", 3002),
// which posts reversiones/crearAutorizacion {aps, anno, mes, descripcion} (service/ReversionService.js:9).

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

function crear() {
  localStorage.clear();
  const service = { autorizarReversion: vi.fn(() => of({ rowsAffected: 1 })) };
  TestBed.configureTestingModule({
    imports: [AutorizacionReversionesComponent],
    providers: [
      { provide: ReversionesService, useValue: service },
      { provide: AuthService, useValue: { getApsAsignadas: vi.fn(() => of({ asignadas: [] })) } },
      {
        provide: ParametrosConsultaStateService,
        useValue: { getAps: vi.fn(() => null), setAps: vi.fn(), getAnno: vi.fn(() => null), getMes: vi.fn(() => null), setAnno: vi.fn(), setMes: vi.fn() }
      }
    ]
  });
  const fixture = TestBed.createComponent(AutorizacionReversionesComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  component.aps = 7;
  component.anno = 2026;
  component.mes = 1;
  return { fixture, component, service };
}

describe('AutorizacionReversionesComponent (3002, legacy AutorizacionReversiones.vue)', () => {
  // AutorizacionReversiones.vue:59-72: the authorization is saved for the APS and the month before the selected one
  // (Jan 2026 -> Dec 2025) with the textarea text as descripcion.
  it('creates the authorization for the previous month of the selected APS', () => {
    const { fixture, component, service } = crear();
    component.descripcion = 'Corrección F24';

    component.autorizar();
    fixture.detectChanges();

    expect(service.autorizarReversion).toHaveBeenCalledWith({ aps: 7, anno: 2025, mes: 12, descripcion: 'Corrección F24' });
    expect(component.error).toBe('');
    expect(component.descripcion).toBe('');
  });

  // AutorizacionReversiones.vue:72-74: on success the user sees "Se guardo la Autorizacion correctamente".
  it.skip('PARITY-FINDING: legacy success message is "Se guardo la Autorizacion correctamente" (AutorizacionReversiones.vue:74); new shows "Autorización creada correctamente"', () => {
    const { fixture, component } = crear();
    component.descripcion = 'Corrección F24';

    component.autorizar();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Se guardo la Autorizacion correctamente');
  });

  // AutorizacionReversiones.vue:59-72 has no validation: Guardar always posts, even with an empty textarea (descripcion null).
  it.skip('PARITY-FINDING: legacy posts the authorization even with an empty description (AutorizacionReversiones.vue:59-72, no validation); new blocks it with "Debe seleccionar APS, año, mes y descripción"', () => {
    const { fixture, component, service } = crear();

    component.autorizar();
    fixture.detectChanges();

    expect(service.autorizarReversion).toHaveBeenCalledWith(expect.objectContaining({ aps: 7, anno: 2025, mes: 12 }));
    expect(fixture.nativeElement.textContent).not.toContain('Debe seleccionar APS, año, mes y descripción');
  });

  // AutorizacionReversiones.vue:15-30: textarea placeholder "Motivo de Autorizacion Reversión..." and button "Guardar".
  it.skip('PARITY-FINDING: legacy textarea placeholder is "Motivo de Autorizacion Reversión..." and the button reads "Guardar" (AutorizacionReversiones.vue:15-30); new has no placeholder and the button reads "Autorizar"', () => {
    const { fixture } = crear();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    const boton = fixture.nativeElement.querySelector('p-button button') as HTMLButtonElement;
    expect(textarea.getAttribute('placeholder')).toBe('Motivo de Autorizacion Reversión...');
    expect(boton.textContent?.trim()).toBe('Guardar');
  });
});

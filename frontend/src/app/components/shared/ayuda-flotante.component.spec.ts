import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AyudaFlotanteComponent } from './ayuda-flotante.component';
import { AyudaService } from '../../services/ayuda.service';

// No legacy equivalent: front-tarificador has no floating help/support widget (App.vue only renders
// topbar, menu, router-view and footer). These tests pin the current behavior.

function setup() {
  const ayudaService = {
    solicitudMenuSoporte$: new Subject<Event>(),
    soporteMenuItems: [{ label: 'Enviar correo' }],
    mostrarDocumentacion: signal(false),
    capitulosDocumentacion: [],
    articuloSeleccionado: signal(null),
    abrirDocumentacion: vi.fn(),
    verArticulo: vi.fn()
  };
  TestBed.configureTestingModule({
    imports: [AyudaFlotanteComponent],
    providers: [{ provide: AyudaService, useValue: ayudaService }]
  });
  const fixture = TestBed.createComponent(AyudaFlotanteComponent);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const toggle = vi.spyOn(component.menuSoporte, 'toggle').mockImplementation(() => undefined);
  return { fixture, component, ayudaService, toggle, el: fixture.nativeElement as HTMLElement };
}

describe('AyudaFlotanteComponent (no legacy equivalent — pinned)', () => {
  it('shows the "Ver Documentación" and "Soporte Directo" actions and toggles the flyout', () => {
    const { fixture, component, el } = setup();
    const acciones = Array.from(el.querySelectorAll('.ayuda-flotante-accion')).map(b => b.textContent?.trim());
    expect(acciones).toEqual(['Ver Documentación', 'Soporte Directo']);
    (el.querySelector('button.ayuda-flotante') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.mostrarFlyoutForzado()).toBe(true);
    expect(el.querySelector('.ayuda-flotante-wrapper')?.classList.contains('abierto')).toBe(true);
  });

  it('opens the documentation through the service and closes the flyout', () => {
    const { component, ayudaService } = setup();
    component.toggleFlyout();
    component.abrirDocumentacion();
    expect(ayudaService.abrirDocumentacion).toHaveBeenCalledTimes(1);
    expect(component.mostrarFlyoutForzado()).toBe(false);
  });

  it('opens the support menu from the button and from service requests', () => {
    const { component, ayudaService, toggle } = setup();
    const click = new Event('click');
    component.toggleFlyout();
    component.abrirMenuSoporte(click);
    expect(toggle).toHaveBeenCalledWith(click);
    expect(component.mostrarFlyoutForzado()).toBe(false);
    const solicitado = new Event('click');
    ayudaService.solicitudMenuSoporte$.next(solicitado);
    expect(toggle).toHaveBeenLastCalledWith(solicitado);
  });
});

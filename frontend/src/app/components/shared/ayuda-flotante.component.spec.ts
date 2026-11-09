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

// The floating help button was removed at the user's request (Inicio redesign); only the support popup menu
// stays, opened from screens through AyudaService (e.g. the documentation page).
describe('AyudaFlotanteComponent (no legacy equivalent — pinned)', () => {
  it('renders no floating help button', () => {
    const { el } = setup();
    expect(el.querySelector('.ayuda-flotante')).toBeNull();
    expect(el.querySelectorAll('button').length).toBe(0);
  });

  it('opens the support menu when a screen requests it through the service', () => {
    const { ayudaService, toggle } = setup();
    const solicitado = new Event('click');
    ayudaService.solicitudMenuSoporte$.next(solicitado);
    expect(toggle).toHaveBeenCalledWith(solicitado);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';
import { AyudaService } from '../../services/ayuda.service';
import { AuthState } from '../../state/auth.state';

// Legacy 100 "Inicio" (/): front-tarificador/src/views/Home.vue is an empty card. The new Inicio shows shortcut cards;
// the legacy rule it must keep is the menu permission one: only options whose MENU_ID comes back from auth/getUserMenu
// are reachable (front-tarificador/src/service/MenuService.js:655-671).

const menuTree = [
  { id: 200, label: 'Configuración', children: [{ id: 201, label: 'APS' }, { id: 204, label: 'Usuarios' }] },
  { id: 500, label: 'Informes', children: [{ id: 501, label: 'Detallado Tarifas' }] }
];

function crear(sistemaId: number | null = 1) {
  const auth = {
    getUserMenu: vi.fn(() => of([{ MENU_ID: 204 }, { MENU_ID: 501 }])),
    getGeneralMenuTree: vi.fn(() => of(menuTree))
  };
  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: AyudaService, useValue: { abrirDocumentacion: vi.fn(), abrirMenuSoporte: vi.fn() } }
    ]
  });
  const state = TestBed.inject(AuthState);
  state.setUser({ SISU_ID: 77, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'P', SISU_CORREO: 'a@x.co', SISU_ESTADO: 1 });
  if (sistemaId !== null) state.setSistema({ SIST_ID: sistemaId, SIST_NOMBRE: 'Regulator' });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, auth };
}

const enlaces = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('a.card') as NodeListOf<HTMLAnchorElement>).map((a) => [a.getAttribute('href'), a.querySelector('h3')?.textContent?.trim()]);

describe('DashboardComponent (100 Inicio)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  // MenuService.js:655-671: only permitted MENU_IDs (201 APS is not granted here) are offered; Inicio itself is not a card.
  it('offers only the options the user is permitted to open and shows the default shortcuts among them', () => {
    const { fixture, component, auth } = crear();

    expect(auth.getGeneralMenuTree).toHaveBeenCalledWith(1);
    expect(auth.getUserMenu).toHaveBeenCalledTimes(1);
    expect(component.disponibles.map((i) => i.path)).toEqual(['/usuarios', '/tarifas']);
    expect(component.cardPaths).toEqual(['/usuarios']);
    expect(enlaces(fixture.nativeElement)).toEqual([['/usuarios', 'Usuarios']]);
  });

  it('restores and saves the chosen shortcuts per user and system, ignoring options no longer permitted', () => {
    localStorage.setItem('dashboard:accesos:77:1', JSON.stringify(['/tarifas', '/aps']));
    const { fixture, component } = crear();

    expect(component.cardPaths).toEqual(['/tarifas']);

    component.guardarSeleccion(['/usuarios', '/tarifas']);
    fixture.detectChanges();

    expect(JSON.parse(localStorage.getItem('dashboard:accesos:77:1')!)).toEqual(['/usuarios', '/tarifas']);
    expect(enlaces(fixture.nativeElement).map(([href]) => href)).toEqual(['/usuarios', '/tarifas']);
  });

  it('shows no shortcut and asks nothing to the API when no system is selected', () => {
    const { fixture, auth } = crear(null);

    expect(auth.getUserMenu).not.toHaveBeenCalled();
    expect(auth.getGeneralMenuTree).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No elegiste ningún acceso todavía.');
  });

  // Legacy views/Home.vue:1-12 renders an empty card (no shortcuts, no help block).
  // Accepted deviation: legacy-characterization-tests S8/S9 (group D, "the new Inicio dashboard"): Inicio shows the
  // permitted shortcut cards, the help block and "Personalizar".
  it('shows the new Inicio: shortcut cards, the help block and "Personalizar"', () => {
    const { fixture } = crear();

    expect(fixture.nativeElement.querySelectorAll('a.card').length).toBe(1);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Personalizar');
    expect(texto).toContain('¿Necesitas ayuda con algo más?');
  });
});

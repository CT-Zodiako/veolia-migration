import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LayoutComponent } from './layout.component';
import { AuthService } from '../../services/auth.service';

// Legacy: front-tarificador/src/App.vue (menu built on mount, App.vue:79-82),
// service/MenuService.js (getMenu filters the static tree by getUserMenu MENU_IDs, MenuService.js:652-696),
// back-tarificador/src/modules/auth/routes.js:78-84 (getUserMenu per user + idSistema from the token).
// Approved deviations: titles in the layout top bar (parity-review-all L20); menu tree read from
// AUGE_MENU per selected system (T13 R3). The system switcher and support panel have no legacy
// equivalent: those tests pin current behavior.

const TREE = [
  { id: 100, label: 'Inicio', children: [] },
  { id: 200, label: 'Configuración', children: [{ id: 201, label: 'APS' }, { id: 202, label: 'Empresas' }, { id: 204, label: 'Usuarios' }] },
  { id: 300, label: 'Suministros', children: [{ id: 301, label: 'Indices CRA' }] }
];

function setup(opts: { url?: string; sistema?: object | null; usuario?: object | null; auth?: Record<string, unknown> } = {}) {
  localStorage.clear();
  localStorage.setItem('jwtOken', 'tok');
  if (opts.usuario !== null) {
    localStorage.setItem('usuario', JSON.stringify(opts.usuario ?? { SISU_ID: 9, SISU_CORREO: 'ana@veolia.com' }));
  }
  if (opts.sistema !== null) {
    localStorage.setItem('sistema', JSON.stringify(opts.sistema ?? { SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' }));
  }
  const authService = {
    getUserMenu: vi.fn(() => of([{ MENU_ID: 100 }, { MENU_ID: 200 }, { MENU_ID: 201 }, { MENU_ID: 204 }])),
    getGeneralMenuTree: vi.fn(() => of(TREE)),
    getSistemasByCorreo: vi.fn(() => of([{ SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' }, { SIST_ID: 3, SIST_NOMBRE: 'SUI853' }])),
    switchSistema: vi.fn(() => of({})),
    ...opts.auth
  };
  const router = { url: opts.url ?? '/', navigate: vi.fn(() => Promise.resolve(true)) };
  TestBed.configureTestingModule({
    imports: [LayoutComponent],
    providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router }
    ]
  });
  TestBed.overrideComponent(LayoutComponent, { set: { template: '', imports: [] } });
  const fixture = TestBed.createComponent(LayoutComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, authService, router };
}

describe('LayoutComponent (legacy App.vue + MenuService.js)', () => {
  afterEach(() => localStorage.clear());

  // Legacy MenuService.js:652-696: only menu ids returned by getUserMenu are shown, grouped under their parent.
  it('shows only the options whose MENU_ID the user holds, grouped under their parent', () => {
    const { component, authService } = setup();
    expect(authService.getUserMenu).toHaveBeenCalledTimes(1);
    expect(authService.getGeneralMenuTree).toHaveBeenCalledWith(1);
    expect(component.menuGroups.map(g => [g.label, g.children.map(c => [c.label, c.path])])).toEqual([
      ['Inicio', [['Inicio', '/']]],
      ['Configuración', [['APS', '/aps'], ['Usuarios', '/usuarios']]]
    ]);
  });

  // Legacy routes.js:78-84 needs a token with idSistema; without a session system nothing is requested.
  it('shows no menu and requests nothing without a session system', () => {
    const { component, authService } = setup({ sistema: null });
    expect(authService.getUserMenu).not.toHaveBeenCalled();
    expect(component.menuGroups).toEqual([]);
  });

  // Legacy MenuService.js:657 (if (usrMenu)): a failing menu request leaves the menu empty.
  it('leaves the menu empty when the menu request fails', () => {
    const { component } = setup({ auth: { getUserMenu: vi.fn(() => throwError(() => ({ status: 500 }))) } });
    expect(component.menuGroups).toEqual([]);
  });

  // Approved deviation parity-review-all L20: page titles live in the top bar.
  it.each([
    ['/usuarios', 'Gestión de Usuarios'],
    ['/cambiar-clave', 'Cambiar Contraseña'],
    ['/cssaprovechamiento', 'SUI 853 - Estimación CSS'],
    ['/cargueResiduos', 'SUI 853 - Cargue Residuos'],
    ['/informesGenerados', 'SUI 853 - Cargue Facturación'],
    ['/informesGeneradosMes?x=1', 'SUI 853 - Cargue Facturación Mes'],
    ['/ruta-sin-titulo', '']
  ])('top-bar title for %s is "%s"', (url, title) => {
    const { component } = setup({ url });
    expect(component.getPageTitle()).toBe(title);
  });

  // No legacy equivalent (pinned): sidebar header shows the session system name.
  it('shows the session system name, with a generic fallback', () => {
    expect(setup().component.nombreSistema).toBe('VEO-Regulator');
    TestBed.resetTestingModule();
    expect(setup({ sistema: null }).component.nombreSistema).toBe('Sistema de Gestión');
  });

  // No legacy equivalent (pinned): system switcher lists the user's systems and switches through the API.
  it('switches system through switchSistema and reloads the menu', async () => {
    const { component, authService, router } = setup();
    expect(authService.getSistemasByCorreo).toHaveBeenCalledWith('ana@veolia.com');
    expect(component.sistemasDisponibles.map(s => s.SIST_ID)).toEqual([1, 3]);
    component.cambiarSistema(3);
    expect(authService.switchSistema).toHaveBeenCalledWith(3);
    expect(component.sistemaSeleccionadoId).toBe(3);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    await Promise.resolve();
    expect(authService.getUserMenu).toHaveBeenCalledTimes(2);
  });

  // Pinned: a failed switch keeps the previous system; switching to the current one does nothing.
  it('keeps the previous system when the switch fails', () => {
    const { component, authService } = setup({ auth: { switchSistema: vi.fn(() => throwError(() => ({ status: 403 }))) } });
    component.cambiarSistema(1);
    expect(authService.switchSistema).not.toHaveBeenCalled();
    component.cambiarSistema(3);
    expect(component.sistemaSeleccionadoId).toBe(1);
    expect(component.cambiandoSistema).toBe(false);
  });

  // Pinned: sidebar collapse state persists in localStorage.
  it('persists the collapsed sidebar', () => {
    const { component } = setup();
    component.toggleSidebar();
    expect(localStorage.getItem('sidebarCollapsed')).toBe('true');
  });
});

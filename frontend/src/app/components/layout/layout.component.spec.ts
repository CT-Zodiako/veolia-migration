import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
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

  // User: "cuadno yo tneogun opcion selecioanda tambien seleccione al padre para saber ne qu epadre estoy".
  it('marks and opens the parent of the selected option, ignoring the query string', () => {
    const { component } = setup({ url: '/usuarios?aps=1020&mes=11' });
    const [inicio, configuracion] = component.menuGroups;

    expect(component.isActive('/usuarios')).toBe(true);
    expect(component.isActive('/aps')).toBe(false);
    expect(component.isGroupActive(configuracion)).toBe(true);
    expect(component.isGroupActive(inicio)).toBe(false);
    expect(component.menuGroups.map((g) => [g.label, g.expanded])).toEqual([['Inicio', false], ['Configuración', true]]);
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
    ['/', 'Inicio'],
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

  // Shell redesign S3: the permitted groups are shown under sections, Inicio on top without heading.
  it('organises the permitted groups into sections', () => {
    const { component } = setup();
    expect(component.menuSections.map((s) => [s.label, s.groups.map((g) => g.label)])).toEqual([
      [null, ['Inicio']],
      ['SISTEMA', ['Configuración']]
    ]);
  });

  it('has no sections when the menu request fails', () => {
    const { component } = setup({ auth: { getUserMenu: vi.fn(() => throwError(() => ({ status: 500 }))) } });
    expect(component.menuSections).toEqual([]);
  });

  // Shell redesign S3: breadcrumb above the title names the parent group of the current option.
  it.each([
    ['/usuarios?aps=1020', 'Configuración'],
    ['/aps', 'Configuración'],
    ['/', ''],
    ['/ruta-fuera-del-menu', '']
  ])('breadcrumb for %s is "%s"', (url, breadcrumb) => {
    const { component } = setup({ url });
    expect(component.getBreadcrumb()).toBe(breadcrumb);
  });

  // Shell redesign S3: user card at the bottom of the sidebar.
  it('shows the session user initial and name in the user card', () => {
    const { component } = setup({ usuario: { SISU_ID: 9, SISU_NOMBRE: 'soporte', SISU_CORREO: 'soporte@veolia.com' } });
    expect(component.usuarioNombre).toBe('soporte');
    expect(component.usuarioInicial).toBe('S');
  });

  it('falls back to "Usuario" without a session user', () => {
    const { component } = setup({ usuario: null });
    expect(component.usuarioNombre).toBe('Usuario');
    expect(component.usuarioInicial).toBe('U');
  });
});

@Component({ standalone: true, template: '' })
class BlankPageComponent {}

// Shell redesign S3 rendered with the real template.
describe('LayoutComponent shell (rendered)', () => {
  afterEach(() => localStorage.clear());

  async function render(url: string) {
    localStorage.clear();
    localStorage.setItem('jwtOken', 'tok');
    localStorage.setItem('usuario', JSON.stringify({ SISU_ID: 9, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com' }));
    localStorage.setItem('sistema', JSON.stringify({ SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' }));
    TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([{ path: '**', component: BlankPageComponent }]),
        MessageService,
        {
          provide: AuthService,
          useValue: {
            getUserMenu: vi.fn(() => of([{ MENU_ID: 100 }, { MENU_ID: 200 }, { MENU_ID: 201 }, { MENU_ID: 204 }])),
            getGeneralMenuTree: vi.fn(() => of(TREE)),
            getSistemasByCorreo: vi.fn(() => of([{ SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' }])),
            switchSistema: vi.fn(() => of({})),
            logout: vi.fn(() => of({}))
          }
        }
      ]
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(LayoutComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const texts = (selector: string) => Array.from(el.querySelectorAll(selector)).map((n) => n.textContent?.replace(/\s+/g, ' ').trim());
    return { fixture, el, texts };
  }

  it('renders section headings only for non-empty sections, Inicio without heading', async () => {
    const { texts } = await render('/');
    expect(texts('.menu-section-title')).toEqual(['SISTEMA']);
    expect(texts('.menu-section .nav-label')).toEqual(['Inicio', 'Configuración']);
  });

  it('marks the active parent and child and shows the breadcrumb over the title', async () => {
    const { texts } = await render('/usuarios?aps=1020');
    expect(texts('.menu-parent.parent-active .nav-label')).toEqual(['Configuración']);
    expect(texts('.submenu-item.active')).toEqual(['Usuarios']);
    expect(texts('.top-bar-breadcrumb')).toEqual(['Configuración']);
    expect(texts('.top-bar-title')).toEqual(['Gestión de Usuarios']);
  });

  it('shows no breadcrumb for a route outside the menu', async () => {
    const { el } = await render('/ruta-fuera-del-menu');
    expect(el.querySelector('.top-bar-breadcrumb')).toBeNull();
  });

  it('has no floating help button', async () => {
    const { el } = await render('/');
    expect(el.querySelector('.ayuda-flotante')).toBeNull();
  });

  it('shows the user card with initial, name and "Sesión activa"', async () => {
    const { texts } = await render('/');
    expect(texts('.sidebar-user-avatar')).toEqual(['A']);
    expect(texts('.sidebar-user-name')).toEqual(['Ana']);
    expect(texts('.sidebar-user-status')).toEqual(['Sesión activa']);
  });
});

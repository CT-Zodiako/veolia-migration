import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { PermisosComponent } from './permisos.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/components/usuarios/MenuxUsuario.vue (vue-treeselect, value-consists-of
// ALL_WITH_INDETERMINATE, MenuxUsuario.vue:14-24,52), service/AuthService.js:261-310,
// back-tarificador/src/modules/auth/controller.js:289-324 (uptUserMenu: deactivate the system's menus, then
// activate/insert every id in `options`), MenuService.js:652-696 (a parent shows only when its own MENU_ID is granted).
// Approved: admin-only user management (parity-review-all S10/L19); per-system tree (T13 R3).

const USERS = [{ SISU_ID: 7, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 }];
const CATALOG = [
  { id: 200, label: 'Configuración', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 201, label: 'APS', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 202, label: 'Empresas', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 100, label: 'Inicio', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 10001, label: 'Comercial', parentId: null, sistemaId: 3, sistemaNombre: 'SUI853' },
  { id: 9001, label: 'Otro', parentId: null, sistemaId: 2, sistemaNombre: 'Reliquidaciones' }
];

function setup(permitted: number[] = []) {
  const authService = {
    getAllUsers: vi.fn(() => of(USERS)),
    getMenuUserOptions: vi.fn(() => of(permitted)),
    getMenuCatalog: vi.fn(() => of(CATALOG)),
    getSistemasPorUsuario: vi.fn(() => of({ asignados: [{ SIST_ID: 1 }, { SIST_ID: 3 }], sinAsignar: [{ SIST_ID: 2 }] })),
    uptUserMenu: vi.fn(() => of({}))
  };
  TestBed.configureTestingModule({
    imports: [PermisosComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  TestBed.overrideComponent(PermisosComponent, { set: { template: '', imports: [] } });
  const component = TestBed.createComponent(PermisosComponent).componentInstance;
  component.selectedUsuarioId = 7;
  component.cargarPermisos();
  return { component, authService };
}

describe('PermisosComponent (legacy components/usuarios/MenuxUsuario.vue)', () => {
  // Legacy MenuxUsuario.vue:75-83 + AuthService.js:277-285: the user's granted MENU_IDs preselect the tree.
  it('preselects the granted options of the selected user', () => {
    const { component, authService } = setup([201, 100]);
    expect(authService.getMenuUserOptions).toHaveBeenCalledWith(7);
    expect(component.isSelected(201)).toBe(true);
    expect(component.isSelected(202)).toBe(false);
    expect(component.isSelected(100)).toBe(true);
    expect(component.isPartiallySelected(200)).toBe(true);
  });

  // Legacy controller.js:326-355 tree = parents with their children; approved per-system grouping (T13 R3) limited to assigned systems.
  it('shows one tree per assigned system with parents and children', () => {
    const { component, authService } = setup();
    expect(authService.getSistemasPorUsuario).toHaveBeenCalledWith('ana@veolia.com');
    expect(component.sistemasPermisos.map(s => [s.sistemaNombre, s.items.map(i => [i.label, i.children.map(c => c.label)])])).toEqual([
      ['SUI853', [['Comercial', []]]],
      ['VEO-Regulator', [['Configuración', ['APS', 'Empresas']], ['Inicio', []]]]
    ]);
  });

  // Legacy AuthService.js:295-299 posts { id, options, sistema }; controller.js:289-324 replaces the menus of `sistema`.
  it('saves, per system, the selected option ids of that system', () => {
    const { component, authService } = setup([201, 100, 10001]);
    component.guardar();
    expect(authService.uptUserMenu).toHaveBeenCalledTimes(2);
    expect(authService.uptUserMenu).toHaveBeenCalledWith(7, [10001], 3);
    expect(authService.uptUserMenu).toHaveBeenCalledWith(7, expect.arrayContaining([201, 100]), 1);
  });

  // Legacy treeselect ALL_WITH_INDETERMINATE (MenuxUsuario.vue:52): checking a parent stores the parent and all its children,
  // and MenuService.js:663 needs the parent MENU_ID to show the group.
  it('checking a parent saves the parent id too like legacy MenuxUsuario.vue:52 ALL_WITH_INDETERMINATE', () => {
    const { component, authService } = setup();
    component.toggleMenuItem(200);
    component.guardar();
    const idsSistema1 = (authService.uptUserMenu.mock.calls as unknown as [number, number[], number][]).find(c => c[2] === 1)![1];
    expect([...idsSistema1].sort()).toEqual([200, 201, 202]);
  });

  // Legacy ALL_WITH_INDETERMINATE: a partially checked parent is stored too.
  it('a partially checked parent is saved like legacy MenuxUsuario.vue:52 ALL_WITH_INDETERMINATE', () => {
    const { component, authService } = setup();
    component.toggleMenuItem(201);
    component.guardar();
    const idsSistema1 = (authService.uptUserMenu.mock.calls as unknown as [number, number[], number][]).find(c => c[2] === 1)![1];
    expect([...idsSistema1].sort()).toEqual([200, 201]);
  });

  // Legacy AuthService.js:306 success toast.
  it('success message is "Opciones Asignadas Correctamente" like legacy AuthService.js:306', () => {
    const { component } = setup([100]);
    component.guardar();
    expect(component.success).toBe('Opciones Asignadas Correctamente');
  });

  // Pinned (no legacy equivalent): "Marcar todos" / "Desmarcar todos" per system.
  it('marks and unmarks every leaf of a system', () => {
    const { component } = setup();
    const regulator = component.sistemasPermisos.find(s => s.sistemaId === 1)!;
    component.marcarTodos(regulator, true);
    expect(component.contarSeleccionados(regulator.items)).toBe(3);
    expect(component.contarTotal(regulator.items)).toBe(3);
    component.marcarTodos(regulator, false);
    expect(component.contarSeleccionados(regulator.items)).toBe(0);
  });

  // Legacy MenuxUsuario.vue:80: nothing is requested without a selected user.
  it('requests nothing without a selected user', () => {
    const { component, authService } = setup();
    authService.getMenuUserOptions.mockClear();
    component.selectedUsuarioId = null;
    component.cargarPermisos();
    component.guardar();
    expect(authService.getMenuUserOptions).not.toHaveBeenCalled();
    expect(authService.uptUserMenu).not.toHaveBeenCalled();
  });
});

// Rendered UI: design/usuarios-permisos/01-lista-y-tarjetas.html (user list + one card per menu group).
const UI_USERS = [
  { SISU_ID: 7, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 },
  { SISU_ID: 8, SISU_NOMBRE: 'José', SISU_APELLIDO: 'Gómez', SISU_CORREO: 'jgomez@veolia.com', SISU_ESTADO: 1 }
];
const UI_CATALOG = [
  { id: 200, label: 'Configuración', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 201, label: 'APS', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 202, label: 'Empresas', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 203, label: 'Seguridad', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 204, label: 'Roles', parentId: 203, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 300, label: 'Informes', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 301, label: 'Costos', parentId: 300, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 100, label: 'Inicio', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 400, label: 'Sui', parentId: null, sistemaId: 3, sistemaNombre: 'SUI853' },
  { id: 401, label: 'Formatos', parentId: 400, sistemaId: 3, sistemaNombre: 'SUI853' },
  { id: 402, label: 'Dashboard', parentId: 400, sistemaId: 3, sistemaNombre: 'SUI853' },
  { id: 9001, label: 'Otro', parentId: null, sistemaId: 2, sistemaNombre: 'Reliquidaciones' }
];

function setupUi(opts: { permitted?: number[]; asignados?: number[]; pendingPermisos?: boolean } = {}) {
  const permisos$ = new Subject<number[]>();
  const authService = {
    getAllUsers: vi.fn(() => of(UI_USERS)),
    getMenuUserOptions: vi.fn(() => (opts.pendingPermisos ? permisos$ : of(opts.permitted ?? []))),
    getMenuCatalog: vi.fn(() => of(UI_CATALOG)),
    getSistemasPorUsuario: vi.fn(() => of({ asignados: (opts.asignados ?? [1, 3]).map(id => ({ SIST_ID: id })), sinAsignar: [] })),
    uptUserMenu: vi.fn(() => of({}))
  };
  TestBed.configureTestingModule({
    imports: [PermisosComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  const fixture = TestBed.createComponent(PermisosComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, el: fixture.nativeElement as HTMLElement };
}

function texts(el: HTMLElement, selector: string): string[] {
  return Array.from(el.querySelectorAll(selector)).map(n => (n.textContent || '').replace(/\s+/g, ' ').trim());
}

function click(fixture: ComponentFixture<PermisosComponent>, node: Element | null): void {
  expect(node).not.toBeNull();
  (node as HTMLElement).click();
  fixture.detectChanges();
}

function userButton(el: HTMLElement, nombre: string): HTMLButtonElement {
  return Array.from(el.querySelectorAll<HTMLButtonElement>('.usuario-item')).find(b => b.textContent!.includes(nombre))!;
}

function chip(el: HTMLElement, sistema: string): HTMLButtonElement {
  return Array.from(el.querySelectorAll<HTMLButtonElement>('.sistema-chip')).find(b => b.textContent!.includes(sistema))!;
}

function grupoCard(el: HTMLElement, grupo: string): HTMLElement {
  return Array.from(el.querySelectorAll<HTMLElement>('.grupo-card')).find(c => c.querySelector('.grupo-nombre')!.textContent!.trim() === grupo)!;
}

function sw(el: HTMLElement, ariaLabel: string): HTMLInputElement {
  return el.querySelector<HTMLInputElement>(`input[aria-label="${ariaLabel}"]`)!;
}

function openUser(fixture: ComponentFixture<PermisosComponent>, el: HTMLElement, nombre = 'Ana', sistema = 'VEO-Regulator'): void {
  click(fixture, userButton(el, nombre));
  if (sistema) click(fixture, chip(el, sistema));
}

describe('PermisosComponent UI (artboard 01 lista + tarjetas)', () => {
  it('lists users with initials, name, email and a count footer', () => {
    const { el } = setupUi();
    expect(texts(el, '.usuario-item .usuario-avatar')).toEqual(['AP', 'JG']);
    expect(texts(el, '.usuario-item .usuario-nombre')).toEqual(['Ana Pérez', 'José Gómez']);
    expect(texts(el, '.usuario-item .usuario-correo')).toEqual(['ana@veolia.com', 'jgomez@veolia.com']);
    expect(texts(el, '.usuarios-footer')).toEqual(['2 usuarios']);
  });

  it('search filters by name or email ignoring case and accents', () => {
    const { fixture, el } = setupUi();
    const input = el.querySelector<HTMLInputElement>('input[placeholder="Buscar usuario o correo"]')!;
    input.value = 'JOSE';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(texts(el, '.usuario-item .usuario-nombre')).toEqual(['José Gómez']);
    expect(texts(el, '.usuarios-footer')).toEqual(['1 usuario']);
    input.value = 'ana@';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(texts(el, '.usuario-item .usuario-nombre')).toEqual(['Ana Pérez']);
    input.value = 'perez';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(texts(el, '.usuario-item .usuario-nombre')).toEqual(['Ana Pérez']);
  });

  it('shows a prompt and requests no permissions until a user is selected', () => {
    const { el, authService } = setupUi();
    expect(texts(el, '.permisos-empty-prompt')[0]).toContain('Seleccioná un usuario');
    expect(authService.getMenuUserOptions).not.toHaveBeenCalled();
  });

  it('clicking a user loads its permissions and highlights it', () => {
    const { fixture, el, authService } = setupUi({ permitted: [201] });
    click(fixture, userButton(el, 'Ana'));
    expect(authService.getMenuUserOptions).toHaveBeenCalledWith(7);
    expect(authService.getMenuCatalog).toHaveBeenCalled();
    expect(authService.getSistemasPorUsuario).toHaveBeenCalledWith('ana@veolia.com');
    expect(userButton(el, 'Ana').classList).toContain('selected');
    expect(userButton(el, 'Ana').getAttribute('aria-pressed')).toBe('true');
    expect(userButton(el, 'José').classList).not.toContain('selected');
    expect(texts(el, '.panel-usuario-nombre')).toEqual(['Ana Pérez']);
    expect(texts(el, '.panel-usuario-correo')).toEqual(['ana@veolia.com']);
  });

  it('system chips show counts, the first is active and clicking switches the visible groups', () => {
    const { fixture, el } = setupUi({ permitted: [201, 100, 401] });
    click(fixture, userButton(el, 'Ana'));
    expect(texts(el, '.sistema-chip')).toEqual(['SUI853 1 / 2', 'VEO-Regulator 2 / 5']);
    expect(chip(el, 'SUI853').classList).toContain('active');
    expect(texts(el, '.grupo-card .grupo-nombre')).toEqual(['Sui']);
    click(fixture, chip(el, 'VEO-Regulator'));
    expect(chip(el, 'VEO-Regulator').classList).toContain('active');
    expect(chip(el, 'VEO-Regulator').getAttribute('aria-pressed')).toBe('true');
    expect(chip(el, 'SUI853').classList).not.toContain('active');
    expect(texts(el, '.grupo-card .grupo-nombre')).toEqual(['Configuración', 'Informes', 'General']);
  });

  it('group cards list their options as accessible switches, nested children indented', () => {
    const { fixture, el } = setupUi({ permitted: [201] });
    openUser(fixture, el);
    const card = grupoCard(el, 'Configuración');
    expect(texts(card, '.opcion-label')).toEqual(['APS', 'Empresas', 'Seguridad', 'Roles']);
    expect(sw(el, 'Configuración: APS').checked).toBe(true);
    expect(sw(el, 'Configuración: Empresas').checked).toBe(false);
    expect(sw(el, 'Configuración: Roles').closest('.opcion-children')).not.toBeNull();
    expect(texts(grupoCard(el, 'General'), '.opcion-label')).toEqual(['Inicio']);
    click(fixture, sw(el, 'Configuración: Empresas'));
    expect(sw(el, 'Configuración: Empresas').checked).toBe(true);
    expect(texts(card, '.grupo-count')).toEqual(['2 de 3']);
  });

  it('group checkbox selects and deselects all its options and is indeterminate when partial', () => {
    const { fixture, el } = setupUi({ permitted: [201] });
    openUser(fixture, el);
    const card = grupoCard(el, 'Configuración');
    const all = card.querySelector<HTMLInputElement>('input[aria-label="Todo Configuración"]')!;
    expect(texts(card, '.grupo-count')).toEqual(['1 de 3']);
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
    click(fixture, all);
    expect(texts(card, '.grupo-count')).toEqual(['3 de 3']);
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
    expect(['APS', 'Empresas', 'Seguridad', 'Roles'].map(o => sw(el, `Configuración: ${o}`).checked)).toEqual([true, true, true, true]);
    click(fixture, all);
    expect(texts(card, '.grupo-count')).toEqual(['0 de 3']);
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(false);
  });

  it('counts unsaved changes and Descartar restores the loaded selection', () => {
    const { fixture, el } = setupUi({ permitted: [201] });
    openUser(fixture, el);
    const descartar = Array.from(el.querySelectorAll<HTMLButtonElement>('.permisos-bar button')).find(b => b.textContent!.includes('Descartar'))!;
    expect(texts(el, '.cambios-text')).toEqual(['Sin cambios']);
    expect(descartar.disabled).toBe(true);
    click(fixture, sw(el, 'Configuración: APS'));
    expect(texts(el, '.cambios-text')).toEqual(['1 cambio sin guardar']);
    click(fixture, sw(el, 'Configuración: Empresas'));
    expect(texts(el, '.cambios-text')).toEqual(['2 cambios sin guardar']);
    expect(descartar.disabled).toBe(false);
    click(fixture, descartar);
    expect(texts(el, '.cambios-text')).toEqual(['Sin cambios']);
    expect(sw(el, 'Configuración: APS').checked).toBe(true);
    expect(sw(el, 'Configuración: Empresas').checked).toBe(false);
  });

  it('Guardar is disabled without changes and after a change sends the same payload as before', () => {
    const { fixture, el, authService } = setupUi({ permitted: [201] });
    openUser(fixture, el);
    const guardarBtn = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.permisos-bar button')).find(b => b.textContent!.includes('Guardar permisos'))!;
    expect(guardarBtn().disabled).toBe(true);
    click(fixture, sw(el, 'Configuración: Empresas'));
    expect(guardarBtn().disabled).toBe(false);
    click(fixture, guardarBtn());
    expect(authService.uptUserMenu).toHaveBeenCalledTimes(2);
    const calls = authService.uptUserMenu.mock.calls as unknown as [number, number[], number][];
    expect([...calls.find(c => c[2] === 1)![1]].sort()).toEqual([200, 201, 202]);
    expect(calls.find(c => c[2] === 3)).toEqual([7, [], 3]);
    expect(texts(el, '.success-message')).toEqual(['Opciones Asignadas Correctamente']);
    expect(texts(el, '.cambios-text')).toEqual(['Sin cambios']);
    expect(guardarBtn().disabled).toBe(true);
  });

  it('Marcar todos / Desmarcar todos act on the visible system', () => {
    const { fixture, el } = setupUi();
    openUser(fixture, el);
    const link = (t: string) => Array.from(el.querySelectorAll<HTMLButtonElement>('.marcar-acciones button')).find(b => b.textContent!.trim() === t)!;
    click(fixture, link('Marcar todos'));
    expect(texts(el, '.sistema-chip')).toEqual(['SUI853 0 / 2', 'VEO-Regulator 5 / 5']);
    click(fixture, link('Desmarcar todos'));
    expect(texts(el, '.sistema-chip')).toEqual(['SUI853 0 / 2', 'VEO-Regulator 0 / 5']);
  });

  it('shows the existing message for a user without systems', () => {
    const { fixture, el } = setupUi({ asignados: [] });
    click(fixture, userButton(el, 'Ana'));
    expect(texts(el, '.empty-message')).toEqual([
      'Este usuario no tiene sistemas asignados. Asigná un sistema en la pestaña "Sistemas" antes de configurar sus permisos.'
    ]);
    expect(el.querySelector('.grupo-card')).toBeNull();
  });

  it('shows the loading text while permissions load', () => {
    const { fixture, el } = setupUi({ pendingPermisos: true });
    click(fixture, userButton(el, 'Ana'));
    expect(texts(el, '.loading-message')).toEqual(['Cargando permisos...']);
    expect(el.querySelector('.permisos-empty-prompt')).toBeNull();
  });
});

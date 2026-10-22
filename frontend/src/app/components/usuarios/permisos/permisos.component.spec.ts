import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
  it.skip('PARITY-FINDING: checking a parent saves the parent id too (legacy MenuxUsuario.vue:52 ALL_WITH_INDETERMINATE); new saves only the children', () => {
    const { component, authService } = setup();
    component.toggleMenuItem(200);
    component.guardar();
    const idsSistema1 = (authService.uptUserMenu.mock.calls as unknown as [number, number[], number][]).find(c => c[2] === 1)![1];
    expect([...idsSistema1].sort()).toEqual([200, 201, 202]);
  });

  // Legacy ALL_WITH_INDETERMINATE: a partially checked parent is stored too.
  it.skip('PARITY-FINDING: a partially checked parent is saved (legacy MenuxUsuario.vue:52 ALL_WITH_INDETERMINATE); new drops it', () => {
    const { component, authService } = setup();
    component.toggleMenuItem(201);
    component.guardar();
    const idsSistema1 = (authService.uptUserMenu.mock.calls as unknown as [number, number[], number][]).find(c => c[2] === 1)![1];
    expect([...idsSistema1].sort()).toEqual([200, 201]);
  });

  // Legacy AuthService.js:306 success toast.
  it.skip('PARITY-FINDING: success message is "Opciones Asignadas Correctamente" (legacy AuthService.js:306); new shows "Permisos actualizados correctamente"', () => {
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

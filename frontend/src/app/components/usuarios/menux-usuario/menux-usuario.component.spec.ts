import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MenuxUsuarioComponent } from './menux-usuario.component';
import { AuthService } from '../../../services/auth.service';

function crear(authService: Partial<Record<keyof AuthService, unknown>>): MenuxUsuarioComponent {
  TestBed.configureTestingModule({
    imports: [MenuxUsuarioComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  TestBed.overrideComponent(MenuxUsuarioComponent, { set: { template: '', imports: [] } });
  return TestBed.createComponent(MenuxUsuarioComponent).componentInstance;
}

describe('MenuxUsuarioComponent - menu tree of the selected system (legacy MenuxUsuario.vue)', () => {
  it('requests the tree and the user permissions of the system selected on screen, not the session system', () => {
    localStorage.setItem('idSistema', '1');
    const authService = {
      getAllUsers: vi.fn(() => of([])),
      getAllSistemas: vi.fn(() => of([])),
      getGeneralMenuTree: vi.fn(() => of([{ id: 300, label: 'Menu sistema 3', children: [] }])),
      getMenuByUser: vi.fn(() => of([300]))
    };
    const component = crear(authService);

    component.selectedUsuarioId = 777;
    component.selectedSistemaId = 3;
    component.cargarMenu();

    expect(authService.getGeneralMenuTree).toHaveBeenCalledWith(3);
    expect(authService.getMenuByUser).toHaveBeenCalledWith(3, 777);
    expect(component.menuTree).toEqual([{ id: 300, label: 'Menu sistema 3', children: [] }]);
    expect(component.selectedMenuIds).toEqual([300]);
    localStorage.removeItem('idSistema');
  });

  it('does not request a tree until both user and system are selected', () => {
    const authService = {
      getAllUsers: vi.fn(() => of([])),
      getAllSistemas: vi.fn(() => of([])),
      getGeneralMenuTree: vi.fn(() => of([])),
      getMenuByUser: vi.fn(() => of([]))
    };
    const component = crear(authService);

    component.selectedUsuarioId = 777;
    component.selectedSistemaId = null;
    component.cargarMenu();

    expect(authService.getGeneralMenuTree).not.toHaveBeenCalled();
  });

  it('saves the permissions for the selected system', () => {
    const authService = {
      getAllUsers: vi.fn(() => of([])),
      getAllSistemas: vi.fn(() => of([])),
      uptUserMenu: vi.fn(() => of({ rowsAffected: 1 }))
    };
    const component = crear(authService);

    component.selectedUsuarioId = 777;
    component.selectedSistemaId = 3;
    component.selectedMenuIds = [300];
    component.guardar();

    expect(authService.uptUserMenu).toHaveBeenCalledWith(777, [300], 3);
  });
});

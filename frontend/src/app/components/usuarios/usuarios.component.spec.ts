import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { UsuariosComponent } from './usuarios.component';
import { AuthService, Usuario } from '../../services/auth.service';
import { PermisosComponent } from './permisos/permisos.component';
import { AsignacionSistemaComponent } from './asignacion-sistema/asignacion-sistema.component';
import { ApsxUsuarioComponent } from './apsx-usuario/apsx-usuario.component';

const usuarios: Usuario[] = [
  { SISU_ID: 1, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Zuluaga', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 },
  { SISU_ID: 2, SISU_NOMBRE: 'Luis', SISU_APELLIDO: 'Arango', SISU_CORREO: 'luis@otra.com', SISU_ESTADO: 1 },
  { SISU_ID: 3, SISU_NOMBRE: 'Marta', SISU_APELLIDO: 'Méndez', SISU_CORREO: 'marta@veolia.com', SISU_ESTADO: 0 }
];

function render() {
  const auth = { getAllUsers: vi.fn(() => of(usuarios.map((u) => ({ ...u })))), resetPass: vi.fn(() => of('Nueva123')) };
  const confirmation = { confirm: vi.fn() };
  TestBed.configureTestingModule({
    imports: [UsuariosComponent],
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: ConfirmationService, useValue: confirmation }
    ]
  });
  TestBed.overrideComponent(UsuariosComponent, {
    remove: { imports: [PermisosComponent, AsignacionSistemaComponent, ApsxUsuarioComponent] },
    add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] }
  });
  const fixture = TestBed.createComponent(UsuariosComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, auth, confirmation };
}

function apellidos(fixture: ReturnType<typeof render>['fixture']): string[] {
  const filas = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
  return Array.from(filas).map((tr) => tr.cells[1]?.textContent?.trim() ?? '');
}

// Renders the whole tabbed screen; give it room when the machine is under load.
const RENDER_TIMEOUT = 20000;

describe('UsuariosComponent', () => {
  afterEach(() => vi.restoreAllMocks());

  // Legacy GestionUsuarios.vue:13-97: 15 rows, [15,30,50,100], sorted by surname, filters on surname, name and email.
  it('restores legacy paging, surname sort and the surname/name/email filters', () => {
    const { fixture, component } = render();
    const table = fixture.debugElement.query(By.directive(Table)).componentInstance as Table;
    const sortables = Array.from(fixture.nativeElement.querySelectorAll('th[psortablecolumn]') as NodeListOf<HTMLElement>)
      .map((th) => th.getAttribute('psortablecolumn'));
    const filtros = fixture.nativeElement.querySelectorAll('tr.filter-row input') as NodeListOf<HTMLInputElement>;

    expect(table.rows).toBe(15);
    expect(table.rowsPerPageOptions).toEqual([15, 30, 50, 100]);
    expect(table.sortField).toBe('SISU_APELLIDO');
    expect(sortables).toEqual(['SISU_APELLIDO', 'SISU_NOMBRE', 'SISU_CORREO', 'SISU_ESTADO']);
    expect(filtros).toHaveLength(3);
    expect(apellidos(fixture)).toEqual(['Arango', 'Méndez', 'Zuluaga']);

    component.apellidoFilter = 'u';
    fixture.detectChanges();
    expect(apellidos(fixture)).toEqual(['Zuluaga']);

    component.apellidoFilter = '';
    component.correoFilter = '@veolia';
    fixture.detectChanges();
    expect(apellidos(fixture)).toEqual(['Méndez', 'Zuluaga']);

    component.nombreFilter = 'mar';
    fixture.detectChanges();
    expect(apellidos(fixture)).toEqual(['Méndez']);
  }, RENDER_TIMEOUT);

  // Legacy GestionUsuarios.vue:139-150,202-207: confirm, then a "Reinicio de Clave" dialog with the new password.
  it('resets the password through the confirm dialog and shows the new password in a dialog, not alert()', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    const { fixture, component, auth, confirmation } = render();

    component.resetPassword(component.usuarios.find((u) => u.SISU_ID === 1)!);
    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
    expect(auth.resetPass).not.toHaveBeenCalled();

    (confirmation.confirm.mock.calls[0][0] as Confirmation).accept!();
    fixture.detectChanges();

    expect(auth.resetPass).toHaveBeenCalledWith(1);
    expect(component.showResetDialog).toBe(true);
    expect(component.nuevaClave).toBe('Nueva123');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  }, RENDER_TIMEOUT);
});

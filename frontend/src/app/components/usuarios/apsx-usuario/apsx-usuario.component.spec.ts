import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ApsxUsuarioComponent } from './apsx-usuario.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/components/usuarios/{ApsxUsuario.vue,UsuarioDD.vue}, service/AuthService.js:217-259,
// back-tarificador/src/modules/auth/{routes.js:126-136, controller.js:253-270}.
// Approved: user management is admin-only (parity-review-all S10/L19) — enforced by the backend, not this screen.
// UI: design/usuarios-aps/01-grilla-aps.html (user list + grid of checkable APS tiles).

const USERS = [
  { SISU_ID: 7, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 },
  { SISU_ID: 8, SISU_NOMBRE: 'Luis', SISU_APELLIDO: 'Gómez', SISU_CORREO: 'luis@veolia.com', SISU_ESTADO: 1 }
];
const SIN_ASIGNAR = [{ APSA_ID: 1, APSA_NOMAPS: 'APS Norte' }, { APSA_ID: 4, APSA_NOMAPS: 'Girón' }];
const ASIGNADAS = [{ APSA_ID: 2, APSA_NOMAPS: 'APS Sur' }, { APSA_ID: 3, APSA_NOMAPS: 'APS Centro' }];

function setup() {
  const authService = {
    getAllUsers: vi.fn(() => of(USERS)),
    getApsAsignadas: vi.fn((_id: number): any => of({ asignadas: ASIGNADAS, sinAsignar: SIN_ASIGNAR })),
    setApsxUsuario: vi.fn(() => of({}))
  };
  TestBed.configureTestingModule({
    imports: [ApsxUsuarioComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  const fixture = TestBed.createComponent(ApsxUsuarioComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const render = () => fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, el, render };
}

type Ctx = ReturnType<typeof setup>;

const strip = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function selectUser(ctx: Ctx, correo = 'ana@veolia.com') {
  const boton = Array.from(ctx.el.querySelectorAll<HTMLButtonElement>('.usuario-item')).find(b => b.textContent?.includes(correo))!;
  boton.click();
  ctx.render();
}

const tiles = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('.aps-tile'));
const tileNames = (el: HTMLElement) => tiles(el).map(t => t.querySelector('input')!.getAttribute('aria-label'));
const checkOf = (el: HTMLElement, nombre: string) => el.querySelector<HTMLInputElement>(`.aps-tile input[aria-label="${nombre}"]`)!;
const toggle = (ctx: Ctx, nombre: string) => {
  checkOf(ctx.el, nombre).click();
  ctx.render();
};
const tool = (el: HTMLElement, texto: string) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('.aps-tools button')).find(b => strip(b.textContent) === texto)!;
const buscarAps = (ctx: Ctx, term: string) => {
  const input = ctx.el.querySelector<HTMLInputElement>('input[aria-label="Buscar APS"]')!;
  input.value = term;
  input.dispatchEvent(new Event('input'));
  ctx.render();
};
const saveButton = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('.aps-bar button')).find(b => strip(b.textContent).startsWith('Guardar'))!;
const discardButton = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('.aps-bar button')).find(b => strip(b.textContent) === 'Descartar')!;

describe('ApsxUsuarioComponent (legacy components/usuarios/ApsxUsuario.vue)', () => {
  // Legacy UsuarioDD.vue:36-41 loads getAllUsers; options show name and SISU_CORREO (UsuarioDD.vue:6,15-17).
  it('lists every user with initials, name and email and a user count', () => {
    const { el, authService } = setup();
    expect(authService.getAllUsers).toHaveBeenCalledTimes(1);
    const items = Array.from(el.querySelectorAll('.usuario-item'));
    expect(items.map(i => strip(i.querySelector('.usuario-nombre')?.textContent))).toEqual(['Ana Perez', 'Luis Gomez']);
    expect(items.map(i => i.querySelector('.usuario-correo')?.textContent?.trim())).toEqual(['ana@veolia.com', 'luis@veolia.com']);
    expect(items.map(i => i.querySelector('.usuario-avatar')?.textContent?.trim())).toEqual(['AP', 'LG']);
    expect(strip(el.querySelector('.usuarios-footer')?.textContent)).toBe('2 usuarios');
  });

  it('filters the users by name or email, ignoring case and accents', () => {
    const ctx = setup();
    const input = ctx.el.querySelector<HTMLInputElement>('input[aria-label="Buscar usuario"]')!;
    expect(input.placeholder).toBe('Buscar usuario o correo');
    ctx.component.busqueda = 'GOMEZ';
    ctx.render();
    expect(Array.from(ctx.el.querySelectorAll('.usuario-item')).map(i => strip(i.querySelector('.usuario-nombre')?.textContent))).toEqual(['Luis Gomez']);
    expect(strip(ctx.el.querySelector('.usuarios-footer')?.textContent)).toBe('1 usuario');
    ctx.component.busqueda = 'zzz';
    ctx.render();
    expect(strip(ctx.el.querySelector('.usuarios-vacio')?.textContent)).toBe('Ningun usuario coincide con la busqueda.');
  });

  it('prompts to choose a user before anything is selected', () => {
    const { el, authService } = setup();
    expect(strip(el.querySelector('.aps-empty-prompt')?.textContent)).toBe('Selecciona un usuario de la lista para ver y editar sus APS.');
    expect(el.querySelector('.aps-tile')).toBeNull();
    expect(authService.getApsAsignadas).not.toHaveBeenCalled();
  });

  // Legacy ApsxUsuario.vue:47-56: getApsAsignadas(SISU_ID).
  it('selecting a user loads its APS by SISU_ID and shows the header with name, email and "N de M APS"', () => {
    const ctx = setup();
    selectUser(ctx);
    expect(ctx.authService.getApsAsignadas).toHaveBeenCalledWith(7);
    const item = ctx.el.querySelector('.usuario-item.selected');
    expect(item?.getAttribute('aria-pressed')).toBe('true');
    expect(strip(ctx.el.querySelector('.panel-usuario-nombre')?.textContent)).toBe('Ana Perez');
    expect(strip(ctx.el.querySelector('.panel-usuario-correo')?.textContent)).toBe('ana@veolia.com');
    expect(strip(ctx.el.querySelector('.aps-pill')?.textContent)).toBe('2 de 4 APS');
  });

  it('renders one tile per APS sorted by name with the loaded checked state', () => {
    const ctx = setup();
    selectUser(ctx);
    expect(tileNames(ctx.el)).toEqual(['APS Centro', 'APS Norte', 'APS Sur', 'Girón']);
    expect(tiles(ctx.el).map(t => t.querySelector('input')!.checked)).toEqual([true, false, true, false]);
    expect(tiles(ctx.el).map(t => t.classList.contains('checked'))).toEqual([true, false, true, false]);
    expect(ctx.el.querySelector('.aps-tile')?.tagName).toBe('LABEL');
  });

  it('shows a loading text while the APS are fetched', () => {
    const ctx = setup();
    const pendiente = new Subject<any>();
    ctx.authService.getApsAsignadas.mockReturnValue(pendiente);
    selectUser(ctx);
    expect(strip(ctx.el.querySelector('.loading-message')?.textContent)).toBe('Cargando APS...');
    pendiente.next({ asignadas: ASIGNADAS, sinAsignar: SIN_ASIGNAR });
    ctx.render();
    expect(ctx.el.querySelector('.loading-message')).toBeNull();
    expect(tiles(ctx.el).length).toBe(4);
  });

  it('shows a message when the user has no APS available', () => {
    const ctx = setup();
    ctx.authService.getApsAsignadas.mockReturnValue(of({ asignadas: [], sinAsignar: [] }));
    selectUser(ctx);
    expect(strip(ctx.el.querySelector('.empty-message')?.textContent)).toBe('No hay APS disponibles para asignar.');
    expect(ctx.el.querySelector('.aps-bar')).toBeNull();
  });

  it('filters the tiles by APS name ignoring case and accents', () => {
    const ctx = setup();
    selectUser(ctx);
    buscarAps(ctx, 'GIRON');
    expect(tileNames(ctx.el)).toEqual(['Girón']);
    buscarAps(ctx, 'xyz');
    expect(tiles(ctx.el).length).toBe(0);
    expect(strip(ctx.el.querySelector('.aps-vacio')?.textContent)).toBe('Ningun APS coincide con la busqueda.');
  });

  it('"Seleccionar todos" and "Ninguno" only change the visible tiles', () => {
    const ctx = setup();
    selectUser(ctx);
    buscarAps(ctx, 'aps');
    tool(ctx.el, 'Seleccionar todos').click();
    ctx.render();
    buscarAps(ctx, '');
    expect(tiles(ctx.el).map(t => t.querySelector('input')!.checked)).toEqual([true, true, true, false]);

    buscarAps(ctx, 'sur');
    tool(ctx.el, 'Ninguno').click();
    ctx.render();
    buscarAps(ctx, '');
    expect(tiles(ctx.el).map(t => t.querySelector('input')!.checked)).toEqual([true, true, false, false]);
  });

  it('"Solo asignados" toggles showing only the checked APS', () => {
    const ctx = setup();
    selectUser(ctx);
    const solo = tool(ctx.el, 'Solo asignados');
    expect(solo.getAttribute('aria-pressed')).toBe('false');
    solo.click();
    ctx.render();
    expect(solo.getAttribute('aria-pressed')).toBe('true');
    expect(tileNames(ctx.el)).toEqual(['APS Centro', 'APS Sur']);
    solo.click();
    ctx.render();
    expect(solo.getAttribute('aria-pressed')).toBe('false');
    expect(tiles(ctx.el).length).toBe(4);
  });

  it('counts the changes, marks the changed tiles and updates the pill', () => {
    const ctx = setup();
    selectUser(ctx);
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('Sin cambios');
    expect(ctx.el.querySelector('.aps-tile.changed')).toBeNull();

    toggle(ctx, 'APS Norte');
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('1 cambio sin guardar');
    expect(strip(ctx.el.querySelector('.aps-pill')?.textContent)).toBe('3 de 4 APS');
    const changed = ctx.el.querySelectorAll('.aps-tile.changed');
    expect(changed.length).toBe(1);
    expect(changed[0].querySelector('input')!.getAttribute('aria-label')).toBe('APS Norte');
    expect(strip(changed[0].querySelector('.aps-tile-cambio')?.textContent)).toBe('cambio');

    toggle(ctx, 'APS Sur');
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('2 cambios sin guardar');
    toggle(ctx, 'APS Sur');
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('1 cambio sin guardar');
  });

  it('Descartar restores the loaded state', () => {
    const ctx = setup();
    selectUser(ctx);
    expect(discardButton(ctx.el).disabled).toBe(true);
    toggle(ctx, 'APS Norte');
    toggle(ctx, 'APS Centro');
    expect(discardButton(ctx.el).disabled).toBe(false);
    discardButton(ctx.el).click();
    ctx.render();
    expect(tiles(ctx.el).map(t => t.querySelector('input')!.checked)).toEqual([true, false, true, false]);
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('Sin cambios');
  });

  // Legacy ApsxUsuario.vue:61-69 + AuthService.js:239-243: inAps = assigned ids, outAps = unassigned ids, id = selected user.
  it('"Guardar APS" is disabled without changes and sends outAps/inAps of every APS', () => {
    const ctx = setup();
    selectUser(ctx);
    expect(strip(saveButton(ctx.el).textContent)).toBe('Guardar APS');
    expect(saveButton(ctx.el).disabled).toBe(true);

    toggle(ctx, 'Girón');
    toggle(ctx, 'APS Sur');
    expect(saveButton(ctx.el).disabled).toBe(false);
    saveButton(ctx.el).click();
    ctx.render();
    expect(ctx.authService.setApsxUsuario).toHaveBeenCalledWith(7, [1, 2], [3, 4]);
  });

  // Legacy ApsxUsuario.vue:61,68: nothing is sent without a selected user / loaded lists.
  it('sends nothing without a selected user', () => {
    const { component, authService } = setup();
    component.guardar();
    expect(authService.setApsxUsuario).not.toHaveBeenCalled();
  });

  // Legacy AuthService.js:251 success toast; the APS are reloaded after saving.
  it('success message is "APS Asignadas Correctamente" and the APS are reloaded after saving', () => {
    const ctx = setup();
    selectUser(ctx);
    toggle(ctx, 'APS Norte');
    saveButton(ctx.el).click();
    ctx.render();
    expect(ctx.authService.getApsAsignadas).toHaveBeenCalledTimes(2);
    expect(strip(ctx.el.querySelector('.success-message')?.textContent)).toBe('APS Asignadas Correctamente');
  });

  it('ignores a stale APS response after switching users', () => {
    const ctx = setup();
    const ana = new Subject<any>();
    const luis = new Subject<any>();
    ctx.authService.getApsAsignadas.mockImplementation((id: number) => (id === 7 ? ana : luis));
    selectUser(ctx, 'ana@veolia.com');
    selectUser(ctx, 'luis@veolia.com');
    luis.next({ asignadas: [{ APSA_ID: 9, APSA_NOMAPS: 'Yopal' }], sinAsignar: [] });
    ctx.render();
    ana.next({ asignadas: ASIGNADAS, sinAsignar: SIN_ASIGNAR });
    ctx.render();
    expect(tileNames(ctx.el)).toEqual(['Yopal']);
    expect(strip(ctx.el.querySelector('.panel-usuario-nombre')?.textContent)).toBe('Luis Gomez');
  });
});

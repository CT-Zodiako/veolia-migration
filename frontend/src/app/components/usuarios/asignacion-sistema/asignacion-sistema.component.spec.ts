import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AsignacionSistemaComponent } from './asignacion-sistema.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/components/usuarios/{AsignacionSistema.vue,UsuarioDD.vue}, service/AuthService.js:316-344,
// back-tarificador/src/modules/auth/{routes.js:137-146, controller.js:403-505}.
// Approved: token + admin required on getSistemasPorUsuario/asignarSistema (parity-review-all S10/L19);
// the new response carries sisuId (typed DTO), legacy took SISU_ID from the selected user (AsignacionSistema.vue:55).
// UI: design/usuarios-sistemas/01-tarjetas-sistema.html (user list + one card per system).

const USERS = [
  { SISU_ID: 7, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 },
  { SISU_ID: 8, SISU_NOMBRE: 'Luis', SISU_APELLIDO: 'Gómez', SISU_CORREO: 'luis@veolia.com', SISU_ESTADO: 0 }
];
const SIN_ASIGNAR = [{ SIST_ID: 3, SIST_NOMBRE: 'SUI853' }];
const ASIGNADOS = [{ SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' }, { SIST_ID: 2, SIST_NOMBRE: 'Reliquidaciones' }];
const CATALOG = [
  { id: 200, label: 'Configuración', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 201, label: 'APS', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 202, label: 'Empresas', parentId: 200, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 100, label: 'Inicio', parentId: null, sistemaId: 1, sistemaNombre: 'VEO-Regulator' },
  { id: 9001, label: 'Otro', parentId: null, sistemaId: 2, sistemaNombre: 'Reliquidaciones' },
  { id: 10001, label: 'Comercial', parentId: null, sistemaId: 3, sistemaNombre: 'SUI853' }
];

function setup(opts: { countsFail?: boolean } = {}) {
  const authService = {
    getAllUsers: vi.fn(() => of(USERS)),
    getSistemasPorUsuario: vi.fn((correo: string) =>
      of({ sisuId: correo === 'ana@veolia.com' ? 7 : 8, asignados: ASIGNADOS, sinAsignar: SIN_ASIGNAR })),
    asignarSistema: vi.fn(() => of({})),
    // Parent 200 granted with children 201/202 plus 100 and 9001: leaves 201, 202, 100 (system 1), 9001 (system 2).
    getMenuUserOptions: vi.fn(() => opts.countsFail ? throwError(() => new Error('x')) : of([200, 201, 202, 100, 9001, 10001])),
    getMenuCatalog: vi.fn(() => of(CATALOG))
  };
  TestBed.configureTestingModule({
    imports: [AsignacionSistemaComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  const fixture = TestBed.createComponent(AsignacionSistemaComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const render = () => fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, el, render };
}

const strip = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

function selectAna(ctx: ReturnType<typeof setup>) {
  const boton = Array.from(ctx.el.querySelectorAll<HTMLButtonElement>('.usuario-item')).find(b => b.textContent?.includes('ana@veolia.com'))!;
  boton.click();
  ctx.render();
}

const cards = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>('.sistema-card'));
const switchDe = (el: HTMLElement, sistema: string) => el.querySelector<HTMLInputElement>(`input[aria-label="Acceso a ${sistema}"]`)!;
const toggle = (ctx: ReturnType<typeof setup>, sistema: string) => {
  switchDe(ctx.el, sistema).click();
  ctx.render();
};
const botonGuardar = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('.sistemas-bar button')).find(b => strip(b.textContent).includes('Guardar'))!;
const botonDescartar = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('.sistemas-bar button')).find(b => strip(b.textContent) === 'Descartar')!;

describe('AsignacionSistemaComponent (legacy components/usuarios/AsignacionSistema.vue)', () => {
  it('lists the users with initials, name and email and a "N usuarios" footer', () => {
    const { el } = setup();
    const items = Array.from(el.querySelectorAll('.usuario-item'));
    expect(items.map(i => strip(i.querySelector('.usuario-nombre')?.textContent))).toEqual(['Ana Perez', 'Luis Gomez']);
    expect(items.map(i => i.querySelector('.usuario-correo')?.textContent?.trim())).toEqual(['ana@veolia.com', 'luis@veolia.com']);
    expect(items[0].querySelector('.usuario-avatar')?.textContent?.trim()).toBe('AP');
    expect(strip(el.querySelector('.usuarios-footer')?.textContent)).toBe('2 usuarios');
  });

  it('search filters users by name or email ignoring case and accents', () => {
    const ctx = setup();
    const input = ctx.el.querySelector<HTMLInputElement>('input[placeholder="Buscar usuario o correo"]')!;
    const buscar = (texto: string) => {
      input.value = texto;
      input.dispatchEvent(new Event('input'));
      ctx.render();
    };
    buscar('GOMEZ');
    expect(Array.from(ctx.el.querySelectorAll('.usuario-correo')).map(n => n.textContent?.trim())).toEqual(['luis@veolia.com']);
    expect(strip(ctx.el.querySelector('.usuarios-footer')?.textContent)).toBe('1 usuario');
    buscar('pérez');
    expect(Array.from(ctx.el.querySelectorAll('.usuario-correo')).map(n => n.textContent?.trim())).toEqual(['ana@veolia.com']);
    buscar('zzz');
    expect(strip(ctx.el.querySelector('.usuarios-vacio')?.textContent)).toBe('Ningun usuario coincide con la busqueda.');
  });

  it('prompts to pick a user before one is selected', () => {
    const { el } = setup();
    expect(strip(el.querySelector('.sistemas-empty-prompt')?.textContent)).toBe('Selecciona un usuario de la lista para ver y editar sus sistemas.');
    expect(el.querySelector('.sistema-card')).toBeNull();
  });

  // Legacy UsuarioDD.vue:6 + AsignacionSistema.vue:52 query by correo.
  it('selecting a user queries its systems by email and the permission counts by SISU_ID', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(ctx.authService.getSistemasPorUsuario).toHaveBeenCalledWith('ana@veolia.com');
    expect(ctx.authService.getMenuUserOptions).toHaveBeenCalledWith(7);
    expect(ctx.authService.getMenuCatalog).toHaveBeenCalled();
    expect(ctx.el.querySelector('.usuario-item.selected')?.textContent).toContain('ana@veolia.com');
    expect(strip(ctx.el.querySelector('.panel-usuario-nombre')?.textContent)).toBe('Ana Perez');
    expect(ctx.el.querySelector('.panel-usuario-correo')?.textContent?.trim()).toBe('ana@veolia.com');
  });

  // Legacy controller.js:440-447 looks the user up by correo without SISU_ESTADO, so inactive users get their systems.
  it('inactive users can be assigned systems like legacy (controller.js:440-447 has no SISU_ESTADO filter)', () => {
    const ctx = setup();
    Array.from(ctx.el.querySelectorAll<HTMLButtonElement>('.usuario-item')).find(b => b.textContent?.includes('luis@veolia.com'))!.click();
    ctx.render();
    expect(ctx.authService.getSistemasPorUsuario).toHaveBeenCalledWith('luis@veolia.com');
    expect(cards(ctx.el)).toHaveLength(3);
  });

  it('shows a loading text while the systems load', () => {
    const ctx = setup();
    ctx.authService.getSistemasPorUsuario.mockReturnValue(new (class { subscribe() { return { unsubscribe() {} }; } })() as never);
    selectAna(ctx);
    expect(strip(ctx.el.querySelector('.loading-message')?.textContent)).toBe('Cargando sistemas...');
  });

  it('renders one card per system (assigned + unassigned) ordered by name with its switch state', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(cards(ctx.el).map(c => strip(c.querySelector('.sistema-nombre')?.textContent))).toEqual(['Reliquidaciones', 'SUI853', 'VEO-Regulator']);
    expect(cards(ctx.el).map(c => c.querySelector('.sistema-inicial')?.textContent?.trim())).toEqual(['R', 'S', 'V']);
    expect(switchDe(ctx.el, 'VEO-Regulator').checked).toBe(true);
    expect(switchDe(ctx.el, 'Reliquidaciones').checked).toBe(true);
    expect(switchDe(ctx.el, 'SUI853').checked).toBe(false);
    expect(cards(ctx.el).map(c => c.classList.contains('asignado'))).toEqual([true, false, true]);
    // The API returns only SIST_ID/SIST_NOMBRE, so there is no description line.
    expect(ctx.el.querySelector('.sistema-descripcion')).toBeNull();
  });

  it('header pill shows "N de M sistemas" and follows the switches', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(strip(ctx.el.querySelector('.sistemas-pill')?.textContent)).toBe('2 de 3 sistemas');
    toggle(ctx, 'SUI853');
    expect(strip(ctx.el.querySelector('.sistemas-pill')?.textContent)).toBe('3 de 3 sistemas');
  });

  it('shows the intro line pointing to the Permisos tab', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(strip(ctx.el.querySelector('.sistemas-lead')?.textContent)).toBe(
      'Encende los sistemas a los que puede entrar el usuario. Los permisos de cada sistema se configuran en la pestana Permisos.');
  });

  it('meta line counts the permitted leaf options of each system and "Sin acceso" when unassigned', () => {
    const ctx = setup();
    selectAna(ctx);
    const meta = (nombre: string) => strip(cards(ctx.el).find(c => c.textContent?.includes(nombre))?.querySelector('.sistema-meta')?.textContent);
    expect(meta('VEO-Regulator')).toBe('✓ 3 opciones con permiso');
    expect(meta('Reliquidaciones')).toBe('✓ 1 opcion con permiso');
    expect(meta('SUI853')).toBe('Sin acceso');
    toggle(ctx, 'VEO-Regulator');
    expect(meta('VEO-Regulator')).toBe('Sin acceso');
  });

  it('falls back to "Asignado" when the permission count calls fail, without blocking the tab', () => {
    const ctx = setup({ countsFail: true });
    selectAna(ctx);
    expect(cards(ctx.el)).toHaveLength(3);
    expect(ctx.el.querySelector('.error-message')).toBeNull();
    const meta = (nombre: string) => strip(cards(ctx.el).find(c => c.textContent?.includes(nombre))?.querySelector('.sistema-meta')?.textContent);
    expect(meta('VEO-Regulator')).toBe('Asignado');
    expect(meta('SUI853')).toBe('Sin acceso');
  });

  it('toggling marks changes and warns only when a loaded assignment is switched off', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('Sin cambios');
    expect(ctx.el.querySelector('.sistemas-warn')).toBeNull();

    toggle(ctx, 'SUI853');
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('1 cambio sin guardar');
    expect(ctx.el.querySelector('.sistemas-warn')).toBeNull();

    toggle(ctx, 'VEO-Regulator');
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('2 cambios sin guardar');
    expect(strip(ctx.el.querySelector('.sistemas-warn')?.textContent)).toBe(
      '⚠ Al quitar un sistema, el usuario deja de verlo en el selector de sistema al guardar.');

    toggle(ctx, 'VEO-Regulator');
    expect(ctx.el.querySelector('.sistemas-warn')).toBeNull();
  });

  it('Descartar restores the loaded assignment', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(botonDescartar(ctx.el).disabled).toBe(true);
    toggle(ctx, 'SUI853');
    toggle(ctx, 'Reliquidaciones');
    botonDescartar(ctx.el).click();
    ctx.render();
    expect(switchDe(ctx.el, 'SUI853').checked).toBe(false);
    expect(switchDe(ctx.el, 'Reliquidaciones').checked).toBe(true);
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('Sin cambios');
  });

  it('"Guardar sistemas" is disabled without changes', () => {
    const ctx = setup();
    selectAna(ctx);
    expect(strip(botonGuardar(ctx.el).textContent)).toBe('Guardar sistemas');
    expect(botonGuardar(ctx.el).disabled).toBe(true);
    toggle(ctx, 'SUI853');
    expect(botonGuardar(ctx.el).disabled).toBe(false);
  });

  // Legacy AsignacionSistema.vue:61-70: { sisuId, asignados: target ids, noAsignados: source ids }.
  it('saves sisuId with the switched-on ids as asignados and the switched-off ids as noAsignados', () => {
    const ctx = setup();
    selectAna(ctx);
    toggle(ctx, 'SUI853');
    toggle(ctx, 'Reliquidaciones');
    botonGuardar(ctx.el).click();
    ctx.render();
    expect(ctx.authService.asignarSistema).toHaveBeenCalledTimes(1);
    const [sisuId, asignados, noAsignados] = ctx.authService.asignarSistema.mock.calls[0] as unknown as [number, number[], number[]];
    expect(sisuId).toBe(7);
    expect([...asignados].sort()).toEqual([1, 3]);
    expect(noAsignados).toEqual([2]);
  });

  // Legacy AsignacionSistema.vue:60,69: nothing is sent before a user is loaded.
  it('sends nothing before a user is loaded', () => {
    const { component, authService } = setup();
    component.guardar();
    expect(authService.asignarSistema).not.toHaveBeenCalled();
  });

  // Legacy AuthService.js:339 success toast; the systems are reloaded after saving.
  it('success message is "Sistemas Asignados Correctamente" like legacy AuthService.js:339', () => {
    const ctx = setup();
    selectAna(ctx);
    toggle(ctx, 'SUI853');
    botonGuardar(ctx.el).click();
    ctx.render();
    expect(strip(ctx.el.querySelector('.success-message')?.textContent)).toBe('Sistemas Asignados Correctamente');
    expect(ctx.authService.getSistemasPorUsuario).toHaveBeenCalledTimes(2);
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('Sin cambios');
  });

  it('shows the backend message when saving fails and keeps the pending changes', () => {
    const ctx = setup();
    selectAna(ctx);
    ctx.authService.asignarSistema.mockReturnValue(throwError(() => ({ error: { message: 'Fallo' } })) as never);
    toggle(ctx, 'SUI853');
    botonGuardar(ctx.el).click();
    ctx.render();
    expect(strip(ctx.el.querySelector('.error-message')?.textContent)).toBe('Fallo');
    expect(strip(ctx.el.querySelector('.cambios-text')?.textContent)).toBe('1 cambio sin guardar');
  });
});

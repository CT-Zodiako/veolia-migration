import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AsignacionSistemaComponent } from './asignacion-sistema.component';
import { AuthService } from '../../../services/auth.service';

// Legacy: front-tarificador/src/components/usuarios/{AsignacionSistema.vue,UsuarioDD.vue}, service/AuthService.js:316-344,
// back-tarificador/src/modules/auth/{routes.js:137-146, controller.js:403-505}.
// Approved: token + admin required on getSistemasPorUsuario/asignarSistema (parity-review-all S10/L19);
// the new response carries sisuId (typed DTO), legacy took SISU_ID from the selected user (AsignacionSistema.vue:55).

const USERS = [
  { SISU_ID: 7, SISU_NOMBRE: 'Ana', SISU_APELLIDO: 'Pérez', SISU_CORREO: 'ana@veolia.com', SISU_ESTADO: 1 },
  { SISU_ID: 8, SISU_NOMBRE: 'Luis', SISU_APELLIDO: 'Gómez', SISU_CORREO: 'luis@veolia.com', SISU_ESTADO: 0 }
];
const SIN_ASIGNAR = [{ SIST_ID: 3, SIST_NOMBRE: 'SUI853' }];
const ASIGNADOS = [{ SIST_ID: 1, SIST_NOMBRE: 'VEO-Regulator' }];

function setup() {
  const authService = {
    getAllUsers: vi.fn(() => of(USERS)),
    getSistemasPorUsuario: vi.fn((correo: string) =>
      of({ sisuId: correo === 'ana@veolia.com' ? 7 : 8, asignados: ASIGNADOS, sinAsignar: SIN_ASIGNAR })),
    asignarSistema: vi.fn(() => of({}))
  };
  TestBed.configureTestingModule({
    imports: [AsignacionSistemaComponent],
    providers: [{ provide: AuthService, useValue: authService }]
  });
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  // jsdom has no matchMedia; the PrimeNG PickList reads it for its responsive breakpoint.
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  const fixture = TestBed.createComponent(AsignacionSistemaComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, authService, el: fixture.nativeElement as HTMLElement };
}

const strip = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

describe('AsignacionSistemaComponent (legacy components/usuarios/AsignacionSistema.vue)', () => {
  // Legacy UsuarioDD.vue:6 option value is the user (SISU_CORREO label); AsignacionSistema.vue:52 queries by correo.
  it('lists users by email and queries the systems with the selected email', () => {
    const { component, authService } = setup();
    expect(component.usuarioOptions.map(o => o.value)).toEqual(['ana@veolia.com', 'luis@veolia.com']);
    component.correo = 'ana@veolia.com';
    component.buscarSistemas();
    expect(authService.getSistemasPorUsuario).toHaveBeenCalledWith('ana@veolia.com');
  });

  // Legacy AsignacionSistema.vue:49 + controller.js:480-502: PickList = [sinAsignar, asignados], item label SIST_NOMBRE (vue:11).
  it('shows [sinAsignar, asignados] with SIST_NOMBRE', () => {
    const { fixture, component, el } = setup();
    component.correo = 'ana@veolia.com';
    component.buscarSistemas();
    fixture.detectChanges();
    expect(component.listaSistema).toEqual([SIN_ASIGNAR, ASIGNADOS]);
    const nombres = Array.from(el.querySelectorAll('.sistema-chip span')).map(n => n.textContent?.trim());
    expect(nombres).toEqual(['SUI853', 'VEO-Regulator']);
  });

  // Legacy AsignacionSistema.vue:61-70: { sisuId, asignados: target ids, noAsignados: source ids }.
  it('saves asignados from the target list and noAsignados from the source list', () => {
    const { component, authService } = setup();
    component.correo = 'ana@veolia.com';
    component.buscarSistemas();
    component.guardar();
    expect(authService.asignarSistema).toHaveBeenCalledWith(7, [1], [3]);
  });

  // Legacy AsignacionSistema.vue:60,69: nothing is sent before a user is loaded.
  it('sends nothing before a user is loaded', () => {
    const { component, authService } = setup();
    component.guardar();
    expect(authService.asignarSistema).not.toHaveBeenCalled();
  });

  // Legacy AsignacionSistema.vue:18 button label (accents ignored).
  it('shows the "Actualizar Asignacion de Sistema" button once the systems are loaded', () => {
    const { fixture, component, el } = setup();
    component.correo = 'ana@veolia.com';
    component.buscarSistemas();
    fixture.detectChanges();
    expect(strip(el.querySelector('p-button button')?.textContent)).toBe('Actualizar Asignacion de Sistema');
  });

  // Legacy controller.js:440-447 looks the user up by correo without SISU_ESTADO, so inactive users get their systems.
  it.skip('PARITY-FINDING: inactive users can be assigned systems (legacy controller.js:440-447 has no SISU_ESTADO filter); new blocks them with an error', () => {
    const { component, authService } = setup();
    component.correo = 'luis@veolia.com';
    component.buscarSistemas();
    expect(authService.getSistemasPorUsuario).toHaveBeenCalledWith('luis@veolia.com');
    expect(component.listaSistema).toEqual([SIN_ASIGNAR, ASIGNADOS]);
  });

  // Legacy AuthService.js:339 success toast.
  it.skip('PARITY-FINDING: success message is "Sistemas Asignados Correctamente" (legacy AuthService.js:339); new sets "Asignaciones guardadas correctamente" and the reload (buscarSistemas) clears it at once, so no success message is shown', () => {
    const { component } = setup();
    component.correo = 'ana@veolia.com';
    component.buscarSistemas();
    component.guardar();
    expect(component.success).toBe('Sistemas Asignados Correctamente');
  });

  // Legacy AsignacionSistema.vue:8-9 PickList headers.
  it.skip('PARITY-FINDING: PickList headers are "SISTEMA SIN ASIGNAR" / "SISTEMA ASIGNADAS" (legacy AsignacionSistema.vue:8-9); new shows "Sin asignar" / "Asignados"', () => {
    const { fixture, component, el } = setup();
    component.correo = 'ana@veolia.com';
    component.buscarSistemas();
    fixture.detectChanges();
    const text = el.querySelector('p-picklist')?.textContent ?? '';
    expect(text).toContain('SISTEMA SIN ASIGNAR');
    expect(text).toContain('SISTEMA ASIGNADAS');
  });
});

import { SimpleChange } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProyeccionSelectorComponent } from './proyeccion-selector.component';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ParametrosConsultaStateService } from '../../services/parametros-consulta-state.service';

// Legacy: front-tarificador/src/components/proyecciones/seleccionarProyeccion.vue — Dropdown optionLabel PROYNOMBRE /
// optionValue PROYID (:9-16), list reloaded by APS (getProybyAps, :173-176) whenever the store APS changes (:194-197),
// selected projection kept in the store (setProyId, :167). Approved: typed-DTO camelCase (proyNombre/proyId) and
// envelope { data } consumed by the new frontend (parity-review-all S3).

const PROYS = [
  { proyId: 10, apsaId: 1, proyNombre: 'Base 2025', proyTipo100: 1, proyAnnoDes: 2025, proyMesDes: 1, proyAnnoHas: 2025 },
  { proyId: 11, apsaId: 1, proyNombre: 'Alta 2026', proyTipo100: 1, proyAnnoDes: 2026, proyMesDes: 1, proyAnnoHas: 2026 }
];

function setup(guardado: number | null = null, consulta = vi.fn(() => of({ data: PROYS }))) {
  const service = { consulta };
  const state = { getProyeccion: vi.fn(() => guardado), setProyeccion: vi.fn() };
  TestBed.configureTestingModule({
    imports: [ProyeccionSelectorComponent],
    providers: [
      { provide: ProyeccionesService, useValue: service },
      { provide: ParametrosConsultaStateService, useValue: state }
    ]
  });
  const component = TestBed.createComponent(ProyeccionSelectorComponent).componentInstance;
  const ids: (number | null)[] = [];
  const objs: unknown[] = [];
  component.selectedProyeccionChange.subscribe(v => ids.push(v));
  component.proyeccionChange.subscribe(v => objs.push(v));
  const setAps = (aps: number | null) => {
    component.aps = aps;
    component.ngOnChanges({ aps: new SimpleChange(null, aps, false) });
  };
  return { component, service, state, ids, objs, setAps };
}

describe('ProyeccionSelectorComponent (legacy proyecciones/seleccionarProyeccion.vue)', () => {
  // Legacy seleccionarProyeccion.vue:173-176,194-197: projections of the selected APS, reloaded when the APS changes.
  it('loads the projections of the selected APS', () => {
    const { component, service, setAps } = setup();
    setAps(1);
    expect(service.consulta).toHaveBeenCalledWith(1);
    expect(component.proyecciones).toEqual(PROYS);
    setAps(2);
    expect(service.consulta).toHaveBeenLastCalledWith(2);
  });

  // Legacy :167 setProyId + :141 selected projection object used by the parent.
  it('emits the id and the full projection on select, and saves the id', () => {
    const { component, state, ids, objs, setAps } = setup();
    setAps(1);
    component.onSelect('11');
    expect(ids).toEqual([11]);
    expect(objs).toEqual([PROYS[1]]);
    expect(state.setProyeccion).toHaveBeenCalledWith(11);
  });

  // Legacy :183 restores stProyId from the store.
  it('restores the saved projection when it belongs to the APS', () => {
    const { component, ids, setAps } = setup(10);
    setAps(1);
    expect(component.selectedProyeccion).toBe(10);
    expect(ids).toEqual([10]);
  });

  // Pinned: a selection not in the new APS list is cleared.
  it('clears a selection that does not belong to the new APS', () => {
    const { component, ids, setAps } = setup();
    component.selectedProyeccion = 99;
    setAps(1);
    expect(component.selectedProyeccion).toBeNull();
    expect(ids).toEqual([null]);
  });

  // Pinned: without APS no request is sent and any selection is cleared.
  it('requests nothing and clears the selection without APS', () => {
    const { component, service, ids, setAps } = setup();
    component.selectedProyeccion = 10;
    setAps(null);
    expect(service.consulta).not.toHaveBeenCalled();
    expect(ids).toEqual([null]);
  });

  // Pinned: request errors leave an empty list.
  it('leaves an empty list when the request fails', () => {
    const { component, setAps } = setup(null, vi.fn(() => throwError(() => ({ status: 500 }))));
    setAps(1);
    expect(component.proyecciones).toEqual([]);
    expect(component.loading).toBe(false);
  });
});

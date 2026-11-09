import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, MenuCatalogItem } from '../../../services/auth.service';

interface PermisoMenuNode {
  id: number;
  label: string;
  children: PermisoMenuNode[];
}

interface SistemaPermisos {
  sistemaId: number;
  sistemaNombre: string;
  items: PermisoMenuNode[];
}

// One card of the grid: a top-level menu with children, or "General" holding the top-level options without children.
interface GrupoPermisos {
  key: string;
  label: string;
  opciones: PermisoMenuNode[];
}

interface UsuarioItem {
  id: number;
  nombre: string;
  correo: string;
  iniciales: string;
  busqueda: string;
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

@Component({
  selector: 'app-permisos',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './permisos.component.html',
  styleUrls: ['./permisos.component.css']
})
export class PermisosComponent {
  usuarios: any[] = [];
  selectedUsuarioId: number | null = null;
  sistemasPermisos: SistemaPermisos[] = [];
  loading = false;
  saving = false;
  error = '';
  success = '';
  busqueda = '';
  sistemaActivoId: number | null = null;

  private catalog: MenuCatalogItem[] = [];
  private nodosPorId = new Map<number, PermisoMenuNode>();
  private selectedIds = new Set<number>();
  private loadedIds = new Set<number>();
  private gruposPorSistema = new Map<number, GrupoPermisos[]>();

  constructor(
    private authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.authService.getAllUsers().subscribe({
      next: (usuarios: any[]) => {
        this.usuarios = usuarios;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar usuarios';
        this.cdr.detectChanges();
      }
    });
  }

  cargarPermisos(): void {
    if (!this.selectedUsuarioId) return;

    const correo = this.usuarios.find(u => u.SISU_ID === this.selectedUsuarioId)?.SISU_CORREO;
    if (!correo) {
      this.error = 'No se encontró el correo del usuario seleccionado';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.sistemasPermisos = [];
    this.gruposPorSistema.clear();
    this.sistemaActivoId = null;

    forkJoin({
      permittedIds: this.authService.getMenuUserOptions(this.selectedUsuarioId),
      catalog: this.authService.getMenuCatalog(),
      sistemasUsuario: this.authService.getSistemasPorUsuario(correo)
    }).subscribe({
      next: ({ permittedIds, catalog, sistemasUsuario }) => {
        this.catalog = catalog || [];
        this.selectedIds = new Set(permittedIds || []);
        const sistemasAsignados = new Set((sistemasUsuario?.asignados || []).map(s => s.SIST_ID));
        this.sistemasPermisos = this.buildSistemasPermisos(this.catalog)
          .filter(sistema => sistemasAsignados.has(sistema.sistemaId));
        this.loadedIds = new Set(this.selectedIds);
        this.sistemaActivoId = this.sistemasPermisos[0]?.sistemaId ?? null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar los permisos del usuario';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get usuarioOptions(): { label: string; value: number }[] {
    return this.usuarios.map(u => ({
      label: `${u.SISU_NOMBRE} ${u.SISU_APELLIDO} (${u.SISU_CORREO})`,
      value: u.SISU_ID
    }));
  }

  get usuarioSeleccionadoNombre(): string {
    const u = this.usuarios.find(u => u.SISU_ID === this.selectedUsuarioId);
    return u ? `${u.SISU_NOMBRE} ${u.SISU_APELLIDO}` : '';
  }

  get usuarioSeleccionado(): UsuarioItem | undefined {
    return this.usuariosLista.find(u => u.id === this.selectedUsuarioId);
  }

  get usuariosLista(): UsuarioItem[] {
    return this.usuarios.map(u => {
      const nombre = `${u.SISU_NOMBRE ?? ''} ${u.SISU_APELLIDO ?? ''}`.trim();
      const correo = u.SISU_CORREO ?? '';
      const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
      return { id: u.SISU_ID, nombre, correo, iniciales, busqueda: normalizar(`${nombre} (${correo})`) };
    });
  }

  get usuariosFiltrados(): UsuarioItem[] {
    const term = normalizar(this.busqueda.trim());
    return term ? this.usuariosLista.filter(u => u.busqueda.includes(term)) : this.usuariosLista;
  }

  seleccionarUsuario(id: number): void {
    if (this.selectedUsuarioId === id && (this.loading || this.sistemasPermisos.length > 0)) return;
    this.selectedUsuarioId = id;
    this.cargarPermisos();
  }

  get sistemaActivo(): SistemaPermisos | undefined {
    return this.sistemasPermisos.find(s => s.sistemaId === this.sistemaActivoId) ?? this.sistemasPermisos[0];
  }

  seleccionarSistema(sistemaId: number): void {
    this.sistemaActivoId = sistemaId;
  }

  gruposDe(sistema: SistemaPermisos): GrupoPermisos[] {
    let grupos = this.gruposPorSistema.get(sistema.sistemaId);
    if (!grupos) {
      grupos = sistema.items
        .filter(item => item.children.length > 0)
        .map(item => ({ key: `menu-${item.id}`, label: item.label, opciones: item.children }));
      const generales = sistema.items.filter(item => item.children.length === 0);
      if (generales.length > 0) {
        grupos.push({ key: 'general', label: 'General', opciones: generales });
      }
      this.gruposPorSistema.set(sistema.sistemaId, grupos);
    }
    return grupos;
  }

  isGrupoSeleccionado(grupo: GrupoPermisos): boolean {
    const total = this.contarTotal(grupo.opciones);
    return total > 0 && this.contarSeleccionados(grupo.opciones) === total;
  }

  isGrupoParcial(grupo: GrupoPermisos): boolean {
    const seleccionados = this.contarSeleccionados(grupo.opciones);
    return seleccionados > 0 && seleccionados < this.contarTotal(grupo.opciones);
  }

  toggleGrupo(grupo: GrupoPermisos): void {
    this.toggleNodos(grupo.opciones);
  }

  // A row with children is "on" when all its leaves are; toggling it sets the whole subtree.
  isOpcionSeleccionada(nodo: PermisoMenuNode): boolean {
    return nodo.children.length === 0 ? this.selectedIds.has(nodo.id) : this.isGrupoSeleccionado({ key: '', label: '', opciones: nodo.children });
  }

  toggleOpcion(nodo: PermisoMenuNode): void {
    if (nodo.children.length === 0) {
      this.toggleMenuItem(nodo.id);
    } else {
      this.toggleNodos(nodo.children);
    }
  }

  get cambiosPendientes(): number {
    return this.sistemasPermisos
      .flatMap(sistema => this.collectAllLeafIds(sistema.items))
      .filter(id => this.selectedIds.has(id) !== this.loadedIds.has(id)).length;
  }

  get cambiosTexto(): string {
    const n = this.cambiosPendientes;
    if (n === 0) return 'Sin cambios';
    return n === 1 ? '1 cambio sin guardar' : `${n} cambios sin guardar`;
  }

  descartar(): void {
    this.selectedIds = new Set(this.loadedIds);
  }

  contarSeleccionados(items: PermisoMenuNode[]): number {
    return this.collectAllLeafIds(items).filter(id => this.selectedIds.has(id)).length;
  }

  contarTotal(items: PermisoMenuNode[]): number {
    return this.collectAllLeafIds(items).length;
  }

  marcarTodos(sistema: SistemaPermisos, marcar: boolean): void {
    const ids = this.collectAllLeafIds(sistema.items);
    for (const id of ids) {
      if (marcar) {
        this.selectedIds.add(id);
      } else {
        this.selectedIds.delete(id);
      }
    }
  }

  isPartiallySelected(menuId: number): boolean {
    const ids = this.collectDescendantIds(menuId);
    if (ids.length === 0) return false;
    const seleccionados = ids.filter(id => this.selectedIds.has(id)).length;
    return seleccionados > 0 && seleccionados < ids.length;
  }

  toggleMenuItem(menuId: number): void {
    const ids = this.collectDescendantIds(menuId);
    if (ids.length === 0) {
      ids.push(menuId);
    }

    const allSelected = ids.every(id => this.selectedIds.has(id));
    if (allSelected) {
      for (const id of ids) {
        this.selectedIds.delete(id);
      }
    } else {
      for (const id of ids) {
        this.selectedIds.add(id);
      }
    }
  }

  isSelected(menuId: number): boolean {
    const ids = this.collectDescendantIds(menuId);
    if (ids.length === 0) {
      return this.selectedIds.has(menuId);
    }
    return ids.every(id => this.selectedIds.has(id));
  }

  guardar(): void {
    if (!this.selectedUsuarioId || this.sistemasPermisos.length === 0) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    const llamadas = this.sistemasPermisos.map(sistema =>
      this.authService.uptUserMenu(this.selectedUsuarioId!, this.collectIdsParaGuardar(sistema.items), sistema.sistemaId));

    forkJoin(llamadas).subscribe({
      next: () => {
        // Legacy AuthService.js:306.
        this.success = 'Opciones Asignadas Correctamente';
        this.loadedIds = new Set(this.selectedIds);
        this.saving = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar los permisos';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  private toggleNodos(nodos: PermisoMenuNode[]): void {
    const hojas = this.collectAllLeafIds(nodos);
    const todos: number[] = [];
    this.collectIds(nodos, todos);
    const marcar = !hojas.every(id => this.selectedIds.has(id));
    for (const id of todos) {
      if (marcar) {
        this.selectedIds.add(id);
      } else {
        this.selectedIds.delete(id);
      }
    }
  }

  private collectDescendantIds(menuId: number): number[] {
    const item = this.nodosPorId.get(menuId);
    if (!item || item.children.length === 0) {
      return [];
    }
    const ids: number[] = [];
    this.collectIds(item.children, ids);
    return ids;
  }

  private collectIds(items: PermisoMenuNode[], ids: number[]): void {
    for (const item of items) {
      ids.push(item.id);
      if (item.children.length > 0) {
        this.collectIds(item.children, ids);
      }
    }
  }

  // Legacy MenuxUsuario.vue:52 (treeselect ALL_WITH_INDETERMINATE): checked leaves plus every checked or
  // partially checked parent; MenuService.js:663 needs the parent MENU_ID to show the group.
  private collectIdsParaGuardar(items: PermisoMenuNode[]): number[] {
    const ids: number[] = [];
    const walk = (nodos: PermisoMenuNode[]): void => {
      for (const nodo of nodos) {
        if (nodo.children.length === 0) {
          if (this.selectedIds.has(nodo.id)) ids.push(nodo.id);
          continue;
        }
        const antes = ids.length;
        walk(nodo.children);
        if (ids.length > antes) ids.push(nodo.id);
      }
    };
    walk(items);
    return ids;
  }

  private collectAllLeafIds(items: PermisoMenuNode[]): number[] {
    const ids: number[] = [];
    const walk = (nodos: PermisoMenuNode[]): void => {
      for (const nodo of nodos) {
        if (nodo.children.length === 0) {
          ids.push(nodo.id);
        } else {
          walk(nodo.children);
        }
      }
    };
    walk(items);
    return ids;
  }

  private buildSistemasPermisos(catalog: MenuCatalogItem[]): SistemaPermisos[] {
    this.nodosPorId = new Map(catalog.map(item => [item.id, { id: item.id, label: item.label, children: [] }]));

    const grupos = new Map<number, SistemaPermisos>();

    for (const item of catalog) {
      const nodo = this.nodosPorId.get(item.id)!;
      const padre = item.parentId != null ? this.nodosPorId.get(item.parentId) : undefined;

      if (padre) {
        padre.children.push(nodo);
        continue;
      }

      if (!grupos.has(item.sistemaId)) {
        grupos.set(item.sistemaId, {
          sistemaId: item.sistemaId,
          sistemaNombre: item.sistemaNombre || 'Sin sistema',
          items: []
        });
      }
      grupos.get(item.sistemaId)!.items.push(nodo);
    }

    return Array.from(grupos.values()).sort((a, b) => a.sistemaNombre.localeCompare(b.sistemaNombre));
  }
}

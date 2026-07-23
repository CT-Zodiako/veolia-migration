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
  error = '';
  success = '';

  private catalog: MenuCatalogItem[] = [];
  private nodosPorId = new Map<number, PermisoMenuNode>();
  private selectedIds = new Set<number>();

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

    this.loading = true;
    this.error = '';
    this.success = '';

    const llamadas = this.sistemasPermisos.map(sistema => {
      const idsDelSistema = this.catalog
        .filter(item => item.sistemaId === sistema.sistemaId && this.selectedIds.has(item.id))
        .map(item => item.id);

      return this.authService.uptUserMenu(this.selectedUsuarioId!, idsDelSistema, sistema.sistemaId);
    });

    forkJoin(llamadas).subscribe({
      next: () => {
        this.success = 'Permisos actualizados correctamente';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar los permisos';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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

import { Injectable, signal, computed } from '@angular/core';

export interface MenuGroup {
  id: number;
  label: string;
  icon: string;
  expanded: boolean;
  children: MenuItem[];
}

export interface MenuItem {
  label: string;
  path: string;
  icon: string;
}

@Injectable({ providedIn: 'root' })
export class MenuState {
  // Estado privado
  private readonly _menuGroups = signal<MenuGroup[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Estado público
  readonly menuGroups = this._menuGroups.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly menuCount = computed(() => this._menuGroups().length);
  readonly isEmpty = computed(() => this._menuGroups().length === 0);

  // Acciones
  setMenuGroups(groups: MenuGroup[]): void {
    this._menuGroups.set(groups);
  }

  toggleGroup(id: number): void {
    this._menuGroups.update(groups =>
      groups.map(g => g.id === id ? { ...g, expanded: !g.expanded } : g)
    );
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setError(error: string | null): void {
    this._error.set(error);
  }

  clearMenu(): void {
    this._menuGroups.set([]);
    this._error.set(null);
  }
}

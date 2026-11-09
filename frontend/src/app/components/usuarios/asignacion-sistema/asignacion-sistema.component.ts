import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, MenuCatalogItem, Sistema } from '../../../services/auth.service';

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
  selector: 'app-asignacion-sistema',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './asignacion-sistema.component.html',
  styleUrls: ['./asignacion-sistema.component.css']
})
export class AsignacionSistemaComponent implements OnInit {
  usuarios: any[] = [];
  selectedUsuarioId: number | null = null;
  sisuId: number | null = null;
  // All the systems (asignados + sinAsignar), ordered by SIST_NOMBRE like the backend lists.
  sistemas: Sistema[] = [];
  loading = false;
  saving = false;
  error = '';
  success = '';
  busqueda = '';

  private asignadosIds = new Set<number>();
  private loadedIds = new Set<number>();
  // Permitted leaf options per SIST_ID; null when the count calls failed (meta falls back to "Asignado").
  private opcionesPorSistema: Map<number, number> | null = null;
  private carga = 0;

  constructor(
    private authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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

  // Systems are queried by correo (legacy AsignacionSistema.vue:52), so users without one are not listed.
  get usuariosLista(): UsuarioItem[] {
    return this.usuarios
      .filter(u => !!u.SISU_CORREO)
      .map(u => {
        const nombre = `${u.SISU_NOMBRE ?? ''} ${u.SISU_APELLIDO ?? ''}`.trim();
        const correo = u.SISU_CORREO;
        const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
        return { id: u.SISU_ID, nombre, correo, iniciales, busqueda: normalizar(`${nombre} (${correo})`) };
      });
  }

  get usuariosFiltrados(): UsuarioItem[] {
    const term = normalizar(this.busqueda.trim());
    return term ? this.usuariosLista.filter(u => u.busqueda.includes(term)) : this.usuariosLista;
  }

  get usuarioSeleccionado(): UsuarioItem | undefined {
    return this.usuariosLista.find(u => u.id === this.selectedUsuarioId);
  }

  seleccionarUsuario(id: number): void {
    if (this.selectedUsuarioId === id && (this.loading || this.sistemas.length > 0)) return;
    this.selectedUsuarioId = id;
    this.buscarSistemas();
  }

  buscarSistemas(): void {
    const usuario = this.usuarioSeleccionado;
    if (!usuario) {
      this.error = 'Seleccione un usuario';
      return;
    }

    this.error = '';
    this.success = '';
    this.sisuId = null;
    this.sistemas = [];
    this.opcionesPorSistema = null;
    const carga = ++this.carga;

    // Legacy auth/controller.js:440-447: inactive users are assigned systems too (no SISU_ESTADO filter).
    this.loading = true;

    // The permission counts only feed the meta line: a failure there must not block the tab.
    forkJoin({
      permittedIds: this.authService.getMenuUserOptions(usuario.id),
      catalog: this.authService.getMenuCatalog()
    }).pipe(catchError(() => of(null))).subscribe(conteo => {
      if (carga !== this.carga) return;
      this.opcionesPorSistema = conteo ? this.contarOpcionesPorSistema(conteo.catalog || [], conteo.permittedIds || []) : null;
      this.cdr.detectChanges();
    });

    this.authService.getSistemasPorUsuario(usuario.correo).subscribe({
      next: (response: any) => {
        if (carga !== this.carga) return;
        this.sisuId = response.sisuId ?? null;
        const sinAsignar = (response.sinAsignar || []) as Sistema[];
        const asignados = (response.asignados || []) as Sistema[];
        this.sistemas = [...asignados, ...sinAsignar].sort((a, b) => a.SIST_NOMBRE.localeCompare(b.SIST_NOMBRE));
        this.loadedIds = new Set(asignados.map(s => s.SIST_ID));
        this.asignadosIds = new Set(this.loadedIds);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (carga !== this.carga) return;
        this.error = err.error?.message || 'Error al cargar sistemas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  isAsignado(sistema: Sistema): boolean {
    return this.asignadosIds.has(sistema.SIST_ID);
  }

  toggleSistema(sistema: Sistema): void {
    if (this.asignadosIds.has(sistema.SIST_ID)) {
      this.asignadosIds.delete(sistema.SIST_ID);
    } else {
      this.asignadosIds.add(sistema.SIST_ID);
    }
  }

  inicial(sistema: Sistema): string {
    return (sistema.SIST_NOMBRE ?? '').trim().charAt(0).toUpperCase();
  }

  meta(sistema: Sistema): string {
    if (!this.isAsignado(sistema)) return 'Sin acceso';
    if (!this.opcionesPorSistema) return 'Asignado';
    const n = this.opcionesPorSistema.get(sistema.SIST_ID) ?? 0;
    return n === 1 ? '✓ 1 opción con permiso' : `✓ ${n} opciones con permiso`;
  }

  get resumenTexto(): string {
    const asignados = this.sistemas.filter(s => this.isAsignado(s)).length;
    return `${asignados} de ${this.sistemas.length} sistemas`;
  }

  get quitaAsignado(): boolean {
    return Array.from(this.loadedIds).some(id => !this.asignadosIds.has(id));
  }

  get cambiosPendientes(): number {
    return this.sistemas.filter(s => this.asignadosIds.has(s.SIST_ID) !== this.loadedIds.has(s.SIST_ID)).length;
  }

  get cambiosTexto(): string {
    const n = this.cambiosPendientes;
    if (n === 0) return 'Sin cambios';
    return n === 1 ? '1 cambio sin guardar' : `${n} cambios sin guardar`;
  }

  descartar(): void {
    this.asignadosIds = new Set(this.loadedIds);
  }

  guardar(): void {
    if (!this.sisuId || this.sistemas.length === 0) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    // Paridad AS-IS (AsignacionSistema.vue:61-70): every system goes either to asignados or to noAsignados.
    const asignados = this.sistemas.filter(s => this.isAsignado(s)).map(s => s.SIST_ID);
    const noAsignados = this.sistemas.filter(s => !this.isAsignado(s)).map(s => s.SIST_ID);

    this.authService.asignarSistema(this.sisuId, asignados, noAsignados).subscribe({
      next: () => {
        this.saving = false;
        this.buscarSistemas();
        // Legacy AuthService.js:339; set after the reload, which clears the messages.
        this.success = 'Sistemas Asignados Correctamente';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar asignaciones';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Same tree as Permisos (buildSistemasPermisos): a child hangs from its parent and the root decides the system;
  // counts the permitted leaves of each system.
  private contarOpcionesPorSistema(catalog: MenuCatalogItem[], permittedIds: number[]): Map<number, number> {
    const porId = new Map(catalog.map(item => [item.id, item]));
    const padres = new Set(catalog.filter(item => item.parentId != null && porId.has(item.parentId)).map(item => item.parentId!));
    const permitidos = new Set(permittedIds);
    const conteo = new Map<number, number>();

    for (const item of catalog) {
      if (padres.has(item.id) || !permitidos.has(item.id)) continue;
      let raiz = item;
      const vistos = new Set<number>();
      while (raiz.parentId != null && porId.has(raiz.parentId) && !vistos.has(raiz.id)) {
        vistos.add(raiz.id);
        raiz = porId.get(raiz.parentId)!;
      }
      conteo.set(raiz.sistemaId, (conteo.get(raiz.sistemaId) ?? 0) + 1);
    }
    return conteo;
  }
}

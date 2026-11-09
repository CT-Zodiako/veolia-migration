import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, ApsItem } from '../../../services/auth.service';

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
  selector: 'app-apsx-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './apsx-usuario.component.html',
  styleUrls: ['./apsx-usuario.component.css']
})
export class ApsxUsuarioComponent implements OnInit {
  usuarios: any[] = [];
  selectedUsuarioId: number | null = null;
  // All the APS (asignadas + sinAsignar), ordered by APSA_NOMAPS.
  aps: ApsItem[] = [];
  loading = false;
  saving = false;
  error = '';
  success = '';
  busqueda = '';
  busquedaAps = '';
  soloAsignados = false;

  private asignadasIds = new Set<number>();
  private loadedIds = new Set<number>();
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

  get usuarioSeleccionado(): UsuarioItem | undefined {
    return this.usuariosLista.find(u => u.id === this.selectedUsuarioId);
  }

  seleccionarUsuario(id: number): void {
    if (this.selectedUsuarioId === id && (this.loading || this.aps.length > 0)) return;
    this.selectedUsuarioId = id;
    this.onUsuarioChange();
  }

  onUsuarioChange(): void {
    const carga = ++this.carga;
    this.aps = [];
    this.asignadasIds = new Set();
    this.loadedIds = new Set();
    if (!this.selectedUsuarioId) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.getApsAsignadas(this.selectedUsuarioId).subscribe({
      next: (response: any) => {
        if (carga !== this.carga) return;
        const sinAsignar = (response.sinAsignar || []) as ApsItem[];
        const asignadas = (response.asignadas || []) as ApsItem[];
        this.aps = [...asignadas, ...sinAsignar].sort((a, b) => (a.APSA_NOMAPS ?? '').localeCompare(b.APSA_NOMAPS ?? '', 'es'));
        this.loadedIds = new Set(asignadas.map(a => a.APSA_ID));
        this.asignadasIds = new Set(this.loadedIds);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        if (carga !== this.carga) return;
        this.error = err.error?.message || 'Error al cargar APS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get apsVisibles(): ApsItem[] {
    const term = normalizar(this.busquedaAps.trim());
    return this.aps.filter(a =>
      (!term || normalizar(a.APSA_NOMAPS ?? '').includes(term)) && (!this.soloAsignados || this.isAsignada(a)));
  }

  isAsignada(aps: ApsItem): boolean {
    return this.asignadasIds.has(aps.APSA_ID);
  }

  isCambiada(aps: ApsItem): boolean {
    return this.asignadasIds.has(aps.APSA_ID) !== this.loadedIds.has(aps.APSA_ID);
  }

  toggleAps(aps: ApsItem): void {
    if (this.asignadasIds.has(aps.APSA_ID)) {
      this.asignadasIds.delete(aps.APSA_ID);
    } else {
      this.asignadasIds.add(aps.APSA_ID);
    }
  }

  // "Seleccionar todos" / "Ninguno" only touch the APS the current filters show.
  marcarVisibles(asignar: boolean): void {
    for (const a of this.apsVisibles) {
      if (asignar) {
        this.asignadasIds.add(a.APSA_ID);
      } else {
        this.asignadasIds.delete(a.APSA_ID);
      }
    }
  }

  toggleSoloAsignados(): void {
    this.soloAsignados = !this.soloAsignados;
  }

  get resumenTexto(): string {
    const asignadas = this.aps.filter(a => this.isAsignada(a)).length;
    return `${asignadas} de ${this.aps.length} APS`;
  }

  get cambiosPendientes(): number {
    return this.aps.filter(a => this.isCambiada(a)).length;
  }

  get cambiosTexto(): string {
    const n = this.cambiosPendientes;
    if (n === 0) return 'Sin cambios';
    return n === 1 ? '1 cambio sin guardar' : `${n} cambios sin guardar`;
  }

  descartar(): void {
    this.asignadasIds = new Set(this.loadedIds);
  }

  guardar(): void {
    if (!this.selectedUsuarioId || this.aps.length === 0) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    // Paridad AS-IS: every APS goes either to outAps (sin asignar) or to inAps (asignadas).
    const outAps = this.aps.filter(a => !this.isAsignada(a)).map(a => a.APSA_ID);
    const inAps = this.aps.filter(a => this.isAsignada(a)).map(a => a.APSA_ID);

    this.authService.setApsxUsuario(this.selectedUsuarioId, outAps, inAps).subscribe({
      next: () => {
        this.saving = false;
        this.onUsuarioChange();
        // Legacy AuthService.js:251; set after the reload, which clears the messages.
        this.success = 'APS Asignadas Correctamente';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar asignaciones';
        this.saving = false;
        this.cdr.detectChanges();
      }
    });
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, Sistema } from '../../../services/auth.service';

@Component({
  selector: 'app-asignacion-sistema',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './asignacion-sistema.component.html',
  styleUrls: ['./asignacion-sistema.component.css']
})
export class AsignacionSistemaComponent implements OnInit {
  usuarios: any[] = [];
  correo: string | null = null;
  sisuId: number | null = null;
  listaSistema: Sistema[][] = [];
  loading = false;
  error = '';
  success = '';

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

  get usuarioOptions(): { label: string; value: string }[] {
    return this.usuarios
      .filter(u => !!u.SISU_CORREO)
      .map(u => ({
        label: `${u.SISU_NOMBRE} ${u.SISU_APELLIDO} — ${u.SISU_CORREO}`,
        value: u.SISU_CORREO
      }));
  }

  buscarSistemas(): void {
    if (!this.correo) {
      this.error = 'Seleccione un usuario';
      return;
    }

    this.error = '';
    this.success = '';
    this.sisuId = null;
    this.listaSistema = [];

    // El backend (GetSistemasPorUsuarioAsync) solo busca usuarios con SISU_ESTADO = 1;
    // si está inactivo devuelve todo vacío en silencio, por eso lo detectamos antes de llamarlo.
    const usuario = this.usuarios.find(u => u.SISU_CORREO === this.correo);
    if (usuario && usuario.SISU_ESTADO !== 1) {
      this.error = 'Este usuario está inactivo. Activalo desde la pestaña "Usuarios" antes de asignarle sistemas.';
      return;
    }

    this.loading = true;

    this.authService.getSistemasPorUsuario(this.correo).subscribe({
      next: (response: any) => {
        // Paridad AS-IS: PickList espera [source, target] = [sinAsignar, asignados].
        this.sisuId = response.sisuId ?? null;
        const sinAsignar = (response.sinAsignar || []) as Sistema[];
        const asignados = (response.asignados || []) as Sistema[];
        this.listaSistema = [sinAsignar, asignados];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar sistemas';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  guardar(): void {
    if (!this.sisuId || this.listaSistema.length < 2) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    // Paridad AS-IS: source = sinAsignar -> noAsignados; target = asignados -> asignados.
    const noAsignados = this.listaSistema[0].map(s => s.SIST_ID);
    const asignados = this.listaSistema[1].map(s => s.SIST_ID);

    this.authService.asignarSistema(this.sisuId, asignados, noAsignados).subscribe({
      next: () => {
        this.success = 'Asignaciones guardadas correctamente';
        this.loading = false;
        this.buscarSistemas();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar asignaciones';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}

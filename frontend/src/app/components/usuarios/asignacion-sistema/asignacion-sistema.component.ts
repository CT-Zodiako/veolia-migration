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
  correo = '';
  asignados: Sistema[] = [];
  sinAsignar: Sistema[] = [];
  selectedAsignados: number[] = [];
  selectedSinAsignar: number[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(
    private authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  buscarSistemas(): void {
    if (!this.correo) {
      this.error = 'Ingrese un correo';
      return;
    }

    this.loading = true;
    this.error = '';
    this.authService.getSistemasPorUsuario(this.correo).subscribe({
      next: (response: any) => {
        this.asignados = response.asignados || [];
        this.sinAsignar = response.sinAsignar || [];
        this.selectedAsignados = [];
        this.selectedSinAsignar = [];
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

  toggleAsignado(sistId: number): void {
    const index = this.selectedAsignados.indexOf(sistId);
    if (index > -1) {
      this.selectedAsignados.splice(index, 1);
    } else {
      this.selectedAsignados.push(sistId);
    }
  }

  toggleSinAsignar(sistId: number): void {
    const index = this.selectedSinAsignar.indexOf(sistId);
    if (index > -1) {
      this.selectedSinAsignar.splice(index, 1);
    } else {
      this.selectedSinAsignar.push(sistId);
    }
  }

  guardar(): void {
    // Necesitamos el sisuId, lo obtenemos del usuario logueado o del primer asignado
    const sisuId = this.getSisuId();
    if (!sisuId) {
      this.error = 'No se pudo determinar el usuario';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.asignarSistema(sisuId, this.selectedSinAsignar, this.selectedAsignados).subscribe({
      next: () => {
        this.success = 'Asignaciones guardadas correctamente';
        this.buscarSistemas();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar asignaciones';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getSisuId(): number | null {
    const usuario = localStorage.getItem('usuario');
    if (usuario) {
      const u = JSON.parse(usuario);
      return u.SISU_ID || null;
    }
    return null;
  }
}

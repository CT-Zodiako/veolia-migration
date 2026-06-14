import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, ApsItem } from '../../../services/auth.service';

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
  asignadas: ApsItem[] = [];
  sinAsignar: ApsItem[] = [];
  selectedAsignadas: number[] = [];
  selectedSinAsignar: number[] = [];
  loading = false;
  error = '';
  success = '';

  get usuarioOptions(): { label: string; value: number }[] {
    return this.usuarios.map(u => ({
      label: `${u.SISU_NOMBRE} ${u.SISU_APELLIDO} (${u.SISU_CORREO})`,
      value: u.SISU_ID
    }));
  }

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

  onUsuarioChange(): void {
    if (!this.selectedUsuarioId) return;
    
    this.loading = true;
    this.error = '';
    this.authService.getApsAsignadas(this.selectedUsuarioId).subscribe({
      next: (response: any) => {
        this.asignadas = response.asignadas || [];
        this.sinAsignar = response.sinAsignar || [];
        this.selectedAsignadas = [];
        this.selectedSinAsignar = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar APS';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleAsignada(apsaId: number): void {
    const index = this.selectedAsignadas.indexOf(apsaId);
    if (index > -1) {
      this.selectedAsignadas.splice(index, 1);
    } else {
      this.selectedAsignadas.push(apsaId);
    }
  }

  toggleSinAsignar(apsaId: number): void {
    const index = this.selectedSinAsignar.indexOf(apsaId);
    if (index > -1) {
      this.selectedSinAsignar.splice(index, 1);
    } else {
      this.selectedSinAsignar.push(apsaId);
    }
  }

  guardar(): void {
    if (!this.selectedUsuarioId) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.setApsxUsuario(
      this.selectedUsuarioId,
      this.selectedAsignadas,
      this.selectedSinAsignar
    ).subscribe({
      next: () => {
        this.success = 'Asignaciones guardadas correctamente';
        this.onUsuarioChange();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar asignaciones';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}

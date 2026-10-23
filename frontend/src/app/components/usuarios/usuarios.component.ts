import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfirmationService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AuthService, Usuario } from '../../services/auth.service';
import { PermisosComponent } from './permisos/permisos.component';
import { AsignacionSistemaComponent } from './asignacion-sistema/asignacion-sistema.component';
import { ApsxUsuarioComponent } from './apsx-usuario/apsx-usuario.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, DialogModule, PermisosComponent, AsignacionSistemaComponent, ApsxUsuarioComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  readonly estadoOptions = [
    { label: 'Activo', value: 1 },
    { label: 'Inactivo', value: 0 }
  ];
  usuarios: Usuario[] = [];
  selectedUsuario: Usuario | null = null;
  isEditing = false;
  showForm = false;
  error = '';
  success = '';
  loading = false;

  // Form fields
  nombre = '';
  apellido = '';
  correo = '';
  password = '';
  confirmPassword = '';
  estado = 1;
  nombreFilter = '';
  apellidoFilter = '';
  correoFilter = '';
  readonly pageSize = 15;
  readonly rowsPerPageOptions = [15, 30, 50, 100];
  showResetDialog = false;
  nuevaClave = '';

  // Legacy GestionUsuarios.vue: "Contiene" filters on apellidos, nombres and correo.
  get filteredUsuarios(): Usuario[] {
    const filtros: Array<[keyof Usuario, string]> = [
      ['SISU_APELLIDO', this.apellidoFilter],
      ['SISU_NOMBRE', this.nombreFilter],
      ['SISU_CORREO', this.correoFilter]
    ];
    const activos = filtros
      .map(([campo, valor]) => [campo, valor.trim().toLowerCase()] as const)
      .filter(([, term]) => term);
    if (!activos.length) return this.usuarios;
    return this.usuarios.filter(u =>
      activos.every(([campo, term]) => String(u[campo] ?? '').toLowerCase().includes(term))
    );
  }

  constructor(
    private authService: AuthService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.loading = true;
    this.authService.getAllUsers().subscribe({
      next: (usuarios: Usuario[]) => {
        this.usuarios = usuarios;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar usuarios';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openNewForm(): void {
    this.selectedUsuario = null;
    this.isEditing = false;
    this.showForm = true;
    this.clearForm();
  }

  editUsuario(usuario: Usuario): void {
    this.selectedUsuario = usuario;
    this.isEditing = true;
    this.showForm = true;

    // Paridad AS-IS: el viejo recarga el usuario por ID antes de editar.
    if (usuario.SISU_ID) {
      this.authService.getUserbyId(usuario.SISU_ID).subscribe({
        next: (resultado: Usuario[]) => {
          const usr = resultado.length > 0 ? resultado[0] : usuario;
          this.populateForm(usr);
        },
        error: () => {
          this.populateForm(usuario);
        }
      });
    } else {
      this.populateForm(usuario);
    }
  }

  private populateForm(usuario: Usuario): void {
    this.nombre = usuario.SISU_NOMBRE || '';
    this.apellido = usuario.SISU_APELLIDO || '';
    this.correo = usuario.SISU_CORREO || '';
    this.estado = usuario.SISU_ESTADO ?? 1;
    this.password = '';
    this.confirmPassword = '';
  }

  closeForm(): void {
    this.showForm = false;
    this.selectedUsuario = null;
    this.clearForm();
  }

  clearForm(): void {
    this.nombre = '';
    this.apellido = '';
    this.correo = '';
    this.password = '';
    this.confirmPassword = '';
    this.estado = 1;
    this.error = '';
    this.success = '';
  }

  saveUsuario(): void {
    if (!this.nombre || !this.apellido || !this.correo) {
      this.error = 'Complete los campos obligatorios';
      return;
    }

    if (!this.isEditing) {
      if (!this.password || !this.confirmPassword) {
        this.error = 'La contraseña y la confirmación son obligatorias';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.error = 'La clave y la confirmación no son iguales';
        return;
      }
    }

    this.loading = true;
    this.error = '';

    const usuarioData = {
      nombre: this.nombre,
      apellido: this.apellido,
      correo: this.correo,
      password: this.password,
      estado: this.estado
    };

    if (this.isEditing && this.selectedUsuario?.SISU_ID) {
      this.authService.updateUsuario({ ...usuarioData, id: this.selectedUsuario.SISU_ID }).subscribe({
        next: () => {
          this.success = 'Usuario actualizado correctamente';
          this.loadUsuarios();
          this.closeForm();
        },
        error: (err: any) => {
          this.error = err.error?.message || 'Error al actualizar usuario';
          this.loading = false;
        }
      });
    } else {
      if (!this.password) {
        this.error = 'La contraseña es obligatoria para nuevos usuarios';
        this.loading = false;
        return;
      }
      this.authService.registro(usuarioData).subscribe({
        next: () => {
          this.success = 'Usuario creado correctamente';
          this.loadUsuarios();
          this.closeForm();
        },
        error: (err: any) => {
          this.error = err.error?.message || 'Error al crear usuario';
          this.loading = false;
        }
      });
    }
  }

  resetPassword(usuario: Usuario): void {
    if (!usuario.SISU_ID) return;
    
    const sisuId = usuario.SISU_ID;

    this.confirmationService.confirm({
      header: 'Reiniciar contraseña',
      message: `¿Seguro que querés reiniciar la contraseña de ${usuario.SISU_NOMBRE} ${usuario.SISU_APELLIDO}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reiniciar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-warn',
      rejectButtonStyleClass: 'p-button-secondary p-button-text',
      accept: () => this.confirmarResetPassword(sisuId)
    });
  }

  private confirmarResetPassword(sisuId: number): void {
    this.loading = true;
    this.authService.resetPass(sisuId).subscribe({
      next: (newPass: string) => {
        this.nuevaClave = newPass;
        this.showResetDialog = true;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al resetear contraseña';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeResetDialog(): void {
    this.showResetDialog = false;
    this.nuevaClave = '';
  }

  toggleEstado(usuario: Usuario): void {
    if (!usuario.SISU_ID) return;

    const nuevoEstado = usuario.SISU_ESTADO === 1 ? 0 : 1;
    this.authService.updateUsuario({
      id: usuario.SISU_ID,
      nombre: usuario.SISU_NOMBRE,
      apellido: usuario.SISU_APELLIDO,
      correo: usuario.SISU_CORREO,
      estado: nuevoEstado
    }).subscribe({
      next: () => {
        usuario.SISU_ESTADO = nuevoEstado;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cambiar estado';
        this.cdr.detectChanges();
      }
    });
  }
}

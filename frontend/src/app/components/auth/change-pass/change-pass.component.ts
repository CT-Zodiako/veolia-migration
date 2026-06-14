import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-change-pass',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './change-pass.component.html',
  styleUrls: ['./change-pass.component.css']
})
export class ChangePassComponent {
  oldPass = '';
  newPass = '';
  confirmPass = '';
  error = '';
  success = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  changePassword(): void {
    if (!this.oldPass || !this.newPass || !this.confirmPass) {
      this.error = 'Complete todos los campos';
      return;
    }

    if (this.newPass !== this.confirmPass) {
      this.error = 'Las contraseñas nuevas no coinciden';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.changePass(this.oldPass, this.newPass, this.confirmPass).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.success = 'Contraseña actualizada correctamente';
          setTimeout(() => this.router.navigate(['/']), 2000);
        } else {
          this.error = response.msg || 'Error al cambiar contraseña';
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error de conexión';
        this.loading = false;
      }
    });
  }
}

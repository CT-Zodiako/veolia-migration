import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, Sistema } from '../../../services/auth.service';
import { AuthState } from '../../../state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  idSistema: number | null = null;
  sistemas: Sistema[] = [];
  error = '';
  loading = false;

  // Inyección moderna
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  // Exponer estado para el template (signals)
  get authLoading() { return this.authState.loading(); }
  get authError() { return this.authState.error(); }

  onEmailChange(): void {
    if (this.email.length > 3) {
      this.authService.getSistemasByCorreo(this.email).subscribe({
        next: (sistemas: Sistema[]) => {
          this.sistemas = sistemas;
          if (sistemas.length === 1) {
            this.idSistema = sistemas[0].SIST_ID;
          }
        },
        error: () => {
          this.sistemas = [];
        }
      });
    }
  }

  login(): void {
    if (!this.email || !this.password || !this.idSistema) {
      this.error = 'Complete todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login({
      correo: this.email,
      pass: this.password,
      idSistema: this.idSistema
    }).subscribe({
      next: (response: any) => {
        if (response.auth_token) {
          // Guardar en localStorage (para persistencia)
          localStorage.setItem('jwtOken', response.auth_token);
          localStorage.setItem('usuario', JSON.stringify(response.usuario));
          localStorage.setItem('sistema', JSON.stringify(response.sistema));
          
          // El estado ya se actualizó en el servicio
          this.router.navigate(['/']);
        } else {
          this.error = response.message || 'Error en login';
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error de conexión';
        this.loading = false;
      }
    });
  }
}

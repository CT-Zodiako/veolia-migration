import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, Sistema } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ...CommonPrimeNgModules],
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
  validating = false;
  credentialsValidated = false;
  showSistemaDialog = false;
  private validationVersion = 0;
  private readonly destroyRef = inject(DestroyRef);

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private isValidEmail(email: string): boolean {
    // eslint-disable-next-line no-useless-escape
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  onCredentialsChange(): void {
    this.validationVersion++;
    this.credentialsValidated = false;
    this.validating = false;
    this.sistemas = [];
    this.idSistema = null;
    this.error = '';
  }

  onPasswordChange(): void {
    this.onCredentialsChange();
  }

  validateCredentials(): void {
    if (this.loading || this.validating || this.credentialsValidated) return;
    this.onCredentialsChange();
    if (!this.isValidEmail(this.email) || !this.password) return;

    const version = this.validationVersion;
    this.validating = true;
    this.authService.validateCredentials(this.email, this.password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version === this.validationVersion) this.validating = false;
        })
      )
      .subscribe({
        next: (sistemas: Sistema[]) => {
          if (version !== this.validationVersion) return;
          this.validating = false;
          this.credentialsValidated = true;
          this.sistemas = sistemas;
          this.idSistema = sistemas.length === 1 ? sistemas[0].SIST_ID : null;
          if (!sistemas.length) {
            this.error = 'No tiene sistemas activos asignados';
          } else {
            this.showSistemaDialog = true;
          }
        },
        error: (err) => {
          if (version !== this.validationVersion) return;
          this.validating = false;
          this.error = err.status === 401 ? 'Usuario o Pass Incorrecto' : 'Error de conexión';
        }
      });
  }

  openSistemaDialog(): void {
    if (this.credentialsValidated && this.sistemas.length > 0) {
      this.showSistemaDialog = true;
    }
  }

  login(): void {
    this.error = '';

    if (this.loading || this.validating) return;

    if (!this.credentialsValidated || !this.email || !this.password ||
        !this.sistemas.some(sistema => sistema.SIST_ID === this.idSistema)) {
      this.error = 'Complete todos los campos';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.error = 'El email no es válido';
      return;
    }

    this.loading = true;

    this.authService.login({
      correo: this.email,
      pass: this.password,
      idSistema: this.idSistema!
    }).subscribe({
      next: (response: any) => {
        this.loading = false;

        if (response.auth_token) {
          localStorage.setItem('jwtOken', response.auth_token);
          localStorage.setItem('usuario', JSON.stringify(response.usuario));
          localStorage.setItem('sistema', JSON.stringify(response.sistema));
          this.router.navigate(['/']);
        } else {
          this.error = response.message || 'Error en login';
        }
      },
      error: (err: any) => {
        this.loading = false;

        if (err.status === 401) {
          this.showSistemaDialog = false;
          this.onCredentialsChange();
          this.error = 'Usuario o Pass Incorrecto';
          this.password = '';
        } else if (err.status === 404) {
          this.showSistemaDialog = false;
          this.onCredentialsChange();
          this.error = 'Usuario no existe o inactivo';
          this.email = '';
          this.password = '';
          this.sistemas = [];
          this.idSistema = null;
        } else {
          this.error = err.error?.message || 'Error de conexión';
        }
      }
    });
  }
}

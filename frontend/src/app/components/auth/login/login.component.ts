import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, Sistema } from '../../../services/auth.service';

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
  validating = false;
  credentialsValidated = false;
  showSistemas = false;
  emailConfirmed = false;
  private validationVersion = 0;
  @ViewChild('emailInput') private emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;
  @ViewChild('systemOptions') private systemOptions?: ElementRef<HTMLElement>;
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private isValidEmail(email: string): boolean {
    // eslint-disable-next-line no-useless-escape
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }

  /** One question per screen (design/login-dinamico/02-conversacional.html): 1 email, 2 password, 3 system. */
  get step(): 1 | 2 | 3 {
    if (this.showSistemas) return 3;
    return this.emailConfirmed && this.email ? 2 : 1;
  }

  get nombre(): string {
    const first = this.email.split('@')[0].split(/[._-]/)[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }

  nextFromEmail(): void {
    this.error = '';
    if (!this.email) {
      this.error = 'El email es obligatorio';
    } else if (!this.isValidEmail(this.email)) {
      this.error = 'El email no es valido';
    } else {
      this.emailConfirmed = true;
    }
    this.focusStep();
  }

  backToEmail(): void {
    this.onCredentialsChange();
    this.password = '';
    this.emailConfirmed = false;
    this.focusStep();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.step !== 3 || this.loading || event.ctrlKey || event.metaKey || event.altKey || !/^[1-9]$/.test(event.key)) return;
    const sistema = this.sistemas[Number(event.key) - 1];
    if (!sistema) return;
    event.preventDefault();
    this.selectSistema(sistema.SIST_ID);
  }

  private focusStep(): void {
    setTimeout(() => {
      const target = this.step === 1 ? this.emailInput?.nativeElement
        : this.step === 2 ? this.passwordInput?.nativeElement
        : this.systemOptions?.nativeElement.querySelector('button');
      target?.focus();
    });
  }

  onCredentialsChange(): void {
    this.validationVersion++;
    this.showSistemas = false;
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
    if (this.loading || this.validating) return;
    if (this.credentialsValidated) {
      this.showSistemasStep();
      return;
    }
    this.onCredentialsChange();
    // Legacy Login.vue:114-120 lists the missing fields; Login.vue:111-112 rejects an invalid email.
    const errores: string[] = [];
    if (!this.email) errores.push('El email es obligatorio');
    if (!this.password) errores.push('El pass es obligatorio');
    if (!errores.length && !this.isValidEmail(this.email)) errores.push('El email no es valido');
    this.emailConfirmed = !!this.email && this.isValidEmail(this.email);
    if (errores.length) {
      this.error = errores.join('\n');
      this.focusStep();
      return;
    }

    const version = this.validationVersion;
    this.validating = true;
    this.authService.validateCredentials(this.email, this.password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version !== this.validationVersion || this.destroyRef.destroyed) return;
          this.validating = false;
          this.changeDetectorRef.markForCheck();
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
            this.showSistemas = true;
          }
          this.changeDetectorRef.markForCheck();
          this.focusStep();
        },
        error: (err) => {
          if (version !== this.validationVersion) return;
          this.validating = false;
          this.showSistemas = false;
          this.error = err.status === 401 ? 'Usuario o Pass Incorrecto' : 'Error de conexión';
          this.changeDetectorRef.markForCheck();
          this.focusStep();
        }
      });
  }

  showSistemasStep(): void {
    if (this.credentialsValidated && this.sistemas.length > 0) {
      this.showSistemas = true;
      this.focusStep();
    }
  }

  selectSistema(idSistema: number): void {
    if (this.loading || !this.credentialsValidated) return;
    this.idSistema = idSistema;
    this.login();
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
          this.onCredentialsChange();
          this.error = 'Usuario o Pass Incorrecto';
          this.password = '';
          this.focusStep();
        } else if (err.status === 404) {
          this.onCredentialsChange();
          this.error = 'Usuario no existe o inactivo';
          this.email = '';
          this.password = '';
          this.sistemas = [];
          this.idSistema = null;
          this.emailConfirmed = false;
          this.focusStep();
        } else {
          this.error = err.error?.message || 'Error de conexión';
        }
      }
    });
  }
}

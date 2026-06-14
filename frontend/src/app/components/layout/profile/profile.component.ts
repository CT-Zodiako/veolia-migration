import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService } from '../../../services/auth.service';
import { AuthState } from '../../../state';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  showDropdown = false;

  // Inyección moderna
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);

  // Signals directos para el template
  readonly userName = this.authState.userFullName;
  readonly user = this.authState.user;

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  logout(): void {
    const token = localStorage.getItem('jwtOken');
    if (token) {
      this.authService.logout(token).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  private clearSession(): void {
    this.authState.clearSession();
    localStorage.removeItem('jwtOken');
    localStorage.removeItem('usuario');
    localStorage.removeItem('sistema');
    this.router.navigate(['/login']);
  }

  goToChangePass(): void {
    this.showDropdown = false;
    this.router.navigate(['/cambiar-clave']);
  }
}

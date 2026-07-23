import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Title } from '@angular/platform-browser';
import { AuthState } from './state/auth.state';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule],
  template: '<p-toast position="top-right"></p-toast><p-confirmDialog></p-confirmDialog><router-outlet></router-outlet>'
})
export class AppComponent {
  private readonly titleService = inject(Title);
  private readonly authState = inject(AuthState);
  private readonly themeService = inject(ThemeService);

  constructor() {
    effect(() => {
      const sistema = this.authState.sistema();
      this.titleService.setTitle(sistema ? `Veolia - ${sistema.SIST_NOMBRE}` : 'Veolia');
    });
  }
}

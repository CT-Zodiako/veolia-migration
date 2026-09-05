import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Title } from '@angular/platform-browser';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule],
  template: '<p-toast position="top-right"></p-toast><p-confirmDialog></p-confirmDialog><router-outlet></router-outlet>'
})
export class AppComponent {
  private readonly titleService = inject(Title);
  private readonly themeService = inject(ThemeService);

  constructor() {
    this.titleService.setTitle('Sistema Uno');
  }
}

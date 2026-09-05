import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ErrorHandler } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authTokenInterceptor } from './app/interceptors/auth-token.interceptor';
import { httpErrorInterceptor } from './app/interceptors/http-error.interceptor';
import { GlobalErrorHandler } from './app/interceptors/global-error-handler';

// Escala tonal derivada del azul de marca (#2563eb), anclado en el paso 600.
const BrandPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    }
  }
});

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
    provideRouter(routes),
    provideAnimationsAsync(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    MessageService,
    ConfirmationService,
    providePrimeNG({
      theme: {
        preset: BrandPreset,
        options: {
          darkModeSelector: '.app-dark'
        }
      }
    })
  ]
}).catch((err) => console.error(err));

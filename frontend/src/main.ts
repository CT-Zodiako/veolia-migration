import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
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

// Escala tonal derivada del rojo de marca Veolia (#f10400), anclado en el paso 600.
const VeoliaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff2f2',
      100: '#ffe6e5',
      200: '#ffcdcc',
      300: '#ffa5a3',
      400: '#ff6966',
      500: '#ff2a26',
      600: '#f10400',
      700: '#c40300',
      800: '#9c0300',
      900: '#780200',
      950: '#4a0100'
    }
  }
});

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
    provideRouter(routes),
    provideAnimationsAsync(),
    MessageService,
    ConfirmationService,
    providePrimeNG({
      theme: {
        preset: VeoliaPreset,
        options: {
          darkModeSelector: '.app-dark'
        }
      }
    })
  ]
}).catch((err) => console.error(err));

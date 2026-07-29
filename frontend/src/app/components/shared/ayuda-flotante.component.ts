import { Component, DestroyRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { AyudaService } from '../../services/ayuda.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-ayuda-flotante',
  standalone: true,
  imports: [CommonModule, DialogModule, MenuModule, IconComponent],
  templateUrl: './ayuda-flotante.component.html',
  styleUrl: './ayuda-flotante.component.css'
})
export class AyudaFlotanteComponent {
  @ViewChild('menuSoporte') menuSoporte!: Menu;

  readonly ayudaService = inject(AyudaService);
  readonly mostrarFlyoutForzado = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.ayudaService.solicitudMenuSoporte$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.menuSoporte.toggle(event));
  }

  toggleFlyout(): void {
    this.mostrarFlyoutForzado.update(v => !v);
  }

  abrirDocumentacion(): void {
    this.ayudaService.abrirDocumentacion();
    this.mostrarFlyoutForzado.set(false);
  }

  abrirMenuSoporte(event: Event): void {
    this.menuSoporte.toggle(event);
    this.mostrarFlyoutForzado.set(false);
  }
}

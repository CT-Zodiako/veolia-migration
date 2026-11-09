import { Component, DestroyRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { AyudaService } from '../../services/ayuda.service';

@Component({
  selector: 'app-ayuda-flotante',
  standalone: true,
  imports: [MenuModule],
  templateUrl: './ayuda-flotante.component.html'
})
export class AyudaFlotanteComponent {
  @ViewChild('menuSoporte', { static: true }) menuSoporte!: Menu;

  readonly ayudaService = inject(AyudaService);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.ayudaService.solicitudMenuSoporte$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.menuSoporte.toggle(event));
  }
}

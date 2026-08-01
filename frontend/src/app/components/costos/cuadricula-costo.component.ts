import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CostoItem } from '../../models/costos.models';

/**
 * Paleta fija de 10 colores heredada del legacy (CuadriculaCosto.vue), aplicada
 * por índice `% 10`. Son fondos de tarjeta de marca fijos: NO cambian con el
 * modo oscuro (misma categoría que el rojo de marca #f10400).
 */
export const CARD_COSTO_COLORS = [
  '#0d5ba8',
  '#db0000',
  '#83db00',
  '#ebc22f',
  '#9b00de',
  '#2ea39d',
  '#27b800',
  '#72a32e',
  '#ff028c',
  '#d6b20f'
];

@Component({
  selector: 'app-cuadricula-costo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cuadricula-costo" *ngIf="costos.length">
      <div
        class="tarjeta-costo"
        *ngFor="let item of costos; let i = index"
        [style.background-color]="cardColor(i)"
        [class.tarjeta-clickeable]="item.nomCosto === 'CLUS'"
        (click)="onCardClick(item)"
      >
        <span class="tarjeta-titulo">{{ item.nomCosto }}</span>
        <h3 class="tarjeta-valor">{{ (item.valor ?? 0) | number:'1.0-2' }}</h3>
        <small class="tarjeta-variacion">% {{ ((item.variacion ?? 0) * 100) | number:'1.0-2' }}</small>
      </div>
    </div>
  `,
  styles: [`
    .cuadricula-costo {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .tarjeta-costo {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      min-width: 9rem;
      padding: 0.75rem;
      border-radius: 10px;
      color: #faf9fa;
      cursor: default;
    }
    .tarjeta-clickeable { cursor: pointer; }
    .tarjeta-titulo { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.02em; }
    .tarjeta-valor { margin: 0; font-size: 1.4rem; }
    .tarjeta-variacion { opacity: 0.9; }
  `]
})
export class CuadriculaCostoComponent {
  @Input() costos: CostoItem[] = [];

  constructor(private readonly router: Router) {}

  cardColor(index: number): string {
    return CARD_COSTO_COLORS[index % CARD_COSTO_COLORS.length];
  }

  onCardClick(item: CostoItem): void {
    if (item.nomCosto !== 'CLUS') {
      return;
    }
    this.router.navigate(['/costo-clus'], { queryParamsHandling: 'preserve' });
  }
}

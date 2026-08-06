import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CostoItem } from '../../models/costos.models';

/**
 * Paleta fija de 10 colores heredada del legacy (CuadriculaCosto.vue), aplicada
 * por índice `% 10` como acento (franja superior) de cada tarjeta. Son colores
 * de marca fijos: NO cambian con el modo oscuro (misma categoría que el rojo
 * de marca #f10400).
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
        [style.border-top-color]="cardColor(i)"
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
      gap: 1rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .tarjeta-costo {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      flex: 0 0 9.5rem;
      width: 9.5rem;
      height: 7rem;
      padding: 1rem 0.75rem;
      border-radius: 10px;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-top-width: 4px;
      border-top-style: solid;
      color: var(--color-text-primary);
      cursor: default;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .tarjeta-clickeable { cursor: pointer; }
    .tarjeta-clickeable:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
    }
    .tarjeta-titulo { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-secondary); text-align: center; line-height: 1.2; }
    .tarjeta-valor { margin: 0; font-size: 1.6rem; font-weight: 700; letter-spacing: -0.01em; color: var(--color-text-primary); }
    .tarjeta-variacion { font-size: 0.75rem; color: var(--color-text-muted); letter-spacing: 0.01em; }
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

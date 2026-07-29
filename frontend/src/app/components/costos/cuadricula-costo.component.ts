import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CostoItem } from '../../models/costos.models';

@Component({
  selector: 'app-cuadricula-costo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cuadricula-costo" *ngIf="costos.length">
      <div class="tarjeta-costo" *ngFor="let item of costos">
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
      background: linear-gradient(135deg, #c40300, #780200);
      color: #faf9fa;
    }
    .tarjeta-titulo { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.02em; }
    .tarjeta-valor { margin: 0; font-size: 1.4rem; }
    .tarjeta-variacion { opacity: 0.9; }
  `]
})
export class CuadriculaCostoComponent {
  @Input() costos: CostoItem[] = [];
}

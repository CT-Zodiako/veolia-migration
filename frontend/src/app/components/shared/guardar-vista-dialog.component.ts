import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';

@Component({
  selector: 'app-guardar-vista-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ...CommonPrimeNgModules],
  template: `
    <p-dialog
      header="Guardar vista"
      [modal]="true"
      [visible]="visible"
      (visibleChange)="onVisibleChange($event)"
      [style]="{ width: '26rem' }"
    >
      <div class="campo">
        <label>Nombre de la vista</label>
        <input
          pInputText
          type="text"
          [(ngModel)]="nombre"
          (keydown.enter)="confirmar()"
          placeholder="Ej: Solo lo esencial"
          class="w-full"
          autofocus
        />
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (click)="cerrar()"></p-button>
        <p-button label="Guardar" icon="pi pi-bookmark" [disabled]="!nombre.trim()" (click)="confirmar()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .campo { margin-bottom: 8px; }
    .campo label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--color-text-body); }
  `]
})
export class GuardarVistaDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() guardar = new EventEmitter<string>();

  nombre = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      this.nombre = '';
    }
  }

  onVisibleChange(visible: boolean): void {
    this.visible = visible;
    this.visibleChange.emit(visible);
  }

  cerrar(): void {
    this.onVisibleChange(false);
  }

  confirmar(): void {
    const nombreLimpio = this.nombre.trim();
    if (!nombreLimpio) {
      return;
    }

    this.guardar.emit(nombreLimpio);
    this.cerrar();
  }
}

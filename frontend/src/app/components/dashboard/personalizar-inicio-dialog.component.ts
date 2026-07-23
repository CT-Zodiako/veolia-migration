import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { SidebarMenuItem } from '../../services/sidebar-menu.service';

@Component({
  selector: 'app-personalizar-inicio-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ...CommonPrimeNgModules],
  template: `
    <p-dialog
      header="Personalizar accesos de Inicio"
      [modal]="true"
      [visible]="visible"
      (visibleChange)="onVisibleChange($event)"
      [style]="{ width: '30rem' }"
    >
      <div class="campo">
        <div class="opciones-header">
          <label>Accesos disponibles ({{ seleccionados.length }} de {{ disponibles.length }})</label>
          <div class="opciones-acciones">
            <a (click)="seleccionarTodas()">Todas</a>
            <a (click)="seleccionarNinguna()">Ninguna</a>
          </div>
        </div>
        <div class="opciones-grid">
          <div class="opcion-check" *ngFor="let item of disponibles">
            <p-checkbox
              [binary]="true"
              [ngModel]="estaSeleccionado(item)"
              (onChange)="toggle(item)"
              [inputId]="'acceso-' + item.path"
            ></p-checkbox>
            <label [for]="'acceso-' + item.path">{{ item.icon }} {{ item.label }}</label>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (click)="cerrar()"></p-button>
        <p-button label="Guardar" icon="pi pi-check" (click)="confirmar()"></p-button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .campo { margin-bottom: 8px; }
    .opciones-header label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--color-text-body); }

    .opciones-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .opciones-acciones {
      display: flex;
      gap: 12px;
    }

    .opciones-acciones a {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-brand-accent);
      cursor: pointer;
    }

    .opciones-acciones a:hover {
      text-decoration: underline;
    }

    .opciones-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      max-height: 320px;
      overflow-y: auto;
      margin-top: 10px;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
    }

    .opcion-check {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .opcion-check label {
      margin: 0;
      font-size: 13px;
      font-weight: 400;
      color: var(--color-text-body);
      cursor: pointer;
    }
  `]
})
export class PersonalizarInicioDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() disponibles: SidebarMenuItem[] = [];
  @Input() seleccionadosIniciales: string[] = [];

  @Output() guardar = new EventEmitter<string[]>();

  seleccionados: SidebarMenuItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      const iniciales = new Set(this.seleccionadosIniciales);
      this.seleccionados = this.disponibles.filter(item => iniciales.has(item.path));
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
    this.guardar.emit(this.seleccionados.map(item => item.path));
    this.cerrar();
  }

  estaSeleccionado(item: SidebarMenuItem): boolean {
    return this.seleccionados.some(s => s.path === item.path);
  }

  toggle(item: SidebarMenuItem): void {
    this.seleccionados = this.estaSeleccionado(item)
      ? this.seleccionados.filter(s => s.path !== item.path)
      : [...this.seleccionados, item];
  }

  seleccionarTodas(): void {
    this.seleccionados = [...this.disponibles];
  }

  seleccionarNinguna(): void {
    this.seleccionados = [];
  }
}

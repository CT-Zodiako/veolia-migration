import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarMenuItem } from '../../services/sidebar-menu.service';

/** Permitted menu option offered on Inicio, with the menu group it belongs to. */
export interface AccesoInicio extends SidebarMenuItem {
  grupo: string;
}

/** Side panel next to the Inicio shortcuts where the user picks which pages appear there. */
@Component({
  selector: 'app-personalizar-inicio-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="panel" aria-labelledby="personalizar-titulo">
      <header class="panel-header">
        <h3 id="personalizar-titulo">Personalizar accesos</h3>
        <p>Marque las páginas que quiere ver en Inicio.</p>
        <div class="opciones-acciones">
          <span>{{ seleccionados.length }} de {{ disponibles.length }}</span>
          <a (click)="seleccionarTodas()">Todas</a>
          <a (click)="seleccionarNinguna()">Ninguna</a>
        </div>
      </header>

      <div class="opciones">
        <label class="opcion-check" *ngFor="let item of disponibles">
          <input type="checkbox" [checked]="estaSeleccionado(item)" (change)="toggle(item)" />
          <span class="opcion-texto">
            <span class="opcion-titulo">{{ item.label }}</span>
            <span class="opcion-grupo">{{ item.grupo }}</span>
          </span>
        </label>
      </div>

      <footer class="panel-footer">
        <button type="button" class="btn-outline" (click)="cerrar()">Cancelar</button>
        <button type="button" class="btn-primario" (click)="confirmar()">Guardar</button>
      </footer>
    </aside>
  `,
  styles: [`
    :host { display: block; }

    .panel {
      background: var(--color-bg-card);
      border: 1px solid #e1e6ee;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(11, 31, 58, 0.08);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 200px);
    }

    :host-context(.app-dark) .panel { border-color: var(--color-border); box-shadow: none; }

    .panel-header {
      padding: 20px 20px 12px;
      border-bottom: 1px solid var(--color-border);
    }

    .panel-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .panel-header p {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .opciones-acciones {
      display: flex;
      gap: 12px;
      margin-top: 10px;
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .opciones-acciones span { margin-right: auto; }

    .opciones-acciones a {
      font-weight: 600;
      color: #16335a;
      cursor: pointer;
    }

    :host-context(.app-dark) .opciones-acciones a { color: #9fb6d9; }

    .opciones-acciones a:hover { text-decoration: underline; }

    .opciones {
      overflow-y: auto;
      padding: 8px 12px;
    }

    .opcion-check {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
    }

    .opcion-check:hover { background: var(--color-bg-soft); }

    .opcion-check input {
      width: 16px;
      height: 16px;
      margin: 0;
      accent-color: #16335a;
      flex-shrink: 0;
      cursor: pointer;
    }

    :host-context(.app-dark) .opcion-check input { accent-color: #9fb6d9; }

    .opcion-texto {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .opcion-titulo {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .opcion-grupo {
      font-size: 12px;
      color: var(--color-text-secondary);
    }

    .panel-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 14px 20px;
      border-top: 1px solid var(--color-border);
    }

    .btn-outline,
    .btn-primario {
      height: 38px;
      padding: 0 16px;
      border-radius: 8px;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-outline {
      background: var(--color-bg-card);
      border: 1px solid #c5cedb;
      color: var(--color-text-primary);
    }

    :host-context(.app-dark) .btn-outline { border-color: var(--color-border); }

    .btn-primario {
      background: #c4262e;
      border: 1px solid #c4262e;
      color: #fff;
    }

    .btn-primario:hover { background: #a81f26; }
  `]
})
export class PersonalizarInicioDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() disponibles: AccesoInicio[] = [];
  @Input() seleccionadosIniciales: string[] = [];

  @Output() guardar = new EventEmitter<string[]>();

  seleccionados: AccesoInicio[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['visible'] || changes['disponibles'] || changes['seleccionadosIniciales']) && this.visible) {
      const iniciales = new Set(this.seleccionadosIniciales);
      this.seleccionados = this.disponibles.filter(item => iniciales.has(item.path));
    }
  }

  cerrar(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  confirmar(): void {
    this.guardar.emit(this.seleccionados.map(item => item.path));
    this.cerrar();
  }

  estaSeleccionado(item: AccesoInicio): boolean {
    return this.seleccionados.some(s => s.path === item.path);
  }

  toggle(item: AccesoInicio): void {
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

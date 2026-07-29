import { Component, Input } from '@angular/core';

/** Nombres soportados por <app-icon>, en el mismo kebab-case usado por
 *  sidebar-menu.service.ts (routeCatalog[].icon / iconMap). Cada nombre
 *  corresponde a un archivo `public/emoji/<name>.svg` (Twemoji, self-hosted
 *  para que se vea igual en cualquier SO/navegador). Agregar un ícono nuevo
 *  implica sumar el .svg a `public/emoji/` con ese mismo nombre de archivo. */
export type IconName =
  | 'home' | 'settings' | 'building-2' | 'users' | 'calculator' | 'file-text'
  | 'folder-open' | 'recycle' | 'newspaper' | 'calendar-days' | 'refresh-cw'
  | 'notepad-text' | 'repeat' | 'clock' | 'inbox' | 'archive' | 'puzzle'
  | 'mailbox' | 'monitor' | 'library' | 'globe' | 'receipt' | 'award'
  | 'construction' | 'trash-2' | 'circle-check' | 'wallet' | 'telescope'
  | 'hourglass' | 'sprout' | 'target' | 'handshake' | 'pen-line' | 'truck'
  | 'scale' | 'chart-line' | 'search' | 'file-pen-line' | 'map-pin'
  | 'sliders-horizontal' | 'percent' | 'shuffle' | 'tree-pine' | 'upload'
  | 'map' | 'banknote' | 'gift' | 'compass' | 'trees' | 'wrench'
  | 'search-check' | 'flask-conical' | 'microscope' | 'file'
  | 'drafting-compass' | 'ruler' | 'trending-down' | 'trending-up' | 'hash'
  | 'signal-high' | 'package' | 'zap' | 'store' | 'factory' | 'file-stack'
  | 'clipboard-list' | 'folder';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <img
      [src]="'emoji/' + name + '.svg'"
      [style.width.px]="size"
      [style.height.px]="size"
      [alt]="name"
      (error)="onError($event)"
    />
  `
})
export class IconComponent {
  @Input({ required: true }) name!: string;
  @Input() size = 18;

  onError(event: Event): void {
    (event.target as HTMLImageElement).src = 'emoji/folder.svg';
  }
}

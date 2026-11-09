import { ChangeDetectorRef, Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AuthService, MenuPermission } from '../../services/auth.service';
import { AuthState } from '../../state/auth.state';
import { SidebarMenuService } from '../../services/sidebar-menu.service';
import { AyudaService } from '../../services/ayuda.service';
import { AccesoInicio, PersonalizarInicioDialogComponent } from './personalizar-inicio-dialog.component';

interface DashboardCard {
  title: string;
  grupo: string;
  route: string;
  lineIcon: string;
}

const ACCESOS_POR_DEFECTO = ['/usuarios', '/aps-usuario', '/asignacion-sistema', '/menu-usuario'];

/** Same line style as the navy sidebar: PrimeIcons equivalent of each menu option's icon name
 *  (sidebar-menu.service.ts routeCatalog[].icon). Unknown names fall back to the option's group icon. */
const LINE_ICON_POR_NOMBRE: Record<string, string> = {
  'home': 'pi-home', 'settings': 'pi-cog', 'building-2': 'pi-building', 'users': 'pi-users',
  'calculator': 'pi-calculator', 'file-text': 'pi-file', 'folder-open': 'pi-folder-open', 'recycle': 'pi-refresh',
  'newspaper': 'pi-book', 'calendar-days': 'pi-calendar', 'refresh-cw': 'pi-refresh', 'notepad-text': 'pi-file-edit',
  'repeat': 'pi-replay', 'clock': 'pi-clock', 'inbox': 'pi-inbox', 'archive': 'pi-box', 'puzzle': 'pi-th-large',
  'mailbox': 'pi-envelope', 'monitor': 'pi-desktop', 'library': 'pi-book', 'globe': 'pi-globe',
  'receipt': 'pi-receipt', 'award': 'pi-verified', 'construction': 'pi-wrench', 'trash-2': 'pi-trash',
  'circle-check': 'pi-check-circle', 'wallet': 'pi-wallet', 'telescope': 'pi-eye', 'hourglass': 'pi-hourglass',
  'sprout': 'pi-sun', 'target': 'pi-bullseye', 'handshake': 'pi-thumbs-up', 'pen-line': 'pi-pencil',
  'truck': 'pi-truck', 'scale': 'pi-sliders-v', 'chart-line': 'pi-chart-line', 'search': 'pi-search',
  'file-pen-line': 'pi-file-edit', 'map-pin': 'pi-map-marker', 'sliders-horizontal': 'pi-sliders-h',
  'percent': 'pi-percentage', 'shuffle': 'pi-arrow-right-arrow-left', 'tree-pine': 'pi-sun', 'upload': 'pi-upload',
  'map': 'pi-map', 'banknote': 'pi-money-bill', 'gift': 'pi-gift', 'compass': 'pi-compass', 'trees': 'pi-sun',
  'wrench': 'pi-wrench', 'search-check': 'pi-check-square', 'flask-conical': 'pi-filter',
  'microscope': 'pi-search-plus', 'file': 'pi-file', 'drafting-compass': 'pi-pencil', 'ruler': 'pi-arrows-h',
  'trending-down': 'pi-arrow-down-right', 'trending-up': 'pi-arrow-up-right', 'hash': 'pi-hashtag',
  'signal-high': 'pi-chart-bar', 'package': 'pi-box', 'zap': 'pi-bolt', 'store': 'pi-shop',
  'factory': 'pi-building', 'file-stack': 'pi-copy', 'clipboard-list': 'pi-list', 'folder': 'pi-folder'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DragDropModule,
    ...CommonPrimeNgModules,
    PersonalizarInicioDialogComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  cards: DashboardCard[] = [];
  cardPaths: string[] = [];
  disponibles: AccesoInicio[] = [];
  mostrarPersonalizar = false;

  constructor(
    private readonly authService: AuthService,
    private readonly authState: AuthState,
    private readonly sidebarMenuService: SidebarMenuService,
    readonly ayudaService: AyudaService,
    private readonly cdr: ChangeDetectorRef
  ) {
    effect(() => {
      this.cargarMenu(this.authState.sistemaId());
    });
  }

  private cargarMenu(idSistema: number | null): void {
    if (!idSistema) {
      this.disponibles = [];
      this.aplicarSeleccion([]);
      this.cdr.detectChanges();
      return;
    }

    forkJoin({
      permissions: this.authService.getUserMenu(),
      menuTree: this.authService.getGeneralMenuTree(idSistema)
    }).subscribe({
      next: ({ permissions, menuTree }: { permissions: MenuPermission[]; menuTree: any[] }) => {
        const permittedMenuIds = new Set((permissions || []).map(item => item.MENU_ID));
        this.disponibles = this.accesosConGrupo(menuTree, permittedMenuIds);
        this.aplicarSeleccion(this.cargarSeleccionGuardada());
        this.cdr.detectChanges();
      },
      error: () => {
        this.disponibles = [];
        this.cdr.detectChanges();
      }
    });
  }

  guardarSeleccion(paths: string[]): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(paths));
    this.aplicarSeleccion(paths);
    this.cdr.detectChanges();
  }

  /** Same permitted, de-duplicated options as the sidebar, keeping the menu group each one comes from
   *  (shown as the card subtitle). */
  private accesosConGrupo(menuTree: any[], permittedMenuIds: Set<number>): AccesoInicio[] {
    const vistos = new Set<string>();
    const accesos: AccesoInicio[] = [];
    for (const group of this.sidebarMenuService.buildMenuGroups(menuTree, permittedMenuIds)) {
      for (const item of group.children) {
        if (item.path === '/' || vistos.has(item.path)) continue;
        vistos.add(item.path);
        accesos.push({ ...item, grupo: group.label });
      }
    }
    return accesos;
  }

  trackByRoute(_index: number, card: DashboardCard): string {
    return card.route;
  }

  onDrop(event: CdkDragDrop<DashboardCard[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    moveItemInArray(this.cards, event.previousIndex, event.currentIndex);
    const paths = this.cards.map(card => card.route);
    localStorage.setItem(this.storageKey(), JSON.stringify(paths));
    this.aplicarSeleccion(paths);
    this.cdr.detectChanges();
  }

  private aplicarSeleccion(paths: string[]): void {
    this.cards = this.construirTarjetas(paths);
    this.cardPaths = this.cards.map(card => card.route);
  }

  private storageKey(): string {
    const sisuId = this.authState.user()?.SISU_ID ?? 'anonimo';
    const idSistema = this.authState.sistemaId() ?? 'sin-sistema';
    return `dashboard:accesos:${sisuId}:${idSistema}`;
  }

  private cargarSeleccionGuardada(): string[] {
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Preferencia corrupta o inexistente: seguir con el default.
    }

    const disponiblesPaths = new Set(this.disponibles.map(item => item.path));
    const defaultDisponible = ACCESOS_POR_DEFECTO.filter(path => disponiblesPaths.has(path));
    return defaultDisponible.length > 0 ? defaultDisponible : this.disponibles.slice(0, 4).map(item => item.path);
  }

  private construirTarjetas(paths: string[]): DashboardCard[] {
    const porPath = new Map(this.disponibles.map(item => [item.path, item]));

    return paths
      .map(path => porPath.get(path))
      .filter((item): item is AccesoInicio => !!item)
      .map((item) => ({
        title: item.label,
        grupo: item.grupo,
        route: item.path,
        lineIcon: 'pi ' + (LINE_ICON_POR_NOMBRE[item.icon] ?? this.sidebarMenuService.lineIcon(item.grupo))
      }));
  }
}

import { ChangeDetectorRef, Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AuthService, MenuPermission } from '../../services/auth.service';
import { AuthState } from '../../state/auth.state';
import { SidebarMenuService, SidebarMenuItem } from '../../services/sidebar-menu.service';
import { PersonalizarInicioDialogComponent } from './personalizar-inicio-dialog.component';

interface DashboardCard {
  title: string;
  route: string;
  icon: string;
  color: string;
}

const PALETA_ROJOS = ['#f10400', '#c40300', '#9c0300', '#780200'];
const ACCESOS_POR_DEFECTO = ['/usuarios', '/aps-usuario', '/asignacion-sistema', '/menu-usuario'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DragDropModule, ...CommonPrimeNgModules, PersonalizarInicioDialogComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  cards: DashboardCard[] = [];
  cardPaths: string[] = [];
  disponibles: SidebarMenuItem[] = [];
  mostrarPersonalizar = false;

  constructor(
    private readonly authService: AuthService,
    private readonly authState: AuthState,
    private readonly sidebarMenuService: SidebarMenuService,
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
        this.disponibles = this.sidebarMenuService.getFlatPermittedItems(menuTree, permittedMenuIds);
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
      .filter((item): item is SidebarMenuItem => !!item)
      .map((item, index) => ({
        title: item.label,
        route: item.path,
        icon: item.icon,
        color: PALETA_ROJOS[index % PALETA_ROJOS.length]
      }));
  }
}

import { ChangeDetectorRef, Component, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AuthService, MenuPermission } from '../../services/auth.service';
import { AuthState } from '../../state/auth.state';
import { SidebarMenuService, SidebarMenuItem } from '../../services/sidebar-menu.service';
import { NotificationService } from '../../services/notification.service';
import { PersonalizarInicioDialogComponent } from './personalizar-inicio-dialog.component';
import { IconComponent } from '../shared/icon.component';

interface ArticuloDocumentacion {
  categoria: string;
  titulo: string;
}

/** Contenido simulado -- no hay base de conocimientos real todavia. */
const DOCUMENTACION_SIMULADA: ArticuloDocumentacion[] = [
  { categoria: 'Primeros pasos', titulo: 'Cómo navegar el menú y personalizar tu Inicio' },
  { categoria: 'Cálculo de Tarifas', titulo: 'Ejecutar y verificar un cálculo de tarifas' },
  { categoria: 'Reliquidaciones', titulo: 'Crear una reliquidación y comparar costos' },
  { categoria: 'SUI 853', titulo: 'Cargue de formatos e integración con el SUI' },
  { categoria: 'Preguntas frecuentes', titulo: '¿Qué hago si un cargue queda con error?' }
];

interface DashboardCard {
  title: string;
  route: string;
  icon: string;
  iconoCustomUrl: string | null;
}

const ACCESOS_POR_DEFECTO = ['/usuarios', '/aps-usuario', '/asignacion-sistema', '/menu-usuario'];
const COLUMNAS_DEFECTO = 6;

/** Set de íconos 3D subido por el usuario (frontend/public/iconos/), solo para
 *  las tarjetas de Inicio -- el sidebar sigue usando los Twemoji de siempre.
 *  Si una ruta no está acá, la tarjeta cae al ícono Twemoji normal. */
const ICONOS_CUSTOM_POR_RUTA: Record<string, string> = {
  '/aps': 'aps.png',
  '/empresas': 'empresas.png',
  '/usuarios': 'usuarios.png',
  '/calculo': 'Copia de calculo tarifas.png',
  '/cft': 'calculo tarifas.png',
  '/tarifas': 'detallado tarifas.png',
  '/informesGenerados': 'infomre.png',
  '/reversion_auth': 'aurotizar reversiones.png',
  '/suministros/reversion': 'Reversion.png',
  '/suministros/historico': 'historico.png',
  '/suministros/cargue-mensual': 'cargue mensual.png',
  '/suministros/cargue-semestral': 'cargue semestra.png',
  '/sui/integracion': 'formato.png',
  '/sui/cargue-complementario': 'cargue complemntario.png',
  '/sui/dashboard': 'dashbaord 2.png',
  '/sui/resumen-formatos': 'resumen fomratos y formulario.png',
  '/sui-reversiones': 'sui reversiones.png',
  '/histProductividad': 'historial de porductividad.png',
  '/subcon': 'subisdios contribuciones.png',
  '/proyecciones': 'proyecciones.png',
  '/proyecciones/linea-tiempo': 'linea de tiempo.png',
  '/proyecciones/crecimiento': 'crecimiento.png',
  '/proyecciones/ejecutar': 'proyectar.png',
  '/proyecciones/subcont': 'subicidos contirbuciones.png',
  '/reliquidacion/cargue': 'cargue.png',
  '/cra': 'indices cra.png',
  '/productividad': 'ajuste productividad.png',
  '/suministros/descuento-costos': 'Copia de desceunto.png',
  '/suministros/aprovechamiento': 'activar aprovechamiento.png',
  '/suministros/costo-poda': 'costo poda.png',
  '/suministros/cargue-productividad': 'cargue productividad.png',
  '/generales': 'infomracion general.png',
  '/gerencial/costos': 'detallado de costo.png',
  '/gerencial/sub-aporte': 'detallado y aporte.png',
  '/gerencial/dashboard': 'dashboard.png',
  '/gerencial/poda': 'poda.png',
  '/gerencial/descuento-costos': 'desceunto.png',
  '/suministros/verificacion': 'verificacion.png',
  '/pgirs/resumen': 'PGIRS RESMEUN.png',
  '/pgirs/informe-variables': 'pgir infomre variables.png'
};

function iconoCustomUrl(path: string): string | null {
  const archivo = ICONOS_CUSTOM_POR_RUTA[path];
  return archivo ? 'iconos/' + encodeURIComponent(archivo) : null;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DragDropModule,
    DialogModule,
    MenuModule,
    ...CommonPrimeNgModules,
    PersonalizarInicioDialogComponent,
    IconComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  @ViewChild('ayudaSection') ayudaSection?: ElementRef<HTMLElement>;
  @ViewChild('menuSoporte') menuSoporte!: Menu;

  cards: DashboardCard[] = [];
  cardPaths: string[] = [];
  disponibles: SidebarMenuItem[] = [];
  mostrarPersonalizar = false;
  mostrarDocumentacion = false;
  columnas = COLUMNAS_DEFECTO;
  documentacionSimulada = DOCUMENTACION_SIMULADA;

  soporteMenuItems: MenuItem[] = [
    { label: 'Enviar correo a soporte', icon: 'pi pi-envelope', command: () => this.simularCanalSoporte('correo') },
    { label: 'Llamar a soporte', icon: 'pi pi-phone', command: () => this.simularCanalSoporte('teléfono') },
    { label: 'Chat en vivo', icon: 'pi pi-comments', command: () => this.simularCanalSoporte('chat') }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly authState: AuthState,
    private readonly sidebarMenuService: SidebarMenuService,
    private readonly notificationService: NotificationService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.columnas = this.cargarColumnasGuardadas();
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
        this.disponibles = this.sidebarMenuService
          .getFlatPermittedItems(menuTree, permittedMenuIds)
          .filter(item => item.path !== '/');
        this.aplicarSeleccion(this.cargarSeleccionGuardada());
        this.cdr.detectChanges();
      },
      error: () => {
        this.disponibles = [];
        this.cdr.detectChanges();
      }
    });
  }

  irAAyuda(): void {
    this.ayudaSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  abrirDocumentacion(): void {
    this.mostrarDocumentacion = true;
  }

  abrirMenuSoporte(event: Event): void {
    this.menuSoporte.toggle(event);
  }

  private simularCanalSoporte(canal: string): void {
    this.notificationService.info(`Esto es una simulación -- todavía no hay integración real con ${canal}.`, 'Soporte Directo');
  }

  guardarSeleccion(paths: string[]): void {
    localStorage.setItem(this.storageKey(), JSON.stringify(paths));
    this.aplicarSeleccion(paths);
    this.cdr.detectChanges();
  }

  guardarColumnas(n: number): void {
    this.columnas = n;
    localStorage.setItem(this.columnasStorageKey(), String(n));
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

  private columnasStorageKey(): string {
    const sisuId = this.authState.user()?.SISU_ID ?? 'anonimo';
    return `dashboard:columnas:${sisuId}`;
  }

  private cargarColumnasGuardadas(): number {
    const raw = Number(localStorage.getItem(this.columnasStorageKey()));
    return raw >= 3 && raw <= 6 ? raw : COLUMNAS_DEFECTO;
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
      .map((item) => ({
        title: item.label,
        route: item.path,
        icon: item.icon,
        iconoCustomUrl: iconoCustomUrl(item.path)
      }));
  }
}

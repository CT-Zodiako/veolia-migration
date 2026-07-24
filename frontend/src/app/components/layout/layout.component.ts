import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AuthService, MenuPermission, Sistema } from '../../services/auth.service';
import { AuthState } from '../../state/auth.state';
import { SidebarMenuService, MenuGroup } from '../../services/sidebar-menu.service';
import { ThemeService } from '../../services/theme.service';
import { ProfileComponent } from './profile/profile.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ...CommonPrimeNgModules, ProfileComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  menuGroups: MenuGroup[] = [];
  usuario: any = null;
  sidebarCollapsed = false;
  sistemasDisponibles: Sistema[] = [];
  sistemaSeleccionadoId: number | null = null;
  cambiandoSistema = false;
  showSistemaDropdown = false;

  constructor(
    private authService: AuthService,
    private authState: AuthState,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private sidebarMenuService: SidebarMenuService,
    readonly themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const usuarioStr = localStorage.getItem('usuario');
    if (usuarioStr) {
      this.usuario = JSON.parse(usuarioStr);
    }
    this.sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    this.authState.hydrate();
    this.sistemaSeleccionadoId = this.authState.sistema()?.SIST_ID ?? null;
    this.loadMenu();
    this.loadSistemasDisponibles();
  }

  get nombreSistema(): string {
    return this.authState.sistema()?.SIST_NOMBRE || 'Sistema de Gestión';
  }

  loadSistemasDisponibles(): void {
    const correo = this.usuario?.SISU_CORREO;
    if (!correo) {
      return;
    }

    this.authService.getSistemasByCorreo(correo).subscribe({
      next: sistemas => {
        this.sistemasDisponibles = sistemas || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.sistemasDisponibles = [];
        this.cdr.detectChanges();
      }
    });
  }

  cambiarSistema(idSistema: number): void {
    if (!idSistema || idSistema === this.sistemaSeleccionadoId) {
      return;
    }

    const idAnterior = this.sistemaSeleccionadoId;
    this.cambiandoSistema = true;
    this.authService.switchSistema(idSistema).subscribe({
      next: () => {
        this.cambiandoSistema = false;
        this.sistemaSeleccionadoId = idSistema;
        this.router.navigate(['/']).then(() => this.loadMenu());
        this.cdr.detectChanges();
      },
      error: () => {
        this.cambiandoSistema = false;
        this.sistemaSeleccionadoId = idAnterior;
        this.cdr.detectChanges();
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebarCollapsed', String(this.sidebarCollapsed));
  }

  loadMenu(): void {
    const idSistema = this.authState.sistemaId();
    if (!idSistema) {
      this.menuGroups = [];
      return;
    }

    forkJoin({
      permissions: this.authService.getUserMenu(),
      menuTree: this.authService.getGeneralMenuTree(idSistema)
    }).subscribe({
      next: ({ permissions, menuTree }: { permissions: MenuPermission[]; menuTree: any[] }) => {
        const permittedMenuIds = new Set((permissions || []).map((item) => item.MENU_ID));
        this.menuGroups = this.sidebarMenuService.buildMenuGroups(menuTree, permittedMenuIds);
        this.cdr.detectChanges();
      },
      error: () => {
        this.menuGroups = [];
        this.cdr.detectChanges();
      }
    });
  }


  toggleExpand(group: MenuGroup): void {
    group.expanded = !group.expanded;
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  getPageTitle(): string {
    const url = this.router.url;
    switch (url) {
      case '/': return 'Dashboard';
      case '/usuarios': return 'Gestión de Usuarios';
      case '/aps': return 'Configuración APS';
      case '/empresas': return 'Configuración Empresas';
      case '/asignacion-sistema': return 'Asignación de Sistemas';
      case '/menu-usuario': return 'Asignación de Menú';
      case '/cambiar-clave': return 'Cambiar Contraseña';
      case '/sui-reversiones': return 'SUI Reversiones';
      case '/reversion_auth': return 'Autorización Reversiones';
      case '/detautorizacion': return 'Detallado Autorización';
      case '/suministros/reversion': return 'Ejecutar Reversión';
      case '/suministros/historico': return 'Histórico Reversión';
      case '/sui/integracion': return 'SUI Integración';
      case '/facturacion': return 'Facturación';
      case '/rellenos': return 'Configuración de Rellenos';
      case '/validaciones': return 'Validaciones';
      case '/subcont': return 'Subsidios y Contribuciones';
      case '/proyecciones': return 'Crear Proyección';
      case '/proyecciones/linea-tiempo': return 'Proyecciones - Línea de Tiempo';
      case '/proyecciones/crecimiento': return 'Proyecciones - Crecimiento';
      case '/proyecciones/subcont': return 'Subsidios y Contribuciones';
      case '/proyecciones/ejecutar': return 'Proyectar';
      case '/reliquidacion/crear': return 'Reliquidación - Crear';
      case '/reliquidacion/cargue': return 'Reliquidación - Cargue';
      case '/reliquidacion/comparar-costo': return 'Reliquidación - Comparar Costo';
      case '/reliquidacion/comparar-tarifas': return 'Reliquidación - Comparar Tarifas';
      case '/reliquidacion/tarificador': return 'Reliquidación - Tarificador';
      case '/generales': return 'Información Generales';
      case '/gerencial/costos': return 'Gerencial - Detalle Costos';
      case '/gerencial/sub-aporte': return 'Gerencial - Sub Aporte';
      case '/gerencial/dashboard': return 'Gerencial - Dashboard';
      case '/gerencial/poda': return 'Gerencial - Costo Poda';
      case '/gerencial/verificacion': return 'Gerencial - Verificación APS';
      case '/gerencial/poda-simple': return 'Gerencial - Poda';
      case '/pgirs/resumen': return 'PGIRS - Resumen';
      case '/pgirs/informe-variables': return 'PGIRS - Informe Variables';
      case '/pgirs/variables': return 'Variables PGIRS';
      case '/suministros/cargue-certificacion': return 'Cargue y Certificación';
      case '/costos/calculo-tarifas': return 'Cálculo de Tarifas';
      case '/cra': return 'Índices CRA';
      case '/tarifas': return 'Detallado Tarifas';
      default: return '';
    }
  }
}

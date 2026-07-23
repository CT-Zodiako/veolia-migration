import { Injectable } from '@angular/core';

export interface SidebarMenuItem {
  label: string;
  path: string;
  icon: string;
}

export interface MenuGroup {
  id: number;
  label: string;
  icon: string;
  expanded: boolean;
  children: SidebarMenuItem[];
}

@Injectable({ providedIn: 'root' })
export class SidebarMenuService {
  private readonly iconMap: Record<string, string> = {
    'inicio': '📊',
    'configuracion': '⚙️',
    'configuraci': '⚙️',
    'suministros': '📦',
    'suministro': '📦',
    'procesos': '⚡',
    'proceso': '⚡',
    'informes': '📈',
    'informe': '📈',
    'cargue': '📥',
    'sui': '🌐',
    'proyecciones': '🔮',
    'proyeccion': '🔮',
    'reversiones': '🔄',
    'reversion': '🔄',
    'general': '📋',
    'comercial': '🏪',
    'operaciones': '🏭',
    'operacione': '🏭',
    'tarificador': '🧮',
    'pgirs': '♻️',
    'cft': '🎓',
    'cvna': '📄',
    'cva': '📑',
    'crt': '📊',
  };

  private readonly routeCatalog: Array<SidebarMenuItem & { keywords: string[]; menuId?: number }> = [
    // Rutas implementadas y funcionando
    { label: 'Inicio', path: '/', icon: '📊', keywords: ['inicio'], menuId: 100 },
    { label: 'APS', path: '/aps', icon: '⚙️', keywords: ['aps'], menuId: 201 },
    { label: 'Empresas', path: '/empresas', icon: '🏢', keywords: ['empresa', 'empresas'], menuId: 202 },
    { label: 'Usuarios', path: '/usuarios', icon: '👥', keywords: ['usuario', 'usuarios'], menuId: 204 },
    { label: 'Cálculo Tarifas', path: '/calculo', icon: '🧮', keywords: ['calculo', 'tarifa'], menuId: 401 },
    { label: 'Cálculo de Tarifas', path: '/costos/calculo-tarifas', icon: '💰', keywords: ['costos', 'calculo de tarifas', 'costos tarifas'] },
    { label: 'Detallado Tarifas', path: '/tarifas', icon: '📋', keywords: ['tarifa', 'detallado tarifas'], menuId: 501 },
    { label: 'Tarifas General', path: '/tarifas-general', icon: '📊', keywords: ['tarifa general'], menuId: 502 },
    { label: 'Residuos', path: '/residuosGenerados', icon: '♻️', keywords: ['residuo'], menuId: 2001 },
    { label: 'Informes', path: '/informesGenerados', icon: '📈', keywords: ['informe generado'], menuId: 30005 },
    { label: 'Informes Mes', path: '/informesGeneradosMes', icon: '📅', keywords: ['informe mes'], menuId: 30006 },
    { label: 'Autorización Reversiones', path: '/reversion_auth', icon: '🔄', keywords: ['autorizacion reversiones', 'autoizacion reversion', 'reversion auth'], menuId: 3003 },
    { label: 'Detallado Autorización', path: '/detautorizacion', icon: '📋', keywords: ['detallado autorizacion', 'detautorizacion'], menuId: 3004 },
    { label: 'Ejecutar Reversión', path: '/suministros/reversion', icon: '🔁', keywords: ['ejecutar reversion', 'suministros reversion'], menuId: 3001 },
    { label: 'Histórico Reversión', path: '/suministros/historico', icon: '🧾', keywords: ['historico reversion', 'suministros historico'], menuId: 3002 },
    {
      label: 'Cargue y Certificación',
      path: '/suministros/cargue-certificacion',
      icon: '✅',
      keywords: ['cargue certificacion', 'certificacion', 'suministros certificacion'],
      menuId: 3007
    },
    { label: 'SUI Reversiones', path: '/sui-reversiones', icon: '🌐', keywords: ['sui reversiones', 'reversiones sui'] },
    { label: 'SUI Integración', path: '/sui/integracion', icon: '🧩', keywords: ['sui integracion', 'integracion sui'] },
    { label: 'Facturación', path: '/facturacion', icon: '🧾', keywords: ['facturacion', 'facturación', 'billing'] },
    { label: 'Rellenos', path: '/rellenos', icon: '🗑️', keywords: ['relleno', 'rellenos sanitarios', 'rellenos'] },
    { label: 'Validaciones', path: '/validaciones', icon: '✅', keywords: ['validacion', 'validaciones'] },
    { label: 'Subsidios y Contribuciones', path: '/subcont', icon: '💰', keywords: ['subcont', 'subsidios', 'contribuciones'] },
    { label: 'Proyecciones', path: '/proyecciones', icon: '🔮', keywords: ['proyeccion', 'proyecciones'] },
    { label: 'Reliquidación - Crear', path: '/reliquidacion/crear', icon: '🧾', keywords: ['reliquidacion crear', 'reliq crear', 'reliquidacion'], menuId: 6001 },
    { label: 'Reliquidación - Cargue', path: '/reliquidacion/cargue', icon: '📥', keywords: ['reliquidacion cargue', 'reliq cargue'], menuId: 6002 },
    { label: 'Reliquidación - Comparar Costo', path: '/reliquidacion/comparar-costo', icon: '📊', keywords: ['comparar costo reliquidacion', 'reliq comparar costo'], menuId: 6003 },
    { label: 'Reliquidación - Comparar Tarifas', path: '/reliquidacion/comparar-tarifas', icon: '💹', keywords: ['comparar tarifas reliquidacion', 'reliq comparar tarifas'], menuId: 6004 },
    { label: 'Reliquidación - Tarificador', path: '/reliquidacion/tarificador', icon: '🧮', keywords: ['tarificador reliquidacion', 'reliq tarificador'], menuId: 6005 },
    { label: 'Índices CRA', path: '/cra', icon: '📌', keywords: ['indices cra', 'indice cra', 'cra indices'] },
    { label: 'Información Generales', path: '/generales', icon: '📈', keywords: ['informacion generales', 'generales', 'infogenerales'] },
    { label: 'Gerencial - Detalle Costos', path: '/gerencial/costos', icon: '💰', keywords: ['gerencial costos', 'detalle costos gerencial', 'infogerencial costos'] },
    { label: 'Gerencial - Sub Aporte', path: '/gerencial/sub-aporte', icon: '🧾', keywords: ['gerencial sub aporte', 'sub aporte gerencial', 'infogerencial sub aporte'] },
    { label: 'Gerencial - Dashboard', path: '/gerencial/dashboard', icon: '📊', keywords: ['dashboard gerencial', 'infogerencial dashboard'], menuId: 604 },
    { label: 'Gerencial - Costo Poda', path: '/gerencial/poda', icon: '🌿', keywords: ['costo poda gerencial', 'gerencial poda', 'infogerencial poda'] },
    { label: 'Gerencial - Verificación', path: '/gerencial/verificacion', icon: '✅', keywords: ['verificacion gerencial', 'gerencial verificacion', 'infogerencial verificacion'] },
    { label: 'PGIRS - Informe', path: '/pgirs/informe', icon: '♻️', keywords: ['pgirs informe', 'informe pgirs'] },
    { label: 'PGIRS - Resumen', path: '/pgirs/resumen', icon: '♻️', keywords: ['pgirs resumen', 'resumen pgirs'] },
    { label: 'PGIRS - Informe Variables', path: '/pgirs/informe-variables', icon: '♻️', keywords: ['pgirs informe variables', 'informe variables pgirs'] },
    { label: 'PGIRS - Variables', path: '/pgirs/variables', icon: '♻️', keywords: ['pgirs variables', 'variables pgirs'] },
    { label: 'SUI 853 - APS Empresa', path: '/apsEmpresa', icon: '🏢', keywords: ['aps empresa'], menuId: 30001 },
    { label: 'SUI 853 - APS Documentos', path: '/apsDocumentos', icon: '📄', keywords: ['aps documentos'], menuId: 30002 },
    { label: 'Configuración APS', path: '/aps-usuario', icon: '⚙️', keywords: ['aps usuario'], menuId: 205 },
    { label: 'Asignación Sistema', path: '/asignacion-sistema', icon: '🖥️', keywords: ['asignacion sistema'], menuId: 206 },
    { label: 'Menú Usuario', path: '/menu-usuario', icon: '📋', keywords: ['menu usuario'], menuId: 207 },
  ];

  buildMenuGroups(menuTree: any[], permittedMenuIds: Set<number>): MenuGroup[] {
    if (!Array.isArray(menuTree)) {
      return [];
    }

    const groups: MenuGroup[] = [];

    for (const node of menuTree) {
      if (!node || typeof node !== 'object') {
        continue;
      }

      const nodeId = Number(node.id);
      const nodeLabel = String(node.label || '');
      const children = node.children || [];

      if (Array.isArray(children) && children.length > 0) {
        const childItems = this.processChildren(children, permittedMenuIds);

        if (childItems.length > 0) {
          groups.push({
            id: nodeId,
            label: nodeLabel,
            icon: this.resolveIcon(nodeLabel),
            expanded: false,
            children: childItems
          });
        }
      } else if (permittedMenuIds.has(nodeId) && nodeLabel) {
        const item = this.resolveSidebarItem(nodeLabel, nodeId);
        if (item) {
          groups.push({
            id: nodeId,
            label: nodeLabel,
            icon: item.icon,
            expanded: false,
            children: [item]
          });
        }
      }
    }

    return groups;
  }

  /** Lista plana (sin agrupar) de todos los ítems de menú a los que el usuario tiene permiso. */
  getFlatPermittedItems(menuTree: any[], permittedMenuIds: Set<number>): SidebarMenuItem[] {
    const groups = this.buildMenuGroups(menuTree, permittedMenuIds);
    const items: SidebarMenuItem[] = [];
    const seenPaths = new Set<string>();

    for (const group of groups) {
      for (const item of group.children) {
        if (!seenPaths.has(item.path)) {
          seenPaths.add(item.path);
          items.push(item);
        }
      }
    }

    return items;
  }

  private processChildren(children: any[], permittedMenuIds: Set<number>): SidebarMenuItem[] {
    const items: SidebarMenuItem[] = [];

    for (const child of children) {
      if (!child || typeof child !== 'object') {
        continue;
      }

      const childId = Number(child.id);
      const childLabel = String(child.label || '');

      if (permittedMenuIds.has(childId) && childLabel) {
        const item = this.resolveSidebarItem(childLabel, childId);
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  private resolveSidebarItem(label: string, menuId?: number): SidebarMenuItem | null {
    const normalizedLabel = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (menuId !== undefined) {
      const byId = this.routeCatalog.find((item) => item.menuId === menuId);
      if (byId) {
        return {
          label: byId.label,
          path: byId.path,
          icon: byId.icon
        };
      }
    }

    const matched = this.routeCatalog.find((item) =>
      item.keywords.some((keyword) => normalizedLabel.includes(keyword))
    );

    if (!matched) {
      return null;
    }

    return {
      label: matched.label,
      path: matched.path,
      icon: matched.icon
    };
  }

  private resolveIcon(label: string): string {
    const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    for (const [key, icon] of Object.entries(this.iconMap)) {
      if (normalized.includes(key)) {
        return icon;
      }
    }

    return '📁';
  }
}

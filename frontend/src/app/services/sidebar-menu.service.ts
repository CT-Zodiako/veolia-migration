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
    'cft': '🧮',
    'cvna': '📄',
    'cva': '📑',
    'crt': '📊',
  };

  private readonly routeCatalog: Array<SidebarMenuItem & { keywords: string[]; menuId?: number }> = [
    // Rutas implementadas y funcionando
    { label: 'Inicio', path: '/', icon: '🏠', keywords: ['inicio'], menuId: 100 },
    { label: 'APS', path: '/aps', icon: '⚙️', keywords: ['aps'], menuId: 201 },
    { label: 'Empresas', path: '/empresas', icon: '🏢', keywords: ['empresa', 'empresas'], menuId: 202 },
    { label: 'Usuarios', path: '/usuarios', icon: '👥', keywords: ['usuario', 'usuarios'], menuId: 204 },
    { label: 'Cálculo Tarifas', path: '/calculo', icon: '🧮', keywords: ['calculo', 'tarifa', 'costos'], menuId: 401 },
    { label: 'Detallado Tarifas', path: '/tarifas', icon: '📃', keywords: ['tarifa', 'detallado tarifas'], menuId: 501 },
    { label: 'Detallado Tarifas', path: '/tarifas-general', icon: '🗂️', keywords: ['tarifa general', 'detallado tarifas gerencial'], menuId: 601 },
    { label: 'Residuos', path: '/residuosGenerados', icon: '♻️', keywords: ['residuo'], menuId: 30004 },
    { label: 'Informes', path: '/informesGenerados', icon: '📰', keywords: ['informe generado'], menuId: 30005 },
    { label: 'Informes Mes', path: '/informesGeneradosMes', icon: '📅', keywords: ['informe mes'], menuId: 30007 },
    { label: 'Autorización Reversiones', path: '/reversion_auth', icon: '🔄', keywords: ['autorizacion reversiones', 'autoizacion reversion', 'reversion auth'], menuId: 3003 },
    { label: 'Detallado Autorización', path: '/detautorizacion', icon: '🗒️', keywords: ['detallado autorizacion', 'detautorizacion'], menuId: 3004 },
    { label: 'Ejecutar Reversión', path: '/suministros/reversion', icon: '🔁', keywords: ['ejecutar reversion', 'suministros reversion'], menuId: 3001 },
    { label: 'Histórico Reversión', path: '/suministros/historico', icon: '🕰️', keywords: ['historico reversion', 'suministros historico'], menuId: 3002 },
    {
      label: 'Cargue Mensual',
      path: '/suministros/cargue-mensual',
      icon: '📥',
      keywords: ['cargue mensual', 'cargue de informacion', 'informacion mensual'],
      menuId: 701
    },
    {
      label: 'Cargue Semestral',
      path: '/suministros/cargue-semestral',
      icon: '🗃️',
      keywords: ['cargue semestral', 'cargue de informacion', 'informacion semestral'],
      menuId: 702
    },
    { label: 'Formatos y Formularios', path: '/sui/integracion', icon: '🧩', keywords: ['sui integracion', 'integracion sui', 'formatos y formularios'], menuId: 801 },
    { label: 'Cargue Complementario', path: '/sui/cargue-complementario', icon: '📮', keywords: ['cargue complementario', 'cargue complemento'], menuId: 802 },
    { label: 'SUI Dashboard', path: '/sui/dashboard', icon: '🖥️', keywords: ['sui dashboard', 'dashboard sui'], menuId: 803 },
    { label: 'Resumen Formatos y Formularios', path: '/sui/resumen-formatos', icon: '📚', keywords: ['resumen formatos', 'resumen formularios', 'formatos y formularios'], menuId: 804 },
    { label: 'SUI Reversiones', path: '/sui-reversiones', icon: '🌐', keywords: ['sui reversiones', 'reversiones sui'], menuId: 805 },
    { label: 'Detallado Facturación', path: '/facturacion', icon: '🧾', keywords: ['facturacion', 'facturación', 'billing', 'detallado facturacion'], menuId: 502 },
    { label: 'Historial de Certificación', path: '/histCertificacion', icon: '🏅', keywords: ['historial certificacion', 'historia de certificacion'], menuId: 503 },
    { label: 'Historial de Productividad', path: '/histProductividad', icon: '🏗️', keywords: ['historial productividad'], menuId: 504 },
    { label: 'Rellenos', path: '/rellenos', icon: '🗑️', keywords: ['relleno', 'rellenos sanitarios', 'rellenos'], menuId: 203 },
    { label: 'Validaciones', path: '/validaciones', icon: '✅', keywords: ['validacion', 'validaciones'] },
    { label: 'Subsidios y Contribuciones', path: '/subcon', icon: '💰', keywords: ['subcont', 'subcon'], menuId: 302 },
    { label: 'Crear Proyección', path: '/proyecciones', icon: '🔮', keywords: ['crear proyeccion', 'proyecciones'], menuId: 901 },
    { label: 'Líneas de Tiempo', path: '/proyecciones/linea-tiempo', icon: '⏳', keywords: ['lineas de tiempo', 'linea de tiempo'], menuId: 902 },
    { label: 'Crecimiento Variables Programadas', path: '/proyecciones/crecimiento', icon: '🌱', keywords: ['crecimiento variables', 'crecimiento variables programadas'], menuId: 903 },
    { label: 'Proyectar', path: '/proyecciones/ejecutar', icon: '🎯', keywords: ['proyectar'], menuId: 904 },
    { label: 'Subsidios y Contribuciones', path: '/proyecciones/subcont', icon: '🤝', keywords: ['subsidios contribuciones proyeccion'], menuId: 905 },
    { label: 'Reliquidación - Crear', path: '/reliquidacion/crear', icon: '✍️', keywords: ['reliquidacion crear', 'reliq crear', 'reliquidacion'], menuId: 5001 },
    { label: 'Reliquidación - Cargue', path: '/reliquidacion/cargue', icon: '🚚', keywords: ['reliquidacion cargue', 'reliq cargue'], menuId: 5002 },
    { label: 'Reliquidación - Comparar Costo', path: '/reliquidacion/comparar-costo', icon: '⚖️', keywords: ['comparar costo reliquidacion', 'reliq comparar costo'], menuId: 5003 },
    { label: 'Reliquidación - Comparar Tarifas', path: '/reliquidacion/comparar-tarifas', icon: '💹', keywords: ['comparar tarifas reliquidacion', 'reliq comparar tarifas'], menuId: 5004 },
    // AUGE_MENU 6000 "Tarificador" tiene 2 hijos reales (6001 "Verificacion de Cambios",
    // 6002 "Aplicar en Tarifas"); reliq-tarificador.component ya resuelve ambas funciones
    // en una sola pantalla, por eso los 2 menuId reales apuntan al mismo path.
    { label: 'Reliquidación - Verificación de Cambios', path: '/reliquidacion/tarificador', icon: '🔍', keywords: ['tarificador reliquidacion', 'reliq tarificador', 'verificacion de cambios'], menuId: 6001 },
    { label: 'Reliquidación - Aplicar en Tarifas', path: '/reliquidacion/tarificador', icon: '🖋️', keywords: ['tarificador reliquidacion', 'reliq tarificador', 'aplicar en tarifas'], menuId: 6002 },
    { label: 'Índices CRA', path: '/cra', icon: '📌', keywords: ['indices cra', 'indice cra', 'cra indices'], menuId: 301 },
    { label: 'Ajuste Productividad', path: '/productividad', icon: '🛠️', keywords: ['ajuste productividad'], menuId: 303 },
    { label: 'Descuentos en Costos', path: '/suministros/descuento-costos', icon: '💸', keywords: ['descuentos en costos'], menuId: 304 },
    { label: 'Activar Aprovechamiento', path: '/suministros/aprovechamiento', icon: '🔀', keywords: ['activar aprovechamiento'], menuId: 308 },
    { label: 'Costo de Poda', path: '/suministros/costo-poda', icon: '🌳', keywords: ['costo de poda suministros'], menuId: 309 },
    { label: 'Cargue Productividad', path: '/suministros/cargue-productividad', icon: '📤', keywords: ['cargue productividad'], menuId: 311 },
    { label: 'Información Generales', path: '/generales', icon: '🗺️', keywords: ['informacion generales', 'generales', 'infogenerales'], menuId: 1001 },
    { label: 'Detallado de Costos', path: '/gerencial/costos', icon: '💵', keywords: ['gerencial costos', 'detalle costos gerencial', 'infogerencial costos', 'detallado de costos'], menuId: 602 },
    { label: 'Detallado Sub y Aportes', path: '/gerencial/sub-aporte', icon: '🎁', keywords: ['gerencial sub aporte', 'sub aporte gerencial', 'infogerencial sub aporte', 'detallado sub y aportes'], menuId: 603 },
    { label: 'Dashboard', path: '/gerencial/dashboard', icon: '🧭', keywords: ['dashboard gerencial', 'infogerencial dashboard'], menuId: 604 },
    { label: 'Costo de Poda', path: '/gerencial/poda', icon: '🌿', keywords: ['costo poda gerencial', 'gerencial poda', 'infogerencial poda'], menuId: 606 },
    { label: 'Act. Descuento Costos', path: '/gerencial/descuento-costos', icon: '🔧', keywords: ['descuento costos', 'actualizacion descuento costos', 'act descuento costos'], menuId: 605 },
    { label: 'Verificación', path: '/suministros/verificacion', icon: '🔎', keywords: ['verificacion'], menuId: 307 },
    { label: 'PGIRS - Resumen', path: '/pgirs/resumen', icon: '♻️', keywords: ['pgirs resumen', 'resumen pgirs', 'informe pgirs'], menuId: 2002 },
    { label: 'PGIRS - Informe Variables', path: '/pgirs/informe-variables', icon: '🧪', keywords: ['pgirs informe variables', 'informe variables pgirs'], menuId: 2003 },
    { label: 'Variables PGIRS', path: '/pgirs/variables', icon: '🔬', keywords: ['pgirs variables', 'variables pgris'], menuId: 2001 },
    { label: 'SUI 853 - APS Empresa', path: '/apsEmpresa', icon: '🏢', keywords: ['aps empresa'], menuId: 30001 },
    { label: 'SUI 853 - APS Documentos', path: '/apsDocumentos', icon: '📄', keywords: ['aps documentos'], menuId: 30002 },
    { label: 'SUI 853 - CFT', path: '/cft', icon: '🧮', keywords: ['cft'], menuId: 7011 },
    { label: 'SUI 853 - CSS Aprovechamiento', path: '/cssaprovechamiento', icon: '♻️', keywords: ['css aprovechamiento', 'ccs aprovechamiento'], menuId: 7001 },
    { label: 'SUI 853 - CRLUS', path: '/crlus', icon: '📐', keywords: ['crlus'], menuId: 7002 },
    { label: 'SUI 853 - CBLS', path: '/cbls', icon: '📏', keywords: ['cbls'], menuId: 7003 },
    { label: 'SUI 853 - CBLUS Mínimo', path: '/cblusMinimo', icon: '📉', keywords: ['cblus minimo'], menuId: 7004 },
    { label: 'SUI 853 - CBLUS Máximo', path: '/cblusMaximo', icon: '📈', keywords: ['cblus maximo'], menuId: 7005 },
    { label: 'SUI 853 - CBLUS', path: '/cblus', icon: '🔢', keywords: ['cblus'], menuId: 7006 },
    { label: 'SUI 853 - CBICS Mínimo y Máximo', path: '/cbicsmaxmin', icon: '📶', keywords: ['cbics maxmin', 'cbics minimo maximo'], menuId: 7010 },
    // 'Configuración APS' (/aps-usuario), 'Asignación Sistema' (/asignacion-sistema) y
    // 'Menú Usuario' (/menu-usuario) NO tienen nodo propio en AUGE_MENU: dump completo del
    // árbol confirma que el nodo padre "Configuración" (menu_id 200) solo tiene 4 hijos reales
    // (201 APS, 202 Empresas, 203 Rellenos, 204 Usuarios), y una búsqueda por
    // ASIGNAC%/SISTEMA%/MENU+USUARIO%/APS% en toda la tabla no arroja ningún otro menu_id para
    // estas 3 funcionalidades. Confirmado también en el código: <app-apsx-usuario>,
    // <app-asignacion-sistema> y MenuxUsuarioComponent se renderizan como pestañas dentro de
    // usuarios.component.html (bajo la ruta /usuarios, menuId 204), no como opciones de menú
    // separadas. Los menuId 205/206/207 que tenían eran inventados y nunca podían matchear
    // (buildMenuGroups/processChildren solo recorren nodos reales de AUGE_MENU), así que se
    // quitan las entradas del catálogo en vez de dejarlas con un menuId falso.
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

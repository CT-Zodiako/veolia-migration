import { Route } from '@angular/router';
import { routes } from '../app.routes';
import { SidebarMenuService } from './sidebar-menu.service';

// Leaf menu options from the legacy AUGE_MENU table (doc migracion/modules/auth/AUGE_MENU_202604272009.md)
// that have a migrated screen. Each one must resolve to a sidebar path that the router serves.
const MIGRATED_LEGACY_MENU_IDS = [
  100, 201, 202, 203, 204, 301, 302, 303, 304, 307, 308, 309, 311, 401, 501, 502, 503, 504,
  601, 602, 603, 604, 605, 606, 701, 702, 801, 802, 803, 804, 805, 901, 902, 903, 904, 905,
  1001, 2001, 2002, 2003, 3001, 3002, 3003, 3004,
  5001, 5002, 5003, 5004, 6001, 6002,
  7001, 7002, 7003, 7004, 7005, 7006, 7010, 7011, 8001, 8002, 8008, 8009, 8010, 9001,
  10001, 20001, 30001, 30002, 30003, 30004, 30005, 30006, 30007, 40001
];

function collectRoutePaths(routeList: Route[], prefix = ''): Set<string> {
  const paths = new Set<string>();
  for (const route of routeList) {
    const full = [prefix, route.path ?? ''].filter(Boolean).join('/');
    paths.add('/' + full);
    if (route.children) {
      collectRoutePaths(route.children, full).forEach((p) => paths.add(p));
    }
  }
  return paths;
}

describe('SidebarMenuService', () => {
  const service = new SidebarMenuService();

  it('resolves every migrated legacy menu option to a registered route', () => {
    const routePaths = collectRoutePaths(routes);
    const unresolved: string[] = [];

    for (const menuId of MIGRATED_LEGACY_MENU_IDS) {
      const [item] = service.getFlatPermittedItems(
        [{ id: menuId, label: `menu-${menuId}` }],
        new Set([menuId])
      );
      if (!item) {
        unresolved.push(`${menuId}: no sidebar item`);
      } else if (!routePaths.has(item.path)) {
        unresolved.push(`${menuId}: ${item.path} has no route`);
      }
    }

    expect(unresolved).toEqual([]);
  });

  it('only shows options the user is permitted to see', () => {
    const tree = [
      {
        id: 5000,
        label: 'Reliquidaciones',
        children: [
          { id: 5001, label: 'Crear' },
          { id: 5002, label: 'Cargue' }
        ]
      }
    ];

    const groups = service.buildMenuGroups(tree, new Set([5001]));

    expect(groups).toHaveLength(1);
    expect(groups[0].children.map((child) => child.path)).toEqual(['/reliquidacion/crear']);
  });

  it('does not duplicate CFT for the legacy-dead CFTz option (keyword fallback regression)', () => {
    const tree = [
      {
        id: 7000,
        label: 'CFT',
        children: [
          { id: 7011, label: 'CFT' },
          { id: 7009, label: 'CFTz' }
        ]
      }
    ];

    const items = service.getFlatPermittedItems(tree, new Set([7011, 7009]));

    expect(items.map((item) => item.path)).toEqual(['/cft']);
  });

  it('labels the SUI853 Drive loads as load screens like legacy (Cargue ...)', () => {
    const items = service.getFlatPermittedItems(
      [{ id: 30004, label: 'a' }, { id: 30005, label: 'b' }, { id: 30007, label: 'c' }],
      new Set([30004, 30005, 30007])
    );

    expect(items.map((item) => [item.label, item.path])).toEqual([
      ['Cargue Residuos', '/cargueResiduos'],
      ['Cargue Facturación', '/informesGenerados'],
      ['Cargue Facturación Mes', '/informesGeneradosMes']
    ]);
  });

  // Legacy MenuService.js:320-336: 2002 "Informe PGIRS" opens InformePgirs.vue, 2003 "Resumen variables PGIRS"
  // opens ResumenPgirs.vue; the new screens show the same data, only the labels were crossed.
  it('labels the PGIRS options like legacy', () => {
    const items = service.getFlatPermittedItems(
      [{ id: 2001, label: 'a' }, { id: 2002, label: 'b' }, { id: 2003, label: 'c' }],
      new Set([2001, 2002, 2003])
    );

    expect(items.map((item) => [item.label, item.path])).toEqual([
      ['Variables PGIRS', '/pgirs/variables'],
      ['Informe PGIRS', '/pgirs/resumen'],
      ['Resumen variables PGIRS', '/pgirs/informe-variables']
    ]);
  });
});

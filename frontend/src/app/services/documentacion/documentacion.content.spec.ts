import { Routes } from '@angular/router';
import { routes } from '../../app.routes';
import { SidebarMenuService, SidebarMenuItem } from '../sidebar-menu.service';
import { ArticuloDocumentacion, CATEGORIAS_DOCUMENTACION, DOCUMENTACION, slugDocumentacion } from './index';

// Integrity of the REAL Centro de documentación content (odd/tasks/documentacion-sistema.md S1-S4).
// The page itself is tested with fixtures in documentacion-page.component.spec.ts.

/** Every navigable path of the router config, as '/a/b' ('' -> '/'). */
function rutasDeclaradas(config: Routes, padre = ''): string[] {
  return config.flatMap(route => {
    if (route.path === undefined || route.path === '**') return [];
    const ruta = [padre, route.path].filter(Boolean).join('/');
    return ['/' + ruta, ...rutasDeclaradas(route.children ?? [], ruta)];
  });
}

const textoDe = (a: ArticuloDocumentacion) =>
  [
    a.titulo,
    a.contenido,
    a.sistema ?? '',
    ...(a.secciones ?? []).flatMap(s => [s.titulo, ...s.parrafos]),
    ...(a.pasos ?? []),
    ...(a.notas ?? [])
  ].join(' ');

describe('Contenido del Centro de documentación', () => {
  const declaradas = new Set(rutasDeclaradas(routes));

  it('has unique titles and slugs', () => {
    const titulos = DOCUMENTACION.map(a => a.titulo);
    const slugs = titulos.map(slugDocumentacion);
    expect(titulos.filter((t, i) => titulos.indexOf(t) !== i)).toEqual([]);
    expect(slugs.filter((s, i) => slugs.indexOf(s) !== i)).toEqual([]);
  });

  it('only uses the allowed categories', () => {
    const permitidas: readonly string[] = CATEGORIAS_DOCUMENTACION;
    expect(DOCUMENTACION.filter(a => !permitidas.includes(a.categoria)).map(a => `${a.titulo}: ${a.categoria}`)).toEqual([]);
  });

  it('gives every article a non-empty summary', () => {
    expect(DOCUMENTACION.filter(a => !a.contenido.trim()).map(a => a.titulo)).toEqual([]);
  });

  it('points every ruta to a route declared in app.routes.ts', () => {
    const invalidas = DOCUMENTACION.filter(a => a.ruta !== undefined && !declaradas.has(a.ruta)).map(
      a => `${a.titulo}: ${a.ruta}`
    );
    expect(invalidas).toEqual([]);
  });

  it('documents every screen of the general area (Inicio + Configuración)', () => {
    const documentadas = new Set(DOCUMENTACION.map(a => a.ruta));
    const generales = ['/', '/usuarios', '/aps', '/empresas', '/rellenos', '/validaciones', '/cambiar-clave'];
    expect(generales.filter(path => !documentadas.has(path))).toEqual([]);
  });

  // Se habilita cuando se publiquen las demás áreas en index.ts (odd/tasks/documentacion-sistema.md, T3–T6).
  it.skip('documents every sidebar screen that is a declared route', () => {
    // routeCatalog is private in SidebarMenuService; bracket access reads it without widening
    // its public API just for this coverage check.
    const catalogo = new SidebarMenuService()['routeCatalog'] as SidebarMenuItem[];
    const documentadas = new Set(DOCUMENTACION.map(a => a.ruta));
    const faltantes = [...new Set(catalogo.map(item => item.path))].filter(
      path => declaradas.has(path) && !documentadas.has(path)
    );
    expect(faltantes, `Pantallas del menú sin artículo: ${faltantes.join(', ')}`).toEqual([]);
  });

  it('no longer contains simulated content', () => {
    expect(DOCUMENTACION.filter(a => /simulad/i.test(textoDe(a))).map(a => a.titulo)).toEqual([]);
  });
});

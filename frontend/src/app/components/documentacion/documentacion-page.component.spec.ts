import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { DocumentacionPageComponent } from './documentacion-page.component';
import { AyudaService } from '../../services/ayuda.service';
import { NotificationService } from '../../services/notification.service';
import { ArticuloDocumentacion, DOCUMENTACION_ARTICULOS } from '../../services/documentacion';

// No legacy equivalent: front-tarificador has no documentation center. These tests pin the
// "Centro de documentación" page (design/documentacion-ayuda/02-centro-pagina.html) against a
// fixture list, so the real content (services/documentacion/*.docs.ts) can change freely.

// Deliberately NOT in CATEGORIAS_DOCUMENTACION order: the page must reorder the modules.
const ARTICULOS: ArticuloDocumentacion[] = [
  {
    categoria: 'Reliquidaciones',
    titulo: 'Crear una reliquidación y comparar costos',
    contenido: 'Resumen de cómo se arma una reliquidación.',
    sistema: 'Reliquidaciones',
    ruta: '/reliquidacion/crear',
    secciones: [
      { titulo: 'Para qué sirve', parrafos: ['Permite recalcular periodos ya facturados.', 'Queda guardada como borrador.'] },
      { titulo: 'Qué muestra', parrafos: ['La tabla de periodos de la APS.'] }
    ],
    pasos: ['Elegí la APS.', 'Indicá el periodo inicial y final.', 'Hacé clic en Crear.'],
    notas: ['Una vez aplicada no se puede deshacer.', 'Necesitás permiso de Reliquidaciones.']
  },
  { categoria: 'Primeros pasos', titulo: 'Ingresar al sistema', contenido: 'Cómo iniciar sesión con tu usuario.' },
  { categoria: 'Suministros', titulo: 'Ejecutar y autorizar una reversión', contenido: 'Ejecutá la reversión de un suministro.' },
  { categoria: 'Primeros pasos', titulo: 'Cargue de información inicial', contenido: 'Qué archivos subir el primer mes.' },
  {
    categoria: 'Configuración',
    titulo: 'Personalizar la apariencia',
    contenido: 'Cambiá colores y tema de la aplicación.',
    pasos: ['Abrí el menú de usuario.', 'Activá el modo oscuro.']
  },
  { categoria: 'Primeros pasos', titulo: 'Navegar por el menú', contenido: 'Cómo encontrar cada pantalla.' },
  { categoria: 'Preguntas frecuentes', titulo: '¿Qué hago si un cargue queda con error?', contenido: 'Revisá el detalle del error.' },
  { categoria: 'Preguntas frecuentes', titulo: '¿Cómo recupero mi contraseña?', contenido: 'Pedí el cambio a un administrador.' }
];

async function setup(url = '/documentacion') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'documentacion', component: DocumentacionPageComponent }]),
      { provide: DOCUMENTACION_ARTICULOS, useValue: ARTICULOS },
      { provide: NotificationService, useValue: { info: vi.fn() } }
    ]
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const el = harness.routeNativeElement as HTMLElement;
  return { harness, el };
}

const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

function buscarEn(harness: RouterTestingHarness, el: HTMLElement, termino: string): string[] {
  const input = el.querySelector('input[type=search]') as HTMLInputElement;
  input.value = termino;
  input.dispatchEvent(new Event('input'));
  harness.detectChanges();
  return Array.from(el.querySelectorAll('.doc-resultado strong')).map(text);
}

describe('DocumentacionPageComponent', () => {
  it('shows one card per module (FAQ apart) in CATEGORIAS_DOCUMENTACION order with its article links', async () => {
    const { el } = await setup();
    const titulos = Array.from(el.querySelectorAll('.doc-modulo h3')).map(text);
    expect(titulos).toEqual(['Primeros pasos', 'Configuración', 'Suministros', 'Reliquidaciones']);
    expect(text(el.querySelector('.doc-modulo'))).toContain('3 artículos');
    const faq = Array.from(el.querySelectorAll('.doc-faq summary')).map(text);
    expect(faq).toEqual(['¿Qué hago si un cargue queda con error?', '¿Cómo recupero mi contraseña?']);
  });

  it('uses one PrimeIcon per module category', async () => {
    const { el } = await setup();
    const iconos = Array.from(el.querySelectorAll('.doc-modulo-icono i')).map(i => i.className);
    expect(iconos).toEqual(['pi pi-play', 'pi pi-cog', 'pi pi-box', 'pi pi-sync']);
  });

  it('filters articles by the search term and shows an empty state', async () => {
    const { harness, el } = await setup();
    expect(buscarEn(harness, el, 'reversión')).toEqual(['Ejecutar y autorizar una reversión']);
    expect(el.querySelector('.doc-grid')).toBeNull();

    buscarEn(harness, el, 'zzz-no-existe');
    expect(text(el.querySelector('.doc-sin-resultados'))).toContain('No encontramos artículos para “zzz-no-existe”');
  });

  it('also matches text inside secciones, pasos and notas', async () => {
    const { harness, el } = await setup();
    expect(buscarEn(harness, el, 'recalcular periodos')).toEqual(['Crear una reliquidación y comparar costos']);
    expect(buscarEn(harness, el, 'modo oscuro')).toEqual(['Personalizar la apariencia']);
    expect(buscarEn(harness, el, 'no se puede deshacer')).toEqual(['Crear una reliquidación y comparar costos']);
  });

  it('applies a popular search chip as the search term', async () => {
    const { harness, el } = await setup();
    (el.querySelector('.doc-populares button') as HTMLButtonElement).click();
    harness.detectChanges();
    expect((el.querySelector('input[type=search]') as HTMLInputElement).value).toBe('Cargue');
    expect(el.querySelectorAll('.doc-resultado').length).toBeGreaterThan(0);
  });

  it('opens an article from the ?articulo query param and goes back to the index', async () => {
    const { harness, el } = await setup('/documentacion?articulo=crear-una-reliquidacion-y-comparar-costos');
    expect(text(el.querySelector('.doc-articulo h2'))).toBe('Crear una reliquidación y comparar costos');
    expect(text(el.querySelector('.doc-articulo .doc-tag'))).toBe('Reliquidaciones');
    expect(el.querySelector('.doc-grid')).toBeNull();
    (el.querySelector('.doc-volver') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/documentacion');
    expect(el.querySelector('.doc-grid')).not.toBeNull();
  });

  it('renders sistema, screen link, secciones, pasos and notas of a full article', async () => {
    const { el } = await setup('/documentacion?articulo=crear-una-reliquidacion-y-comparar-costos');
    const articulo = el.querySelector('.doc-articulo') as HTMLElement;
    expect(text(articulo.querySelector('.doc-sistema'))).toContain('Reliquidaciones');

    const enlace = articulo.querySelector('a.doc-ir') as HTMLAnchorElement;
    expect(text(enlace)).toBe('Ir a la pantalla');
    expect(enlace.getAttribute('href')).toBe('/reliquidacion/crear');

    const secciones = Array.from(articulo.querySelectorAll('.doc-seccion'));
    expect(secciones.map(s => text(s.querySelector('h3')))).toEqual(['Para qué sirve', 'Qué muestra']);
    expect(Array.from(secciones[0].querySelectorAll('p')).map(text)).toEqual([
      'Permite recalcular periodos ya facturados.',
      'Queda guardada como borrador.'
    ]);
    expect(Array.from(secciones[1].querySelectorAll('p')).map(text)).toEqual(['La tabla de periodos de la APS.']);

    const pasos = Array.from(articulo.querySelectorAll('ol.doc-pasos > li')).map(text);
    expect(pasos).toEqual(['Elegí la APS.', 'Indicá el periodo inicial y final.', 'Hacé clic en Crear.']);

    const notas = articulo.querySelector('.doc-notas') as HTMLElement;
    expect(text(notas)).toContain('Tené en cuenta');
    expect(Array.from(notas.querySelectorAll('li')).map(text)).toEqual([
      'Una vez aplicada no se puede deshacer.',
      'Necesitás permiso de Reliquidaciones.'
    ]);
    expect(text(articulo)).not.toContain('simulado');
  });

  it('omits the optional blocks for an article without them', async () => {
    const { el } = await setup('/documentacion?articulo=ingresar-al-sistema');
    const articulo = el.querySelector('.doc-articulo') as HTMLElement;
    expect(text(articulo.querySelector('h2'))).toBe('Ingresar al sistema');
    expect(text(articulo.querySelector('.doc-articulo-texto'))).toBe('Cómo iniciar sesión con tu usuario.');
    expect(articulo.querySelector('.doc-sistema')).toBeNull();
    expect(articulo.querySelector('a.doc-ir')).toBeNull();
    expect(articulo.querySelector('.doc-seccion')).toBeNull();
    expect(articulo.querySelector('.doc-pasos')).toBeNull();
    expect(articulo.querySelector('.doc-notas')).toBeNull();
    expect(text(articulo)).not.toContain('Tené en cuenta');
  });

  it('falls back to the index for an unknown article slug', async () => {
    const { el } = await setup('/documentacion?articulo=no-existe');
    expect(el.querySelector('.doc-articulo')).toBeNull();
    expect(el.querySelector('.doc-grid')).not.toBeNull();
  });

  it('shows no support section or support mention', async () => {
    const { harness, el } = await setup();
    expect(el.querySelector('.doc-soporte')).toBeNull();
    expect(el.textContent).not.toMatch(/soporte/i);
    const input = el.querySelector('input[type=search]') as HTMLInputElement;
    input.value = 'zzz-no-existe';
    input.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(text(el.querySelector('.doc-sin-resultados'))).toBe('No encontramos artículos para “zzz-no-existe”. Probá con otra palabra.');
  });
});

describe('AyudaService.abrirDocumentacion', () => {
  it('navigates to the documentation page', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: NotificationService, useValue: { info: vi.fn() } }]
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(AyudaService).abrirDocumentacion();
    expect(navigate).toHaveBeenCalledWith(['/documentacion']);
  });
});

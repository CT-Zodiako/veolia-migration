import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ArticuloDocumentacion, AyudaService, CATEGORIA_FAQ } from '../../services/ayuda.service';

/** Ícono PrimeIcons por módulo; las categorías nuevas caen en `pi-book`. */
const ICONOS_CATEGORIA: Record<string, string> = {
  'Primeros pasos': 'pi-play',
  'Configuración': 'pi-cog',
  'Cálculo de Tarifas': 'pi-calculator',
  'Suministros': 'pi-box',
  'Reversiones': 'pi-replay',
  'Informes': 'pi-chart-bar',
  'Proyecciones': 'pi-chart-line',
  'Reliquidaciones': 'pi-sync',
  'SUI 853': 'pi-upload',
  'PGIRS': 'pi-sitemap'
};

const BUSQUEDAS_POPULARES = ['Cargue', 'Comparar costo', 'Modo oscuro', 'Formatos SUI'];

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Todo el texto del artículo en que busca el buscador (cuerpo incluido). */
const textoBuscable = (a: ArticuloDocumentacion) =>
  normalizar([
    a.titulo,
    a.categoria,
    a.contenido,
    ...(a.secciones ?? []).flatMap(s => [s.titulo, ...s.parrafos]),
    ...(a.pasos ?? []),
    ...(a.notas ?? [])
  ].join(' '));

/** Centro de documentación (design/documentacion-ayuda/02-centro-pagina.html).
 *  El artículo abierto vive en `?articulo=<slug>` para poder compartir el enlace. */
@Component({
  selector: 'app-documentacion-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './documentacion-page.component.html',
  styleUrl: './documentacion-page.component.css'
})
export class DocumentacionPageComponent {
  readonly ayudaService = inject(AyudaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly busquedasPopulares = BUSQUEDAS_POPULARES;
  readonly termino = signal('');

  readonly modulos = this.ayudaService.capitulosDocumentacion.filter(c => c.categoria !== CATEGORIA_FAQ);
  readonly preguntasFrecuentes =
    this.ayudaService.capitulosDocumentacion.find(c => c.categoria === CATEGORIA_FAQ)?.articulos ?? [];

  private readonly textos = new Map(this.ayudaService.articulosDocumentacion.map(a => [a, textoBuscable(a)]));

  private readonly slugActivo = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('articulo'))),
    { initialValue: null }
  );

  readonly articuloActivo = computed(() => {
    const slug = this.slugActivo();
    return slug ? this.ayudaService.articulosDocumentacion.find(a => a.slug === slug) ?? null : null;
  });

  readonly relacionados = computed(() => {
    const activo = this.articuloActivo();
    return activo
      ? this.ayudaService.articulosDocumentacion.filter(a => a.categoria === activo.categoria && a !== activo)
      : [];
  });

  readonly resultados = computed(() => {
    const term = normalizar(this.termino().trim());
    if (!term) return [];
    return this.ayudaService.articulosDocumentacion.filter(a => this.textos.get(a)!.includes(term));
  });

  icono(categoria: string): string {
    return ICONOS_CATEGORIA[categoria] ?? 'pi-book';
  }

  buscar(valor: string): void {
    this.termino.set(valor);
  }

  abrir(articulo: ArticuloDocumentacion): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { articulo: articulo.slug } });
  }

  volver(): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
}

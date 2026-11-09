import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { NotificationService } from './notification.service';
import {
  ArticuloDocumentacion,
  CATEGORIAS_DOCUMENTACION,
  CapituloDocumentacion,
  DOCUMENTACION_ARTICULOS,
  slugDocumentacion
} from './documentacion';

export type { ArticuloDocumentacion, CapituloDocumentacion } from './documentacion';
export { CATEGORIA_FAQ, slugDocumentacion } from './documentacion';

function agruparEnCapitulos(articulos: ArticuloDocumentacion[]): CapituloDocumentacion[] {
  const porCategoria = new Map<string, ArticuloDocumentacion[]>();
  for (const articulo of articulos) {
    const lista = porCategoria.get(articulo.categoria) ?? [];
    lista.push(articulo);
    porCategoria.set(articulo.categoria, lista);
  }

  // Primero las categorías conocidas en su orden; cualquier otra, al final.
  const capitulos: CapituloDocumentacion[] = [];
  for (const categoria of new Set([...CATEGORIAS_DOCUMENTACION, ...porCategoria.keys()])) {
    const articulosCategoria = porCategoria.get(categoria);
    if (articulosCategoria) capitulos.push({ categoria, articulos: articulosCategoria });
  }
  return capitulos;
}

/** Estado compartido del widget de ayuda (botón flotante + documentación
 *  en /documentacion + menú de soporte), visible en toda la app vía <app-ayuda-flotante>
 *  en layout.component.html. Cualquier pantalla puede disparar las mismas
 *  acciones (ej. la card de Inicio) inyectando este service. */
@Injectable({ providedIn: 'root' })
export class AyudaService {
  readonly articulosDocumentacion: ArticuloDocumentacion[] = inject(DOCUMENTACION_ARTICULOS).map(a => ({
    ...a,
    slug: slugDocumentacion(a.titulo)
  }));
  readonly capitulosDocumentacion = agruparEnCapitulos(this.articulosDocumentacion);

  readonly soporteMenuItems: MenuItem[] = [
    { label: 'Enviar correo a soporte', icon: 'pi pi-envelope', command: () => this.simularCanalSoporte('correo') },
    { label: 'Llamar a soporte', icon: 'pi pi-phone', command: () => this.simularCanalSoporte('teléfono') },
    { label: 'Chat en vivo', icon: 'pi pi-comments', command: () => this.simularCanalSoporte('chat') }
  ];

  private readonly solicitudMenuSoporteSubject = new Subject<Event>();
  readonly solicitudMenuSoporte$ = this.solicitudMenuSoporteSubject.asObservable();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly router: Router
  ) {}

  abrirDocumentacion(): void {
    this.router.navigate(['/documentacion']);
  }

  abrirMenuSoporte(event: Event): void {
    this.solicitudMenuSoporteSubject.next(event);
  }

  private simularCanalSoporte(canal: string): void {
    this.notificationService.info(`Esto es una simulación -- todavía no hay integración real con ${canal}.`, 'Soporte Directo');
  }
}

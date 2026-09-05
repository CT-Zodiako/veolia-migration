import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { MenuItem } from 'primeng/api';
import { NotificationService } from './notification.service';

export interface ArticuloDocumentacion {
  categoria: string;
  titulo: string;
  contenido: string;
}

export interface CapituloDocumentacion {
  categoria: string;
  numeroRomano: string;
  articulos: ArticuloDocumentacion[];
}

/** Contenido simulado -- no hay base de conocimientos real todavia. */
const DOCUMENTACION_SIMULADA: ArticuloDocumentacion[] = [
  {
    categoria: 'Primeros pasos',
    titulo: 'Cómo navegar el menú y personalizar tu Inicio',
    contenido: 'El menú lateral agrupa las pantallas por módulo. Tocá "Personalizar" arriba a la derecha de Inicio para elegir qué accesos directos ver y cuántas columnas mostrar en la grilla.'
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Cambiar entre modo claro y oscuro',
    contenido: 'El ícono de luna/sol en la barra superior alterna el tema. La preferencia se guarda en tu navegador y se mantiene la próxima vez que entres.'
  },
  {
    categoria: 'Primeros pasos',
    titulo: 'Cambiar de sistema (Sistema Uno, Sistema Dos, Sistema Tres)',
    contenido: 'Desde el selector azul de la barra superior podés pasar de un sistema a otro sin cerrar sesión, siempre que tengas permisos asignados a ambos.'
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Ejecutar y verificar un cálculo de tarifas',
    contenido: 'Elegí APS, año y mes en los selectores de parámetros; la consulta se dispara sola al completar los tres. Los resultados quedan disponibles en Detallado Tarifas apenas termina.'
  },
  {
    categoria: 'Cálculo de Tarifas',
    titulo: 'Entender el detallado de tarifas por APS',
    contenido: 'La tabla de detallado permite fijar columnas, exportar a CSV y guardar vistas propias -- útil cuando comparás el mismo período entre varias APS.'
  },
  {
    categoria: 'Reliquidaciones',
    titulo: 'Crear una reliquidación y comparar costos',
    contenido: 'Reliquidación - Crear arma el período a reliquidar; Comparar Costo te deja ver lado a lado el costo original contra el reliquidado antes de aplicar cualquier cambio.'
  },
  {
    categoria: 'Reliquidaciones',
    titulo: 'Verificar cambios antes de aplicar en tarifas',
    contenido: 'Reliquidación - Tarificador resuelve tanto la verificación de cambios como su aplicación final en una sola pantalla, para no perder el contexto entre ambos pasos.'
  },
  {
    categoria: 'SUI 853',
    titulo: 'Cargue de formatos e integración con el SUI',
    contenido: 'Formatos y Formularios centraliza el envío de la información al SUI; Resumen Formatos y Formularios te deja revisar el estado de cada envío antes de darlo por cerrado.'
  },
  {
    categoria: 'SUI 853',
    titulo: 'Revisar CFT, CVA y demás formatos técnicos',
    contenido: 'Cada pantalla de SUI 853 (CFT, CRLUS, CBLS, CBLUS, CBICS) trae su propia tabla con columnas fijas de identificación y el resto editable según el formato SUI correspondiente.'
  },
  {
    categoria: 'Suministros',
    titulo: 'Cargue mensual y semestral de información',
    contenido: 'Cargue Mensual y Cargue Semestral aceptan el mismo tipo de archivo que usabas antes; el sistema valida el formato apenas lo subís y te avisa si falta algún campo obligatorio.'
  },
  {
    categoria: 'Suministros',
    titulo: 'Ejecutar y autorizar una reversión',
    contenido: 'Ejecutar Reversión dispara el proceso; Autorización Reversiones es el paso donde un segundo usuario aprueba antes de que el cambio impacte en Histórico Reversión.'
  },
  {
    categoria: 'PGIRS',
    titulo: 'Cargar variables e informes PGIRS',
    contenido: 'Variables PGIRS permite edición inline fila por fila; PGIRS - Resumen resalta en colores las diferencias contra el período anterior para detectar variaciones rápido.'
  },
  {
    categoria: 'Proyecciones',
    titulo: 'Crear una proyección y líneas de tiempo',
    contenido: 'Crear Proyección arma el escenario base; Líneas de Tiempo y Crecimiento Variables Programadas te dejan ajustar la evolución esperada antes de Proyectar el resultado final.'
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Qué hago si un cargue queda con error?',
    contenido: 'Si sos usuario de soporte, el panel de logs (ícono de base de datos, abajo a la derecha) muestra el detalle técnico del error real devuelto por la base de datos.'
  },
  {
    categoria: 'Preguntas frecuentes',
    titulo: '¿Cómo recupero mi contraseña?',
    contenido: 'Por ahora el cambio de contraseña lo gestiona un administrador desde Configuración > Usuarios -- no hay todavía un flujo de autogestión para el usuario final.'
  }
];

const NUMEROS_ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function agruparEnCapitulos(articulos: ArticuloDocumentacion[]): CapituloDocumentacion[] {
  const capitulos: CapituloDocumentacion[] = [];
  const porCategoria = new Map<string, ArticuloDocumentacion[]>();

  for (const articulo of articulos) {
    const lista = porCategoria.get(articulo.categoria) ?? [];
    lista.push(articulo);
    porCategoria.set(articulo.categoria, lista);
  }

  let indice = 0;
  for (const [categoria, articulosCategoria] of porCategoria) {
    capitulos.push({
      categoria,
      numeroRomano: NUMEROS_ROMANOS[indice] ?? String(indice + 1),
      articulos: articulosCategoria
    });
    indice++;
  }

  return capitulos;
}

/** Estado compartido del widget de ayuda (botón flotante + documentación
 *  simulada + menú de soporte), visible en toda la app vía <app-ayuda-flotante>
 *  en layout.component.html. Cualquier pantalla puede disparar las mismas
 *  acciones (ej. la card de Inicio) inyectando este service. */
@Injectable({ providedIn: 'root' })
export class AyudaService {
  readonly mostrarDocumentacion = signal(false);
  readonly articuloSeleccionado = signal<ArticuloDocumentacion | null>(null);
  readonly capitulosDocumentacion = agruparEnCapitulos(DOCUMENTACION_SIMULADA);

  readonly soporteMenuItems: MenuItem[] = [
    { label: 'Enviar correo a soporte', icon: 'pi pi-envelope', command: () => this.simularCanalSoporte('correo') },
    { label: 'Llamar a soporte', icon: 'pi pi-phone', command: () => this.simularCanalSoporte('teléfono') },
    { label: 'Chat en vivo', icon: 'pi pi-comments', command: () => this.simularCanalSoporte('chat') }
  ];

  private readonly solicitudMenuSoporteSubject = new Subject<Event>();
  readonly solicitudMenuSoporte$ = this.solicitudMenuSoporteSubject.asObservable();

  constructor(private readonly notificationService: NotificationService) {}

  abrirDocumentacion(): void {
    this.articuloSeleccionado.set(null);
    this.mostrarDocumentacion.set(true);
  }

  verArticulo(articulo: ArticuloDocumentacion): void {
    this.articuloSeleccionado.set(articulo);
  }

  volverAlListado(): void {
    this.articuloSeleccionado.set(null);
  }

  abrirMenuSoporte(event: Event): void {
    this.solicitudMenuSoporteSubject.next(event);
  }

  private simularCanalSoporte(canal: string): void {
    this.notificationService.info(`Esto es una simulación -- todavía no hay integración real con ${canal}.`, 'Soporte Directo');
  }
}

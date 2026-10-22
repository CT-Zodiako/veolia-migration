import { Component, OnInit, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { TablaAvanzadaComponent, TablaColumn } from '../shared/tabla-avanzada.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { CdftRow } from '../../models/sui853-cft.model';

// Legacy cdft.vue formatMoney()/formatNumber(): toLocaleString("es-CO",
// { minimumFractionDigits: 2 }) -- sin máximo explícito, Intl usa 3.
const FORMATO_NUMERO = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2 });

// cdft.vue (legacy) — /cdft — pantalla distinta al resto de SUI853/CFT: no
// consume SUI.f_render_formato2 (sin SIN_MOVIMIENTO/CON_MOVIMIENTO), consulta
// por año vía POST api/v1/sui853/cdft/cdft { anno } y devuelve un listado
// plano por APS. Columnas fijas conocidas de antemano -> app-tabla-avanzada
// con columnas declaradas a mano, no dinámicas como en Sui853Formato2TablaComponent.
@Component({
  selector: 'app-cdft-page',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, AnnoSelectorComponent, TablaAvanzadaComponent],
  templateUrl: './cdft-page.component.html',
  styleUrl: './cdft-page.component.css'
})
export class CdftPageComponent implements OnInit {
  readonly anno = signal<number>(new Date().getFullYear());
  readonly rows = signal<CdftRow[]>([]);
  readonly loading = signal(false);

  readonly columnas: TablaColumn[] = [
    { field: 'annoFiscal', header: 'Año Fiscal' },
    { field: 'nombreAps', header: 'Nombre APS', filtrable: true },
    { field: 'valorCorriente', header: 'Valor Corriente', numero: true },
    { field: 'valor2018', header: 'Valor 2018', numero: true },
    { field: 'qrtz', header: 'QRTZ', numero: true }
  ];

  constructor(
    private readonly service: Sui853CftService,
    private readonly messages: MessageService
  ) {}

  ngOnInit(): void {
    this.consultar();
  }

  onAnnoChange(value: number | null): void {
    this.anno.set(value ?? new Date().getFullYear());
    this.consultar();
  }

  displayValue(col: TablaColumn, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (col.numero) {
      const num = typeof value === 'number' ? value : Number(value);
      return Number.isNaN(num) ? String(value) : FORMATO_NUMERO.format(num);
    }
    return String(value);
  }

  // Legacy cdft.vue copyDisplay() (solo columnas numéricas): copia el valor
  // mostrado como número plano (sin separador de miles, coma -> punto) y
  // muestra un toast "Copiado".
  async copiar(col: TablaColumn, value: unknown): Promise<void> {
    if (!col.numero) return;
    const mostrado = this.displayValue(col, value);
    if (!mostrado) return;
    const limpio = mostrado.replace(/\./g, '').replace(/,/g, '.');
    const texto = Number.isFinite(Number(limpio)) ? limpio : mostrado;
    try {
      await this.copiarAlPortapapeles(texto);
    } catch {
      // Ni la Clipboard API ni el fallback funcionaron -- nada crítico que perder.
      return;
    }
    this.messages.add({ severity: 'success', summary: 'Copiado', detail: texto, life: 1800 });
  }

  // navigator.clipboard solo existe en contexto seguro (HTTPS/localhost);
  // en un deploy por HTTP el legacy caía a textarea + execCommand('copy').
  private async copiarAlPortapapeles(texto: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(texto);
        return;
      } catch {
        // Permiso denegado: probar el fallback.
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      if (!document.execCommand('copy')) {
        throw new Error('execCommand("copy") no pudo copiar el valor.');
      }
    } finally {
      textarea.remove();
    }
  }

  private consultar(): void {
    this.loading.set(true);
    this.service.getCdft(this.anno()).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      }
    });
  }
}

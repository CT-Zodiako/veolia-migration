import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { ApsOption } from '../../models/proyecciones.models';
import { ProyeccionesService } from '../../services/proyecciones.service';

@Component({
  selector: 'app-verificacion-aps',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, ToastModule, TabsModule],
  providers: [MessageService],
  templateUrl: './verificacion-aps.component.html',
  styleUrls: ['./verificacion-aps.component.css']
})
export class VerificacionApsComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  anno = signal<number>(new Date().getFullYear());
  mes = signal<number>(new Date().getMonth() + 1);
  activeTab = signal(0);

  // Estados por pestaña
  emprLoading = signal(false);
  emprData = signal<any[]>([]);
  emprError = signal<string | null>(null);

  apsEmprLoading = signal(false);
  apsEmprData = signal<any[]>([]);
  apsEmprError = signal<string | null>(null);

  rellenoLoading = signal(false);
  rellenoData = signal<any[]>([]);
  rellenoError = signal<string | null>(null);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly proyService: ProyeccionesService,
    private readonly messages: MessageService
  ) {
    this.proyService.listarAps().subscribe({
      next: (data: any) => this.apsOptions.set(data || [])
    });
  }

  consultar(): void {
    const apsId = this.aps();
    const year = this.anno();
    const month = this.mes();
    if (!apsId) {
      this.messages.add({ severity: 'warn', summary: 'Verificación', detail: 'Seleccione un APS' });
      return;
    }
    this.loadTabData(this.activeTab(), apsId, year, month);
  }

  onTabChange(index: number | string | undefined): void {
    if (index === undefined) return;
    const idx = typeof index === 'string' ? parseInt(index, 10) : index;
    this.activeTab.set(idx);
    const apsId = this.aps();
    if (apsId) {
      this.loadTabData(idx, apsId, this.anno(), this.mes());
    }
  }

  loadTabData(tabIndex: number, apsId: number, anno: number, mes: number): void {
    switch (tabIndex) {
      case 0:
        this.loadInfoEmprDivi(apsId, anno, mes);
        break;
      case 1:
        this.loadInfoApsEmprDivi(apsId, anno, mes);
        break;
      case 2:
        this.loadInfoApsRelleno(apsId, anno, mes);
        break;
    }
  }

  private loadInfoEmprDivi(aps: number, anno: number, mes: number): void {
    this.emprLoading.set(true);
    this.emprError.set(null);
    this.service.infoemprdivi(aps, anno, mes).subscribe({
      next: (res: any) => {
        this.emprData.set(res.data || []);
        this.emprLoading.set(false);
      },
      error: (err: any) => {
        this.emprError.set(err?.message || 'Error al consultar empresa/división');
        this.emprLoading.set(false);
      }
    });
  }

  private loadInfoApsEmprDivi(aps: number, anno: number, mes: number): void {
    this.apsEmprLoading.set(true);
    this.apsEmprError.set(null);
    this.service.infoapsemprdivi(aps, anno, mes).subscribe({
      next: (res: any) => {
        this.apsEmprData.set(res.data || []);
        this.apsEmprLoading.set(false);
      },
      error: (err: any) => {
        this.apsEmprError.set(err?.message || 'Error al consultar APS/empresa/división');
        this.apsEmprLoading.set(false);
      }
    });
  }

  private loadInfoApsRelleno(aps: number, anno: number, mes: number): void {
    this.rellenoLoading.set(true);
    this.rellenoError.set(null);
    this.service.infoapsrelleno(aps, anno, mes).subscribe({
      next: (res: any) => {
        this.rellenoData.set(res.data || []);
        this.rellenoLoading.set(false);
      },
      error: (err: any) => {
        this.rellenoError.set(err?.message || 'Error al consultar rellenos');
        this.rellenoLoading.set(false);
      }
    });
  }
}

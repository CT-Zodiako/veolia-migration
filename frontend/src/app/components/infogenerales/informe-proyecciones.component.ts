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
import { InfoGeneralesService } from '../../services/infogenerales.service';
import { ProyeccionesService } from '../../services/proyecciones.service';
import { ApsOption } from '../../models/proyecciones.models';

interface ProyeccionOption {
  proyId: number;
  proyNombre: string;
  apsaId: number;
}

@Component({
  selector: 'app-informe-proyecciones',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, SelectModule, TableModule, ToastModule, TabsModule],
  providers: [MessageService],
  templateUrl: './informe-proyecciones.component.html',
  styleUrls: ['./informe-proyecciones.component.css']
})
export class InformeProyeccionesComponent {
  aps = signal<number | null>(null);
  apsOptions = signal<ApsOption[]>([]);
  proyecciones = signal<ProyeccionOption[]>([]);
  proyId = signal<number | null>(null);
  activeTab = signal(0);

  // Estados por pestaña
  energiaLoading = signal(false);
  energiaData = signal<any[]>([]);
  energiaError = signal<string | null>(null);

  acueductoLoading = signal(false);
  acueductoData = signal<any[]>([]);
  acueductoError = signal<string | null>(null);

  costosLoading = signal(false);
  costosData = signal<any[]>([]);
  costosError = signal<string | null>(null);

  tarifasLoading = signal(false);
  tarifasData = signal<any[]>([]);
  tarifasError = signal<string | null>(null);

  constructor(
    private readonly service: InfoGeneralesService,
    private readonly proyService: ProyeccionesService,
    private readonly messages: MessageService
  ) {
    this.proyService.listarAps().subscribe({
      next: (data) => this.apsOptions.set(data || [])
    });
  }

  onApsChange(): void {
    const apsId = this.aps();
    if (!apsId) {
      this.proyecciones.set([]);
      this.proyId.set(null);
      return;
    }
    this.proyService.consulta(apsId).subscribe({
      next: (res) => {
        const opts = (res.data || []).map((p) => ({
          proyId: p.proyId,
          proyNombre: p.proyNombre,
          apsaId: p.apsaId
        }));
        this.proyecciones.set(opts);
      },
      error: () => this.proyecciones.set([])
    });
  }

  onProyChange(): void {
    this.loadTabData(this.activeTab());
  }

  onTabChange(index: number | string | undefined): void {
    if (index === undefined) return;
    const idx = typeof index === 'string' ? parseInt(index, 10) : index;
    this.activeTab.set(idx);
    if (this.proyId()) {
      this.loadTabData(idx);
    }
  }

  loadTabData(tabIndex: number): void {
    const apsId = this.aps();
    const pId = this.proyId();
    if (!apsId || !pId) return;

    switch (tabIndex) {
      case 0:
        this.loadEnergia(apsId, pId);
        break;
      case 1:
        this.loadAcueducto(apsId, pId);
        break;
      case 2:
        this.loadCostos(apsId, pId);
        break;
      case 3:
        this.loadTarifas(apsId, pId);
        break;
    }
  }

  private loadEnergia(apsId: number, proyId: number): void {
    this.energiaLoading.set(true);
    this.energiaError.set(null);
    this.service.consultaEnergia(apsId, proyId).subscribe({
      next: (res) => {
        this.energiaData.set(res.data || []);
        this.energiaLoading.set(false);
      },
      error: (err) => {
        this.energiaError.set(err?.message || 'Error al consultar energía');
        this.energiaLoading.set(false);
      }
    });
  }

  private loadAcueducto(apsId: number, proyId: number): void {
    this.acueductoLoading.set(true);
    this.acueductoError.set(null);
    this.service.consultaAcueducto(apsId, proyId).subscribe({
      next: (res) => {
        this.acueductoData.set(res.data || []);
        this.acueductoLoading.set(false);
      },
      error: (err) => {
        this.acueductoError.set(err?.message || 'Error al consultar acueducto');
        this.acueductoLoading.set(false);
      }
    });
  }

  private loadCostos(apsId: number, proyId: number): void {
    this.costosLoading.set(true);
    this.costosError.set(null);
    this.service.consultaCostos(apsId, proyId).subscribe({
      next: (res) => {
        this.costosData.set(res.data || []);
        this.costosLoading.set(false);
      },
      error: (err) => {
        this.costosError.set(err?.message || 'Error al consultar costos');
        this.costosLoading.set(false);
      }
    });
  }

  private loadTarifas(apsId: number, proyId: number): void {
    this.tarifasLoading.set(true);
    this.tarifasError.set(null);
    this.service.consultaTarifas(apsId, proyId).subscribe({
      next: (res) => {
        this.tarifasData.set(res.data || []);
        this.tarifasLoading.set(false);
      },
      error: (err) => {
        this.tarifasError.set(err?.message || 'Error al consultar tarifas');
        this.tarifasLoading.set(false);
      }
    });
  }
}

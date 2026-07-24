import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InfoGerencialService } from '../../services/infogerenciales.service';
import { periodoAnterior } from '../../shared/periodo-anterior.util';
import { AnnoSelectorComponent } from '../shared/anno-selector.component';
import { MesSelectorComponent } from '../shared/mes-selector.component';

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TableModule, ToastModule, AnnoSelectorComponent, MesSelectorComponent],
  providers: [MessageService],
  templateUrl: './dashboard-gerencial.component.html',
  styleUrls: ['./dashboard-gerencial.component.css']
})
export class DashboardGerencialComponent {
  anno = signal<number | null>(new Date().getFullYear());
  mes = signal<number | null>(new Date().getMonth() + 1);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any[]>([]);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {}

  consultar(): void {
    const anno = this.anno();
    const mes = this.mes();
    if (!anno || !mes) {
      this.error.set('Debe seleccionar año y mes.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.data.set([]);

    const periodo = periodoAnterior(anno, mes);
    this.service.getDashBoardGerencial(periodo.anno, periodo.mes).subscribe({
      next: (res) => {
        this.data.set(res?.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Error al consultar dashboard gerencial';
        this.error.set(msg);
        this.messages.add({ severity: 'error', summary: 'Dashboard gerencial', detail: msg });
        this.loading.set(false);
      }
    });
  }
}

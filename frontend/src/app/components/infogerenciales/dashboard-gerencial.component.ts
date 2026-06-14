import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InfoGerencialService } from '../../services/infogerenciales.service';

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, TableModule, ToastModule],
  providers: [MessageService],
  templateUrl: './dashboard-gerencial.component.html',
  styleUrls: ['./dashboard-gerencial.component.css']
})
export class DashboardGerencialComponent {
  anno = signal<number>(new Date().getFullYear());
  mes = signal<number>(new Date().getMonth() + 1);

  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<any[]>([]);

  constructor(
    private readonly service: InfoGerencialService,
    private readonly messages: MessageService
  ) {}

  consultar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.data.set([]);

    this.service.getDashBoardGerencial(this.anno(), this.mes()).subscribe({
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

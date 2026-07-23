import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ReversionHistoryItem, SuministrosService } from '../../services/suministros.service';

@Component({
  selector: 'app-historico-reversion',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  providers: [DatePipe],
  templateUrl: './historico-reversion.component.html',
  styleUrl: './historico-reversion.component.css'
})
export class HistoricoReversionComponent implements OnInit {
  rows: ReversionHistoryItem[] = [];
  loading = false;
  error = '';

  apsFilter = '';
  annoFilter = '';
  mesFilter = '';
  fechaFilter = '';
  usuarioFilter = '';

  get filteredRows(): ReversionHistoryItem[] {
    return this.rows.filter(row =>
      this.coincide(row.nombreAps, this.apsFilter) &&
      this.coincide(row.anno, this.annoFilter) &&
      this.coincide(row.mes, this.mesFilter) &&
      this.coincide(this.datePipe.transform(row.fecha, 'dd/MM/yyyy HH:mm'), this.fechaFilter) &&
      this.coincide(row.usuario, this.usuarioFilter)
    );
  }

  constructor(
    private readonly suministrosService: SuministrosService,
    private readonly datePipe: DatePipe,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.error = '';

    this.suministrosService.getReversion().subscribe({
      next: (data) => {
        this.rows = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.data || 'Error al consultar histórico';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private coincide(valor: unknown, filtro: string): boolean {
    const term = filtro.trim().toLowerCase();
    if (!term) return true;
    return String(valor ?? '').toLowerCase().includes(term);
  }
}

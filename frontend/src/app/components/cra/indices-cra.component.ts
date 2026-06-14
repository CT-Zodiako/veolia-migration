import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { IndicesCraService, IndicesPayload } from '../../services/indices-cra.service';

@Component({
  selector: 'app-indices-cra',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules, ToastModule, DialogModule],
  providers: [MessageService],
  templateUrl: './indices-cra.component.html',
  styleUrls: ['./indices-cra.component.css']
})
export class IndicesCraComponent implements OnInit {
  anno = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth() + 1);
  loading = signal(false);
  rows = signal<any[]>([]);
  dialogVisible = signal(false);
  isEdit = signal(false);
  selectedRow = signal<any | null>(null);

  formAnno = signal(new Date().getFullYear());
  formMes = signal(new Date().getMonth() + 1);
  ipc = signal<number | null>(null);
  smlv = signal<number | null>(null);
  ipcc = signal<number | null>(null);
  ioexp = signal<number | null>(null);

  meses = [
    { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 }, { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 }, { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 }, { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 }, { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
  ];

  constructor(private readonly service: IndicesCraService, private readonly messages: MessageService) {}

  ngOnInit(): void {
    this.consultar();
  }

  consultar(): void {
    this.loading.set(true);
    this.service.consultar(this.anno(), this.mes()).subscribe({
      next: (res) => {
        this.rows.set(res.data || []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Índices CRA', detail: err?.error?.message || 'Error al consultar índices.' });
      }
    });
  }

  abrirNuevo(): void {
    this.isEdit.set(false);
    this.selectedRow.set(null);
    this.formAnno.set(this.anno());
    this.formMes.set(this.mes());
    this.ipc.set(null);
    this.smlv.set(null);
    this.ipcc.set(null);
    this.ioexp.set(null);
    this.dialogVisible.set(true);
  }

  abrirEditar(row: any): void {
    this.isEdit.set(true);
    this.selectedRow.set(row);
    this.formAnno.set(row.indiAnno);
    this.formMes.set(row.indiMes);

    const periodRows = this.rows().filter((x) => x.indiAnno === row.indiAnno && x.indiMes === row.indiMes);
    this.ipc.set(periodRows.find((x) => x.paraIndice20011 === 1)?.indiValor ?? null);
    this.smlv.set(periodRows.find((x) => x.paraIndice20011 === 2)?.indiValor ?? null);
    this.ipcc.set(periodRows.find((x) => x.paraIndice20011 === 3)?.indiValor ?? null);
    this.ioexp.set(periodRows.find((x) => x.paraIndice20011 === 4)?.indiValor ?? null);
    this.dialogVisible.set(true);
  }

  guardar(): void {
    if (!this.formValido()) {
      this.messages.add({ severity: 'warn', summary: 'Índices CRA', detail: 'Completá año, mes y los 4 valores.' });
      return;
    }

    const payload: IndicesPayload = {
      anno: this.formAnno(),
      mes: this.formMes(),
      valores: [
        { id: 1, val: this.ipc()! },
        { id: 2, val: this.smlv()! },
        { id: 3, val: this.ipcc()! },
        { id: 4, val: this.ioexp()! }
      ]
    };

    this.loading.set(true);
    const request$ = this.isEdit() ? this.service.editar(payload) : this.service.crear(payload);
    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.dialogVisible.set(false);
        this.messages.add({ severity: 'success', summary: 'Índices CRA', detail: this.isEdit() ? 'Índices actualizados.' : 'Índices creados.' });
        this.anno.set(this.formAnno());
        this.mes.set(this.formMes());
        this.consultar();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Índices CRA', detail: err?.error?.message || 'No se pudo guardar.' });
      }
    });
  }

  eliminar(row: any): void {
    const ok = window.confirm('¿Seguro que querés eliminar este índice del período?');
    if (!ok) return;

    this.loading.set(true);
    this.service.eliminar(row.paraIndice20011, row.indiAnno, row.indiMes).subscribe({
      next: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'success', summary: 'Índices CRA', detail: 'Índice eliminado.' });
        this.consultar();
      },
      error: (err: any) => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Índices CRA', detail: err?.error?.message || 'No se pudo eliminar.' });
      }
    });
  }

  private formValido(): boolean {
    return this.formAnno() > 0 && this.formMes() >= 1 && this.formMes() <= 12
      && this.ipc() !== null && this.smlv() !== null && this.ipcc() !== null && this.ioexp() !== null;
  }
}

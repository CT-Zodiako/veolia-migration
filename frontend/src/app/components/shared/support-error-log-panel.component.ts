import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { SupportErrorLogService } from '../../services/support-error-log.service';

@Component({
  selector: 'app-support-error-log-panel',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules],
  templateUrl: './support-error-log-panel.component.html',
  styleUrls: ['./support-error-log-panel.component.css']
})
export class SupportErrorLogPanelComponent {
  private readonly supportErrorLogService = inject(SupportErrorLogService);

  readonly logs = this.supportErrorLogService.logs;
  readonly abierto = signal(false);

  toggle(): void {
    this.abierto.update(v => !v);
  }

  limpiar(): void {
    this.supportErrorLogService.clear();
  }
}

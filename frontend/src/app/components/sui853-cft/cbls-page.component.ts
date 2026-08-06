import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { Formato2Response } from '../../models/sui853-cft.model';

// cbls.vue (legacy) — F853003, sin tabs, sin selector de parámetros. Se
// envuelve en p-tabs de un solo tab (SEG1), misma estructura que las otras
// 7 pantallas de CFT, lista para sumar más segmentos.
@Component({
  selector: 'app-cbls-page',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, Sui853Formato2TablaComponent],
  templateUrl: './cbls-page.component.html',
  styleUrl: './cbls-page.component.css'
})
export class CblsPageComponent implements OnInit {
  readonly data = signal<Formato2Response | null>(null);
  readonly loading = signal(false);

  constructor(private readonly service: Sui853CftService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.service.getCbls().subscribe({
      next: (res) => {
        this.data.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.data.set(null);
        this.loading.set(false);
      }
    });
  }
}

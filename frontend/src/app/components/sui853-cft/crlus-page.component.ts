import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { Formato2Response } from '../../models/sui853-cft.model';

// crlus.vue (legacy) — F853002, sin tabs, sin selector de parámetros. Se
// envuelve en p-tabs de un solo tab (SEG1) igual que CFT/CSS Aprovechamiento
// -- misma estructura para las 8 pantallas, lista para sumar más segmentos.
@Component({
  selector: 'app-crlus-page',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, Sui853Formato2TablaComponent],
  templateUrl: './crlus-page.component.html',
  styleUrl: './crlus-page.component.css'
})
export class CrlusPageComponent implements OnInit {
  readonly data = signal<Formato2Response | null>(null);
  readonly loading = signal(false);

  constructor(private readonly service: Sui853CftService) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.service.getCrlus().subscribe({
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

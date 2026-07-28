import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../shared/primeng-imports';
import { Sui853Formato2TablaComponent } from '../shared/sui853-formato2-tabla.component';
import { Sui853CftService } from '../../services/sui853-cft.service';
import { Formato2Response } from '../../models/sui853-cft.model';

// cft.vue (legacy) — 3 tabs (SEG1/SEG2/SEG3), cada uno con su propio código
// de formato SUI (F853S105/F853S209/F853S306). Ver doc migracion/modules/sui853/CFT.md.
@Component({
  selector: 'app-cft-page',
  standalone: true,
  imports: [CommonModule, ...CommonPrimeNgModules, Sui853Formato2TablaComponent],
  templateUrl: './cft-page.component.html',
  styleUrl: './cft-page.component.css'
})
export class CftPageComponent implements OnInit {
  readonly activeTab = signal(0);

  readonly seg1 = signal<Formato2Response | null>(null);
  readonly loadingSeg1 = signal(false);
  readonly seg2 = signal<Formato2Response | null>(null);
  readonly loadingSeg2 = signal(false);
  readonly seg3 = signal<Formato2Response | null>(null);
  readonly loadingSeg3 = signal(false);

  constructor(private readonly service: Sui853CftService) {}

  ngOnInit(): void {
    this.cargarSeg1();
    this.cargarSeg2();
    this.cargarSeg3();
  }

  onTabChange(value: unknown): void {
    this.activeTab.set(Number(value));
  }

  private cargarSeg1(): void {
    this.loadingSeg1.set(true);
    this.service.getCft().subscribe({
      next: (res) => {
        this.seg1.set(res.data);
        this.loadingSeg1.set(false);
      },
      error: () => {
        this.seg1.set(null);
        this.loadingSeg1.set(false);
      }
    });
  }

  private cargarSeg2(): void {
    this.loadingSeg2.set(true);
    this.service.getCftSeg2().subscribe({
      next: (res) => {
        this.seg2.set(res.data);
        this.loadingSeg2.set(false);
      },
      error: () => {
        this.seg2.set(null);
        this.loadingSeg2.set(false);
      }
    });
  }

  private cargarSeg3(): void {
    this.loadingSeg3.set(true);
    this.service.getCftSeg3().subscribe({
      next: (res) => {
        this.seg3.set(res.data);
        this.loadingSeg3.set(false);
      },
      error: () => {
        this.seg3.set(null);
        this.loadingSeg3.set(false);
      }
    });
  }
}

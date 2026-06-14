import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CommonPrimeNgModules } from '../../../shared/primeng-imports';
import { AuthService, Sistema } from '../../../services/auth.service';

@Component({
  selector: 'app-menux-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, ...CommonPrimeNgModules],
  templateUrl: './menux-usuario.component.html',
  styleUrls: ['./menux-usuario.component.css']
})
export class MenuxUsuarioComponent implements OnInit {
  usuarios: any[] = [];
  sistemas: Sistema[] = [];
  selectedUsuarioId: number | null = null;
  selectedSistemaId: number | null = null;
  menuTree: any[] = [];
  selectedMenuIds: number[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(
    private authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsuarios();
    this.loadSistemas();
  }

  loadUsuarios(): void {
    this.authService.getAllUsers().subscribe({
      next: (usuarios: any[]) => {
        this.usuarios = usuarios;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar usuarios';
        this.cdr.detectChanges();
      }
    });
  }

  loadSistemas(): void {
    this.authService.getAllSistemas().subscribe({
      next: (sistemas: Sistema[]) => {
        this.sistemas = sistemas;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar sistemas';
        this.cdr.detectChanges();
      }
    });
  }

  cargarMenu(): void {
    if (!this.selectedUsuarioId || !this.selectedSistemaId) return;

    this.loading = true;
    this.error = '';

    // Cargar árbol general
    this.authService.getGeneralMenuTree().subscribe({
      next: (tree: any[]) => {
        this.menuTree = tree;
        this.cdr.detectChanges();
        // Cargar menú actual del usuario
        this.authService.getMenuByUser(this.selectedSistemaId!, this.selectedUsuarioId!).subscribe({
          next: (menuIds: number[]) => {
            this.selectedMenuIds = menuIds || [];
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            this.error = err.error?.message || 'Error al cargar menú del usuario';
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al cargar árbol de menú';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleMenuItem(menuId: number): void {
    const index = this.selectedMenuIds.indexOf(menuId);
    if (index > -1) {
      this.selectedMenuIds.splice(index, 1);
    } else {
      this.selectedMenuIds.push(menuId);
    }
  }

  isSelected(menuId: number): boolean {
    return this.selectedMenuIds.includes(menuId);
  }

  get usuarioOptions(): { label: string; value: number }[] {
    return this.usuarios.map(u => ({
      label: `${u.SISU_NOMBRE} ${u.SISU_APELLIDO}`,
      value: u.SISU_ID
    }));
  }

  get sistemaOptions(): { label: string; value: number }[] {
    return this.sistemas.map(s => ({
      label: s.SIST_NOMBRE,
      value: s.SIST_ID
    }));
  }

  guardar(): void {
    if (!this.selectedUsuarioId || !this.selectedSistemaId) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.uptUserMenu(
      this.selectedUsuarioId,
      this.selectedMenuIds,
      this.selectedSistemaId
    ).subscribe({
      next: () => {
        this.success = 'Menú guardado correctamente';
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Error al guardar menú';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  cards = [
    { title: 'Usuarios', description: 'Gestión de usuarios del sistema', route: '/usuarios', icon: '👥', color: '#0284c7' },
    { title: 'APS', description: 'Asignación de APS por usuario', route: '/aps-usuario', icon: '⚙️', color: '#0891b2' },
    { title: 'Sistemas', description: 'Asignación de sistemas', route: '/asignacion-sistema', icon: '🖥️', color: '#0e7490' },
    { title: 'Menú', description: 'Configuración de menú por usuario', route: '/menu-usuario', icon: '📋', color: '#155e75' }
  ];
}

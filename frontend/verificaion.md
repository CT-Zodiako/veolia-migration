<!DOCTYPE html>

<html class="light" lang="es"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Vacano - Panel de Servicios</title>
<!-- Material Symbols -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Google Fonts: Montserrat & Inter -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&amp;family=Montserrat:wght@600;700;800&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "primary": "#ba0035",
                        "primary-container": "#e12149",
                        "on-primary": "#ffffff",
                        "secondary": "#a53b29",
                        "background": "#f8f9fa",
                        "on-background": "#191c1d",
                        "surface": "#f8f9fa",
                        "on-surface": "#191c1d",
                        "surface-variant": "#e1e3e4",
                        "on-surface-variant": "#5c3f41",
                        "outline": "#906f70",
                        "outline-variant": "#e5bdbe",
                        "surface-container-lowest": "#ffffff",
                        "surface-container-low": "#f3f4f5",
                        "surface-container": "#edeeef",
                        "surface-container-high": "#e7e8e9",
                        "surface-container-highest": "#e1e3e4",
                    },
                    "borderRadius": {
                        "DEFAULT": "8px",
                        "lg": "12px",
                        "xl": "16px",
                        "full": "9999px"
                    },
                    "spacing": {
                        "gutter": "24px",
                        "sidebar-wide": "260px",
                        "sidebar-narrow": "72px"
                    },
                    "fontFamily": {
                        "display": ["Montserrat", "sans-serif"],
                        "body": ["Inter", "sans-serif"]
                    }
                },
            },
        }
    </script>
<style>
        body {
            background-color: #f8f9fa;
            color: #191c1d;
            font-family: 'Inter', sans-serif;
            overflow-x: hidden;
        }
        h1, h2, h3, h4, .font-montserrat {
            font-family: 'Montserrat', sans-serif;
        }
        .sidebar-transition {
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-clay {
            background: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.7);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 
                        inset 0 0 12px rgba(255, 255, 255, 0.6);
            transition: all 0.3s ease;
        }
        .card-clay:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(186, 0, 53, 0.08);
        }
        .sidebar-item:hover {
            background-color: rgba(186, 0, 53, 0.05);
        }
        .sidebar-collapsed .sidebar-text {
            display: none;
        }
        .sidebar-collapsed .sidebar-logo-text {
            display: none;
        }
        .sidebar-collapsed .chevron-icon {
            display: none;
        }
    </style>
</head>
<body class="flex min-h-screen">
<!-- Sidebar -->
<aside class="sidebar-transition w-sidebar-wide bg-white border-r border-surface-variant/50 flex flex-col sticky top-0 h-screen z-[60]" id="sidebar">
<!-- Sidebar Header -->
<div class="p-4 flex items-center justify-between border-b border-surface-variant/30 h-16">
<div class="flex items-center gap-3 overflow-hidden">
<div class="bg-primary p-1.5 rounded-lg shrink-0">
<span class="material-symbols-outlined text-white text-[20px]">dataset</span>
</div>
<span class="sidebar-logo-text font-display font-bold text-primary text-xl truncate">Vacano</span>
</div>
<button class="p-1 hover:bg-surface-container rounded-lg transition-colors" id="sidebarToggle">
<span class="material-symbols-outlined text-on-surface-variant">menu_open</span>
</button>
</div>
<!-- Sidebar Content -->
<div class="flex-grow overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
<div class="mb-4">
<div class="px-3 mb-2 sidebar-text">
<span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Menú Principal</span>
</div>
<nav class="space-y-1">
<a class="sidebar-item flex items-center gap-3 p-3 rounded-lg text-primary bg-primary/5 font-semibold transition-all" href="#">
<span class="material-symbols-outlined">dashboard</span>
<span class="sidebar-text truncate">Inicio</span>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">settings</span>
<span class="sidebar-text truncate">Administración</span>
</div>
<span class="material-symbols-outlined text-[18px] chevron-icon opacity-40">chevron_right</span>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">settings_suggest</span>
<span class="sidebar-text truncate">Operaciones</span>
</div>
<span class="material-symbols-outlined text-[18px] chevron-icon opacity-40">chevron_right</span>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">folder_shared</span>
<span class="sidebar-text truncate">Gestión</span>
</div>
<span class="material-symbols-outlined text-[18px] chevron-icon opacity-40">chevron_right</span>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">history_edu</span>
<span class="sidebar-text truncate">Logs</span>
</div>
<span class="material-symbols-outlined text-[18px] chevron-icon opacity-40">chevron_right</span>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">assessment</span>
<span class="sidebar-text truncate">Reportes</span>
</div>
<span class="material-symbols-outlined text-[18px] chevron-icon opacity-40">chevron_right</span>
</a>
</nav>
</div>
<div>
<div class="px-3 mb-2 sidebar-text">
<span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/50">Métricas &amp; Soporte</span>
</div>
<nav class="space-y-1">
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">monitoring</span>
<span class="sidebar-text truncate">Administrar indicadores</span>
</div>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">notifications_active</span>
<span class="sidebar-text truncate">Tablero alertas</span>
</div>
</a>
<a class="sidebar-item flex items-center justify-between p-3 rounded-lg text-on-surface-variant hover:text-primary transition-all group" href="#">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined">support_agent</span>
<span class="sidebar-text truncate">PQRS</span>
</div>
</a>
</nav>
</div>
</div>
<!-- Sidebar Footer -->
<div class="p-4 border-t border-surface-variant/30">
<div class="flex items-center gap-3 overflow-hidden">
<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
<span class="material-symbols-outlined text-primary">person</span>
</div>
<div class="sidebar-text overflow-hidden">
<p class="text-xs font-bold text-on-surface truncate">Laura López</p>
<p class="text-[10px] text-on-surface-variant truncate">laura.lopez@soluciones...</p>
</div>
</div>
</div>
</aside>
<!-- Main Content Wrapper -->
<div class="flex-grow flex flex-col min-w-0">
<!-- Top Navigation -->
<header class="h-16 bg-white border-b border-surface-variant/30 flex items-center justify-between px-8 sticky top-0 z-50">
<div class="flex items-center gap-4">
<h2 class="font-display font-bold text-on-surface text-lg">Panel de Servicios</h2>
<div class="h-6 w-px bg-surface-variant mx-2 hidden md:block"></div>
<nav class="hidden md:flex items-center gap-2 text-xs text-on-surface-variant">
<span class="hover:text-primary cursor-pointer transition-colors">Sigab</span>
<span class="material-symbols-outlined text-[14px]">chevron_right</span>
<span class="font-semibold text-on-surface">Ayuda</span>
</nav>
</div>
<div class="flex items-center gap-6">
<div class="relative hidden sm:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
<input class="bg-surface-container-low border-none rounded-full py-1.5 pl-10 pr-4 text-xs w-64 focus:ring-1 focus:ring-primary transition-all" placeholder="Buscar módulo..." type="text"/>
</div>
<div class="flex items-center gap-4">
<button class="relative p-1.5 hover:bg-surface-container rounded-full transition-colors group">
<span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary">notifications</span>
<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
</button>
<button class="p-1.5 hover:bg-surface-container rounded-full transition-colors">
<span class="material-symbols-outlined text-on-surface-variant">apps</span>
</button>
<div class="w-8 h-8 rounded-full bg-surface-container-highest border border-surface-variant/50 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
<img alt="Profile" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8RDbU2e0oWfLIByFGC3vRoR3yatf79enHSiZOmuPoH4EzcBh12TB8zpm1SNWqHtW5oNrpgl5CaXEUtEA-IXrjtsuJDUfKC52cDmn1q1JqdHDerdpYbfuNuPc5f3ROozFQ-ItHHxtOeCu5Krk0NOqJ5AYV2PexqHRJBdEOSFhXBVAn2fCU7P3iSQ4GeALNMS_hvaD4096fmMGW4RyO2LNsb8jpL-ahmWZnOMmxxG22Iw4VMuB_tIB9cw"/>
</div>
</div>
</div>
</header>
<!-- Main Dashboard Content -->
<main class="p-8 md:p-12 max-w-[1400px] mx-auto w-full">
<div class="mb-12 text-center">
<h1 class="font-display font-extrabold text-3xl md:text-4xl text-on-surface mb-3 tracking-tight">Bienvenido de nuevo</h1>
<p class="text-on-surface-variant max-w-xl mx-auto text-sm md:text-base opacity-80">
                    Gestiona tus operaciones con claridad y velocidad. Selecciona un módulo para comenzar tu jornada.
                </p>
</div>
<!-- Services Grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
<!-- Facturación -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Facturación" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLtbiosWVM3S3rvcfKiu7MCANSXhROwNgVjUSJa0txW9Pm2f2MyierMgZYGqWbwtylMxjO4ueeaxTddUbySZQhbmJbK85shnoutnNnsL2fO2YR-X6FzGYp-g_qbmk9KlO5Tj26UzGmm_IPAfg10qE4L5GTdXLA1G-EeXpz3-txUNfzSGh0xS5AaEQHORK8nS6EYPpHnoLJbciElcSI4R_0aSawh1PF-dL4c2Mzl3ER0-_eOFo2WOLxh7dRkT"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Facturación</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Emisión y gestión de facturas</p>
</button>
<!-- Recaudo -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Recaudo" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLt0R6fPxaClFqmSjm3q5v5XAgbXGyxBcrOOG-Gcnx9bPvLpWtQGNRcbEVH8XJoyCwsU9XxpeSLNFAYaMzrS92DTpSnnNiLnAqOYkg4Xri3t4NRHv6UIp5r_Cgb8TFshRLmMR_4JriKdgSYDVMXaowrBa3DXiaTHPPLz5Qzjii6Zqo-8Xx1zWt7ZCBNUUgc0Nxm8sokA5GhUGzaXUvDZQtZeAKiPvqCdyY4NS6kVDg9oqBMGBurGRZsmdXja"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Recaudo</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Control de pagos recibidos</p>
</button>
<!-- Cartera -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Cartera" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLsIHVlDo4m3ECp3taNNlzPcL4yBlMtxJX5w9CVD37A8WhjFWjrAnS2sgA25KMFYIt52pZ2XsCf5tYzU2nX87osn7IwxKzep0g0kLVEBD267vnDSs2R_zRAdf71-Wrio-VC3_9e5OoUoQkvSuExmovqp9_pj5xVeLbRyrEcqxKhNFEfW0HtoJiBZ7rFs67sf4cWFHafwE1u_gc_Y42-3yBBWNrjjGjijc_nIaQ_RZ_2j7GuQr9x3EnfKDTwP"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Cartera</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Seguimiento de deudas</p>
</button>
<!-- PQRS -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="PQRS" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLsRQLjqyA8N4JsLYYYHVKDnaCnWZsPDKDNa7H0dd6hmhSjhn0IsOzjdZYYZ-m6ZD1bCbOXPPwZN-NGjPkUgCn30j1Ws0i2rztHgNExnr0d2ZmcgSZSuddgGpxbztGhICfpON0nVaAocZ4UXhEb7lLaDeLPBJFOXEjhdS_ki2fajmJNVn4r-p0xe8X1Hp_GNnHorgbrI1AifbowGgile-fujGrTgQ5xJhixzxedQZxTpNqcE7lo17V6nibgF"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">PQRS</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Atención a peticiones y quejas</p>
</button>
<!-- Visitas -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Visitas" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLuAwMN_eBxYYETLeD3kKtcL5U8VCxXo2D10YrSKpvYsNpJwVz5LPiYHuwt0xbr5GMvV6nKj-bhivIh3Y9uc3ICrL9WJqhyS9FgFrAWbpuzE1-V9VvxNSXajDnFyIeSSCUMXydH2equwCvT14qRj2N3wBBGuBfUMok7us4n5qYkiaavKMOR1i0IwyartmAbps0RWa9qhbl7RAykKqPhESkxZzMdQrLgwB_i39XnGHHPi5WTGl6P-3yRjK6s3"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Visitas</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Gestión de trabajo en campo</p>
</button>
<!-- Lecturas -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Lecturas" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLtpAO7QZWeEGJ3StYDKd7vsYhp9H43Mo2BFqhPO68HjqCQ11ayZke7VZXOpEA-EUW43qnhm-4lPl9Qgg-OBb7n9KdkN2xdiIhtidb7lbffuJekA5x9kQmcTm7RBbtTjA0YK79z0DvAkGvJ0lU5kb8jPYmj5OtexnxDVnQR5i9au-Jk8rpH_o5LA4gSkCwpVkWxV-0WpfpxyjFgKkmGbCGR1iKu8MSo-ZBIrGxUNBY3ueIsZEDBPHD2dvOVs"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Lecturas</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Toma de consumos actuales</p>
</button>
<!-- Corte -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Corte" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLtjORYMnTT_2ZHPK8EavAitW0oXRd32certLleBx2qL9AvgXzVx0GImJhc9sdZnhlrhzuC0PMEdERK7u55zYn1M4fcpFfBE8zzV3P5ImGODvxrgIEhoiNoIlybH7yirfU1qWjp_6vlyMP-aD2vg6b7G49keZKeNcWyilP4bYSBV6-MjpboHOS-eMNlkaMe4ZT-dcfgfdzc_Al7sK0v1bAfaoKIFaRK2RIMeLFVvovpKEezCB0mnQxDQTA8"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Corte</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Suspensión del servicio</p>
</button>
<!-- Reconexión -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Reconexión" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLtNTU6jOpdWIny-bk-AG51Dt2t9s5OZP4ugS01z9JSeaBHq_zQJ_30fhuHYKJ9_ICwhCkh1aryBGXzxVsvRQZtDWX6bEmuPCz5ngR05Mn5MZAK0PMQxAuWcZif0Mw1lUeYMkm11ZUFs2PSQdkSTVz5otxRsjLsPmB57d4lemCF7MmQm1zSIRw7EkYIyCWPQ1OPsSxayo5ODNki6YaVGi5bFXsoKpAjHNyWnxDMJFzuipkpixsVWoug_uiVn"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Reconexión</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Activación de servicios</p>
</button>
<!-- Dashboard -->
<button class="card-clay p-8 rounded-xl flex flex-col items-center group text-center">
<div class="w-24 h-24 mb-6 transition-transform duration-500 group-hover:scale-110">
<img alt="Dashboard" class="w-full h-full object-contain" src="https://lh3.googleusercontent.com/aida/AP1WRLsD7S4kVrliIjruhs__FOoqNSJdkBr5Hg2AKpR9yJULvkU9HUcVtoJcr3ijJNKO6dVwR0kHbHIBgvVP6nu9q06aOgzeSe6TQSO2CZnPgLlYfmfqL8FETpsJ6Bh-L4o8-R2GEQA6uHYhSuE0r7lfbL_MdnoN5EbE1qqOqoAxJudBn9MQiQ01QEb-ofzQN3QF2dwEyRqPcclC0N_BSlSBmqrJ9dDDGwCBWUFjRX0AzuETL-V1x0_wj-vVa7AM"/>
</div>
<h3 class="font-display font-bold text-xl text-on-surface group-hover:text-primary transition-colors">Dashboard</h3>
<p class="text-xs text-on-surface-variant mt-2 opacity-70">Analítica de rendimiento</p>
</button>
</div>
<!-- Help CTA Section -->
<div class="mt-20 bg-white p-8 rounded-2xl border border-surface-variant/30 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
<div class="flex items-center gap-6">
<div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
<span class="material-symbols-outlined text-3xl">help_outline</span>
</div>
<div>
<h4 class="font-display font-bold text-lg text-on-surface">¿Necesitas ayuda con algo más?</h4>
<p class="text-on-surface-variant text-sm opacity-75">Explora nuestra base de conocimientos o contacta a soporte.</p>
</div>
</div>
<div class="flex gap-4 w-full md:w-auto">
<button class="flex-1 md:flex-none px-6 py-2.5 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors">Ver Documentación</button>
<button class="flex-1 md:flex-none px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">Soporte Directo</button>
</div>
</div>
</main>
<!-- Footer -->
<footer class="mt-auto py-8 px-12 border-t border-surface-variant/30 text-xs text-on-surface-variant/60 flex flex-col md:flex-row justify-between items-center gap-4">
<div>© 2024 Vacano Systems. Todos los derechos reservados.</div>
<div class="flex items-center gap-6">
<a class="hover:text-primary transition-colors" href="#">Política de Privacidad</a>
<a class="hover:text-primary transition-colors" href="#">Términos de Servicio</a>
<a class="hover:text-primary transition-colors" href="#">Seguridad</a>
<a class="hover:text-primary transition-colors" href="#">Estado del Sistema</a>
</div>
</footer>
</div>
<!-- Scripts -->
<script>
        document.addEventListener('DOMContentLoaded', () => {
            const sidebar = document.getElementById('sidebar');
            const sidebarToggle = document.getElementById('sidebarToggle');
            const toggleIcon = sidebarToggle.querySelector('.material-symbols-outlined');
            
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('w-sidebar-wide');
                sidebar.classList.toggle('w-sidebar-narrow');
                sidebar.classList.toggle('sidebar-collapsed');
                
                if (sidebar.classList.contains('sidebar-collapsed')) {
                    toggleIcon.textContent = 'menu';
                } else {
                    toggleIcon.textContent = 'menu_open';
                }
            });

            // Smooth entrance for cards
            const cards = document.querySelectorAll('.card-clay');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100 + (index * 50));
            });
        });
    </script>
</body></html>
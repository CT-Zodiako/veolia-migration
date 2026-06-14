pi# Veolia — Setup inicial AS-IS (Frontend ↔ API ↔ Oracle)

Este repo queda preparado para validar conectividad inicial, sin agregar funcionalidades nuevas de negocio.

## Estructura

```text
.
├── backend/
│   └── Veolia.Api/            # .NET 10 Web API (MVC mínimo)
├── frontend/                  # Angular mínimo funcional
├── docker-compose.yml         # Oracle local
├── .env.example               # Variables de entorno de referencia
└── README.md
```

## 1) Preparar variables

```bash
cp .env.example .env
```

Editar `.env` y completar passwords reales locales.

## 2) Levantar Oracle local

```bash
docker compose up -d oracle
docker compose ps
```

Opcional para esperar estado:

```bash
docker compose logs -f oracle
```

## 3) Correr backend (.NET 10)

Desde `backend/Veolia.Api`:

```bash
dotnet restore
dotnet run
```

La API queda en `http://localhost:5000`.

### Endpoints de validación

- `GET http://localhost:5000/api/health` → estado app
- `GET http://localhost:5000/api/health/db` → prueba conexión Oracle

## 4) Correr frontend (Angular)

Desde `frontend/`:

```bash
npm install
npm start
```

La UI queda en `http://localhost:4200` y muestra:
- estado API
- estado DB Oracle

> Base URL de API configurable en `frontend/src/environments/environment.ts`.

## 5) Validación manual de conectividad

1. Oracle en `healthy` (docker compose).
2. `GET /api/health` responde `status: ok`.
3. `GET /api/health/db` responde:
   - `status: ok` si conecta a Oracle
   - HTTP `503` + mensaje claro si falla conexión
4. En la UI principal, ambas líneas deben verse en estado OK.

## Notas de seguridad

- No se versiona `.env`.
- La connection string del backend se toma de `ConnectionStrings__Oracle` por variable de entorno.
- No hay password hardcodeado en código.

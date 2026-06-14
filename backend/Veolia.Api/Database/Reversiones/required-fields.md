# Reversiones · Campos requeridos

## Endpoint `POST /api/v1/reversiones/crearAutorizacion`

Body requerido:

- `aps` (int, requerido, >= 1)
- `anno` (int, requerido, 2000-2999)
- `mes` (int, requerido, 1-12)
- `descripcion` (string, requerido, 3-500 caracteres)

## Endpoint `POST /api/v1/suministros/setReversion`

Body requerido:

- `aps` (int)
- `anno` (int)
- `mes` (int)
- `motivo` (string, requerido; validado en controlador)

## Nota

Para `crearAutorizacion`, la validación de `descripcion` ahora queda formalizada con DataAnnotations en `ReversionesAutorizacionRequest`.

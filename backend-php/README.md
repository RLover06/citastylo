# Backend PHP (XAMPP) - Stylo

Este backend en PHP conecta con MySQL (XAMPP) y expone endpoints REST para:
- Registro de clientes y prestadores
- Creacion y gestion de citas
- Consulta de disponibilidad
- Base para recordatorios

## Requisitos
- XAMPP (Apache + MySQL)
- phpMyAdmin
- PHP 7.4+ (recomendado 8.x)

## Instalacion (XAMPP)

1) Copia la carpeta `backend-php` a:
```
C:\xampp\htdocs\stylo-api
```

2) En phpMyAdmin, crea la base de datos y tablas:
- Abre `http://localhost/phpmyadmin`
- Importa el archivo:
```
backend-php/database/schema.sql
```

3) Configura tu conexion en:
```
backend-php/config/config.php
```

Ejemplo:
```
host: 127.0.0.1
name: stylo
user: root
pass: (vacio si usas XAMPP por defecto)
```

4) Asegura que Apache tenga mod_rewrite habilitado (para rutas).

## URL base
```
http://localhost/stylo-api/public/api
```

## Endpoints principales
- POST /auth/register
- POST /auth/login
- GET /clients/{id}
- GET /providers
- GET /providers/{id}
- GET /providers/{id}/availability
- POST /providers/{id}/availability
- GET /appointments?clientId=1
- GET /appointments?providerId=1
- GET /appointments/{id}
- POST /appointments
- PUT /appointments/{id}
- DELETE /appointments/{id}
- GET /availability?providerId=1&date=2026-01-28

## Frontend (web y mobile)

Actualiza la URL del API para apuntar al backend PHP:

Web (`web/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost/stylo-api/public/api
```

Mobile (`mobile/.env`):
```
EXPO_PUBLIC_API_URL=http://localhost/stylo-api/public/api
```

## Seguridad basica incluida
- Passwords con `password_hash`
- Prepared statements (PDO)
- CORS configurable
- API key opcional (X-API-Key)

## Nota
El token devuelto es un placeholder (no JWT). Si deseas seguridad real,
se recomienda implementar JWT y validacion por usuario.

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
- POST /reminders/run
- GET /reminders/run?limit=50

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

## Recordatorios por WhatsApp

1) Configura en `backend-php/config/config.php`:
```
'whatsapp' => [
  'enabled' => true,
  'api_url' => 'https://graph.facebook.com/v18.0',
  'phone_number_id' => 'TU_PHONE_NUMBER_ID',
  'token' => 'TU_TOKEN',
]
```

2) Asegura que los usuarios tengan telefono con codigo de pais (ej: 573001112233).

3) Ejecuta el envio con:
```
http://localhost/stylo-api/public/api/reminders/run
```

Puedes programar este endpoint en el Programador de tareas de Windows
para que se ejecute cada minuto.

## Nota
El token devuelto es un placeholder (no JWT). Si deseas seguridad real,
se recomienda implementar JWT y validacion por usuario.

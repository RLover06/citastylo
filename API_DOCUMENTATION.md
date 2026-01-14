# Documentación de la API - Stylo

Base URL: `http://localhost:3000`

## 🔐 Autenticación

La mayoría de los endpoints requieren autenticación mediante JWT. Incluye el token en el header:
```
Authorization: Bearer <token>
```

## 📚 Endpoints

### Autenticación

#### POST /auth/register
Registra un nuevo usuario.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "CLIENT" | "PROVIDER",
  "phone": "+1234567890" // opcional
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "usuario@example.com",
    "role": "CLIENT",
    "firstName": "Juan",
    "lastName": "Pérez"
  }
}
```

#### POST /auth/login
Inicia sesión.

**Body:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response:** Igual que `/auth/register`

---

### Usuarios

#### GET /users/me
Obtiene el perfil del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "usuario@example.com",
  "role": "CLIENT",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "+1234567890",
  "providerProfile": null // o objeto si es PROVIDER
}
```

---

### Prestadores

#### GET /providers
Obtiene todos los prestadores disponibles.

**Response:**
```json
[
  {
    "id": "uuid",
    "businessName": "Barbería El Estilo",
    "description": "Servicios de barbería profesional",
    "services": ["Corte de cabello", "Barba"],
    "user": {
      "id": "uuid",
      "firstName": "Carlos",
      "lastName": "García"
    },
    "availability": [...]
  }
]
```

#### GET /providers/me
Obtiene el perfil del prestador autenticado.

**Headers:** `Authorization: Bearer <token>`

#### POST /providers/profile
Crea el perfil de prestador.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "businessName": "Barbería El Estilo",
  "description": "Servicios de barbería profesional",
  "services": ["Corte de cabello", "Barba"],
  "address": "Calle Principal 123",
  "city": "Ciudad",
  "country": "País"
}
```

#### PUT /providers/profile
Actualiza el perfil de prestador.

**Headers:** `Authorization: Bearer <token>`

**Body:** Mismo formato que POST, todos los campos opcionales.

#### GET /providers/availability
Obtiene la disponibilidad del prestador autenticado.

**Headers:** `Authorization: Bearer <token>`

#### POST /providers/availability
Crea o actualiza la disponibilidad para un día.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "dayOfWeek": 1, // 0=Domingo, 1=Lunes, ..., 6=Sábado
  "startTime": "09:00",
  "endTime": "18:00"
}
```

#### PUT /providers/availability/:id
Actualiza una disponibilidad existente.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "startTime": "10:00", // opcional
  "endTime": "19:00", // opcional
  "isActive": true // opcional
}
```

---

### Citas

#### POST /appointments
Crea una nueva cita.

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "providerId": "uuid",
  "date": "2024-01-15",
  "startTime": "10:00",
  "endTime": "11:00",
  "service": "Corte de cabello",
  "notes": "Corte corto por favor" // opcional
}
```

**Response:**
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "providerId": "uuid",
  "date": "2024-01-15T00:00:00.000Z",
  "startTime": "10:00",
  "endTime": "11:00",
  "service": "Corte de cabello",
  "status": "PENDING",
  "client": {...},
  "provider": {...}
}
```

#### GET /appointments
Obtiene todas las citas del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response:** Array de citas

#### GET /appointments/:id
Obtiene una cita específica.

**Headers:** `Authorization: Bearer <token>`

#### PUT /appointments/:id
Actualiza una cita (principalmente el estado).

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "status": "CONFIRMED" | "COMPLETED" | "CANCELLED",
  "notes": "Notas adicionales" // opcional
}
```

#### GET /appointments/available-slots?providerId=uuid&date=2024-01-15
Obtiene los horarios disponibles para un prestador en una fecha específica.

**Response:**
```json
["09:00", "09:30", "10:00", "10:30", ...]
```

---

## 📊 Estados de Cita

- `PENDING`: Cita pendiente de confirmación
- `CONFIRMED`: Cita confirmada
- `COMPLETED`: Cita completada
- `CANCELLED`: Cita cancelada

## 🔔 Recordatorios

Los recordatorios se crean automáticamente cuando se crea una cita:
- 24 horas antes de la cita
- 2 horas antes de la cita

Se envían tanto al cliente como al prestador.

## ⚠️ Códigos de Error

- `400`: Bad Request - Datos inválidos
- `401`: Unauthorized - Token inválido o faltante
- `403`: Forbidden - No tienes permiso
- `404`: Not Found - Recurso no encontrado
- `409`: Conflict - Conflicto (ej: cita ya existe en ese horario)
- `500`: Internal Server Error - Error del servidor



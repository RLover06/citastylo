# Estructura del Proyecto - Stylo

## 📁 Organización General

```
stylo/
├── backend/                 # API REST con NestJS
│   ├── src/
│   │   ├── auth/           # Módulo de autenticación
│   │   ├── users/          # Módulo de usuarios
│   │   ├── providers/      # Módulo de prestadores
│   │   ├── appointments/  # Módulo de citas
│   │   ├── reminders/     # Módulo de recordatorios
│   │   ├── prisma/         # Servicio de Prisma
│   │   └── main.ts         # Punto de entrada
│   ├── prisma/
│   │   └── schema.prisma   # Esquema de base de datos
│   └── package.json
│
├── web/                     # Frontend web con Next.js
│   ├── app/                # App Router de Next.js
│   │   ├── auth/           # Páginas de autenticación
│   │   ├── dashboard/      # Dashboards de usuarios
│   │   └── layout.tsx      # Layout principal
│   ├── lib/                # Utilidades y configuraciones
│   ├── store/              # Estado global (Zustand)
│   └── package.json
│
├── mobile/                  # App móvil con React Native/Expo
│   ├── app/                # Pantallas con Expo Router
│   │   ├── auth/           # Pantallas de autenticación
│   │   ├── dashboard/     # Dashboards móviles
│   │   └── _layout.tsx     # Layout principal
│   ├── lib/                # Utilidades
│   ├── store/              # Estado global
│   └── package.json
│
├── README.md               # Documentación principal
├── INSTALLATION.md         # Guía de instalación
├── API_DOCUMENTATION.md    # Documentación de la API
└── PROJECT_STRUCTURE.md    # Este archivo
```

## 🔧 Backend (NestJS)

### Módulos Principales

1. **AuthModule** - Autenticación y autorización
   - Registro e inicio de sesión
   - JWT tokens
   - Guards y estrategias

2. **UsersModule** - Gestión de usuarios
   - CRUD de usuarios
   - Perfiles de usuario

3. **ProvidersModule** - Gestión de prestadores
   - Perfiles de prestadores
   - Configuración de disponibilidad
   - Horarios disponibles

4. **AppointmentsModule** - Sistema de citas
   - Creación de citas
   - Validación de conflictos
   - Gestión de estados

5. **RemindersModule** - Recordatorios automáticos
   - Programación de recordatorios
   - Envío automático (cron job)

### Base de Datos (Prisma)

**Modelos:**
- `User` - Usuarios del sistema
- `ProviderProfile` - Perfiles de prestadores
- `Availability` - Horarios disponibles
- `Appointment` - Citas agendadas
- `Reminder` - Recordatorios programados

## 🌐 Frontend Web (Next.js)

### Estructura de Páginas

- `/` - Redirección según autenticación
- `/auth/login` - Inicio de sesión
- `/auth/register` - Registro
- `/dashboard/client` - Dashboard de cliente
- `/dashboard/provider` - Dashboard de prestador

### Características

- **App Router** de Next.js 14
- **React Query** para gestión de estado del servidor
- **Zustand** para estado global de autenticación
- **Tailwind CSS** para estilos
- **React Hook Form** para formularios

## 📱 Aplicación Móvil (React Native/Expo)

### Estructura de Pantallas

- `/` - Pantalla inicial (redirección)
- `/auth/login` - Inicio de sesión móvil
- `/auth/register` - Registro móvil
- `/dashboard/client` - Dashboard cliente móvil
- `/dashboard/provider` - Dashboard prestador móvil

### Características

- **Expo Router** para navegación
- **React Query** para datos del servidor
- **Zustand** con AsyncStorage para persistencia
- **React Hook Form** para formularios
- **Expo Notifications** para notificaciones push (preparado)

## 🔄 Flujo de Datos

1. **Autenticación:**
   - Usuario se registra/inicia sesión
   - Backend genera JWT token
   - Token se almacena en localStorage (web) o AsyncStorage (móvil)
   - Token se incluye en todas las peticiones

2. **Citas:**
   - Cliente busca prestadores disponibles
   - Selecciona fecha y hora
   - Backend valida disponibilidad y conflictos
   - Se crea la cita y se programan recordatorios

3. **Recordatorios:**
   - Cron job ejecuta cada minuto
   - Busca recordatorios pendientes
   - Envía notificaciones (actualmente solo logs, listo para integración)

## 🚀 Próximos Pasos

1. **Integración con WhatsApp:**
   - Agregar servicio de WhatsApp API
   - Integrar en RemindersService
   - Configurar webhooks

2. **Notificaciones Push:**
   - Configurar Expo Notifications
   - Implementar envío desde backend
   - Manejar tokens de dispositivos

3. **Mejoras de UI/UX:**
   - Calendario visual para selección de fechas
   - Búsqueda y filtros de prestadores
   - Perfil de prestador con galería

4. **Funcionalidades Adicionales:**
   - Sistema de reseñas
   - Pagos en línea
   - Chat en tiempo real
   - Historial detallado



# Stylo - Sistema de Agendamiento de Citas

Aplicación móvil y web para agendamiento de citas entre clientes y prestadores de servicios (barberos, manicuristas, etc.).

## 🏗️ Arquitectura del Proyecto

```
stylo/
├── backend/          # API REST con NestJS
├── web/              # Frontend web con Next.js
├── mobile/           # Aplicación móvil con React Native/Expo
└── README.md
```

## 🚀 Tecnologías

### Backend
- **NestJS** - Framework Node.js
- **PostgreSQL** - Base de datos
- **Prisma** - ORM
- **JWT** - Autenticación
- **Node-cron** - Recordatorios automáticos

### Frontend Web
- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **React Query** - Gestión de estado del servidor

### Mobile
- **React Native** - Framework móvil
- **Expo** - Herramientas de desarrollo
- **TypeScript** - Tipado estático

## 📋 Funcionalidades

- ✅ Registro e inicio de sesión
- ✅ Perfiles de prestadores y clientes
- ✅ Configuración de horarios disponibles
- ✅ Agendamiento de citas sin conflictos
- ✅ Recordatorios automáticos
- ✅ Historial de citas
- 🔜 Integración con WhatsApp (futuro)

## 👥 Tipos de Usuarios

1. **Prestador de servicios** - Puede configurar horarios y gestionar citas
2. **Cliente** - Puede agendar citas según disponibilidad

## 🛠️ Instalación

### Instalación Rápida (desde la raíz)

```bash
# Instalar todas las dependencias
npm run install:all

# O instalar individualmente:
cd backend && npm install
cd ../web && npm install
cd ../mobile && npm install
```

### Ejecutar el Proyecto

Desde la raíz del proyecto puedes usar estos comandos:

```bash
# Backend (puerto 3000)
npm run dev:backend

# Frontend Web (puerto 3001)
npm run dev:web

# Aplicación Móvil (Expo)
npm run dev:mobile
```

### Instalación Detallada

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno en .env
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

#### Frontend Web
```bash
cd web
npm install
# Crear .env.local con NEXT_PUBLIC_API_URL=http://localhost:3000
npm run dev
```

#### Mobile
```bash
cd mobile
npm install
# Crear .env con EXPO_PUBLIC_API_URL=http://localhost:3000
npm start
```

## 📝 Variables de Entorno

Ver archivos `.env.example` en cada directorio para configuración.

## 📚 Documentación

- [Guía de Instalación](./INSTALLATION.md) - Instrucciones detalladas de instalación
- [Documentación de la API](./API_DOCUMENTATION.md) - Referencia completa de endpoints
- [Estructura del Proyecto](./PROJECT_STRUCTURE.md) - Organización del código

## 🔄 Flujo de Trabajo

1. **Prestador:**
   - Se registra como prestador
   - Completa su perfil (servicios, descripción, ubicación)
   - Configura sus horarios disponibles por día de la semana
   - Recibe y gestiona citas

2. **Cliente:**
   - Se registra como cliente
   - Busca prestadores disponibles
   - Selecciona fecha y hora según disponibilidad
   - Recibe recordatorios automáticos

## 🔔 Sistema de Recordatorios

Los recordatorios se envían automáticamente:
- **24 horas antes** de la cita (cliente y prestador)
- **2 horas antes** de la cita (cliente y prestador)

Actualmente se registran en logs. Listo para integración con:
- Email (SendGrid, AWS SES)
- Notificaciones push
- WhatsApp (futuro)

## 🚀 Próximas Funcionalidades

- [ ] Integración con WhatsApp para recordatorios
- [ ] Notificaciones push en móvil
- [ ] Calendario visual para selección de fechas
- [ ] Sistema de reseñas y calificaciones
- [ ] Pagos en línea
- [ ] Chat en tiempo real
- [ ] Búsqueda avanzada de prestadores

## 🤝 Contribuir

Este es un proyecto en desarrollo. Las contribuciones son bienvenidas.

## 📄 Licencia

MIT


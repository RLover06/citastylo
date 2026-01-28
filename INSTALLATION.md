# Guía de Instalación - Stylo

Esta guía te ayudará a configurar y ejecutar el proyecto completo de Stylo.

## 📋 Requisitos Previos

- Node.js 18+ y npm
- PostgreSQL 14+
- Git

## 🗄️ Configuración de Base de Datos

1. Instala PostgreSQL si no lo tienes instalado
2. Crea una base de datos:
```sql
CREATE DATABASE stylo;
```

## 🗄️ Opcion MySQL (XAMPP)

Si deseas usar MySQL con XAMPP y PHP:

1. Copia `backend-php` a:
```
C:\xampp\htdocs\stylo-api
```

2. Importa el esquema:
```
backend-php/database/schema.sql
```

3. Configura la conexion en:
```
backend-php/config/config.php
```

4. URL base del API:
```
http://localhost/stylo-api/public/api
```

## 🔧 Backend

1. Navega al directorio del backend:
```bash
cd backend
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
```

4. Edita el archivo `.env` con tus credenciales:
```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/stylo?schema=public"
JWT_SECRET="tu-secreto-jwt-aqui"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
```

5. Genera el cliente de Prisma:
```bash
npm run prisma:generate
```

6. Ejecuta las migraciones:
```bash
npm run prisma:migrate
```

7. Inicia el servidor de desarrollo:
```bash
npm run start:dev
```

El backend estará disponible en `http://localhost:3000`

## 🌐 Frontend Web

1. Navega al directorio del frontend:
```bash
cd web
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

El frontend estará disponible en `http://localhost:3001`

## 📱 Aplicación Móvil

1. Instala Expo CLI globalmente (si no lo tienes):
```bash
npm install -g expo-cli
```

2. Navega al directorio móvil:
```bash
cd mobile
```

3. Instala las dependencias:
```bash
npm install
```

4. Crea un archivo `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**Nota:** Para probar en un dispositivo físico, necesitarás cambiar la URL a la IP de tu máquina local (ej: `http://192.168.1.100:3000`)

5. Inicia Expo:
```bash
npm start
```

6. Escanea el código QR con la app Expo Go en tu dispositivo móvil, o presiona:
   - `a` para Android
   - `i` para iOS

## 🚀 Inicio Rápido

Para iniciar todo el proyecto:

1. **Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

2. **Terminal 2 - Frontend Web:**
```bash
cd web
npm run dev
```

3. **Terminal 3 - Mobile:**
```bash
cd mobile
npm start
```

## 📝 Notas Importantes

- Asegúrate de que PostgreSQL esté corriendo antes de iniciar el backend
- El backend debe estar corriendo antes de usar el frontend o la app móvil
- Para desarrollo móvil, usa tu IP local en lugar de `localhost`
- Los recordatorios se ejecutan cada minuto en el backend (cron job)

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Revisa las credenciales en `.env`
- Asegúrate de que la base de datos `stylo` exista

### Error CORS en el frontend
- Verifica que la URL del backend en `.env.local` sea correcta
- Revisa la configuración de CORS en `backend/src/main.ts`

### Error en la app móvil
- Verifica que uses la IP local, no `localhost`
- Asegúrate de que el backend esté accesible desde tu dispositivo
- Revisa los logs de Expo para más detalles


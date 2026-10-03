# Turno · Citas para barberías y salones

*[Read in English](README.md)*

App web para que los clientes reserven su turno desde el celular y cada barbero vea su agenda en un calendario.

- **Cliente:** reserva sin crear cuenta (nombre + WhatsApp), ve sus citas, cambia la hora o cancela desde el mismo celular.
- **Barbero:** entra con Google o con un enlace al correo, ve su calendario (nada se borra), marca atendido / no vino, reprograma, cancela, agenda la próxima cita y recuerda por WhatsApp con un toque.
- **Dueño:** además administra servicios, barberos, horarios, días libres y reglas del negocio.

**Idiomas / Languages:** la app abre en español si el navegador está en español y en inglés en cualquier otro caso. El botón **ES | EN** de la esquina superior permite cambiarlo y se recuerda la elección. *The app opens in Spanish for Spanish-language browsers and in English otherwise; the ES | EN toggle switches it and remembers the choice.*

Tecnología: React + Vite (frontend), Supabase (base de datos PostgreSQL, inicio de sesión y tiempo real). Todo en planes gratuitos para arrancar.

---

## 1. Base de datos (Supabase)

1. Crea una cuenta y un proyecto gratis en [supabase.com](https://supabase.com). Región sugerida: `East US` (la más cercana a Colombia).
2. Ve a **SQL Editor → New query**, pega todo el archivo `supabase/esquema.sql` y dale **Run**.
3. Ve a **Authentication → Sign In / Providers**:
   - **Email:** actívalo (viene activo).
   - **Google:** actívalo con un Client ID y Secret de [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (tipo "Aplicación web"; en "URI de redireccionamiento autorizados" pon la que te muestra Supabase).
4. Ve a **Authentication → URL Configuration** y en **Site URL** pon la dirección de tu app (en desarrollo `http://localhost:5173`). En **Redirect URLs** agrega `http://localhost:5173/panel` y, cuando la publiques, `https://TU-DOMINIO/panel`.
5. Ve a **Project Settings → API** y copia la **Project URL** y la clave **anon public**.

> Nota: el correo integrado de Supabase envía pocos correos por hora. Para producción configura un SMTP propio (Authentication → Emails → SMTP), por ejemplo Resend o Brevo, que tienen planes gratis.

## 2. Correr en tu computador

Requisito: [Node.js](https://nodejs.org) 20 o superior.

```bash
npm install
copy .env.example .env      # en Windows (en Mac/Linux: cp .env.example .env)
# abre .env y pega la URL y la clave anon de Supabase
npm run dev
```

Abre `http://localhost:5173/panel`, entra con tu correo y registra tu negocio. Tu página de reservas queda en `http://localhost:5173/tu-enlace`.

## 3. Publicar gratis (Cloudflare Pages)

Vercel gratis **no permite uso comercial**; Cloudflare Pages sí.

1. Sube el proyecto a un repositorio **privado** de GitHub.
2. En [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**, elige el repositorio.
3. Configuración de compilación: framework `Vite` (o `None`), comando `npm run build`, carpeta `dist`.
4. En **Environment variables** agrega `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_CONTACTO_EMAIL`.
5. Cuando tengas la dirección final (`https://turno.pages.dev` o tu dominio), agrégala en Supabase → Authentication → URL Configuration (Site URL y Redirect URLs con `/panel`).

El archivo `public/_redirects` ya está listo para que enlaces como `/el-sinu` funcionen.

**Vercel (demo):** importa el repositorio (framework: Vite) y agrega las mismas tres variables de entorno. `vercel.json` ya dirige los enlaces de cada negocio a la app. El plan gratis Hobby de Vercel es solo para uso no comercial: antes de cobrarle a una barbería, pasa a Cloudflare Pages o a un plan pago.

## Estructura

```
supabase/esquema.sql        Tablas, seguridad por filas y funciones (reservar, cancelar, reprogramar…)
src/pages/Reserva.jsx       Página pública del negocio: reservar y "Mis citas"
src/pages/panel/Panel.jsx   Entrada, registro del negocio y barra del panel
src/pages/panel/Calendario.jsx  Calendario del barbero y acciones sobre cada cita
src/pages/panel/Ajustes.jsx Horario, días libres, negocio, servicios y barberos
src/pages/Privacidad.jsx    Política de tratamiento de datos (Ley 1581 de 2012)
src/components/             Selector de horario y hoja emergente
src/lib/                    Conexión a Supabase, idioma (ES/EN), fechas en hora de Colombia, datos del cliente
```

## Reglas que ya cumple

- **Sin cruces:** la base de datos impide que un barbero tenga dos citas a la misma hora, incluso si dos personas reservan en el mismo segundo.
- **Nada se borra:** cancelar o reprogramar cambia el estado; el historial queda.
- **Privacidad:** el público no puede leer tablas; solo usa funciones controladas. Cada cliente ve sus citas con un código privado guardado en su celular. Cada negocio ve solo a sus clientes.
- **Ley 1581 de 2012:** no se reserva sin marcar la autorización de datos, y queda registrada la fecha.
- **Límites:** máximo de citas pendientes por celular y plazo mínimo para cancelar, configurables por negocio.

## Límites del plan gratis de Supabase

500 MB de base de datos (cientos de miles de citas) y 50.000 usuarios activos al mes. Los proyectos gratis se pausan si pasan 7 días sin actividad; con barberías reservando a diario no ocurre. Cuando tengas clientes pagando, el plan Pro (25 USD/mes) elimina la pausa e incluye copias diarias.

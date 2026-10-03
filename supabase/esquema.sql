-- =====================================================================
--  TURNO · App de citas para barberías y salones
--  Esquema de base de datos para Supabase (PostgreSQL)
--
--  Cómo usarlo:
--    1. Crea un proyecto gratis en supabase.com
--    2. Abre "SQL Editor", pega este archivo completo y ejecútalo (Run)
--    3. En Authentication > Providers activa "Email" y "Google"
--
--  Qué resuelve:
--    · Perfil del barbero (entra con Google o correo)
--    · Perfil del cliente (sin cuenta: se identifica por su celular y
--      un código privado por cita que queda guardado en su dispositivo)
--    · Calendario con historial: nada se borra
--    · Cancelar, reprogramar y volver a agendar
--    · Imposible que dos citas se crucen para el mismo barbero
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------
do $$ begin
  create type estado_cita as enum ('pendiente','atendida','no_asistio','cancelada');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. TABLAS
-- ---------------------------------------------------------------------

-- Cada negocio (barbería o salón). El "slug" es su enlace público:
-- tuapp.com/el-sinu
create table if not exists barberias (
  id                      uuid primary key default gen_random_uuid(),
  nombre                  text not null check (length(trim(nombre)) >= 2),
  slug                    text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  whatsapp                text check (whatsapp ~ '^3[0-9]{9}$'),
  direccion               text,
  minutos_para_cancelar   int  not null default 60 check (minutos_para_cancelar between 0 and 1440),
  max_citas_por_cliente   int  not null default 2  check (max_citas_por_cliente between 1 and 10),
  intervalo_minutos       int  not null default 30 check (intervalo_minutos in (15,20,30,60)),
  owner_id                uuid not null references auth.users(id),
  creada_en               timestamptz not null default now()
);

-- Barberos. El dueño también aparece aquí (es_dueno = true).
-- user_id queda vacío hasta que el barbero entra por primera vez
-- con el correo que el dueño registró.
create table if not exists barberos (
  id            uuid primary key default gen_random_uuid(),
  barberia_id   uuid not null references barberias(id) on delete cascade,
  user_id       uuid references auth.users(id),
  nombre        text not null check (length(trim(nombre)) >= 2),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  es_dueno      boolean not null default false,
  activo        boolean not null default true,
  creado_en     timestamptz not null default now(),
  unique (barberia_id, email)
);

-- Servicios que ofrece el negocio.
-- dias_para_volver: sugerencia para "volver a agendar" (ej. corte = 15)
create table if not exists servicios (
  id                uuid primary key default gen_random_uuid(),
  barberia_id       uuid not null references barberias(id) on delete cascade,
  nombre            text not null,
  duracion_min      int  not null check (duracion_min between 5 and 480),
  precio            int  not null check (precio >= 0),
  dias_para_volver  int  not null default 15 check (dias_para_volver between 1 and 180),
  activo            boolean not null default true
);

-- Qué servicios hace cada barbero.
-- Si un barbero NO tiene filas aquí, se asume que hace todos.
create table if not exists barbero_servicios (
  barbero_id   uuid references barberos(id) on delete cascade,
  servicio_id  uuid references servicios(id) on delete cascade,
  primary key (barbero_id, servicio_id)
);

-- Horario semanal de cada barbero (0 = domingo … 6 = sábado).
-- Puede tener varios bloques el mismo día (ej. 9-12 y 14-19).
create table if not exists horarios (
  id           uuid primary key default gen_random_uuid(),
  barbero_id   uuid not null references barberos(id) on delete cascade,
  dia_semana   int  not null check (dia_semana between 0 and 6),
  hora_inicio  time not null,
  hora_fin     time not null,
  check (hora_fin > hora_inicio)
);

-- Días libres, vacaciones, almuerzo extendido, etc.
create table if not exists bloqueos (
  id          uuid primary key default gen_random_uuid(),
  barbero_id  uuid not null references barberos(id) on delete cascade,
  inicio      timestamptz not null,
  fin         timestamptz not null,
  motivo      text,
  check (fin > inicio)
);

-- Clientes: uno por celular dentro de cada negocio.
create table if not exists clientes (
  id           uuid primary key default gen_random_uuid(),
  barberia_id  uuid not null references barberias(id) on delete cascade,
  nombre       text not null,
  telefono     text not null check (telefono ~ '^3[0-9]{9}$'),
  acepto_datos timestamptz not null,           -- Ley 1581 de 2012
  nota         text,                           -- nota privada del barbero
  creado_en    timestamptz not null default now(),
  unique (barberia_id, telefono)
);

-- Citas: el corazón del calendario. Nunca se borran.
create table if not exists citas (
  id                  uuid primary key default gen_random_uuid(),
  barberia_id         uuid not null references barberias(id) on delete cascade,
  barbero_id          uuid not null references barberos(id),
  servicio_id         uuid not null references servicios(id),
  cliente_id          uuid not null references clientes(id),
  inicio              timestamptz not null,
  fin                 timestamptz not null,
  precio              int not null,           -- precio congelado al reservar
  estado              estado_cita not null default 'pendiente',
  token               uuid not null unique default gen_random_uuid(), -- código privado del cliente
  cancelada_por       text check (cancelada_por in ('cliente','barbero','reprogramada')),
  reprogramada_desde  uuid references citas(id),
  creada_en           timestamptz not null default now(),
  check (fin > inicio),
  -- Garantía a nivel de base de datos: un barbero no puede tener dos
  -- citas activas que se crucen, aunque dos personas reserven a la vez.
  constraint sin_cruces exclude using gist (
    barbero_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado <> 'cancelada')
);

create index if not exists citas_calendario on citas (barberia_id, inicio);
create index if not exists citas_barbero    on citas (barbero_id, inicio);
create index if not exists citas_cliente    on citas (cliente_id, inicio);

-- ---------------------------------------------------------------------
-- 3. AYUDANTES DE PERMISOS
-- ---------------------------------------------------------------------
create or replace function es_miembro(p_barberia uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from barberos
                 where barberia_id = p_barberia and user_id = auth.uid() and activo);
$$;

create or replace function es_dueno(p_barberia uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from barberias
                 where id = p_barberia and owner_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 4. SEGURIDAD POR FILAS (RLS)
--    · El público (clientes) NO toca tablas: solo usa las funciones
--      de la sección 6.
--    · Cada barbero ve solo su negocio. El dueño administra.
-- ---------------------------------------------------------------------
alter table barberias         enable row level security;
alter table barberos          enable row level security;
alter table servicios         enable row level security;
alter table barbero_servicios enable row level security;
alter table horarios          enable row level security;
alter table bloqueos          enable row level security;
alter table clientes          enable row level security;
alter table citas             enable row level security;

drop policy if exists ver_barberia on barberias;
create policy ver_barberia on barberias for select using (es_miembro(id));
drop policy if exists editar_barberia on barberias;
create policy editar_barberia on barberias for update using (es_dueno(id));

drop policy if exists ver_barberos on barberos;
create policy ver_barberos on barberos for select using (es_miembro(barberia_id));
drop policy if exists gestionar_barberos on barberos;
create policy gestionar_barberos on barberos for all
  using (es_dueno(barberia_id)) with check (es_dueno(barberia_id));

drop policy if exists ver_servicios on servicios;
create policy ver_servicios on servicios for select using (es_miembro(barberia_id));
drop policy if exists gestionar_servicios on servicios;
create policy gestionar_servicios on servicios for all
  using (es_dueno(barberia_id)) with check (es_dueno(barberia_id));

drop policy if exists ver_barbero_servicios on barbero_servicios;
create policy ver_barbero_servicios on barbero_servicios for select
  using (exists (select 1 from barberos b where b.id = barbero_id and es_miembro(b.barberia_id)));
drop policy if exists gestionar_barbero_servicios on barbero_servicios;
create policy gestionar_barbero_servicios on barbero_servicios for all
  using      (exists (select 1 from barberos b where b.id = barbero_id and es_dueno(b.barberia_id)))
  with check (exists (select 1 from barberos b where b.id = barbero_id and es_dueno(b.barberia_id)));

-- Horarios y bloqueos: los maneja el propio barbero o el dueño.
drop policy if exists ver_horarios on horarios;
create policy ver_horarios on horarios for select
  using (exists (select 1 from barberos b where b.id = barbero_id and es_miembro(b.barberia_id)));
drop policy if exists gestionar_horarios on horarios;
create policy gestionar_horarios on horarios for all
  using      (exists (select 1 from barberos b where b.id = barbero_id and (b.user_id = auth.uid() or es_dueno(b.barberia_id))))
  with check (exists (select 1 from barberos b where b.id = barbero_id and (b.user_id = auth.uid() or es_dueno(b.barberia_id))));

drop policy if exists ver_bloqueos on bloqueos;
create policy ver_bloqueos on bloqueos for select
  using (exists (select 1 from barberos b where b.id = barbero_id and es_miembro(b.barberia_id)));
drop policy if exists gestionar_bloqueos on bloqueos;
create policy gestionar_bloqueos on bloqueos for all
  using      (exists (select 1 from barberos b where b.id = barbero_id and (b.user_id = auth.uid() or es_dueno(b.barberia_id))))
  with check (exists (select 1 from barberos b where b.id = barbero_id and (b.user_id = auth.uid() or es_dueno(b.barberia_id))));

drop policy if exists ver_clientes on clientes;
create policy ver_clientes on clientes for select using (es_miembro(barberia_id));
drop policy if exists editar_clientes on clientes;
create policy editar_clientes on clientes for update using (es_miembro(barberia_id));

-- Citas: el barbero las lee; los cambios pasan por funciones.
drop policy if exists ver_citas on citas;
create policy ver_citas on citas for select using (es_miembro(barberia_id));

-- ---------------------------------------------------------------------
-- 5. FUNCIONES DEL BARBERO / DUEÑO (requieren sesión iniciada)
-- ---------------------------------------------------------------------

-- Registro inicial: crea la barbería y al dueño como primer barbero.
create or replace function crear_barberia(p_nombre text, p_slug text, p_nombre_dueno text, p_whatsapp text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text; v_barbero uuid;
begin
  if auth.uid() is null then raise exception 'NECESITA_SESION'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into barberias (nombre, slug, whatsapp, owner_id)
    values (trim(p_nombre), lower(trim(p_slug)), p_whatsapp, auth.uid()) returning id into v_id;
  insert into barberos (barberia_id, user_id, nombre, email, es_dueno)
    values (v_id, auth.uid(), trim(p_nombre_dueno), v_email, true) returning id into v_barbero;
  -- Valores iniciales para que la página de reservas funcione desde el primer minuto
  insert into servicios (barberia_id, nombre, duracion_min, precio, dias_para_volver) values
    (v_id, 'Corte', 30, 20000, 15),
    (v_id, 'Corte + barba', 60, 30000, 15),
    (v_id, 'Arreglo de barba', 30, 12000, 10);
  return v_id;
end $$;

-- El barbero entra por primera vez: se vincula con el correo que el
-- dueño registró. La app la llama justo después de iniciar sesión.
create or replace function vincular_barbero() returns int
language plpgsql security definer set search_path = public as $$
declare v_email text; v_n int;
begin
  if auth.uid() is null then raise exception 'NECESITA_SESION'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();
  update barberos set user_id = auth.uid()
   where lower(email) = v_email and user_id is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- Marcar atendida o no asistió (también sirve para las "sin marcar").
create or replace function marcar_cita(p_cita uuid, p_estado estado_cita)
returns void language plpgsql security definer set search_path = public as $$
declare v_barberia uuid;
begin
  if p_estado not in ('atendida','no_asistio','pendiente') then raise exception 'ESTADO_INVALIDO'; end if;
  select barberia_id into v_barberia from citas where id = p_cita and estado <> 'cancelada';
  if v_barberia is null or not es_miembro(v_barberia) then raise exception 'SIN_PERMISO'; end if;
  update citas set estado = p_estado where id = p_cita;
end $$;

-- Todo barbero nuevo arranca con horario de lunes a sábado, 9 a.m. a 7 p.m.
-- Después cada uno lo ajusta en su perfil.
create or replace function _horario_inicial() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into horarios (barbero_id, dia_semana, hora_inicio, hora_fin)
    select new.id, d, '09:00', '19:00' from generate_series(1,6) d;
  return new;
end $$;
drop trigger if exists horario_inicial on barberos;
create trigger horario_inicial after insert on barberos
  for each row execute function _horario_inicial();

-- ---------------------------------------------------------------------
-- 6. FUNCIONES PÚBLICAS (las usa el cliente sin iniciar sesión)
-- ---------------------------------------------------------------------

-- Datos públicos del negocio para la página de reserva.
create or replace function info_barberia(p_slug text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', b.id, 'nombre', b.nombre, 'whatsapp', b.whatsapp, 'direccion', b.direccion,
    'minutos_para_cancelar', b.minutos_para_cancelar,
    'servicios', coalesce((select json_agg(json_build_object('id',s.id,'nombre',s.nombre,
                   'duracion_min',s.duracion_min,'precio',s.precio) order by s.precio)
                 from servicios s where s.barberia_id = b.id and s.activo), '[]'),
    'barberos',  coalesce((select json_agg(json_build_object('id',x.id,'nombre',x.nombre) order by x.nombre)
                 from barberos x where x.barberia_id = b.id and x.activo), '[]'))
  from barberias b where b.slug = lower(p_slug);
$$;

-- Turnos libres de un día. p_barbero = null → cualquiera disponible.
-- p_ignorar_cita: al reprogramar, la cita actual no bloquea su propio horario.
create or replace function turnos_disponibles(
  p_slug text, p_servicio uuid, p_fecha date,
  p_barbero uuid default null, p_ignorar_cita uuid default null)
returns table (barbero_id uuid, barbero_nombre text, inicio timestamptz)
language sql stable security definer set search_path = public as $$
  with neg as (select id, intervalo_minutos from barberias where slug = lower(p_slug)),
  srv as (select make_interval(mins => s.duracion_min) as dur
            from servicios s where s.id = p_servicio and s.activo
              and s.barberia_id = (select id from neg)),
  cand as (
    select ba.id, ba.nombre, g as ini
      from barberos ba
      join horarios h on h.barbero_id = ba.id
      cross join lateral generate_series(
        (p_fecha + h.hora_inicio) at time zone 'America/Bogota',
        ((p_fecha + h.hora_fin) at time zone 'America/Bogota') - (select dur from srv),
        make_interval(mins => (select intervalo_minutos from neg))) g
     where ba.barberia_id = (select id from neg) and ba.activo
       and h.dia_semana = extract(dow from p_fecha)
       and (p_barbero is null or ba.id = p_barbero)
       and ( not exists (select 1 from barbero_servicios bs where bs.barbero_id = ba.id)
             or exists (select 1 from barbero_servicios bs where bs.barbero_id = ba.id and bs.servicio_id = p_servicio)))
  select c.id, c.nombre, c.ini from cand c
   where c.ini > now()
     and not exists (select 1 from citas ci
                      where ci.barbero_id = c.id and ci.estado <> 'cancelada'
                        and ci.id is distinct from p_ignorar_cita
                        and tstzrange(ci.inicio, ci.fin) && tstzrange(c.ini, c.ini + (select dur from srv)))
     and not exists (select 1 from bloqueos bl
                      where bl.barbero_id = c.id
                        and tstzrange(bl.inicio, bl.fin) && tstzrange(c.ini, c.ini + (select dur from srv)))
   order by c.ini, c.nombre;
$$;

-- Uso interno: crea la cita en el primer barbero libre.
create or replace function _crear_cita(
  p_barberia uuid, p_servicio uuid, p_barbero uuid, p_inicio timestamptz,
  p_cliente uuid, p_origen uuid default null)
returns citas language plpgsql security definer set search_path = public as $$
declare v_slug text; v_srv servicios; v_barbero uuid; v_cita citas;
begin
  select slug into v_slug from barberias where id = p_barberia;
  select * into v_srv from servicios where id = p_servicio and barberia_id = p_barberia and activo;
  if v_srv.id is null then raise exception 'SERVICIO_INVALIDO'; end if;

  select t.barbero_id into v_barbero
    from turnos_disponibles(v_slug, p_servicio, (p_inicio at time zone 'America/Bogota')::date, p_barbero) t
   where t.inicio = p_inicio limit 1;
  if v_barbero is null then raise exception 'HORARIO_OCUPADO'; end if;

  begin
    insert into citas (barberia_id, barbero_id, servicio_id, cliente_id, inicio, fin, precio, reprogramada_desde)
    values (p_barberia, v_barbero, p_servicio, p_cliente, p_inicio,
            p_inicio + make_interval(mins => v_srv.duracion_min), v_srv.precio, p_origen)
    returning * into v_cita;
  exception when exclusion_violation then
    raise exception 'HORARIO_OCUPADO';   -- alguien reservó en el mismo segundo
  end;
  return v_cita;
end $$;

-- RESERVAR. Devuelve el código privado (token) que la app guarda en
-- el dispositivo del cliente: con él ve, cancela o reprograma su cita.
create or replace function reservar_cita(
  p_slug text, p_servicio uuid, p_barbero uuid, p_inicio timestamptz,
  p_nombre text, p_telefono text, p_acepta_datos boolean)
returns json language plpgsql security definer set search_path = public as $$
declare v_neg barberias; v_cliente uuid; v_activas int; v_cita citas; v_tel text;
begin
  v_tel := regexp_replace(coalesce(p_telefono,''), '\D', '', 'g');
  if v_tel !~ '^3[0-9]{9}$' then raise exception 'TELEFONO_INVALIDO'; end if;
  if length(trim(coalesce(p_nombre,''))) < 2 then raise exception 'NOMBRE_INVALIDO'; end if;
  if p_acepta_datos is not true then raise exception 'FALTA_AUTORIZACION_DATOS'; end if;

  select * into v_neg from barberias where slug = lower(p_slug);
  if v_neg.id is null then raise exception 'NEGOCIO_NO_EXISTE'; end if;

  insert into clientes (barberia_id, nombre, telefono, acepto_datos)
  values (v_neg.id, trim(p_nombre), v_tel, now())
  on conflict (barberia_id, telefono) do update set nombre = excluded.nombre
  returning id into v_cliente;

  -- Freno anti-abuso: máximo de citas futuras por celular.
  select count(*) into v_activas from citas
   where cliente_id = v_cliente and estado = 'pendiente' and inicio > now();
  if v_activas >= v_neg.max_citas_por_cliente then raise exception 'LIMITE_CITAS'; end if;

  v_cita := _crear_cita(v_neg.id, p_servicio, p_barbero, p_inicio, v_cliente);
  return json_build_object('cita_id', v_cita.id, 'token', v_cita.token,
                           'barbero_id', v_cita.barbero_id, 'inicio', v_cita.inicio);
end $$;

-- PERFIL DEL CLIENTE: sus citas, a partir de los códigos guardados
-- en su dispositivo. Nadie puede ver citas ajenas con solo un número.
create or replace function mis_citas(p_tokens uuid[]) returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object(
    'cita_id', c.id, 'token', c.token, 'inicio', c.inicio, 'estado', c.estado, 'precio', c.precio,
    'servicio', s.nombre, 'servicio_id', s.id, 'barbero', b.nombre,
    'negocio', n.nombre, 'slug', n.slug,
    'puede_cambiar', c.estado = 'pendiente'
                     and c.inicio - now() >= make_interval(mins => n.minutos_para_cancelar))
    order by c.inicio desc), '[]')
  from citas c
  join servicios s on s.id = c.servicio_id
  join barberos  b on b.id = c.barbero_id
  join barberias n on n.id = c.barberia_id
  where c.token = any(p_tokens);
$$;

-- CANCELAR: el cliente con su token, o el barbero con sesión.
create or replace function cancelar_cita(p_cita uuid default null, p_token uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v citas; v_neg barberias; v_por text;
begin
  select * into v from citas
   where (p_token is not null and token = p_token) or (p_token is null and id = p_cita);
  if v.id is null or v.estado <> 'pendiente' then raise exception 'CITA_NO_DISPONIBLE'; end if;
  select * into v_neg from barberias where id = v.barberia_id;

  if p_token is not null then
    if v.inicio - now() < make_interval(mins => v_neg.minutos_para_cancelar) then
      raise exception 'FUERA_DE_PLAZO'; end if;
    v_por := 'cliente';
  elsif es_miembro(v.barberia_id) then
    v_por := 'barbero';
  else
    raise exception 'SIN_PERMISO';
  end if;

  update citas set estado = 'cancelada', cancelada_por = v_por where id = v.id;
end $$;

-- REPROGRAMAR: mueve la cita a otro horario conservando cliente y
-- servicio. p_barbero = null → cualquier barbero libre.
-- Si el nuevo horario falla, la cita original queda intacta.
create or replace function reprogramar_cita(
  p_nuevo_inicio timestamptz, p_cita uuid default null,
  p_token uuid default null, p_barbero uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare v citas; v_neg barberias; v_nueva citas;
begin
  select * into v from citas
   where (p_token is not null and token = p_token) or (p_token is null and id = p_cita);
  if v.id is null or v.estado <> 'pendiente' then raise exception 'CITA_NO_DISPONIBLE'; end if;
  select * into v_neg from barberias where id = v.barberia_id;

  if p_token is not null then
    if v.inicio - now() < make_interval(mins => v_neg.minutos_para_cancelar) then
      raise exception 'FUERA_DE_PLAZO'; end if;
  elsif not es_miembro(v.barberia_id) then
    raise exception 'SIN_PERMISO';
  end if;

  update citas set estado = 'cancelada', cancelada_por = 'reprogramada' where id = v.id;
  v_nueva := _crear_cita(v.barberia_id, v.servicio_id, p_barbero,
                         p_nuevo_inicio, v.cliente_id, v.id);
  return json_build_object('cita_id', v_nueva.id, 'token', v_nueva.token, 'inicio', v_nueva.inicio);
end $$;

-- VOLVER A AGENDAR: fecha sugerida según el servicio (ej. 15 días).
create or replace function sugerir_proxima(p_cita uuid) returns date
language sql stable security definer set search_path = public as $$
  select ((c.inicio at time zone 'America/Bogota')::date + s.dias_para_volver)
    from citas c join servicios s on s.id = c.servicio_id where c.id = p_cita;
$$;

-- El barbero agenda la próxima cita del mismo cliente y servicio.
create or replace function agendar_proxima(p_cita_anterior uuid, p_inicio timestamptz, p_barbero uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare v citas; v_nueva citas;
begin
  select * into v from citas where id = p_cita_anterior;
  if v.id is null or not es_miembro(v.barberia_id) then raise exception 'SIN_PERMISO'; end if;
  v_nueva := _crear_cita(v.barberia_id, v.servicio_id, p_barbero, p_inicio, v.cliente_id);
  return json_build_object('cita_id', v_nueva.id, 'token', v_nueva.token, 'inicio', v_nueva.inicio);
end $$;

-- ---------------------------------------------------------------------
-- 7. VISTA DEL CALENDARIO (para el barbero)
--    "sin_marcar" = citas pasadas que nadie marcó como atendida
--    o no asistió.
-- ---------------------------------------------------------------------
create or replace view calendario with (security_invoker = true) as
select c.id, c.barberia_id, c.barbero_id, b.nombre as barbero,
       c.inicio, c.fin, (c.inicio at time zone 'America/Bogota')::date as dia,
       c.estado, c.precio, c.cancelada_por, c.reprogramada_desde,
       s.id as servicio_id, s.nombre as servicio, s.duracion_min,
       cl.id as cliente_id, cl.nombre as cliente, cl.telefono,
       (c.estado = 'pendiente' and c.fin < now()) as sin_marcar
  from citas c
  join barberos b  on b.id  = c.barbero_id
  join servicios s on s.id  = c.servicio_id
  join clientes cl on cl.id = c.cliente_id;

-- ---------------------------------------------------------------------
-- 8. PERMISOS DE EJECUCIÓN
-- ---------------------------------------------------------------------
revoke execute on function _crear_cita(uuid,uuid,uuid,timestamptz,uuid,uuid) from public, anon, authenticated;

grant execute on function info_barberia(text)                                        to anon, authenticated;
grant execute on function turnos_disponibles(text,uuid,date,uuid,uuid)               to anon, authenticated;
grant execute on function reservar_cita(text,uuid,uuid,timestamptz,text,text,boolean) to anon, authenticated;
grant execute on function mis_citas(uuid[])                                          to anon, authenticated;
grant execute on function cancelar_cita(uuid,uuid)                                   to anon, authenticated;
grant execute on function reprogramar_cita(timestamptz,uuid,uuid,uuid)               to anon, authenticated;
grant execute on function sugerir_proxima(uuid)                                      to authenticated;

revoke execute on function crear_barberia(text,text,text,text)       from anon;
revoke execute on function vincular_barbero()                        from anon;
revoke execute on function marcar_cita(uuid,estado_cita)             from anon;
revoke execute on function agendar_proxima(uuid,timestamptz,uuid)    from anon;
grant  execute on function crear_barberia(text,text,text,text)       to authenticated;
grant  execute on function vincular_barbero()                        to authenticated;
grant  execute on function marcar_cita(uuid,estado_cita)             to authenticated;
grant  execute on function agendar_proxima(uuid,timestamptz,uuid)    to authenticated;

-- Tiempo real: la cita nueva le aparece al barbero al instante.
do $$ begin
  alter publication supabase_realtime add table citas;
exception when others then null; end $$;

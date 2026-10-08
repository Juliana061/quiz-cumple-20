-- =====================================================================
--  ¿Quién me conoce más? — Esquema de base de datos (Supabase/Postgres)
--  Ejecuta este archivo COMPLETO en: Supabase > SQL Editor > New query
--  Se puede volver a ejecutar sin problema (es idempotente).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Preguntas del quiz (lectura pública).
-- OJO: `opciones` NO debe tener siempre la correcta en la misma posición,
-- porque cualquiera puede leer esta tabla desde el navegador.
create table if not exists public.preguntas (
  id          int primary key,
  orden       int  not null unique,
  texto       text not null,
  opciones    jsonb not null
              check (jsonb_typeof(opciones) = 'array' and jsonb_array_length(opciones) = 4),
  imagen_url  text
);

-- Respuesta correcta de cada pregunta (PRIVADA: el frontend no la puede leer).
create table if not exists public.respuestas_correctas (
  pregunta_id int primary key references public.preguntas(id) on delete cascade,
  correcta    text not null
);

-- Personas que ya jugaron (PRIVADA: solo se escribe vía RPC).
create table if not exists public.participantes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (char_length(nombre) between 2 and 40),
  respuestas  jsonb not null default '{}'::jsonb,
  puntaje     int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Nombre único sin importar mayúsculas/minúsculas ("Ana" = "ANA" = "ana").
create unique index if not exists participantes_nombre_unico
  on public.participantes (lower(nombre));

-- Configuración privada (aquí vive la contraseña del ranking).
create table if not exists public.config (
  llave text primary key,
  valor text not null
);


-- ---------------------------------------------------------------------
-- 2. SEGURIDAD: RLS + permisos
-- ---------------------------------------------------------------------

alter table public.preguntas            enable row level security;
alter table public.respuestas_correctas enable row level security;
alter table public.participantes        enable row level security;
alter table public.config               enable row level security;

-- `preguntas`: cualquiera puede leer, nadie puede modificar desde el cliente.
drop policy if exists "preguntas_lectura_publica" on public.preguntas;
create policy "preguntas_lectura_publica"
  on public.preguntas for select
  to anon, authenticated
  using (true);

revoke all on table public.preguntas from anon, authenticated;
grant select on table public.preguntas to anon, authenticated;

-- Tablas privadas: sin políticas (RLS bloquea todo) y además sin permisos.
-- Solo las funciones SECURITY DEFINER de abajo pueden tocarlas.
revoke all on table public.respuestas_correctas from anon, authenticated;
revoke all on table public.participantes        from anon, authenticated;
revoke all on table public.config               from anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. FUNCIONES RPC
-- ---------------------------------------------------------------------

-- Normaliza un nombre: quita espacios sobrantes al inicio, final y en medio.
create or replace function public._normalizar_nombre(valor text)
returns text
language sql
immutable
as $$
  select regexp_replace(trim(coalesce(valor, '')), '\s+', ' ', 'g');
$$;

revoke all on function public._normalizar_nombre(text) from public, anon, authenticated;


-- ¿Está libre este nombre? Se usa en la pantalla de inicio para avisar
-- ANTES de que la persona responda las 20 preguntas.
create or replace function public.nombre_disponible(nombre text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from participantes p
    where lower(p.nombre) = lower(_normalizar_nombre(nombre_disponible.nombre))
  );
$$;


-- Recibe las respuestas, calcula el puntaje EN EL SERVIDOR y guarda al
-- participante. Formato de `respuestas`: { "<id_pregunta>": "<texto opción>" }
-- Devuelve el puntaje obtenido (cuántas acertó) para mostrárselo a la persona.
-- Se borra primero porque antes devolvía boolean y Postgres no deja cambiar el tipo.
drop function if exists public.enviar_respuestas(text, jsonb);
create function public.enviar_respuestas(nombre text, respuestas jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre     text := _normalizar_nombre(enviar_respuestas.nombre);
  v_respuestas jsonb;
  v_puntaje    int;
begin
  -- Validaciones básicas
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 40 then
    raise exception 'NOMBRE_INVALIDO' using errcode = '22023';
  end if;

  if enviar_respuestas.respuestas is null
     or jsonb_typeof(enviar_respuestas.respuestas) <> 'object' then
    raise exception 'RESPUESTAS_INVALIDAS' using errcode = '22023';
  end if;

  -- Nombre repetido (sin importar mayúsculas)
  if exists (select 1 from participantes p where lower(p.nombre) = lower(v_nombre)) then
    raise exception 'NOMBRE_REPETIDO' using errcode = '23505';
  end if;

  -- Solo conservamos respuestas de preguntas que existen y que son texto
  select coalesce(jsonb_object_agg(pr.id::text, enviar_respuestas.respuestas -> pr.id::text), '{}'::jsonb)
    into v_respuestas
  from preguntas pr
  where jsonb_typeof(enviar_respuestas.respuestas -> pr.id::text) = 'string';

  -- Puntaje: cuántas respuestas coinciden EXACTAMENTE con la correcta
  select count(*)
    into v_puntaje
  from respuestas_correctas rc
  where v_respuestas ->> rc.pregunta_id::text = rc.correcta;

  insert into participantes (nombre, respuestas, puntaje)
  values (v_nombre, v_respuestas, v_puntaje);

  return v_puntaje;

exception
  -- Si dos personas envían el mismo nombre al mismo tiempo, el índice único
  -- frena a la segunda y devolvemos el mismo error amigable.
  when unique_violation then
    raise exception 'NOMBRE_REPETIDO' using errcode = '23505';
end;
$$;


-- Verifica la contraseña de admin contra la guardada en `config`.
-- Lanza un error si no coincide. La usan las funciones de admin de abajo.
create or replace function public._verificar_clave_admin(clave text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guardada text;
begin
  select c.valor into v_guardada from config c where c.llave = 'clave_ranking';

  -- Protección por si se olvidó cambiar el placeholder del seed
  if v_guardada is null or v_guardada = '[MI_CONTRASEÑA]' then
    raise exception 'CLAVE_SIN_CONFIGURAR' using errcode = '28000';
  end if;

  if _verificar_clave_admin.clave is distinct from v_guardada then
    perform pg_sleep(1); -- frena un poco a quien intente adivinar la clave
    raise exception 'CLAVE_INCORRECTA' using errcode = '28P01';
  end if;
end;
$$;

revoke all on function public._verificar_clave_admin(text) from public, anon, authenticated;


-- Devuelve el ranking SOLO si la clave coincide con la guardada en `config`.
-- Desempate: a igual puntaje, gana quien respondió primero (created_at).
create or replace function public.obtener_ranking(clave text)
returns table (posicion bigint, nombre text, puntaje int, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform _verificar_clave_admin(obtener_ranking.clave);

  return query
    select row_number() over (order by p.puntaje desc, p.created_at asc) as posicion,
           p.nombre,
           p.puntaje,
           p.created_at
    from participantes p
    order by p.puntaje desc, p.created_at asc;
end;
$$;


-- Respuestas de TODOS los participantes (solo admin, con contraseña).
-- `detalle` es un arreglo con una entrada por pregunta:
--   { orden, pregunta, respuesta, correcta, acerto }
create or replace function public.obtener_respuestas(clave text)
returns table (posicion bigint, nombre text, puntaje int, created_at timestamptz, detalle jsonb)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  perform _verificar_clave_admin(obtener_respuestas.clave);

  return query
    select row_number() over (order by p.puntaje desc, p.created_at asc) as posicion,
           p.nombre,
           p.puntaje,
           p.created_at,
           coalesce((
             select jsonb_agg(
                      jsonb_build_object(
                        'orden',     pr.orden,
                        'pregunta',  pr.texto,
                        'respuesta', p.respuestas ->> pr.id::text,
                        'correcta',  rc.correcta,
                        'acerto',    coalesce((p.respuestas ->> pr.id::text) = rc.correcta, false)
                      )
                      order by pr.orden
                    )
             from preguntas pr
             join respuestas_correctas rc on rc.pregunta_id = pr.id
           ), '[]'::jsonb) as detalle
    from participantes p
    order by p.puntaje desc, p.created_at asc;
end;
$$;


-- Ranking público (sin contraseña) para que quienes ya jugaron vean quién va
-- adelante. Solo expone posición, nombre y puntaje: nunca las respuestas.
create or replace function public.ranking_publico()
returns table (posicion bigint, nombre text, puntaje int)
language sql
stable
security definer
set search_path = public
as $$
  select row_number() over (order by p.puntaje desc, p.created_at asc),
         p.nombre,
         p.puntaje
  from participantes p
  order by p.puntaje desc, p.created_at asc;
$$;


-- Permisos de ejecución: solo estas funciones son públicas.
revoke all on function public.nombre_disponible(text)          from public;
revoke all on function public.enviar_respuestas(text, jsonb)   from public;
revoke all on function public.obtener_ranking(text)            from public;
revoke all on function public.ranking_publico()                from public;
revoke all on function public.obtener_respuestas(text)         from public;

grant execute on function public.nombre_disponible(text)        to anon, authenticated;
grant execute on function public.enviar_respuestas(text, jsonb) to anon, authenticated;
grant execute on function public.obtener_ranking(text)          to anon, authenticated;
grant execute on function public.ranking_publico()              to anon, authenticated;
grant execute on function public.obtener_respuestas(text)       to anon, authenticated;

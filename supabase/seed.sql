-- =====================================================================
--  ¿Quién me conoce más? — Datos iniciales (20 preguntas)
--  Ejecuta este archivo DESPUÉS de schema.sql.
--  Se puede volver a ejecutar: actualiza las preguntas sin borrar a
--  quienes ya jugaron ni las fotos (imagen_url) que hayas puesto.
-- =====================================================================

-- Las opciones van en posiciones variadas A PROPÓSITO: la tabla `preguntas`
-- es pública, así que la correcta no puede ir siempre de primera.
-- (Igual el frontend las vuelve a mezclar al azar para cada persona.)
insert into public.preguntas (id, orden, texto, opciones) values
  ( 1,  1, '¿Cuál es mi comida favorita?',
        '["Ajiaco", "Lengua en salsa", "Bandeja paisa", "Sobrebarriga"]'),
  ( 2,  2, '¿Cuál es mi color favorito?',
        '["Morado", "Verde", "Azul", "Negro"]'),
  ( 3,  3, '¿Qué estudié en la universidad?',
        '["Ingeniería de Sistemas", "Diseño Gráfico", "Administración de Empresas", "Desarrollo de Software"]'),
  ( 4,  4, '¿Cuál es mi bebida favorita?',
        '["Coca-Cola", "Pepsi", "Colombiana", "Jugo de mora"]'),
  ( 5,  5, '¿Tengo mascota? ¿Cómo se llama?',
        '["Sí: Lulú, Max y Luna", "Sí: Lulú, Félix y Blu", "Sí: Félix, Toby y Blu", "No tengo mascota"]'),
  ( 6,  6, '¿Cuál es mi película o serie favorita?',
        '["La casa de papel", "Merlina", "Stranger Things", "Breaking Bad"]'),
  ( 7,  7, '¿Cómo se llama el pueblo donde nació mi abuelo?',
        '["Gigante", "Baraya", "Garzón", "Colombia"]'),
  ( 8,  8, '¿A qué le tengo miedo?',
        '["A las ratas", "A las arañas", "A las alturas", "A la oscuridad"]'),
  ( 9,  9, '¿Cuál es mi videojuego favorito?',
        '["Minecraft", "GTA V", "Fortnite", "Free Fire"]'),
  (10, 10, '¿Qué es lo que más me molesta de la gente?',
        '["Que lleguen tarde", "Que hablen muy duro", "Que hagan ruido cuando comen", "Que mientan"]'),
  (11, 11, '¿A qué país me gustaría viajar?',
        '["Japón", "Francia", "España", "Estados Unidos"]'),
  (12, 12, '¿Cuál fue mi primer trabajo?',
        '["Vendedora en Seven Seven", "Mesera en un restaurante", "Cajera en Éxito", "Asesora en Falabella"]'),
  (13, 13, '¿En qué colegio estudié?',
        '["Santa María", "La Merced", "San José", "Liceo Femenino"]'),
  (14, 14, '¿Cuál es el carro de mis sueños?',
        '["Toyota Prado", "Mazda CX-5", "Toyota Fortuner", "Jeep Wrangler"]'),
  (15, 15, '¿Qué quería ser cuando era niña?',
        '["Veterinaria", "Profesora", "Abogada", "Médica"]'),
  (16, 16, '¿Cuál es mi mayor sueño?',
        '["Tener casa propia", "Viajar por el mundo", "Tener mi propia empresa", "Tener carro propio"]'),
  (17, 17, '¿Cómo me dice mi familia?',
        '["Juli / Julita", "Yu / Yuyis", "Angie", "Juls"]'),
  (18, 18, '¿Cuál es mi torta favorita?',
        '["Chocolate", "Red velvet", "Tres leches", "Zanahoria"]'),
  (19, 19, '¿Qué canción me estresa escuchar?',
        '["Despacito", "Hawái", "La Bicicleta", "Tutu de Camilo"]'),
  (20, 20, '¿Cómo se llama mi hermana?',
        '["Sofía", "Valentina", "Camila", "Daniela"]')
on conflict (id) do update
  set orden    = excluded.orden,
      texto    = excluded.texto,
      opciones = excluded.opciones;


-- Respuestas correctas (texto IDÉNTICO a la opción guardada arriba).
insert into public.respuestas_correctas (pregunta_id, correcta) values
  ( 1, 'Lengua en salsa'),
  ( 2, 'Azul'),
  ( 3, 'Desarrollo de Software'),
  ( 4, 'Coca-Cola'),
  ( 5, 'Sí: Lulú, Félix y Blu'),
  ( 6, 'Stranger Things'),
  ( 7, 'Colombia'),
  ( 8, 'A las ratas'),
  ( 9, 'GTA V'),
  (10, 'Que hagan ruido cuando comen'),
  (11, 'Estados Unidos'),
  (12, 'Vendedora en Seven Seven'),
  (13, 'La Merced'),
  (14, 'Toyota Fortuner'),
  (15, 'Médica'),
  (16, 'Tener casa propia'),
  (17, 'Yu / Yuyis'),
  (18, 'Tres leches'),
  (19, 'Tutu de Camilo'),
  (20, 'Sofía')
on conflict (pregunta_id) do update
  set correcta = excluded.correcta;


-- Contraseña del ranking (/admin-juli).
-- 👉 Cambia [MI_CONTRASEÑA] por tu contraseña real ANTES de ejecutar,
--    o actualízala después con el UPDATE que aparece en el README.
insert into public.config (llave, valor) values
  ('clave_ranking', '[Juli_1234]')
on conflict (llave) do nothing;


-- Verificación: cada respuesta correcta debe existir tal cual en sus opciones.
-- Si algo no coincide, este bloque lanza un error y te dice cuál pregunta es.
do $$
declare
  v_malas text;
begin
  select string_agg(rc.pregunta_id::text, ', ' order by rc.pregunta_id)
    into v_malas
  from public.respuestas_correctas rc
  join public.preguntas p on p.id = rc.pregunta_id
  where not (p.opciones ? rc.correcta);

  if v_malas is not null then
    raise exception 'La respuesta correcta no coincide con ninguna opción en las preguntas: %', v_malas;
  end if;

  raise notice '✅ Seed OK: % preguntas cargadas.', (select count(*) from public.preguntas);
end;
$$;

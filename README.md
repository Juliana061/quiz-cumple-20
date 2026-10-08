# 🎂 ¿Quién me conoce más? — Quiz de mis 20 años

App web para que mis amigos respondan **20 preguntas (una por cada año que cumplo)** desde el celular.
Al terminar, cada persona ve cuántas acertó (pero no cuáles) y el ranking en vivo para saber quién va ganando. En la fiesta se hace la revelación final desde la ruta secreta `/admin-juli`.

**Stack:** React + Vite · React Router · Supabase (Postgres + funciones RPC) · Vercel

---

## 📁 Estructura

```
quiz-cumple-20/
├── supabase/
│   ├── schema.sql      ← tablas, seguridad (RLS) y funciones RPC
│   └── seed.sql        ← las 20 preguntas, respuestas y contraseña del ranking
├── src/
│   ├── pages/          ← Inicio, Quiz, Final, Ranking
│   ├── components/     ← Fondo (globos), Confeti, Cargando
│   ├── lib/            ← cliente Supabase, llamadas a la API, localStorage, utilidades
│   └── estilos.css
├── .env.example
└── vercel.json         ← hace que /quiz, /gracias y /admin-juli funcionen al recargar
```

### ¿Cómo se protege el juego?

- La tabla `preguntas` es pública, pero **las respuestas correctas están en otra tabla (`respuestas_correctas`) que el navegador no puede leer**.
- En `preguntas` la opción correcta está en posiciones distintas (no siempre de primera), y además el frontend las mezcla al azar para cada persona.
- El **puntaje se calcula en el servidor** (función `enviar_respuestas`), así que nadie lo puede falsificar.
- Los nombres son únicos sin importar mayúsculas (`Ana` = `ANA`). Se valida al empezar y otra vez al enviar.
- En el celular queda guardado que la persona ya jugó (localStorage), y también su avance si cierra la página a la mitad.
- El ranking solo sale si la contraseña coincide con la guardada en la tabla privada `config`.
- **Desempate:** a igual puntaje, gana quien respondió primero.

---

## 1️⃣ Crear el proyecto en Supabase y cargar la base de datos

1. Entra a [supabase.com](https://supabase.com), inicia sesión y haz clic en **New project**.
2. Ponle un nombre (ej. `quiz-cumple-20`), una contraseña para la base de datos y la región más cercana (ej. *South America (São Paulo)*). Espera a que termine de crearse (1–2 min).
3. En el menú izquierdo ve a **SQL Editor** → **New query**.
4. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql), copia **todo** su contenido, pégalo y dale **Run**. Debe decir *Success*.
5. Abre [`supabase/seed.sql`](supabase/seed.sql) y, antes de ejecutarlo, haz el paso 2 de abajo (la contraseña). Luego crea otra **New query**, pega todo y dale **Run**. Al final verás el aviso `✅ Seed OK: 20 preguntas cargadas.`
   - Si sale un error que dice *"La respuesta correcta no coincide…"*, revisa que el texto de la correcta sea idéntico a una de las 4 opciones de esa pregunta (tildes y mayúsculas incluidas).
6. Para verificar: ve a **Table Editor** → `preguntas` y deberías ver las 20.

> Ambos archivos se pueden volver a ejecutar sin problema. Volver a correr `seed.sql` actualiza los textos sin borrar a quienes ya jugaron ni las fotos que hayas puesto.

### 📷 (Opcional) Poner una foto en una pregunta

1. En Supabase ve a **Storage** → **New bucket** → nombre `fotos` → marca **Public bucket** → crear.
2. Sube tu foto, haz clic en ella → **Get URL** y cópiala.
3. En **SQL Editor** ejecuta (cambiando el número de la pregunta y la URL):

```sql
update preguntas set imagen_url = 'https://TU-PROYECTO.supabase.co/storage/v1/object/public/fotos/mi-foto.jpg'
where orden = 5;
```

Para quitarla: `update preguntas set imagen_url = null where orden = 5;`

---

## 2️⃣ Poner la contraseña del ranking

**Opción A (antes de correr el seed):** en `supabase/seed.sql` busca esta línea y cambia `[MI_CONTRASEÑA]` por tu contraseña:

```sql
('clave_ranking', '[MI_CONTRASEÑA]')
```

**Opción B (cuando quieras, también para cambiarla):** en **SQL Editor** ejecuta:

```sql
update config set valor = 'aquí-tu-contraseña-secreta' where llave = 'clave_ranking';
```

> Mientras siga el placeholder `[MI_CONTRASEÑA]`, el ranking **no** se abre (te mostrará un aviso). Usa una contraseña que nadie adivine, porque el link `/admin-juli` es público.

---

## 3️⃣ Correrlo en local

Necesitas [Node.js](https://nodejs.org) 18 o superior.

1. Copia `.env.example` como `.env`:

```bash
cp .env.example .env
```

2. Llena el `.env` con los datos de **Supabase → Project Settings → API**:
   - `VITE_SUPABASE_URL` → *Project URL*
   - `VITE_SUPABASE_ANON_KEY` → la llave *anon public* (¡nunca la `service_role`!)

3. Instala dependencias y arranca:

```bash
npm install
```

```bash
npm run dev
```

4. Abre `http://localhost:5173`. Para probar desde tu celular (conectado al mismo wifi), usa la dirección *Network* que muestra la terminal, ej. `http://192.168.1.10:5173`.

### 🔁 Volver a jugar mientras pruebas

Como la app recuerda que ya jugaste, para probar otra vez:

- En el navegador abre la consola (F12) y ejecuta `localStorage.clear()`, o usa una ventana de incógnito.
- Y borra tus pruebas de la base de datos antes de compartir el link:

```sql
delete from participantes;
```

---

## 4️⃣ Desplegar en Vercel

1. Sube la carpeta `quiz-cumple-20` a un repositorio de GitHub (el `.env` **no** se sube, ya está en `.gitignore`).
2. Entra a [vercel.com](https://vercel.com) → **Add New… → Project** → importa tu repositorio.
   - Si el repo contiene más cosas, en **Root Directory** elige la carpeta `quiz-cumple-20`.
   - Vercel detecta **Vite** solo (Build: `npm run build`, Output: `dist`).
3. Antes de darle Deploy, abre **Environment Variables** y agrega:

| Nombre | Valor |
|---|---|
| `VITE_SUPABASE_URL` | tu Project URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | tu llave anon public |

4. Dale **Deploy**. En 1 minuto tendrás un link tipo `https://quiz-cumple-20.vercel.app`.
5. Si agregas o cambias variables después, ve a **Deployments → ⋯ → Redeploy** para que tomen efecto.

### 🎉 El día de la fiesta

- Comparte el link principal con tus amigos.
- En el TV abre `https://tu-app.vercel.app/admin-juli`, escribe la contraseña y presiona **🥁 Revelar ranking**: primero aparecen los puestos del 4.º en adelante, luego bronce, plata y, por último, el oro con confeti. 
- Pon el navegador en pantalla completa con **F11**. El botón **↻ Actualizar** trae a quien haya jugado a última hora.

---

## 🛠️ Solución de problemas

| Problema | Solución |
|---|---|
| Pantalla "Falta configurar Supabase" | Falta el `.env` (local) o las variables en Vercel. Reinicia `npm run dev` después de crearlo. |
| "Parece que no tienes conexión" | Sin internet o URL de Supabase mal escrita en el `.env`. |
| "Todavía no hay preguntas cargadas" | No se ejecutó `seed.sql`. |
| Al recargar `/admin-juli` en Vercel sale 404 | Asegúrate de que `vercel.json` esté en la raíz del proyecto desplegado. |
| "Todavía no has configurado la contraseña del ranking" | Sigue el paso 2️⃣. |

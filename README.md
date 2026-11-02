# Gym Routine

Aplicación para armar y guardar rutinas de gimnasio. El frontend funciona como sitio estático y puede publicarse gratis en GitHub Pages; el backend FastAPI se conserva para desarrollo local y para la API.

## Estructura

```text
GYM-app/
├── backend/
│   ├── __init__.py
│   ├── exercises.json
│   └── main.py
├── frontend/
│   ├── app.js
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   ├── supabase-config.js
│   ├── crear.html
│   ├── entrenamiento.html
│   ├── index.html
│   ├── icons/
│   └── styles.css
├── .github/
│   └── workflows/
│       └── pages.yml
├── requirements.txt
└── README.md
```

## Publicar en GitHub Pages

1. Subí este proyecto a un repositorio de GitHub en la rama `main` o `master`.
2. En el repositorio, abrí **Settings → Pages** y elegí **GitHub Actions** como origen de publicación.
3. Cada push a `main` o `master` ejecuta el workflow de `.github/workflows/pages.yml`. También podés iniciarlo manualmente desde la pestaña **Actions**.
4. Cuando el workflow termine, GitHub mostrará la dirección pública en **Settings → Pages** (normalmente `https://USUARIO.github.io/REPOSITORIO/`).

La web es instalable como aplicación (PWA) en navegadores compatibles. Abrí el sitio publicado y tocá **Instalar app**; en iPhone/iPad, usá Safari → **Compartir → Agregar a pantalla de inicio**. La instalación requiere HTTPS, disponible automáticamente en GitHub Pages.

El workflow prepara el sitio estático copiando el frontend y el catálogo de ejercicios a la carpeta de publicación. GitHub Pages no ejecuta el backend FastAPI ni ofrece una base de datos. Para sincronizar rutinas entre navegadores, configurá Supabase siguiendo la sección **Sincronizar con Supabase**.

El acceso sigue siendo solo por DNI, sin contraseña. El DNI identifica el espacio de datos pero no verifica la identidad. La configuración actual de Supabase permite que cualquier persona que conozca la URL pública del proyecto y su clave pública lea y modifique los datos de todos los DNI. No guardes información sensible en esta app.

## Sincronizar con Supabase

1. En Supabase, abrí **SQL Editor → New query**, copiá el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y ejecutalo. Esto crea la tabla `gym_user_states` y sus permisos para la app.
2. Revisá [`frontend/supabase-config.js`](./frontend/supabase-config.js). Ya contiene la URL del proyecto y la clave **publishable** compartida para esta configuración. Esa clave es pública y se distribuye con el frontend; nunca reemplazarla por `service_role` ni por una clave secreta.
3. Subí los cambios a GitHub. El workflow de Pages volverá a publicar el sitio.
4. Abrí la app con el mismo DNI en los dispositivos. Al conectarse, la copia que ya exista en Supabase será la compartida. Si todavía no hay una, la app copiará a Supabase la copia local del primer navegador que tenga datos para ese DNI.

La app conserva una copia local y muestra un error si no logra sincronizar. Si usás la app en más de un dispositivo al mismo tiempo, el último cambio sincronizado reemplaza el estado completo anterior; evitá editar la misma rutina en varios dispositivos simultáneamente.

## Ejecutar en Windows

Para ejecutar localmente también se puede usar el backend FastAPI. Desde la carpeta del proyecto, abre una terminal en VS Code:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Abre <http://127.0.0.1:8000> e ingresá tu DNI de 7 u 8 números. La página inicial muestra las rutinas guardadas para ese DNI; **Cambiar usuario** permite entrar con otro. **Ver para entrenar** abre la rutina en una pantalla de solo lectura y **Editar** o **Crear o modificar rutinas** abre el constructor en <http://127.0.0.1:8000/crear.html>. La documentación interactiva de la API está en <http://127.0.0.1:8000/docs>.

La interfaz carga Tailwind CSS y las fuentes desde sus CDNs, por lo que se necesita conexión a internet para esos recursos. En GitHub Pages, el frontend obtiene el catálogo estático de `data/exercises.json`; el resto de la aplicación se ejecuta en el navegador.

## API

- `GET /api/groups`: grupos musculares disponibles.
- `GET /api/exercises`: catálogo completo; acepta `muscle_group` y `q` como filtros.
- `GET /api/routines/{group_id}?limit=4`: genera una rutina nueva y variada.

El catálogo incluye ejercicios con nombres y descripciones en español rioplatense, separados por grupo muscular: pecho, espalda, piernas, hombros, bíceps, tríceps y core. El constructor permite buscar y filtrar ejercicios, agregar los que quieras a la rutina y registrar el peso en kg de cada serie. La pantalla de entrenamiento muestra por separado la rutina guardada y los pesos registrados, sin controles de edición. Las rutinas, ejercicios personalizados y pesos se sincronizan en Supabase y también se conserva una copia local en cada navegador.

Desde el constructor también podés desplegar **Agregar un ejercicio que no está en el listado**, completar sus datos y guardarlo. El ejercicio se agrega a la rutina activa y queda disponible en el catálogo de ese navegador.

Antes de guardar una rutina, podés ajustar entre 1 y 10 series para cada ejercicio. Al guardar o cargar una rutina guardada, la cantidad de series queda bloqueada; para elegir otra cantidad hay que empezar una rutina nueva.

El botón **Ver video** abre una ventana para reproducir los videos que tengan una URL real. Para ejercicios sin ID configurado, ofrece una búsqueda directa en YouTube. Reemplazá `VIDEO_ID` en `backend/exercises.json` por el ID real de YouTube para habilitar el reproductor integrado. Se aceptan enlaces `/watch?v=...`, `/shorts/...` y `/embed/...`.

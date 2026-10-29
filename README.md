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
│   ├── crear.html
│   ├── index.html
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

El workflow prepara el sitio estático copiando el frontend y el catálogo de ejercicios a la carpeta de publicación. La app guarda rutinas, ejercicios personalizados y pesos en el almacenamiento local del navegador: esos datos no se sincronizan entre dispositivos ni navegadores. GitHub Pages no ejecuta el backend FastAPI ni ofrece la API.

## Ejecutar en Windows

Para ejecutar localmente también se puede usar el backend FastAPI. Desde la carpeta del proyecto, abre una terminal en VS Code:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Abre <http://127.0.0.1:8000>. La página inicial muestra tus rutinas guardadas; **Armar otra rutina** abre el constructor en <http://127.0.0.1:8000/crear.html>. La documentación interactiva de la API está en <http://127.0.0.1:8000/docs>.

La interfaz carga Tailwind CSS y las fuentes desde sus CDNs, por lo que se necesita conexión a internet para esos recursos. En GitHub Pages, el frontend obtiene el catálogo estático de `data/exercises.json`; el resto de la aplicación se ejecuta en el navegador.

## API

- `GET /api/groups`: grupos musculares disponibles.
- `GET /api/exercises`: catálogo completo; acepta `muscle_group` y `q` como filtros.
- `GET /api/routines/{group_id}?limit=4`: genera una rutina nueva y variada.

El catálogo incluye ejercicios con nombres y descripciones en español rioplatense, separados por grupo muscular: pecho, espalda, piernas, hombros, bíceps, tríceps y core. La pantalla permite buscar y filtrar ejercicios, agregar los que quieras a la única rutina activa y registrar el peso en kg de cada serie. Las rutinas guardadas y el borrador activo se conservan en el almacenamiento local del navegador.

Desde el constructor también podés desplegar **Agregar un ejercicio que no está en el listado**, completar sus datos y guardarlo. El ejercicio se agrega a la rutina activa y queda disponible en el catálogo de ese navegador.

Antes de guardar una rutina, podés ajustar entre 1 y 10 series para cada ejercicio. Al guardar o cargar una rutina guardada, la cantidad de series queda bloqueada; para elegir otra cantidad hay que empezar una rutina nueva.

El botón **Ver video** abre una ventana para reproducir los videos que tengan una URL real. Para ejercicios sin ID configurado, ofrece una búsqueda directa en YouTube. Reemplazá `VIDEO_ID` en `backend/exercises.json` por el ID real de YouTube para habilitar el reproductor integrado. Se aceptan enlaces `/watch?v=...`, `/shorts/...` y `/embed/...`.

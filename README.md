# Slugpedia — Enciclopedia de babosas

Página estática con catálogo conectado a Slugterra Wiki, búsqueda, filtro por elemento, fichas en un cuadro de diálogo y memorama de 6 parejas.

## Ejecutar

Abre la carpeta en VS Code y arranca un servidor local desde la terminal:

```powershell
python -m http.server 5500
```

Visita `http://localhost:5500`. También puedes usar la extensión Live Server. No abras `index.html` directamente como archivo: los módulos ES y la carga del JSON requieren un servidor HTTP.

## Cómo funciona

- `src/api.js` obtiene las especies conocidas de la sección correspondiente a `Slugs` en Slugterra Wiki y carga sus imágenes, categorías y datos disponibles mediante la API de MediaWiki. El catálogo se guarda en caché por 24 horas; si la actualización falla, se conserva la última copia guardada.
- Si no hay una copia guardada y la API no está disponible, se usa `data/slugs.json` como catálogo alternativo.
- Las fichas muestran enseguida los datos locales y se actualizan con la traducción de la wiki en segundo plano. Los detalles traducidos se guardan en caché por 24 horas; los nombres propios se conservan y los campos ausentes indican que aún no están registrados en la fuente disponible.
- Los nombres visibles de algunas babosas se muestran en español mediante `src/slug-names.js`; los títulos originales se conservan internamente para buscar y abrir las páginas correctas de la wiki.
- Los filtros de Tierra, Fuego, Aire, Agua y Energía usan las listas y excepciones de `src/elements.js`. Una babosa puede aparecer en varios filtros; Universal Slug aparece en los cinco. El catálogo omite las especies retiradas de esa lista.
- La traducción de los datos de la wiki usa el servicio público de Google Translate; si no está disponible, se muestra un aviso y se conservan los datos locales en español.
- `src/ui.js` y `src/game.js` generan la interfaz y el juego de memoria.
- Las seis valoraciones del JSON son estimaciones de esta página, no datos oficiales del juego. Puedes editarlas junto con elemento, descripción, emoji y color.
- `assets/lost-caverns.svg` es una ilustración vectorial original del escenario. Las imágenes de personajes se solicitan a Slugterra Wiki; algunas especies no tienen miniatura publicada.
- Google Fonts (Oxanium y Space Grotesk) y Tailwind Play CDN se cargan desde sus CDN públicos. No se requiere instalar paquetes. La página conserva su CSS propio para el arte y componentes.

La API de Fandom puede limitar solicitudes o cambiar sus políticas CORS; el archivo local mantiene disponible la experiencia básica si ocurre.

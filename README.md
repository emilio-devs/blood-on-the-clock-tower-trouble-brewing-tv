# Blood on the Clocktower · Game Guide

Pantalla de referencia pública y multilingüe para partidas presenciales de **Blood on the Clocktower**. Está diseñada principalmente para una televisión 16:9 y también se adapta a tabletas y móviles.

## Abrir la pantalla

- **Online:** [abrir la versión de GitHub Pages](https://emilio-devs.github.io/bloodontheclocktower/)
- **En local:** descarga `index.html` y ábrelo con Chrome o Edge.

El `index.html` publicado funciona como un único archivo autónomo y puede abrirse directamente. Los datos de personajes e idiomas se incrustan durante la compilación. La música y los iconos necesitan conexión a Internet porque se cargan desde OpenGameArt y Lucide.

## Funciones

- Trouble Brewing con sus 23 tarjetas actuales.
- Español e inglés, con detección automática y preferencias guardadas.
- Selector preparado para Trouble Brewing, Bad Moon Rising y Sects & Violets.
- Diseño oscuro de grimorio optimizado para 1920 × 1080.
- Música instrumental de fantasía con reproducción, pausa, cambio de canción y volumen.
- Pantalla completa.
- Ocultación automática del cursor y los controles tras unos segundos sin actividad.
- Sin backend, instalación ni configuración.

## Datos y compilación

- `data/es.json` y `data/en.json` contienen la interfaz, las ediciones y los personajes traducidos.
- `src/index.template.html` y `src/app.js` contienen la presentación y el comportamiento.
- `index.html` es un archivo generado y no debe editarse directamente.

Para regenerar y validar el HTML:

```powershell
npm run build
npm run check
```

## Publicación

Cada cambio enviado a la rama `main` se compila, valida y publica automáticamente mediante GitHub Pages.

## Créditos

Consulta [MUSIC-CREDITS.md](MUSIC-CREDITS.md) para las atribuciones y licencias de las pistas.

Los iconos pertenecen a [Lucide](https://lucide.dev/) y se cargan desde su distribución pública.

Este es un proyecto de aficionados no oficial. *Blood on the Clocktower* y sus elementos relacionados pertenecen a The Pandemonium Institute.

## Licencia

El código de esta pantalla se distribuye bajo la [licencia MIT](LICENSE). Las pistas musicales mantienen sus licencias originales, indicadas por separado.

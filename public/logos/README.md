# Logos de universidades (landing pública)

La sección "Presencia comercial real" de la landing (`app/page.tsx`) muestra los
logos reales de las universidades, sobre tarjetas blancas.

## Archivos actuales (descargados de Wikimedia Commons)

| Universidad          | Archivo       | Ruta web            | Origen |
|----------------------|---------------|---------------------|--------|
| UBO                  | `ubo.png`     | `/logos/ubo.png`    | Wikimedia Commons (PNG transparente) |
| DUOC                 | `duoc.svg`    | `/logos/duoc.svg`   | Wikimedia Commons (SVG) |
| Universidad de Chile | `uchile.svg`  | `/logos/uchile.svg` | Wikimedia Commons — escudo oficial (SVG) |

La web los reescala a 40 px de alto manteniendo proporción. Si reemplazas un
archivo, mantén el mismo nombre (o actualiza la extensión en `app/page.tsx`) y,
de preferencia, usa PNG transparente o SVG.

## Fallback
Si un archivo falta o no carga, la web cae automáticamente al nombre de la
universidad con un ícono, así no se rompe la sección.

## Nota legal
Estos son logos/marcas de terceros descargados de Wikimedia Commons. Su uso en
una web comercial normalmente requiere autorización de cada institución.
Asegúrate de contar con ese permiso. Si alguna institución pide bajarlo,
reemplaza o elimina el archivo correspondiente en esta carpeta.

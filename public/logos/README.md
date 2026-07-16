# Logos de universidades (landing pública)

La sección "Presencia comercial real" de la landing (`app/page.tsx`) muestra
los logos reales de las universidades. Deja aquí los archivos con **estos
nombres exactos** (en minúscula):

| Universidad          | Archivo requerido | Ruta que usa la web   |
|----------------------|-------------------|-----------------------|
| UBO                  | `ubo.png`         | `/logos/ubo.png`      |
| DUOC                 | `duoc.png`        | `/logos/duoc.png`     |
| Universidad de Chile | `uchile.png`      | `/logos/uchile.png`   |

## Recomendaciones
- Formato **PNG con fondo transparente** (o **SVG**, aún mejor). Si usas SVG,
  cambia la extensión en la tabla de arriba y en `app/page.tsx`.
- Alto útil ~120–200 px; la web los reescala a 40 px de alto manteniendo proporción.
- Se muestran sobre una tarjeta **blanca**, así que sirven logos a color.

## Mientras no estén los archivos
La web no se rompe: si un logo no existe, cae automáticamente al nombre de la
universidad con un ícono (fallback). Al subir el archivo con el nombre correcto,
el logo aparece solo.

## Nota
Usar logos de terceros en una web comercial normalmente requiere autorización de
cada institución. Asegúrate de contar con ese permiso.

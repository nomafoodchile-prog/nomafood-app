# Fotos de la vitrina de muestra (landing pública)

La sección "Así se ve nuestra propuesta en vitrina" (`app/page.tsx`) muestra una
galería con fotos reales de los productos. Deja aquí las fotos con **estos
nombres exactos** (en minúscula):

| Producto   | Archivo requerido | Ruta web              | Insignia |
|------------|-------------------|-----------------------|----------|
| Mendocino  | `mendocino.jpg`   | `/productos/mendocino.jpg` | ⭐ Producto estrella |
| Empanadas  | `empanadas.jpg`   | `/productos/empanadas.jpg` | — |
| Galletas   | `galletas.jpg`    | `/productos/galletas.jpg`  | — |
| Ensaladas  | `ensaladas.jpg`   | `/productos/ensaladas.jpg` | — |
| Gohan      | `gohan.jpg`       | `/productos/gohan.jpg`     | — |

## Recomendaciones
- Formato **JPG** (foto). Proporción cercana a **4:3 horizontal** se ve mejor;
  la web recorta al centro (`object-fit: cover`), así que centra el producto.
- Ancho útil ~800–1200 px. Peso ideal < 400 KB por foto (comprímelas).
- Fondo cuidado / buena luz: son la cara comercial de la landing.

## Mientras no estén las fotos
La galería no se rompe: cada recuadro muestra "Foto próximamente" sobre un fondo
elegante. Al subir el archivo con el nombre correcto, la foto aparece sola.

## Fotos del catálogo (sección "Nuestros productos")
Esa sección se llena automáticamente desde el catálogo interno: cada producto
usa su campo `foto_oficial_url`. Para que TODOS los productos del catálogo
muestren imagen, cárgales su foto oficial desde el sistema interno (no van en
esta carpeta).

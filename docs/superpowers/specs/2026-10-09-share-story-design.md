# Compartir: imagen de historia — diseño

## Objetivo
Que **Compartir** genere una imagen vertical (formato historia de Instagram, 1080×1920) con la camiseta diseñada —frente y espalda— sobre un diseño de fondo provisto por el equipo, para mandar por WhatsApp o redes. Tiene que sentirse como un momento divertido y empujar a que más gente arme la suya: es una herramienta viral, no un archivo que se descarga.

## Alcance
Incluye:
- El botón **Compartir** del header pasa a funcionar y es la única salida de imagen. Se elimina **Descargar PNG** de la barra del visor, junto con `exportStagePng` y lo que solo él usaba.
- Una vista previa a pantalla completa con un **momento de revelado** animado (con confeti) y la imagen final.
- La imagen: fondo provisto, camiseta de frente y de espalda, una **frase divertida** y el llamado a la acción "Diseñá la tuya en <dirección>" como texto.
- **Otra frase**: cambia la frase y rearma la imagen al instante.
- Compartir con el menú nativo del teléfono (imagen adjunta). Donde no se pueda compartir archivos (escritorio), se descarga.

Fuera de alcance: video o imagen animada, publicar directo en Instagram o WhatsApp por API, código QR, varios fondos para elegir, elegir qué vista mostrar, guardar un historial de lo compartido.

## Decisiones tomadas
- **Componer en un canvas 2D** (no HTML a imagen ni servidor): sin librerías, mismo resultado en todos los navegadores y reutiliza la captura del visor 3D. Generarla en el servidor no es opción: las camisetas se capturan en el navegador y no hay backend.
- **Frente y espalda juntas** en la misma imagen.
- **La vista previa es el mismo PNG que se comparte** (una `<img>` con animación de entrada), así que no puede haber diferencias entre lo que se ve y lo que sale.
- **El revelado tapa el tiempo de captura:** mientras el visor gira de frente a espalda detrás de la vista previa (~2,6 s, igual que en el checkout), se muestra "Armando tu camiseta…".
- **CTA como texto**, no QR.
- Frase elegida al azar; "Otra frase" nunca repite la que está en pantalla.

## Flujo
1. Toque en **Compartir** (header). Se abre un diálogo modal a pantalla completa; el fondo queda inerte.
2. Estado "armando": animación y el texto "Armando tu camiseta…" (anunciado a lectores de pantalla). El visor captura el frente y la espalda.
3. Estado "listo": la imagen aparece con entrada animada y confeti. Botones: **Compartir**, **Otra frase** y cerrar.
4. **Compartir** llama al menú nativo con la imagen adjunta y un texto corto que incluye la dirección. Si el usuario cancela el menú no es un error.
5. Sin soporte de compartir archivos (escritorio y navegadores viejos), el mismo botón descarga el PNG con el nombre del diseño.
- Con `prefers-reduced-motion` no hay confeti ni animación de entrada: la imagen aparece directo.
- El diálogo se cierra con Esc y con el botón de cerrar, y devuelve el foco a **Compartir**. **Compartir** y **Revisar diseño** no pueden estar activos a la vez (ambos mueven la cámara).

## La imagen (`lib/share/`)
- **`story-layout.ts`:** constantes con nombre: tamaño (1080×1920), un rectángulo para el frente, uno para la espalda, y la posición, el ancho máximo, la fuente, el color y la alineación de la frase y del texto del enlace. Son provisorias hasta tener el diseño de fondo; se calibran con capturas del usuario, como se hizo con el escudo y los sponsors.
- **Fondo:** archivo en `public/share/` provisto por el equipo.
- **Captura de las camisetas:** reutiliza la secuencia del checkout (pedir una vista, esperar a que la cámara termine de girar, leer el canvas), pero lee el canvas **completo, con transparencia** (el WebGL es transparente) y lo copia enseguida a otro canvas, porque el búfer cambia con el siguiente giro. Cada copia se **recorta al contenido visible** (rectángulo de píxeles no transparentes) para que la camiseta ocupe siempre el mismo espacio sin importar el tamaño de la pantalla, y se ajusta dentro de su rectángulo del diseño conservando proporción.
- **`phrases.ts`:** lista de frases cortas en español rioplatense. `nextPhrase(current, random)` devuelve una distinta de la actual (con `random` inyectable para probar).
- **`compose-story.ts`:** dibuja en orden fondo, camiseta de frente, camiseta de espalda, frase y enlace; espera a que las fuentes estén cargadas antes de dibujar texto; reduce el tamaño de la fuente de la frase hasta que entre en su ancho máximo.
- **Dirección del enlace:** una constante (`SHARE_URL`) en un solo lugar.

## Compartir (`lib/share/share-image.ts`)
- `canShareFile(file)` usa `navigator.canShare({ files })`. `shareImage(blob, { name, text })`: si se puede, llama a `navigator.share({ files, text })`; si el usuario cancela (`AbortError`) devuelve "cancelado" sin error; si no se puede compartir archivos, descarga el archivo y devuelve "descargado".
- El texto compartido: una línea con la frase y la dirección ("Mirá mi camiseta. Diseñá la tuya en <dirección>").

## Fallas
- Si falla la captura de alguna cara, el diálogo muestra el error con **Reintentar** (no se muestra una imagen incompleta).
- Si no carga el fondo, mismo error con **Reintentar**.
- Si falla `navigator.share` por algo distinto de cancelar, se ofrece la descarga.

## Tests
Con TDD (ver cada test fallar primero): `nextPhrase` (nunca repite), recorte al contenido visible y ajuste en un rectángulo, orden de dibujo y tamaño 1080×1920 de `compose-story`, `shareImage` con y sin soporte y con cancelación, el diálogo (estados armando y listo, "Otra frase" no vuelve a capturar, cierre con Esc, `prefers-reduced-motion`), el header (Compartir activo, deshabilitado mientras se arma) y que ya no exista "Descargar PNG". El aspecto final y los tiempos de la animación se revisan con capturas del usuario.

## Riesgos
- **Dependencia con el checkout:** la secuencia de captura (`lib/checkout/thumbnails.ts`), `pause` y el botón "Revisar diseño" activo viven en la rama `feat/checkout` (PR abierto). Esta funcionalidad toca los mismos `Header.tsx` y `BuilderPage.tsx`; se implementa sobre `main` con el checkout ya mergeado, o sobre esa rama, y se decide antes de empezar.
- La captura depende del visor y de la cámara (`VIEW_SETTLE_MS`), igual que las miniaturas del checkout; no puedo verla en pantalla.
- El menú nativo con archivos requiere HTTPS y un navegador reciente (iOS 15+, Android Chrome); donde falte, se descarga.
- Instagram no recibe imágenes por enlace: aparece como destino en el menú nativo del teléfono, no hay botón directo.
- Las fuentes del texto sobre el canvas deben estar cargadas antes de dibujar, o sale con la fuente de reemplazo.

## Datos que faltan del equipo (antes de implementar)
1. La imagen de fondo y las zonas donde van las camisetas, la frase y el enlace.
2. La dirección real del enlace.
3. Aprobar o ajustar la primera lista de frases que propongo.

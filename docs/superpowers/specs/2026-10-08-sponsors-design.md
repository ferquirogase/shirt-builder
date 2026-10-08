# Sponsors — diseño

## Objetivo
Reemplazar el sponsor de texto (un texto blanco de tamaño fijo, hoy dibujado en la zona del cuello) por sponsors que son imágenes, en 5 ubicaciones fijas de la camiseta, cada una con su propia escala dentro de un límite.

## Alcance
Incluye:
- 5 ubicaciones, una imagen por cada una y todas opcionales: **abdomen** (frente), **manga izquierda**, **manga derecha**, **nuca** (espalda, bajo el cuello) y **espalda baja**.
- Escala por ubicación, de 50 % a 150 % de su tamaño base.
- Subir, reemplazar y quitar cada sponsor; deshacer y rehacer.
- Eliminar el sponsor de texto: `sponsorText`, `SET_SPONSOR_TEXT`, su rama del historial, su dibujo y su campo en el panel.

Fuera de alcance: mover los sponsors a mano, texto como sponsor, cambiar la cámara hacia la espalda al elegir una ubicación trasera, efecto tejido o relieve (se evaluó y se dejó para después).

## Ubicaciones (`lib/builder/sponsor-slots.ts`)
Un catálogo `SPONSOR_SLOTS` en este orden. Cada ubicación define: `id`, `label`, la región de la textura (`bodyFront`, `bodyBack`, `sleeveLeft`, `sleeveRight`), el punto central dentro de la región (`uFrac`, `vFrac`), la orientación (giro de 180° en la espalda; un cuarto de giro en las mangas, sin espejo) y el tamaño base (`baseBox`, lado mayor como fracción del lienzo).

| id | Etiqueta | Región | Tamaño base | Notas |
|---|---|---|---|---|
| `abdomen` | Abdomen | `bodyFront` | 0.12 | el más grande; centro horizontal; 58 % de altura desde el borde de abajo (a la altura del pecho, calibrado con una captura) |
| `sleeve-left` | Manga izquierda | `sleeveLeft` | 0.05 | pequeño-normal; cara exterior de la manga |
| `sleeve-right` | Manga derecha | `sleeveRight` | 0.05 | espejo de la izquierda |
| `nape` | Nuca | `bodyBack` | 0.03 | pequeño; bajo la banda del cuello y sobre el nombre |
| `lower-back` | Espalda baja | `bodyBack` | 0.045 | pequeño; debajo del número |

Los valores de posición y tamaño son provisionales: se calculan con la geometría de la malla (`public/models/gepe_shirt.obj`) y se afinan con capturas, como se hizo con el escudo. Dos puntos críticos:
- **Mangas:** en la textura el eje de la manga (del puño al hombro) corre en la dirección `u` y la circunferencia en `v`, así que la imagen necesita un cuarto de giro para verse derecha con el brazo caído: `-90°` en la manga izquierda y `+90°` en la derecha, sin espejo en ninguna. Se derivó de la malla y lo fija un test. La manga es corta (unos 0.117 de ancho en `u`): el tamaño base y el 150 % deben caber a lo largo de ella.
- **Nuca:** la malla del cuello ocupa la textura de la espalda hasta el 23 % de su altura, así que la nuca no puede ir arriba del nombre (ver más abajo).

El tamaño base es el lado mayor de la caja en la que se ajusta la imagen, conservando su proporción, como el escudo.

## Estado
`DesignState` pierde `sponsorText` y gana:

```ts
sponsors: Partial<Record<SponsorSlotId, { dataUrl: string; scale: number }>>
```

Una ubicación sin entrada no tiene sponsor. Acciones: `SET_SPONSOR { slot, dataUrl }` (conserva la escala de esa ubicación si ya la tenía; si no, 1), `SET_SPONSOR_SCALE { slot, value }` (se limita a 0.5–1.5; sin efecto si la ubicación está vacía), `REMOVE_SPONSOR { slot }`. Un `slot` desconocido no cambia el estado.

Historial: subir, quitar y reemplazar son pasos discretos; los cambios seguidos de escala de una misma ubicación se agrupan en un solo paso (clave `sponsor-scale:<slot>`); la igualdad de estados compara las 5 ubicaciones.

## Dibujo
`drawDesignToCanvas` recibe `sponsorImages: Partial<Record<SponsorSlotId, HTMLImageElement>>` y, tras el escudo y el logo de la marca, recorre el catálogo y pinta cada sponsor que tenga imagen: ajusta la imagen a `baseBox × scale`, la centra en el punto de su ubicación y aplica su orientación. Una imagen que aún no cargó no se pinta.

`JerseyModel` decodifica cada `dataUrl` una sola vez (caché por URL, como el escudo), ignora el resultado de cargas obsoletas y, si una imagen falla, solo omite ese sponsor.

## Panel (`SponsorPanel.tsx`)
Una lista de 5 tarjetas, en el orden del catálogo. Cada tarjeta:
- Nombre de la ubicación.
- Botón de subir (PNG, JPG o SVG, máximo 2 MB; mismas reglas y mensajes de error que el escudo) o, si ya hay imagen, una miniatura y "Reemplazar".
- Control de escala (50 %–150 %), visible solo con imagen.
- "Quitar".

La validación y la lectura de archivos se extraen de `CrestPanel` a un hook compartido para no duplicarlas. Cada tarjeta tiene su propio mensaje de error y su propia protección contra cargas fuera de orden.

## Pruebas
- Reducer: `SET_SPONSOR` guarda la imagen y la escala 1; reemplazar conserva la escala; `SET_SPONSOR_SCALE` limita a 0.5–1.5 y no hace nada en una ubicación vacía; `REMOVE_SPONSOR` vacía la ubicación; un `slot` desconocido no cambia el estado; `sponsorText` ya no existe.
- Historial: subir y quitar se pueden deshacer; arrastrar la escala es un solo paso; escalar dos ubicaciones distintas son dos pasos.
- Catálogo: ids únicos; los 5 esperados en orden; tamaño abdomen > mangas > espalda; todos los puntos dentro de su región; `baseBox × 1.5` cabe en la zona de cada ubicación.
- Compositor: cada ubicación dibuja su imagen centrada en su punto y con su tamaño; la escala agranda y achica; la espalda se dibuja rotada 180°; las mangas con giro y espejo según la malla; las ubicaciones vacías o sin cargar no dibujan nada; no se llama a `fillText` para sponsors.
- Panel: subir a una ubicación despacha `SET_SPONSOR` con esa ubicación; un archivo inválido muestra su error solo en esa tarjeta; el control de escala aparece solo con imagen; quitar vacía la tarjeta; una subida lenta no pisa a una posterior de la misma ubicación.

## Diseño de la espalda
Las posiciones verticales viven en `lib/builder/back-layout.ts`, medidas desde el cuello: nombre 0.25 y número 0.55 (las de siempre), nuca 0.31 y espalda baja 0.88. El nombre llega hasta el cuello, así que arriba de él no hay lugar para la nuca: el sponsor de la nuca queda entre el nombre y el número. Un test (`tests/lib/back-layout.test.ts`) verifica que, con los sponsors al 150 %, la nuca no toca ni el nombre ni el número, y que la espalda baja queda bajo el número y sobre el dobladillo.

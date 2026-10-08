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
Un catálogo `SPONSOR_SLOTS` en este orden. Cada ubicación define: `id`, `label`, la región de la textura (`bodyFront`, `bodyBack`, `sleeveLeft`, `sleeveRight`), el punto central dentro de la región (`uFrac`, `vFrac`), la orientación (giro de 180° en la espalda; giro y espejo en las mangas) y el tamaño base (`baseBox`, lado mayor como fracción del lienzo).

| id | Etiqueta | Región | Tamaño base | Notas |
|---|---|---|---|---|
| `abdomen` | Abdomen | `bodyFront` | 0.16 | el más grande; centro horizontal; unos 30 % de altura desde el borde de abajo |
| `sleeve-left` | Manga izquierda | `sleeveLeft` | 0.055 | pequeño-normal; cara exterior de la manga |
| `sleeve-right` | Manga derecha | `sleeveRight` | 0.055 | espejo de la izquierda |
| `nape` | Nuca | `bodyBack` | 0.05 | pequeño; entre el cuello y el nombre |
| `lower-back` | Espalda baja | `bodyBack` | 0.06 | pequeño; debajo del número |

Los valores de posición y tamaño son provisionales: se calculan con la geometría de la malla (`public/models/gepe_shirt.obj`) y se afinan con capturas, como se hizo con el escudo. Dos puntos críticos:
- **Mangas:** en la textura el eje de la manga (del puño al hombro) corre en la dirección `u` y la circunferencia en `v`, así que la imagen necesita giro y espejo para verse derecha con el brazo caído. Se deriva de la malla y se fija con un test. La manga es corta (unos 0.117 de ancho en `u`): el tamaño base y el 150 % deben caber a lo largo de ella.
- **Nuca:** el nombre está a 25 % de la espalda y el escote entra en la espalda casi hasta ese punto, así que el espacio es mínimo. Si no cabe, se baja un poco el nombre; ese ajuste es parte de este trabajo.

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

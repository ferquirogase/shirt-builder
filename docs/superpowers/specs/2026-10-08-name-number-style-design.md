# Estilo de nombre y número — diseño

## Objetivo
Hoy el nombre y el número de la espalda se dibujan siempre en blanco, con `sans-serif` y un tamaño fijo (`lib/builder/texture-compositor.ts`). Queremos que el usuario elija entre estilos inspirados en camisetas de equipos conocidos y pueda ajustarlos con color y contorno.

## Alcance
Incluye:
- Un catálogo de 6 presets, cada uno con una fuente de Google Fonts.
- Ajuste de color de relleno, color y grosor de contorno, e interruptor de sombra.
- Deshacer/rehacer y exportación de imagen funcionando igual que el resto del diseño.

Fuera de alcance: fuentes propias subidas por el usuario, mover o rotar el texto, nombre y número en el frente o las mangas. No se tocan el modelo 3D ni el mapeo UV.

## Estado
`DesignState` gana un campo:

```ts
nameNumberStyle: {
  presetId: string;
  fill: string;           // color de relleno
  outlineColor: string;
  outlineWidth: number;   // 0 = sin contorno; relativo al tamaño de fuente (0–0.12)
  shadow: boolean;
}
```

Acciones nuevas: `SET_NN_PRESET` (aplica todos los valores del preset, descartando los ajustes manuales), `SET_NN_FILL`, `SET_NN_OUTLINE_COLOR`, `SET_NN_OUTLINE_WIDTH`, `SET_NN_SHADOW`. El estado inicial usa el preset "Clásico". `design-history.ts` debe incluir el campo en su comparación de igualdad.

## Presets (`lib/builder/name-number-presets.ts`)
Cada preset define: `id`, `label`, fuente (familia y peso), si usa mayúsculas, escala del nombre y del número, y los valores por defecto de `fill`, `outlineColor`, `outlineWidth` y `shadow`.

| id | Etiqueta | Fuente (Google Fonts) | Carácter |
|---|---|---|---|
| classic | Clásico | Oswald 700 | condensada, blanco liso |
| modern | Moderno | Montserrat 800 | geométrica ancha, contorno fino |
| retro | Retro | Righteous 400 | redondeada, años 80–90, con sombra |
| block | Bloque | Anton 400 | muy pesada y condensada, estilo selección |
| elegant | Elegante | Playfair Display 900 | serif |
| outline | Contorno | Alfa Slab One 400 | slab con borde grueso de otro color |

Si una fuente no se ve bien sobre la camiseta, se cambia por otra en esta tabla sin tocar el resto del diseño.

## Fuentes
Se cargan con `next/font/google` en `app/layout.tsx` (solo las 6 familias y pesos usados, subset latino). Cada una expone una variable CSS. Antes de dibujar el canvas hay que esperar la fuente con `document.fonts.load(...)`; si no, la primera textura sale con la fuente de respaldo y no se repinta. Antes de implementar, leer la guía de `next/font` en `node_modules/next/dist/docs/` (esta versión de Next tiene cambios).

## Dibujo (`texture-compositor.ts`)
Una función común dibuja el texto de la espalda (rotado 180°, como hoy) en este orden: sombra, contorno (`strokeText` con `lineJoin = "round"`), relleno (`fillText`). Los dos textos (nombre y número) comparten el mismo estilo. Las posiciones actuales (v = 0.15 y 0.55) no cambian. Un nombre largo se reduce para que quepa en el ancho de `bodyBack`.

## Panel (`TextPanel.tsx`)
1. Inputs de nombre y número, como hoy.
2. Cuadrícula de presets con el número "10" en la fuente de cada uno (misma lógica visual que `PatternGrid`).
3. Selector de color de relleno, selector de color de contorno con control de grosor, e interruptor de sombra.

## Pruebas
- Reducer: cada acción actualiza solo su campo; `SET_NN_PRESET` restablece los valores del preset.
- Historial: un cambio de estilo se puede deshacer y rehacer.
- Compositor: con estilo de contorno y sombra se llaman `strokeText` y los ajustes de sombra; sin contorno no se llama `strokeText`.
- Catálogo: los ids de los presets son únicos y todos tienen fuente.
- Panel: elegir un preset despacha la acción correcta.

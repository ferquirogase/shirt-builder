# Patrones con colores por diseño — Diseño

Fecha: 2026-10-04

## Objetivo

Permitir que el catálogo incorpore diseños reales y reconocibles (basados en camisetas populares de equipos) para que los usuarios puedan recrear sus camisetas preferidas, eligiendo colores, escudo y textos propios.

Hoy un patrón solo puede usar dos colores globales (primario y secundario) más el color del cuello. Las camisetas reales usan hasta tres (por ejemplo azul, rojo y blanco), y un patrón de dos franjas no necesita tres selectores. Este diseño hace que cada patrón declare qué colores usa y que el panel muestre solo esos.

## Alcance

Incluye:
- Un tercer rol de color (`accent`) además de `primary` y `secondary`.
- Cada patrón declara los roles que usa, con nombre propio y color por defecto.
- El panel de Colores muestra solo los roles que usan el patrón del torso y el de las mangas, más el cuello.
- Un SVG de espalda opcional por patrón de torso.
- Migración de los 6 patrones de torso y los 3 de mangas actuales, sin cambio de aspecto.
- Un flujo para incorporar cada camiseta nueva (ver "Incorporar un diseño").

Fuera de alcance:
- Escudos, marcas y sponsors de ningún equipo. Se replica solo el diseño gráfico; el usuario pone su escudo con el panel existente.
- Un cuarto color. Si algún diseño lo necesita, se agrega un rol más (cambio chico, ver "Roles").
- Guardado, compartir y "Revisar diseño" (siguen como en el rediseño GEPE).

## Roles de color

Hay tres roles fijos para los patrones: `primary`, `secondary` y `accent`. El cuello sigue siendo el slot aparte `collar`. En el código, `ColorSlot` pasa a `"primary" | "secondary" | "accent" | "collar"`, y `DesignState.colors` gana la clave `accent`.

Los roles son compartidos entre patrones; lo que cambia por patrón es el nombre que ve el usuario y el color por defecto. Esto permite que los colores elegidos sobrevivan al cambiar de patrón.

## Modelo de datos

```ts
type PatternColor = { role: PatternRole; label: string; default: string };
// PatternRole = "primary" | "secondary" | "accent"

type PatternDef = {
  id: string;
  label: string;          // nombre descriptivo del diseño, nunca el del equipo
  svgPath: string;        // frente (y espalda si no hay svgPathBack)
  svgPathBack?: string;   // opcional; se dibuja visto desde atrás
  colors: PatternColor[]; // roles que usa, en el orden en que aparecen en el panel
};
```

Migración de los patrones actuales (se conservan ids y archivos):

| Patrón | Roles |
| --- | --- |
| `plain-body` | primary |
| `stripes-v1`, `diagonal`, `gradient`, `geometric`, `hoops` | primary, secondary |
| `sleeve-plain` | secondary |
| `sleeve-primary` | primary |
| `sleeve-cuff` | primary, secondary |

Las etiquetas y colores por defecto de la migración repiten los de hoy («Color primario», «Color secundario»).

## Comportamiento de los colores

- **Panel de Colores.** Muestra la unión de los roles del patrón del torso y del patrón de mangas, más «Color del cuello». Si ambos patrones usan un mismo rol, la etiqueta es la del patrón del torso; si solo lo usan las mangas, la de las mangas.
- **Cambio de patrón.** Los roles que ya estaban en uso (por el torso o las mangas actuales) conservan el color que eligió el usuario. Los roles que el nuevo patrón usa y que no estaban en uso arrancan con el color por defecto del patrón.
- **Estado inicial.** Los colores iniciales salen de los patrones iniciales.
- **Historial.** Sin cambios: los cambios de color se agrupan por slot, y `accent` entra solo.
- `sameDesign` en el historial compara también `accent`.

## Espalda opcional

- Si `svgPathBack` existe, se dibuja en el panel trasero. Si no, se reutiliza el SVG del frente, como hoy.
- El compositor rota 180° el panel trasero porque la isla UV de la espalda está girada. Un SVG de espalda se dibuja como lo vería quien mira la espalda, derecho; la rotación del compositor se mantiene. Esto se verifica en la implementación con un patrón de prueba asimétrico (un cambio de orientación sería un error visible, no sutil).
- `CompositorImages` gana `bodyBackPatternImage` (opcional).

## Cambios en componentes y archivos

- `lib/builder/patterns.ts`: nuevos tipos; el catálogo declara `colors`.
- `lib/builder/svg-recolor.ts`: `ColorSlot` con `accent`; `recolorSvg` no cambia.
- `lib/builder/design-state.ts`: `colors.accent`; los reducers de `SET_BODY_PATTERN` y `SET_SLEEVE_PATTERN` aplican la regla de colores por defecto.
- `components/builder/panels/ColorsPanel.tsx`: lista dinámica de roles según los patrones elegidos.
- `components/builder/PatternGrid.tsx` y `pattern-thumbnail.ts`: las miniaturas reciben el mapa completo de colores, no solo primario y secundario.
- `components/builder/JerseyModel.tsx` y `lib/builder/texture-compositor.ts`: cargan y dibujan la imagen de espalda cuando existe.
- `public/patterns/`: un SVG por diseño nuevo (más su SVG de espalda si lo necesita).

## Incorporar un diseño

1. El usuario aporta la foto (de frente y, si puede, de espalda).
2. Se dibuja el SVG plano del torso (y espalda, y mangas si el diseño las cambia) con `data-color-slot` por rol.
3. Se declara en `patterns.ts` con nombre descriptivo, roles, etiquetas y colores por defecto.
4. Se revisa sobre el modelo 3D, de frente y de espalda, y se ajusta con el usuario.

Reglas de contenido: nada de escudos, marcas ni sponsors en los SVG; los nombres de los patrones describen el diseño («Banda central con bordes», «Hombros de color»), no al equipo.

Limitaciones conocidas:
- El mapa de textura del modelo no es un molde de costura plano. Cerca de las costuras y los hombros las formas se deforman; cada diseño se verifica en el modelo, en especial diagonales, chevrones y yokes.
- Los degradados y sombras de las fotos se aproximan con degradados de SVG.
- El resultado es una réplica aproximada del diseño, no una copia exacta.

## Pruebas

- **Reducer:** al cambiar de patrón, los roles en uso conservan su color y los nuevos toman el del patrón.
- **Catálogo:** cada `svgPath` y `svgPathBack` existe en `public/patterns/`, y cada `data-color-slot` de cada SVG está declarado en `colors` del patrón (un test lee los archivos).
- **ColorsPanel:** muestra solo los roles de los patrones elegidos, más el cuello; cambiar un color actualiza el estado.
- **Compositor:** dibuja la imagen de espalda cuando existe y reutiliza la del frente cuando no.
- **Historial:** un cambio de `accent` es un paso de deshacer propio.
- **Verificación visual:** cada patrón migrado se ve igual que antes; cada diseño nuevo se revisa de frente y de espalda en el modelo.

## Preguntas abiertas

- La orientación exacta de un SVG de espalda (ver "Espalda opcional") se confirma en la implementación.

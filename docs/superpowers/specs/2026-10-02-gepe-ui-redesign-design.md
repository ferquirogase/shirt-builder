# Rediseño de UI "GEPE" — Diseño

Fecha: 2026-10-02
Referencia visual: mockup escritorio + móvil provisto por el usuario (imagen `465bafca-...png`).

## Objetivo

Reemplazar el formulario actual (`ControlPanel` con `<select>`) por la interfaz del mockup: app de marca GEPE, estética clara con acento amarillo/ámbar, layout de escritorio (sidebar + panel + visor) y móvil (visor + bottom sheet + barra de pestañas). El visor 3D gana fondo con degradé cálido y sombra suave en el suelo.

## Alcance (primera pasada)

Incluye:
- Layout escritorio y móvil, cabecera, sidebar de 5 secciones, paneles por sección.
- Selector visual de patrones (6 de torso, mangas coherentes) con SVG nuevos.
- Frente/Espalda, rotar (volver a frente), aviso "Arrastrá para girar".
- Deshacer/rehacer con historial, nombre del diseño editable.
- Fondo degradé y sombra difusa en el suelo.

Fuera de alcance (botones visibles pero deshabilitados o con aviso "Próximamente"):
- Guardado real y el indicador "Guardado" (no se muestra, para no mentir).
- Compartir con link.
- Pantalla de "Revisar diseño".

Limitación conocida: el render del mockup es fotorrealista; el visor usa un OBJ con textura de canvas, por lo que el modelo no se verá igual. Se acerca fondo, encuadre y sombra.

## Enfoque

Reescritura por componentes chicos y aislados, solo con Tailwind v4, sin dependencias nuevas. Se elimina `ControlPanel`. El estado sigue en el reducer, envuelto en un historial.

## Estado y datos

- `design-state.ts`: se agrega `projectName: string` al `DesignState` (valor inicial editable, sin persistencia). Acción `SET_PROJECT_NAME`.
- Historial: wrapper `{ past, present, future }` sobre `designReducer`, con acciones `UNDO` y `REDO`. Las acciones existentes no cambian. Los cambios continuos (color, texto, nombre, número) se agrupan: ediciones consecutivas del mismo tipo/slot dentro de una ventana corta (~500 ms) cuentan como un solo paso de historial. `SET_PROJECT_NAME` no entra al historial.
- `design-context.tsx` expone `state`, `dispatch`, `canUndo`, `canRedo`.
- `patterns.ts`: torso pasa a 6 patrones (Liso, Franjas, Diagonal, Degradado, Geométrico, Rayas); mangas a un conjunto coherente (lisa, y variantes que acompañan a los patrones). Cada uno con `svgPath` en `public/patterns/`, usando los slots de color primario/secundario que ya soporta `svg-recolor.ts`. Los SVG existentes (`stripes-v1`, `plain-body`, `sleeve-plain`) se conservan; los ids actuales no cambian.
- Las miniaturas del selector son los mismos SVG recoloreados con los colores actuales (sin imágenes aparte).

## Componentes

Todos en `components/builder/`:

- `BuilderPage` — compone el layout, mantiene el `canvasRef` y la sección activa.
- `Header` — logo GEPE, nombre editable, deshacer/rehacer, Compartir (deshabilitado), Revisar diseño (deshabilitado).
- `SectionNav` — sidebar en escritorio, barra inferior en móvil. Secciones: Diseño, Colores, Escudo, Sponsor, Nombre y número.
- `SectionPanel` y un panel por sección:
  - Diseño: pestañas Torso/Mangas + `PatternGrid`.
  - Colores: selectores primario y secundario.
  - Escudo: subida de logo (mismas validaciones: PNG/JPG/SVG, máx. 2 MB; se reemplaza `alert` por mensaje inline).
  - Sponsor: campo de texto.
  - Nombre y número: campos actuales (mayúsculas, número 2 dígitos).
- `PatternGrid` — grilla de tarjetas con miniatura, etiqueta y check en la seleccionada.
- `Viewer3D` — recibe fondo transparente; contiene `ContactShadows` y los controles de cámara.
- `ViewerControls` — Frente/Espalda, rotar, aviso "Arrastrá para girar" (se oculta tras la primera interacción).

## Layout

- Escritorio (`md+`): tarjeta redondeada a pantalla completa. Cabecera arriba; abajo sidebar → panel de sección → visor.
- Móvil: visor arriba; bottom sheet con el panel de la sección; debajo, barra de 5 pestañas y botón "Revisar diseño". Cabecera compacta con deshacer/rehacer y Compartir.
- Paleta como variables CSS en `globals.css` (acento ámbar/amarillo, neutros cálidos). Se elimina el modo oscuro automático actual; el diseño es claro.
- `layout.tsx`: título y descripción propios de la app (hoy "Create Next App"), `lang="es"`.

## Visor

- Frente/Espalda: la cámara orbita 180° alrededor del modelo con interpolación suave. OrbitControls sigue activo para arrastrar. Rotar vuelve a la vista de frente.
- Verificar durante la implementación que nombre y número (ya dibujados en la textura) queden del lado de la espalda.
- Fondo: degradé CSS cálido (gris perlado → amarillo suave) con resplandor radial detrás de la camiseta; `Canvas` con `alpha`.
- Sombra: `ContactShadows` de drei bajo la camiseta, baja opacidad y alto desenfoque. Es una aproximación, no una sombra fotográfica.
- Export PNG: se compone la captura del canvas sobre el degradé de fondo (el PNG compartible tiene el mismo look que la pantalla). Decisión por defecto, a confirmar en la revisión. El botón de export se integra en la UI (hoy es un botón verde suelto).

## Manejo de errores

- Logo inválido o mayor a 2 MB: mensaje inline en el panel Escudo.
- Fallos de carga de patrones: se mantiene el comportamiento actual (log + último patrón válido).

## Testing

- TDD para el reducer con historial: deshacer, rehacer, vaciado de `future` tras una acción nueva, agrupación de cambios continuos, `SET_PROJECT_NAME` fuera del historial.
- Tests de `patterns.ts` (ids únicos, todos los `svgPath` existen).
- Tests de render con Testing Library: `PatternGrid` (selección y check), `SectionNav` (cambio de sección), `Header` (botones deshabilitados, deshacer/rehacer según `canUndo`/`canRedo`).
- Verificación visual: levantar la app y comparar con el mockup en escritorio y móvil.

## Notas de implementación

- `AGENTS.md` indica que esta versión de Next.js tiene cambios incompatibles: leer la guía relevante en `node_modules/next/dist/docs/` antes de escribir código de la app (en particular `layout.tsx` y fuentes).

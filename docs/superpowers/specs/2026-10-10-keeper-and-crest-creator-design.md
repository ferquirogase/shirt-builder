# Camiseta de arquero y creador de escudos — diseño

Fecha: 2026-10-10. Referencia: pantallas de FIFA ("Forma del escudo" y "Uniforme de PO").

## Objetivo

Dos agregados al builder, simples de usar:

1. **Camiseta de arquero**: un segundo diseño de camiseta (colores y patrón propios) dentro del mismo pedido.
2. **Creador de escudos**: para los equipos que no tienen escudo, armar uno eligiendo forma, fondo, colores y símbolo.

Criterio de éxito: un usuario sin conocimientos de diseño arma un escudo y una camiseta de arquero en pocos clics, sin salir del panel actual y sin que la experiencia de los paneles existentes empeore.

## Decisiones tomadas (con el usuario)

- El arquero tiene **diseño propio** (patrones y colores) y **comparte** escudo, sponsors, tipografía y borde del nombre/número. Usa **todo el catálogo** de patrones.
- Mismo modelo 3D de manga corta. Manga larga queda fuera (hace falta un OBJ nuevo).
- El nombre/número del arquero tiene **color propio**, que arranca en blanco o negro según el contraste con su camiseta.
- El creador de escudos ofrece: forma + fondo + 2 colores + símbolo o iniciales. Sin editor libre.
- Las 25 formas salen del SVG del usuario (`Downloads/5548488_20807.svg`): siluetas lisas de un color en una grilla de 5x5 sobre un `viewBox` 288x288 (24 `<path>` y 1 `<polygon>`).
- Fuera de alcance en esta ronda: la prueba con IA y la imagen para compartir siguen usando solo la camiseta de jugador.

## 1. Escudo creado

### Datos
- `DesignState.crestConfig: CrestConfig | null`, con `{ shapeId, divisionId, colors: { primary, secondary }, symbol: { kind: "icon", id } | { kind: "initials", text } | null }`.
- Una función pura `crestToSvg(config): string` produce el SVG. El reducer guarda su `data:` URL en `logoDataUrl`, por eso el compositor, las miniaturas, el checkout y el story **no cambian**.
- `SET_CREST_CONFIG` pone `crestConfig` y `logoDataUrl`. `SET_LOGO` (subida) pone `crestConfig = null`. `SET_LOGO null` limpia ambos. `RESET_DESIGN` los devuelve a `null`.
- Un pedido guardado sin `crestConfig` debe seguir cargando (el campo es opcional al leer).

### Catálogo
- `lib/builder/catalog/crest-shapes.ts`: las 25 formas como `path d` normalizados a una caja común (se recortan con la caja de cada una al migrarlas). Una prueba verifica 25 formas con ids únicos y `d` no vacío.
- `lib/builder/catalog/crest-symbols.ts`: unos 10 símbolos vectoriales simples (estrella, balón, corona, rayo, etc.) que se dibujan en el centro, en un color que contrasta con el fondo.
- Divisiones: liso, mitad vertical, franjas verticales, banda diagonal. Se recortan a la forma con `clipPath`.
- Iniciales: hasta 3 letras, mayúsculas, centradas, color de contraste.

### Panel
- `CrestPanel` pasa a tener un selector **Subir el mío | Crear escudo**. "Subir" es el panel actual sin cambios.
- "Crear" apila: vista previa del escudo, **Forma** (grilla 5 columnas de miniaturas), **Fondo** (chips de división y 2 colores con el selector de color de `ColorsPanel`), **Símbolo** (grilla de íconos y la opción "Iniciales" con un campo de texto).
- Un botón "Quitar escudo" sigue disponible. El 3D se actualiza en vivo.

## 2. Camiseta de arquero

### Datos
- `DesignState.keeper: { included: boolean; look: { bodyPatternId, sleevePatternId, colors }; nameNumberFill: string } `.
- Al activarlo, `look` arranca con una paleta que contrasta con la del equipo y `nameNumberFill` con el blanco o negro que contrasta con el `primary` del arquero. Mientras el usuario no cambió ese color a mano, se recalcula si cambia el `primary` del arquero.
- Función pura `lookFor(state, "player" | "keeper"): DesignState`: devuelve el `DesignState` con los patrones, colores y `nameNumberStyle.fill` del arquero. El compositor y la textura reciben ese resultado y **no cambian**.
- `RESET_DESIGN` conserva `keeper.included`, igual que hoy con `shorts.included`.

### Edición
- Estado de UI `editing: "player" | "keeper"` en el contexto del diseño, fuera del historial. Las acciones de patrón, color y color de nombre/número escriben en el look que se está editando.
- En `StageToolbar`, un selector **Jugador | Arquero** visible solo si `keeper.included`. Cambia lo que muestra el visor y lo que editan Diseño, Colores y Texto.
- Los cambios de escudo, sponsors, tipografía y borde del nombre/número son compartidos, sin importar qué se esté editando.
- El short sigue el look del jugador, aunque se esté viendo al arquero.
- `GarmentsPanel`: un toggle "Sumar camiseta de arquero" con su precio.

### Checkout
- `PlayerLine.keeper: boolean` (por defecto `false`, saneado en `cleanPatch`). Un casillero "Arquero" en cada línea de la lista, visible solo si el pedido incluye arquero.
- Precio: el de una camiseta por línea (precio de ejemplo, igual que `PRICE_PER_SHIRT`). `orderTotals` no cambia mientras el precio sea igual; si más adelante difiere, entra en `pricing.ts`.
- `DesignPreview` y las miniaturas capturan también el frente y la espalda del arquero cuando está incluido. Las imágenes del arquero se guardan aparte, como las del jugador.

## 3. Pruebas (TDD)

- `crestToSvg`: contiene la forma y los colores elegidos, símbolo e iniciales, y escapa el texto de las iniciales.
- Reducer: `SET_CREST_CONFIG`, la exclusión mutua con `SET_LOGO`, el reset del escudo y del arquero, la acción sobre el look en edición.
- `lookFor` y el cálculo del color de contraste del número.
- `orderReducer`/`cleanPatch` con `keeper`.
- Catálogo: 25 formas, ids únicos.
- Componentes: `CrestPanel` (modo crear), selector Jugador/Arquero, casillero de arquero en el checkout.
- Verificación visual con capturas de pantalla de Chrome headless (escudo en la camiseta, arquero, panel en móvil).

## Puntos abiertos

- Qué símbolos exactos, y su dibujo (se arma una primera lista y se ajusta a ojo).
- El precio del arquero es un ejemplo.
- Si el short debería poder tener otro color para el arquero (hoy no).

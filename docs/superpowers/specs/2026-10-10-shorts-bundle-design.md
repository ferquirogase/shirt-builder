# Conjunto camiseta + pantalón — diseño

## Objetivo
Que un equipo pueda comprar **solo la camiseta** o el **conjunto** (camiseta + pantalón). Lo pidió el cliente en la reunión. El pantalón es liso y toma por ahora el color **primario o secundario** de la camiseta; el modelo 3D del pantalón lo hace el equipo aparte.

## Alcance
Incluye:
- Una sexta sección del builder, **Pantalón**, con el selector *Solo camiseta / Conjunto* y, en conjunto, la elección *Primario / Secundario* con la previa del color.
- Mostrar el pantalón en el visor 3D solo cuando se elige conjunto.
- Un talle de pantalón por jugador en la tabla del checkout (solo en conjunto).
- Precio del pantalón en el resumen, la confirmación y los totales.
- Un pantalón provisorio (placeholder) hasta que esté el modelo real, y una configuración `SHORTS_MODEL` para enchufarlo.

Fuera de alcance: patrones, escudo, sponsors, nombre o número en el pantalón; elegir un color libre para el pantalón; decidir pantalón sí/no jugador por jugador; mapa de normales de arrugas para el pantalón; movimiento tipo tela en el pantalón (se puede sumar después reutilizando `cloth-sway`).

## Decisiones tomadas
- **La elección es para todo el pedido**, no por jugador: coincide con lo que dijo el cliente y mantiene simples la tabla y el descuento.
- **Vive en `DesignState`**, junto a los colores. El visor la necesita antes de que exista un pedido, y así el deshacer/rehacer, el guardado del pedido y "Editar diseño" funcionan sin cambios.
- **El color es una referencia, no un valor:** se guarda `colorSource` (`"primary"` o `"secondary"`) y el color se resuelve de `colors[colorSource]`. Si el usuario cambia el color primario de la camiseta, el pantalón lo sigue.
- **Un talle de pantalón por línea del roster**, independiente del talle de la camiseta (una persona puede usar M arriba y L abajo).
- **El descuento por cantidad sigue contando jugadores** y se aplica sobre todo el subtotal (camisetas + pantalones).

## Modelo de datos
`DesignState` suma:
```ts
shorts: { included: boolean; colorSource: "primary" | "secondary" }
```
Inicial: `{ included: false, colorSource: "primary" }`.

Acciones nuevas del reducer:
- `SET_SHORTS_INCLUDED { value: boolean }`
- `SET_SHORTS_COLOR_SOURCE { value: "primary" | "secondary" }` (ignora cualquier otro valor)

Función pura `shortsColor(state): string` que devuelve `state.colors[state.shorts.colorSource]`.

`PlayerLine` suma `shortsSize: Size` (por defecto `"M"`). Se conserva aunque el usuario vuelva a *Solo camiseta*, para no perder lo cargado. `UPDATE_PLAYER` lo acepta y lo valida igual que `size`.

Compatibilidad con pedidos ya guardados (sessionStorage): al leer, una línea sin `shortsSize` lo toma como `"M"` y un diseño sin `shorts` toma el inicial (la restauración ya mezcla con `initialDesignState`). Un pedido viejo sigue siendo válido.

## Builder
- `SectionNav` agrega `{ id: "pantalon", label: "Pantalón" }` con un ícono nuevo, después de *Texto*.
- `ShortsPanel` (nuevo, mismo estilo que los demás paneles):
  - Selector de dos opciones: *Solo camiseta* / *Conjunto*.
  - Con *Conjunto*: selector *Primario / Secundario*, cada opción con su muestra de color actual.
  - Con *Solo camiseta* el segundo selector no se muestra.
- El nombre de la sección y los textos siguen el castellano rioplatense del resto de la interfaz.

## Visor 3D
- `ShortsModel` (nuevo), hermano de `JerseyModel`, dentro de `Viewer3D`. Se monta solo si `shorts.included`.
- Material: `MeshStandardMaterial`/`Physical` mate con el color de `shortsColor`, sin textura. Mismo estilo de iluminación que la camiseta.
- `SHORTS_MODEL` (en `lib/builder/geometry/shorts-model.ts`) indica la URL del OBJ, igual que `JERSEY_MODEL`. Mientras no exista el OBJ real, el componente dibuja una forma simple de pantalón.
- **Contrato del modelo real:** mismo sistema de coordenadas y escala que la camiseta (valores del orden de cientos, escalado `0.01` en el grupo, origen compartido), con el borde superior justo debajo del borde inferior de la camiseta (y ≈ 167). Así encaja sin ajustes. No hacen falta UVs.
- El encuadre cambia: el conjunto es más alto. La cámara y el centrado se recalibran con capturas de pantalla (constantes con nombre), y se revisa que las miniaturas del checkout y la imagen de la historia no corten nada.

## Checkout y pedido
- `RosterTable`: con conjunto, una columna de talle de pantalón junto al de la camiseta (selector igual al de talle). En móvil se mantiene una línea compacta por jugador; si no entra, el talle del pantalón pasa a una segunda fila de la misma tarjeta.
- `pricing.ts`: `PRICE_PER_SHORTS` (valor de ejemplo, como `PRICE_PER_SHIRT`). `orderTotals(roster, withShorts)` devuelve además `shorts` (cantidad de pantalones). `subtotal = camisetas × PRICE_PER_SHIRT + pantalones × PRICE_PER_SHORTS`; el descuento se calcula sobre ese subtotal con las mismas franjas.
- `OrderSummary`: fila **Pantalones** con la cantidad, solo en conjunto.
- `Confirmation` suma `shorts: number` y el roster ya lleva los talles; `payWithRipple` los llena.
- `DesignPreview` del checkout muestra las miniaturas ya capturadas (que incluirán el pantalón).

## Pruebas
- Reducer: valores por defecto, cada acción, rechazo de un valor inválido, `shortsColor` sigue al color elegido.
- `order.ts`: `shortsSize` por defecto, validación de talle, se conserva al alternar.
- `order-storage`: un pedido viejo sin `shortsSize`/`shorts` se sigue leyendo.
- `pricing`: sin pantalón igual que hoy (no cambia ningún valor existente); con pantalón suma; descuento sobre el total.
- Componentes: `ShortsPanel` (qué se ve en cada modo y qué acciones lanza), `SectionNav` con la sexta sección, columna de talle de pantalón solo en conjunto, fila de resumen.
- El visor 3D no tiene pruebas de pantalla; se verifica con capturas.

## Riesgos
- **Encuadre y capturas:** es lo más probable que necesite iteración visual; se resuelve con capturas del usuario una vez que esté el modelo real.
- **Placeholder vs modelo real:** el encuadre final solo se puede calibrar con el modelo real.
- **Móvil:** la tabla del checkout ya es angosta; la fila extra es la salida si la columna no entra.
- **Precio de ejemplo:** `PRICE_PER_SHORTS` es un número de demostración, igual que el de la camiseta, a definir con el cliente.

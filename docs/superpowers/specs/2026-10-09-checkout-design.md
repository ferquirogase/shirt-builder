# Checkout — diseño

## Objetivo
Mostrar en la reunión cómo funcionaría el checkout: desde el diseño terminado hasta un pedido de camisetas para todo el equipo (un diseño, un plantel con nombre, número y talle por jugador). Es una demo: no se conecta nada. El diseño deja el lugar para conectar Ripple más adelante.

## Alcance
Incluye:
- Ruta `/checkout`, una sola página: miniaturas del diseño, plantel editable, resumen con precios de ejemplo, datos de contacto y envío, y botón "Pagar con Ripple" que simula el pago.
- Ruta `/checkout/confirmacion` con el resumen y un número de pedido falso.
- Botón "Revisar diseño" del header (hoy deshabilitado) como entrada: congela el diseño, saca las miniaturas y navega.
- "Editar diseño" en el checkout: vuelve al builder con ese diseño cargado.
- Persistencia del pedido en `sessionStorage`.

Fuera de alcance: conexión real con Ripple o cualquier backend, cuentas de usuario, talles de niño, pegar o importar listas de jugadores, varios diseños en un mismo pedido, cálculo real de envío o impuestos. La imagen que se comparte es el siguiente trabajo, aparte.

## Decisiones tomadas
- **Un diseño + plantel.** Se diseña una camiseta y cada fila del plantel es una camiseta con ese diseño. No hay diseños distintos en el mismo pedido.
- **Miniatura por diseño**, no por jugador: frente y espalda tal como se ven en el visor al tocar "Revisar diseño" (con el nombre y número cargados en el builder, si hay). Las filas del plantel son texto.
- **Una página completa**, no un wizard.
- **`/checkout` es una ruta propia** y el pedido viaja por `sessionStorage` (no un modal ni el estado en memoria del layout). Así sobrevive a un refresh y el pedido ya es un objeto serializable que se puede mandar a Ripple.

## Modelo (`lib/checkout/`, funciones puras)
```ts
type Size = "S" | "M" | "L" | "XL" | "XXL";
type PlayerLine = { id: string; name: string; number: string; size: Size }; // una línea = una camiseta
type Order = {
  design: DesignState;          // congelado al tocar "Revisar diseño"
  thumbnails: { front: string; back: string }; // data URLs reducidas
  roster: PlayerLine[];
};
```
- La primera línea del plantel nace de `playerName` y `playerNumber` del builder (si están vacíos, la línea queda vacía y se completa en el checkout), con talle `M`.
- Reducer del pedido: `ADD_PLAYER`, `REMOVE_PLAYER`, `UPDATE_PLAYER { id, patch }`. No se puede quitar la última línea.
- Cada línea es una camiseta: no hay cantidad por línea ni duplicar (para dos camisetas iguales se cargan dos líneas). Número de 0 a 99, como texto de hasta 2 dígitos. Nombre de hasta 12 caracteres (el largo que entra en la espalda).
- `orderTotals(roster)`: cantidad de camisetas (una por línea), subtotal y total. Precios y moneda son constantes de ejemplo en un solo archivo (`pricing.ts`): precio por camiseta y un descuento por cantidad. Es lo único que Ripple o un catálogo real reemplazaría.
- `validateOrder(order, contact)`: devuelve los errores por campo (nombre y número de cada línea, y los datos de contacto y envío obligatorios). Los errores se muestran después del primer intento de pagar; el botón no se deshabilita, para que el usuario vea qué falta: se muestran los mensajes y el foco va al primer campo inválido.

## Persistencia (`order-storage.ts`)
Lee y escribe `Order` en `sessionStorage` con try/catch; si falla (cuota, modo privado), el pedido sigue en memoria y la página funciona igual. El escudo y los sponsors son data URLs grandes: las miniaturas se reducen a unos 400 px de lado para dejar espacio. Un JSON dañado se descarta y se trata como "sin pedido".

Sin pedido, `/checkout` muestra un aviso y un enlace "Volver a diseñar".

## Captura de miniaturas
"Revisar diseño" pide al visor la vista frontal, saca un PNG con `exportStagePng`, repite con la espalda, reduce ambos y guarda el pedido. Después navega a `/checkout`. Mientras captura, el botón muestra un estado de carga. Si la captura falla, el pedido se guarda sin miniaturas y el checkout muestra un marcador en su lugar (no se bloquea el flujo).

## Página `/checkout`
- **Escritorio:** dos columnas. Izquierda: miniaturas (frente y espalda) con el nombre del diseño y "Editar diseño", y debajo la tabla del plantel (una línea por camiseta: nombre, número, talle y quitar; en mobile cada jugador ocupa una sola línea compacta) con "+ Agregar jugador". Derecha: resumen (camisetas, subtotal, total), formulario de contacto y envío, y "Pagar con Ripple".
- **Mobile:** una columna; el resumen y el botón van al final, con el total siempre visible en una barra fija abajo.
- "Pagar con Ripple" simula la espera (estado de carga, sin red), guarda un resumen del pedido (número falso, camisetas, total, plantel, sin imágenes) en otra clave de `sessionStorage`, borra el pedido y navega a la confirmación, que lee ese resumen. Sin resumen, la confirmación redirige a `/`. La confirmación muestra el número de pedido falso, el resumen y "Diseñar otra camiseta".
- Accesibilidad: cada campo con su etiqueta, errores asociados al campo, foco en el primer error al intentar pagar.

## "Editar diseño"
Guarda el pedido tal cual y vuelve a `/`. El builder, si encuentra un pedido en `sessionStorage`, carga `order.design` como estado inicial. Al volver a tocar "Revisar diseño" se vuelven a sacar las miniaturas y se conserva el plantel ya cargado (se actualiza solo la primera línea si estaba vacía).

## Tests
Con TDD (ver el test fallar primero): reducer del pedido, totales, validación, `order-storage` (ida y vuelta, JSON dañado, `sessionStorage` que lanza), componentes del plantel (agregar, quitar, editar, total que cambia) y del botón de pagar bloqueado con errores. Lo que depende del visor 3D (captura de miniaturas) y la apariencia se revisa con capturas del usuario.

## Riesgos
- La captura de miniaturas depende del visor y de la cámara; es lo único que no puedo ver en pantalla.
- Tamaño en `sessionStorage` si el escudo o los sponsors son muy pesados: se maneja con el fallback en memoria.
- Next.js de este repo tiene cambios respecto de lo conocido: antes de escribir las rutas se lee la guía correspondiente en `node_modules/next/dist/docs/`.

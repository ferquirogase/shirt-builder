# Camiseta Builder — Diseño (Piloto)

## Contexto y propósito

Empresa local de venta de buzos de egresados quiere ofrecer camisetas de
fútbol personalizadas para grupos de amigos y torneos locales (fútbol 5/11).
El producto es un "builder" visual tipo videojuego: modelo 3D interactivo
(zoom/rotación) + panel de control para personalizar patrones, logo,
nombre/número y sponsor, con checkout de pago online.

## Alcance del piloto

**Incluido:**
- Viewer 3D interactivo (zoom, rotación) de una camiseta de fútbol.
- Panel de control: patrón de cuerpo + patrón de manga (catálogo propio,
  inspirado en camisetas de clubes famosos, sin logos/escudos de terceros),
  colores, logo subido por el usuario (pecho), sponsor (pecho, texto o
  imagen simple), nombre + número (espalda).
- Un solo diseño por pedido, con un solo nombre/número (pedidos grupales
  quedan para una iteración posterior, pero el modelo de datos ya soporta
  múltiples entradas — ver "Modelo de datos").
- Checkout con pago online. Integración de pago (Rebill) la implementa otra
  persona del equipo; este proyecto expone el contrato (crear orden +
  webhook de estado de pago) y construye la UI del checkout.
- Generación de un PNG compartible del diseño final (para viralización).

**Explícitamente fuera de alcance:**
- Panel de administración para la empresa (ya tienen CMS propio; la
  integración se resuelve en una etapa posterior, fuera de este proyecto).
- Pedidos grupales con múltiples nombres/números en un mismo pedido (el
  modelo de datos lo deja preparado, pero la UI no lo soporta en el piloto).
- Personalización de buzos de egresados (fuera de alcance, no discutido con
  la empresa).
- Cualquier asset de marca/club real (logos, escudos, templates de
  fabricantes) — los patrones son diseños propios inspirados en estilos
  genéricos (rayas, franjas, degradados), no copias de kits existentes.

## Stack

- **Frontend/Backend:** Next.js (App Router).
- **3D:** Three.js vía react-three-fiber.
- **Personalización visual:** Canvas 2D compositing → `THREE.CanvasTexture`
  (ver detalle abajo). Se descartó un enfoque con shaders custom
  (sobre-ingeniería para este caso) y descartado un enfoque de texturas
  pre-renderizadas (no soporta logo/nombre/número dinámico).
- **Persistencia:** Supabase (Postgres + storage de archivos) como
  recomendación por defecto — un solo servicio para DB y para el bucket de
  logos subidos, evita piezas de infra adicionales. Abierto a cambiar si el
  equipo ya tiene otra preferencia.
- **Pagos:** Rebill, integrado por otra persona del equipo. Este proyecto
  solo expone el contrato (ver "Flujo de checkout").

## Modelo 3D

El modelo base viene de una carpeta de recursos (`kit-recursos/modelos/*.obj`,
export de Blender, texto plano) con geometría de jersey, short y medias, sin
materiales conectados y sin textura de color final.

**Riesgo identificado y resuelto:** la carpeta original incluía capas
opcionales (`opcionales/puma/`, `opcionales/adidas/`) con templates de
marcas y clubes reales (Parma, Kayserispor) — con nomenclatura consistente
con un pack de extracción de videojuego. Se descartan esas capas: la
empresa fabrica sus propias camisetas con marca y textura propia, no las
necesita.

**Punto abierto:** los archivos `.obj` base (geometría) comparten la misma
huella de nomenclatura que un pack de extracción. Se usan como **placeholder
técnico** para desarrollar el pipeline mientras se confirma o reemplaza por
un modelo con derechos de uso comercial claros (comprado o encargado a un
modelador freelance). El código no depende de un archivo específico — cambiar
el modelo final es reemplazar el asset, no tocar el pipeline.

**UV map:** un solo island por pieza (jersey: `u 0.226–0.774, v 0.058–0.988`),
sin grupos de material que separen pecho/espalda/manga en el archivo. Las
coordenadas exactas de cada región (pecho, espalda, manga) para posicionar
logo/nombre/número/sponsor en el canvas se deben verificar visualmente
(Blender o el propio viewer three.js) al empezar la implementación del
pipeline — no se puede derivar solo de los datos crudos del OBJ.

## Pipeline de texturizado (Canvas 2D)

Por cada cambio de estado del builder, se redibuja un canvas offscreen
(ej. 2048×2048) en capas, en orden:

1. Color(es) base.
2. Patrón SVG recoloreado (reemplazo de atributos `fill` antes de rasterizar,
   patrón de cuerpo y de manga por separado, cada uno posicionado según su
   máscara/región de UV).
3. Logo subido por el usuario (pecho, con límites de tamaño/aspect ratio).
4. Sponsor (pecho, zona separada del logo; texto o imagen simple).
5. Nombre + número (`fillText`, tipografía deportiva, espalda).

El canvas resultante se asigna como `map` de un `THREE.CanvasTexture`, con
`needsUpdate = true` tras cada redibujo. El redibujo se dispara por cambios
de estado (no en el loop de render), con debounce corto (~50-100ms) para
inputs continuos (sliders de color).

**Patrones:** catálogo estático (SVG + metadata de qué partes son
recoloreables), generado por el usuario del proyecto (no son datos subidos
por el cliente final). Se integran como catálogo tipado en el código.

**Export PNG compartible:** captura del `renderer.domElement` del viewer 3D
(`toDataURL`), no del canvas 2D plano — se ve como el producto final,
mejor para viralización.

## Modelo de datos

**Diseño** (snapshot, no solo referencias a IDs vivos):

```json
{
  "id": "uuid",
  "bodyPatternId": "stripes-v1",
  "sleevePatternId": "sleeve-plain",
  "colors": { "primary": "#0a5c36", "secondary": "#ffffff" },
  "logoUrl": "https://storage/.../logo123.png",
  "sponsor": { "type": "text", "value": "Bar El Aguante" },
  "roster": [
    { "name": "QUIROGA", "number": 10, "size": "M" }
  ],
  "createdAt": "..."
}
```

`roster` es un array desde el inicio (una sola entrada en el piloto) para que
sumar pedidos grupales más adelante sea agregar entradas, no romper el
esquema ni el checkout.

**Pedido (Order):** guarda una **copia (snapshot)** del diseño en el momento
de compra, no una referencia viva — si el catálogo de patrones cambia
después, el pedido histórico no se corrompe. Incluye datos de contacto/envío,
precio y `paymentStatus` (`pending` | `paid` | `failed`).

## Flujo de checkout

```
Builder (diseño listo)
  → Formulario: talle + roster
  → POST /api/orders → crea Order (paymentStatus: "pending"), devuelve orderId
  → UI de pago (Rebill) recibe orderId + monto
  → Rebill confirma pago → webhook POST /api/orders/:id/payment-status
    actualiza Order.paymentStatus
  → (fuera de alcance) notificación/exportación a la CMS de la empresa
```

La orden se crea **antes** del pago para no perder el diseño/datos si el
pago falla o se abandona — permite reintentar sobre la misma orden.

**Validaciones del lado del cliente:** tamaño y formato del logo subido
(`png/jpg/svg`, tamaño máx.) se validan en el builder, con feedback
inmediato — no se descubre el error recién en el checkout.

## Testing

- Pipeline de texturizado: pruebas manuales visuales (es contenido gráfico,
  no hay mucho que testear con asserts) más alguna prueba unitaria sobre la
  función de recoloreado de SVG (dado un SVG + mapa de colores, produce el
  SVG esperado).
- Modelo de datos y API routes (`/api/designs`, `/api/orders`,
  `/api/uploads`): tests de integración sobre los endpoints (creación,
  validaciones, snapshot correcto).
- Checkout: se testea el contrato (creación de orden, webhook de estado)
  sin depender de Rebill real — mockeado.

## Riesgos / puntos abiertos

1. **Origen del modelo 3D base** — confirmar licencia de uso comercial antes
   de lanzar a producción; por ahora placeholder técnico.
2. **UV map exacto** — verificar regiones pecho/espalda/manga visualmente
   antes de fijar coordenadas del canvas.
3. **Elección de Supabase** — pendiente de confirmación si el equipo ya
   tiene otra preferencia de hosting/DB.

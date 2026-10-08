# Shirt Builder

Configurador 3D de camisetas de fútbol. Permite personalizar en tiempo real el diseño de una camiseta sobre un modelo 3D interactivo (rotar y hacer zoom): patrón del cuerpo y de las mangas, colores, escudo/logo propio y exportar el resultado como imagen.

## Requisitos

- Node.js 20 o superior
- npm

## Cómo probarlo

```bash
git clone git@github.com:ferquirogase/shirt-builder.git
cd shirt-builder
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Scripts

| Comando         | Descripción                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Servidor de desarrollo               |
| `npm run build` | Build de producción                  |
| `npm start`     | Sirve el build de producción         |
| `npm test`      | Corre los tests (Vitest)             |
| `npm run lint`  | Linter (ESLint)                      |

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Three.js con react-three-fiber.

## Estructura

- `app/` – rutas y layout de Next.js
- `components/builder/` – UI del configurador y visor 3D
- `lib/builder/` – estado del diseño, patrones, texturas y exportación
- `public/` – modelos 3D, patrones SVG y texturas
- `tests/` – tests
- `docs/` – specs y planes de diseño

## Licencia

[MIT](LICENSE)

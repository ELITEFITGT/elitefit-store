# ELITEFIT: tienda online de ropa fitness

Tienda pública hecha con React, Vite, TypeScript y Tailwind CSS. Muestra el catálogo desde **Supabase**, con filtros, detalle de producto con variantes, promociones, guía de tallas interactiva, carrito guardado en el navegador y un asistente de la tienda. Los pedidos confirmados se guardan en Supabase (`pedidos_carrito` y `pedidos_carrito_detalles`) y el equipo contacta al cliente. WhatsApp queda solo para consultas.

No incluye inicio de sesión, panel administrativo ni pagos en línea. En el servidor corren dos cosas: la lectura del catálogo desde Supabase (al iniciar o compilar) y el endpoint de pedidos (`/api/pedidos`).

> **Datos de demostración.** Los productos, precios, descripciones, medidas de la guía de tallas, textos informativos, el número de WhatsApp de pruebas (`50242709260`, es decir 4270-9260) y las redes sociales son de ejemplo. Reemplázalos antes de publicar la tienda. Las fotos vienen de [Unsplash](https://unsplash.com) y solo ilustran el ejemplo.

## Instalar y ejecutar (guía para el equipo)

Requisitos: Node.js 18 o superior y acceso al proyecto de Supabase del ambiente (dev o prd).

1. Clona el repositorio e instala las dependencias:
   ```bash
   git clone https://github.com/ELITEFITGT/elitefit-store.git
   cd elitefit-store
   npm install
   ```
2. Copia `.env.example` como `.env` y llena las claves del ambiente (ver la tabla en [Pedidos en Supabase](#pedidos-en-supabase-dev--prd)). **Las claves no están en el repositorio:** pídelas a quien administra Supabase por un medio privado. Nunca subas el archivo `.env`.
3. Si el proyecto de Supabase es nuevo, corre la migración de pedidos (ver la misma sección).
4. Arranca la tienda:
   ```bash
   npm run dev      # http://localhost:5173 (catálogo de Supabase + endpoint de pedidos)
   npm test         # pruebas (no se conectan a Supabase)
   ```
   En la terminal debe aparecer `[supabase] N productos cargados desde Supabase.` Si falta alguna clave, la tienda muestra los productos de ejemplo y lo avisa en la terminal.

## Versión de producción

```bash
npm run build    # revisa los tipos y genera la carpeta dist/
npm run preview  # sirve dist/ localmente para revisarla
```

Sube el contenido de `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages, etc.). Como la tienda usa rutas como `/catalogo` o `/producto/...`, el hosting debe devolver `index.html` para cualquier ruta:

- **Netlify:** crea `public/_redirects` con la línea `/*  /index.html  200`.
- **Vercel:** detecta Vite y lo configura automáticamente.

### GitHub Pages

GitHub Pages no puede publicar el código fuente tal cual: hay que publicar la versión compilada (`dist/`). Si se publica la rama directamente, la página queda en negro, porque el navegador no puede ejecutar `src/main.tsx`. El repositorio incluye un workflow que compila y publica solo:

1. En GitHub, abre el repositorio → **Settings → Pages → Build and deployment → Source** y elige **GitHub Actions**.
2. Sube los cambios a la rama `master`. El workflow `.github/workflows/deploy-pages.yml` corre las pruebas, compila con la ruta `/<repositorio>/` y publica.
3. Sigue el avance en la pestaña **Actions**. Al terminar, la tienda queda en `https://<usuario>.github.io/<repositorio>/`.

Notas:
- La ruta base se define con la variable `BASE_PATH` al compilar. En Vercel o con un dominio propio no hace falta.
- GitHub Pages solo sirve archivos estáticos: muestra el catálogo con el que se compiló, pero **no puede guardar pedidos** (no hay servidor para `/api/pedidos`). Para una tienda con pedidos, usa Vercel con las variables de entorno del ambiente.

## Cambiar nombre, WhatsApp y textos

Todo está en **`src/config/store.ts`**:

| Campo | Para qué sirve |
| --- | --- |
| `name` | Nombre de la tienda (logo, títulos y mensaje de WhatsApp) |
| `whatsappNumber` | Número que recibe los pedidos, en formato internacional sin `+` ni espacios. Ej.: `50255551234` |
| `announcement` | Mensaje de la barra superior. Déjalo en `''` para ocultarla |
| `contact` | Correo, ubicación y horario del pie de página. Un campo vacío no se muestra |
| `social` | Redes sociales (Instagram, Facebook u otra) |
| `maxQuantityPerItem` | Cantidad máxima por artículo |

El título de la pestaña del navegador está en `index.html`.

## Logo

Los archivos del logo están en **`src/assets/brand/`** (PNG con fondo transparente, recortados al borde del dibujo):

| Archivo | Dónde se usa |
| --- | --- |
| `monograma-ink.png` + `elitefit-ink.png` | Encabezado (fondo claro): corona y nombre en negro |
| `monograma-pink.png` + `elitefit-light.png` | Pie de página (fondo oscuro): corona rosa y nombre claro |
| `monograma-light.png` | Disponible para otros fondos oscuros |

El componente que los muestra es `src/components/Logo.tsx`. Si reemplazas un archivo por otro con distinta proporción, actualiza `MONOGRAM_RATIO` o `WORDMARK_RATIO` en ese componente. Los íconos del navegador son `public/favicon.png` y `public/apple-touch-icon.png`.

## Pantalla de entrada

Al abrir la tienda se muestra una animación de 2 a 3 segundos (logo, líneas de velocidad, pulso y barra de progreso) que sube como una cortina y deja ver la página.

- **Texto y comportamiento:** en `src/config/store.ts`, sección `splash` (`enabled`, `phrase`, `oncePerSession`). Por defecto se muestra cada vez que se carga la página.
- **Logo:** se toma de `src/assets/brand/monograma-pink.png` y `elitefit-light.png` (los imports al inicio de `src/components/SplashScreen.tsx`).
- **Colores:** variables `--splash-bg`, `--splash-text` y `--splash-accent` en `src/index.css`. Si cambias el fondo, cambia también `#0b0b0c` en el `<style>` de `index.html`.
- **Movimiento reducido:** muestra el logo fijo y hace un fundido corto.
- **Nunca bloquea la tienda:** se puede saltar con un clic o una tecla. Además se retira sola a los 4 s, y si falla, la tienda sigue funcionando.

## Cambiar colores y tipografía

Los colores son variables CSS al inicio de **`src/index.css`**, en formato `R G B`:

```css
:root {
  --color-canvas: 244 242 238;  /* fondo */
  --color-ink: 20 20 20;        /* texto y botones principales */
  --color-accent: 242 135 174;  /* rosa de la marca */
  --color-accent-strong: 176 38 96; /* rosa profundo para texto y foco */
  /* ... */
}
```

El rosa claro de la marca se usa en botones y detalles con texto negro encima (`--color-accent-ink`). Para texto rosa sobre fondo claro se usa `--color-accent-strong`, porque el rosa claro no se lee bien en letra pequeña. La tipografía (Archivo, de Google Fonts) se carga en `index.html` y se declara en `tailwind.config.ts`.

## Agregar o editar productos

> **Los productos reales vienen de Supabase** (tablas `productos`, `variantes`, `producto_imagenes`, `tallas`, `colores` y `categorias`): se editan en tu sistema y la tienda los lee al iniciar `npm run dev` o al compilar (reinicia para ver cambios). Lo que sigue describe los **productos de ejemplo** de `src/data/products.ts`, que se usan solo si no hay conexión con Supabase y en las pruebas.

Los productos están en **`src/data/products.ts`**. Para agregar uno, copia un bloque existente y cambia sus datos:

```ts
{
  id: 'p18',                          // único
  slug: 'leggings-nuevos',            // único; URL: /producto/leggings-nuevos
  name: 'Leggings Nuevos',
  category: 'mujer',                  // 'mujer' | 'hombre' | 'calzado' | 'accesorios'
  price: 299,                         // en quetzales
  description: 'Descripción corta del producto.',
  details: ['Característica 1', 'Característica 2'],
  sizes: ['XS', 'S', 'M', 'L', 'XL'], // [] = talla única (no se pide talla)
  colors: [{ name: 'Negro', hex: '#151515' }],
  images: [
    { src: '/productos/leggings-nuevos.jpg', alt: 'Mujer con leggings negros' },
  ],
  addedAt: '2026-11-01',              // se usa para ordenar por novedades
  featured: true,                     // opcional: aparece en Destacados
  isNew: true,                        // opcional: etiqueta "Nuevo" y sección Nueva colección
  sizeGuide: 'mujer',                 // opcional: tabla de la guía de tallas
},
```

- **Imágenes propias:** guárdalas en `public/productos/` y usa la ruta `/productos/archivo.jpg`. Usa fotos verticales (proporción 4:5) para que se vean bien en las tarjetas.
- **Imágenes de Unsplash:** usa `unsplash('<id-de-la-foto>', 'texto alternativo')`.
- Si eliminas un producto, talla o color, los artículos que ya estaban en el carrito con esa combinación desaparecen solos.

Otros archivos editables:

- `src/data/products.ts` → `categories` y `homeImages`: categorías e imágenes de la página de inicio.
- `src/data/info.ts`: páginas de información del pie de página (cómo comprar, envíos, cambios, preguntas frecuentes) y medidas de la guía de tallas.
- `src/lib/catalog.ts` → `priceRanges`: rangos del filtro de precio.
- `src/config/navigation.ts`: enlaces del menú.

## Cómo funciona el pedido

1. El cliente presiona **Confirmar pedido** y completa nombre, teléfono, modalidad (envío o retiro en tienda) y, si es envío, departamento, municipio, dirección y referencia.
2. La página envía el carrito a `/api/pedidos`. El servidor vuelve a leer en Supabase el precio de cada variante (el navegador nunca decide precios) y guarda el encabezado en `pedidos_carrito` y los artículos en `pedidos_carrito_detalles`.
3. El cliente ve su número de pedido y el carrito se vacía. Reenviar el mismo pedido (doble clic o reintento) no lo duplica.

Lógica: `src/lib/order.ts` (datos y validación), `server/orders.ts` (registro en Supabase) y `src/components/CheckoutDialog.tsx` (formulario).

## Asistente de la tienda

Botón flotante "¿Te ayudamos?" (abajo a la derecha). **No usa IA ni servicios externos:** responde al instante, en el navegador, con los datos de la tienda.

- Busca productos por palabra, categoría, color, talla y precio ("leggings negros talla M", "tenis hasta Q500").
- Responde promociones vigentes, guía de tallas, envíos, formas de pago, cómo comprar, cambios y horario.
- Muestra el carrito con el botón **Confirmar pedido**; si no entiende o no encuentra nada, ofrece el catálogo y WhatsApp.

Textos y temas: `src/chat/assistant.ts` (`TOPICS` y `MENU`). Ventana: `src/components/chat/ChatWidget.tsx`.

## Estructura

```
src/
  config/      configuración de la tienda y navegación
  data/        productos de ejemplo, categorías, promociones, páginas de información y guía de tallas
  lib/         lógica sin interfaz: carrito, filtros, promociones, pedido, formato
  chat/        asistente de la tienda (sin IA)
  context/     estado del carrito (localStorage, carrito lateral, formulario de pedido)
  components/  componentes reutilizables (Dialog accesible, tarjetas, guía de tallas…)
  pages/       inicio, catálogo, producto, promociones, carrito, información y 404
  test/        pruebas con Vitest y Testing Library
server/        solo servidor: catálogo desde Supabase y registro de pedidos
api/pedidos.ts función serverless para Vercel
supabase/      migraciones SQL (tablas de pedidos)
```

## Pedidos en Supabase (dev / prd)

La tienda registra cada pedido confirmado en `pedidos_carrito` (encabezado) y `pedidos_carrito_detalles` (artículos) mediante el endpoint `/api/pedidos`, que corre en el servidor con la Secret key.

**Crear las tablas en un ambiente nuevo** (una sola vez; se puede repetir sin problema):

1. Abre el proyecto de Supabase del ambiente (dev o prd) → **SQL Editor**.
2. Pega y ejecuta [`supabase/migrations/20261124000000_pedidos_carrito.sql`](supabase/migrations/20261124000000_pedidos_carrito.sql).
   Con Supabase CLI: `supabase link --project-ref <ref>` y luego `supabase db push`.
3. En **Authentication → Users** crea (o elige) el usuario al que se asignan los pedidos web y copia su UID.

**Variables de cada ambiente** (en `.env` local o en el hosting):

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto del ambiente |
| `VITE_SUPABASE_ANON_KEY` | Clave publishable del ambiente |
| `SUPABASE_SECRET_KEY` | Secret key del ambiente (nunca con prefijo `VITE_`) |
| `ORDER_USUARIO_ID` | UID del paso 3 |

Requisitos: el proyecto debe tener la tabla `variantes` del catálogo. Guardar pedidos necesita servidor: funciona con `npm run dev`/`npm run preview` y en Vercel, pero no en GitHub Pages.

**Consultar los pedidos** desde tu sistema: al final de la migración hay una consulta de ejemplo con cada pedido y sus artículos. El campo `estado` empieza en `pendiente` y lo actualiza tu sistema.

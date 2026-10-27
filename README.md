# ELITEFIT: tienda online de ropa fitness

Tienda pública hecha con React, Vite, TypeScript y Tailwind CSS. Incluye catálogo con filtros, detalle de producto con variantes, carrito guardado en el navegador, pedido por WhatsApp y un asistente de compras con IA.

No incluye base de datos, inicio de sesión, panel administrativo ni pagos en línea. Lo único que corre en un servidor es el endpoint del asistente de IA (`/api/chat`); sin él, la tienda funciona igual. El pedido se arma en la página y se termina en una conversación de WhatsApp.

> **Datos de demostración.** Los productos, precios, descripciones, medidas de la guía de tallas, textos informativos, el número de WhatsApp de pruebas (`50242709260`, es decir 4270-9260) y las redes sociales son de ejemplo. Reemplázalos antes de publicar la tienda. Las fotos vienen de [Unsplash](https://unsplash.com) y solo ilustran el ejemplo.

## Instalar y ejecutar

Requisitos: Node.js 18 o superior.

```bash
npm install      # instala dependencias
npm run dev      # servidor de desarrollo en http://localhost:5173
npm test         # pruebas: carrito, filtros, variantes, WhatsApp y asistente (sin llamar a la IA)
```

## Versión de producción

```bash
npm run build    # revisa los tipos y genera la carpeta dist/
npm run preview  # sirve dist/ localmente para revisarla
```

Sube el contenido de `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages, etc.). Como la tienda usa rutas como `/catalogo` o `/producto/...`, el hosting debe devolver `index.html` para cualquier ruta:

- **Netlify:** crea `public/_redirects` con la línea `/*  /index.html  200`.
- **Vercel:** detecta Vite y lo configura automáticamente.

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

## Cómo funciona el pedido por WhatsApp

1. El cliente completa nombre, modalidad (envío o recoger), dirección (solo si eligió envío) y observaciones.
2. Se arma un mensaje con productos, talla, color, cantidades, precio unitario, subtotales, total, envío por confirmar y datos de entrega. Se abre `https://wa.me/<número>?text=<mensaje codificado con encodeURIComponent>`.
3. La página no marca el pedido como enviado ni vacía el carrito. Indica que la disponibilidad, el envío y el pago se confirman por WhatsApp.

La lógica está en `src/lib/whatsapp.ts`.

## Asistente de compras con IA

Botón flotante "Asesor de compras" (abajo a la derecha). Usa un modelo de IA para buscar productos, recomendar según actividad y presupuesto, explicar tallas, armar el carrito y preparar el pedido por WhatsApp. Trabaja sobre el **mismo carrito** de la tienda.

### Cómo funciona

```
Navegador                                   Servidor (/api/chat)              Proveedor
ChatWidget → useChat ──── conversación ───▶ valida, limita, agrega reglas ──▶ Anthropic (Claude)
     ▲                                       y herramientas permitidas
     └─ controlador restringido ◀── llamadas a herramientas (searchProducts, addToCart, …)
        valida argumentos y ejecuta sobre el carrito real; devuelve el resultado al modelo
```

- **La clave nunca llega al navegador.** Solo la lee el servidor (`server/`), desde la variable `ANTHROPIC_API_KEY`.
- **El modelo no modifica nada directamente.** Pide herramientas y el controlador del navegador (`src/chat/controller.ts`) solo acepta las 9 permitidas. Antes de ejecutar valida:
  - el producto;
  - la combinación de talla y color;
  - que la cantidad sea un entero dentro del límite.

  Los precios y totales siempre salen del catálogo.
- **Sin duplicados:** una misma acción repetida dentro del mismo mensaje del cliente se rechaza, y "Reintentar" no repite acciones ya hechas.
- **Eliminar varios artículos:** la tienda muestra un botón de confirmación y no elimina nada hasta que el cliente lo pulsa.
- **Finalizar el pedido:** el chat muestra el resumen y el botón "Continuar por WhatsApp". El botón abre el formulario de pedido de siempre, así que nombre y dirección se capturan en el navegador y no se envían a la IA. WhatsApp solo se abre cuando el cliente lo pulsa.
- **Privacidad:** la conversación se guarda solo en esta pestaña (`sessionStorage`) y se borra con "Nueva conversación". El servidor no registra conversaciones; solo tipos de error.

### Configurar el proveedor

1. Crea una clave en [console.anthropic.com](https://console.anthropic.com).
2. Copia `.env.example` como `.env` y completa la clave:

   ```bash
   ANTHROPIC_API_KEY=tu-clave
   ```

   No uses el prefijo `VITE_`: las variables con ese prefijo se incluyen en el código del navegador.
3. Reinicia `npm run dev`. Sin clave, el chat muestra "El asistente aún no está configurado" y ofrece WhatsApp.

Opciones en `.env.example`:

| Variable | Valor por defecto | Para qué sirve |
| --- | --- | --- |
| `AI_MODEL` | `claude-opus-5-5` | Modelo. `claude-haiku-5-5` es mucho más económico. |
| `AI_EFFORT` | `low` | Esfuerzo de razonamiento. |
| `AI_FALLBACKS` | `default` | Reintenta en otro modelo si el principal declina por políticas de seguridad. Usa `off` con Haiku, que no tiene ese reintento. |
| `CHAT_RATE_LIMIT_PER_MINUTE` / `CHAT_RATE_LIMIT_PER_DAY` | `15` / `300` | Límites de uso por IP. |
| `CHAT_MAX_*` | ver archivo | Límites de tamaño y de acciones por mensaje. |
| `CHAT_ALLOWED_ORIGINS` | vacío (mismo dominio) | Dominios autorizados para llamar al endpoint. |

La configuración del servidor está en `server/config.ts` y las reglas del asistente en `server/prompt.ts`.

### Desarrollo

`npm run dev` y `npm run preview` montan el endpoint `/api/chat` en el mismo servidor de Vite, así que no hace falta otro proceso. Las pruebas usan un proveedor simulado y no gastan créditos.

### Despliegue

**Vercel (recomendado):** el proyecto ya incluye `api/chat.ts` (función serverless) y `vercel.json` (rutas de la tienda).

1. Importa el repositorio en Vercel (detecta Vite).
2. En *Settings → Environment Variables* agrega `ANTHROPIC_API_KEY` y, si quieres, las opciones de arriba.
3. Despliega. La tienda y `/api/chat` quedan en el mismo dominio.

**Otros hosting:** `server/chatHandler.ts` es un manejador estándar de Node (`req`, `res`). Se puede montar en cualquier servidor Node (Express, Fastify) o adaptarlo a funciones de otra plataforma. Si publicas solo la carpeta `dist/` en un hosting estático sin funciones, la tienda funciona y el chat muestra que el asistente no está disponible.

**Límite de uso:** el límite incluido vive en la memoria de cada instancia. Con tráfico real, súmale el de la plataforma (por ejemplo, Vercel Firewall) y define un límite de gasto en la consola del proveedor.

## Estructura

```
src/
  config/      configuración de la tienda y navegación
  data/        productos, categorías, páginas de información y guía de tallas
  lib/         lógica sin interfaz: carrito, filtros, mensaje de WhatsApp, formato
  chat/        asistente: herramientas, controlador restringido, protocolo y estado de la conversación
  context/     estado del carrito (localStorage, carrito lateral, formulario de pedido)
  components/  componentes reutilizables (Dialog accesible, tarjetas, selectores…)
  pages/       inicio, catálogo, producto, carrito, información y 404
  test/        pruebas con Vitest y Testing Library
server/        endpoint del asistente (solo servidor): configuración, reglas, validación, proveedor
api/chat.ts    función serverless para Vercel
```

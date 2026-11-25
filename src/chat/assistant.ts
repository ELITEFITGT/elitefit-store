/**
 * ASISTENTE DE LA TIENDA (sin IA)
 *
 * Responde al instante, en el navegador, con los datos reales de la tienda: catálogo, promociones,
 * guía de tallas, páginas de información y carrito. Reconoce la intención del mensaje por palabras
 * clave; si no la reconoce, ofrece el menú y el contacto por WhatsApp.
 *
 * Para cambiar textos o agregar temas, edita `TOPICS` y `MENU` de este archivo.
 */
import { storeConfig } from '../config/store';
import { getInfoPage, sizeGuides } from '../data/info';
import type { SizeGuideId } from '../data/info';
import { categories, categoryName, products } from '../data/products';
import type { DetailedLine } from '../lib/cart';
import { formatPrice, normalize } from '../lib/format';
import { activePromotions, benefitText, currentPrice, endsText, scopeText } from '../lib/promotions';
import type { CategoryId, Product } from '../types';

/** Acción de un botón dentro de la respuesta. */
export type ReplyAction =
  | { kind: 'link'; label: string; to: string }
  | { kind: 'external'; label: string; href: string }
  | { kind: 'checkout'; label: string };

export interface Reply {
  text: string;
  products?: Product[];
  /** Muestra el resumen del carrito con el botón para confirmar el pedido. */
  cart?: boolean;
  actions?: ReplyAction[];
  /** Respuestas rápidas sugeridas (se envían como si el cliente las escribiera). */
  chips?: string[];
}

export interface AssistantContext {
  lines: DetailedLine[];
  units: number;
  total: number;
}

export const MENU = ['Ver productos', 'Promociones', 'Guía de tallas', 'Envíos y entregas', 'Cómo comprar', 'Ver mi carrito'];

const WHATSAPP_LABEL = 'Escribir por WhatsApp';

export function whatsappHref(message = `Hola, ${storeConfig.name}. Tengo una consulta.`) {
  return `https://wa.me/${storeConfig.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

const whatsappAction = (message?: string): ReplyAction => ({ kind: 'external', label: WHATSAPP_LABEL, href: whatsappHref(message) });

export const GREETING: Reply = {
  text: `¡Hola! Soy el asistente de **${storeConfig.name}**. Puedo ayudarte a encontrar productos, ver promociones, elegir tu talla y resolver dudas de envíos y pedidos.\n\n¿Qué necesitas? También puedes escribir lo que buscas, por ejemplo: **leggings negros talla M** o **tenis hasta Q500**.`,
  chips: MENU,
};

// ---------------------------------------------------------------------------
// Utilidades de texto
// ---------------------------------------------------------------------------

const has = (text: string, ...words: string[]) => words.some((w) => new RegExp(`(^|[^a-z0-9])${w}`).test(text));

/** Primer párrafo de una página de información, para respuestas breves. */
function infoSummary(slug: string) {
  const page = getInfoPage(slug);
  if (!page) return '';
  return [page.intro, ...page.sections.map((s) => `- **${s.heading.replace(/^\d+\.\s*/, '')}:** ${s.paragraphs[0] ?? ''}`)].join('\n');
}

// ---------------------------------------------------------------------------
// Temas fijos (envíos, compras, cambios, contacto…)
// ---------------------------------------------------------------------------

interface Topic {
  match: (t: string) => boolean;
  /** true: si el mensaje también describe un producto, se busca el producto en lugar de responder el tema. */
  yieldsToSearch?: boolean;
  reply: (ctx: AssistantContext) => Reply;
}

const contactLines = () =>
  [
    storeConfig.contact.location && `- **Ubicación:** ${storeConfig.contact.location}`,
    storeConfig.contact.hours && `- **Horario:** ${storeConfig.contact.hours}`,
    storeConfig.contact.email && `- **Correo:** ${storeConfig.contact.email}`,
  ]
    .filter(Boolean)
    .join('\n');

const TOPICS: Topic[] = [
  {
    match: (t) => /^(hola|buen[oa]s?|saludos|hey|que tal|buenas tardes|buenas noches|buenos dias)\b/.test(t) && t.split(' ').length <= 4,
    reply: () => GREETING,
  },
  {
    match: (t) => has(t, 'gracias', 'muchas gracias', 'perfecto', 'excelente', 'listo'),
    reply: () => ({ text: '¡Con gusto! Si necesitas algo más, aquí estoy.', chips: MENU }),
  },
  {
    match: (t) => has(t, 'whatsapp', 'asesor', 'humano', 'persona', 'hablar con', 'agente', 'llamar'),
    reply: () => ({
      text: 'Con gusto te atiende una persona de nuestro equipo por WhatsApp. Escríbenos y te respondemos en nuestro horario de atención.',
      actions: [whatsappAction()],
    }),
  },
  {
    match: (t) => has(t, 'carrito', 'mi pedido', 'mi bolsa', 'que llevo', 'que tengo'),
    reply: (ctx) =>
      ctx.lines.length
        ? {
            text: `Tienes **${ctx.units} ${ctx.units === 1 ? 'artículo' : 'artículos'}** en tu carrito, por **${formatPrice(ctx.total)}** (sin envío).`,
            cart: true,
          }
        : {
            text: 'Tu carrito está vacío por ahora. ¿Te ayudo a encontrar algo?',
            actions: [{ kind: 'link', label: 'Ir al catálogo', to: '/catalogo' }],
            chips: ['Ver productos', 'Promociones'],
          },
  },
  {
    match: (t) => has(t, 'promo', 'oferta', 'descuento', 'rebaja', 'liquidacion', '2x1', 'mitad de precio'),
    reply: () => {
      const list = activePromotions().filter((p) => p.channels.includes('tienda-en-linea'));
      if (!list.length)
        return {
          text: 'Por ahora no tenemos promociones activas en la tienda en línea. Te invitamos a revisar las novedades.',
          chips: ['Novedades', 'Ver productos'],
        };
      return {
        text: [
          `Estas son las promociones vigentes:`,
          ...list.slice(0, 5).map((p) => `- **${p.title}:** ${benefitText(p)} · ${scopeText(p)} · ${endsText(p)}`),
          '',
          'El descuento se aplica solo en el carrito.',
        ].join('\n'),
        actions: [{ kind: 'link', label: 'Ver promociones', to: '/promociones' }],
      };
    },
  },
  {
    match: (t) => has(t, 'talla', 'tallas', 'medida', 'medidas', 'guia', 'me queda', 'que numero', 'calzo'),
    yieldsToSearch: true,
    reply: (ctx) => {
      // Primero la guía que corresponde a lo que el cliente tiene en el carrito.
      const id = guideFor(ctx);
      const chips = ['Tallas de mujer', 'Tallas de hombre', 'Tallas de calzado'];
      if (id) chips.sort((a, b) => Number(b.endsWith(id)) - Number(a.endsWith(id)));
      return {
        text: 'Tenemos guías de tallas para **mujer**, **hombre** y **calzado**, con medidas en centímetros. ¿Cuál quieres ver?',
        chips,
        actions: [{ kind: 'link', label: 'Abrir guía completa', to: '/info/guia-de-tallas' }],
      };
    },
  },
  {
    match: (t) => has(t, 'envio', 'envios', 'entrega', 'domicilio', 'recoger', 'cuanto tarda', 'llega', 'departamento', 'flete'),
    reply: () => ({
      text: infoSummary('envios-y-entregas'),
      actions: [{ kind: 'link', label: 'Más sobre envíos', to: '/info/envios-y-entregas' }],
      chips: ['Cómo comprar', 'Formas de pago'],
    }),
  },
  {
    match: (t) => has(t, 'pago', 'pagar', 'tarjeta', 'transferencia', 'efectivo', 'contra entrega', 'deposito'),
    reply: () => ({
      text: 'La página no cobra en línea. Al confirmar tu pedido, nuestro equipo te contacta para acordar la **forma de pago**, la disponibilidad y el envío.',
      chips: ['Cómo comprar', 'Ver mi carrito'],
    }),
  },
  {
    match: (t) => has(t, 'como compro', 'como comprar', 'como pido', 'como hago', 'hacer un pedido', 'hacer pedido', 'proceso de compra', 'confirmar pedido'),
    reply: (ctx) => ({
      text: infoSummary('como-comprar'),
      ...(ctx.lines.length
        ? { actions: [{ kind: 'checkout', label: 'Confirmar mi pedido' } as ReplyAction] }
        : { chips: ['Ver productos'] }),
    }),
  },
  {
    match: (t) => has(t, 'cambio', 'cambiar', 'devolucion', 'devolver', 'garantia', 'reembolso'),
    reply: () => ({
      text: infoSummary('cambios-y-devoluciones'),
      actions: [whatsappAction(`Hola, ${storeConfig.name}. Quiero solicitar un cambio de mi pedido.`)],
    }),
  },
  {
    match: (t) => has(t, 'horario', 'abren', 'cierran', 'ubicacion', 'donde estan', 'direccion de la tienda', 'tienda fisica', 'contacto', 'correo'),
    reply: () => ({
      text: contactLines() || 'Escríbenos por WhatsApp y con gusto te damos la información.',
      actions: [whatsappAction()],
    }),
  },
];

// ---------------------------------------------------------------------------
// Guía de tallas
// ---------------------------------------------------------------------------

function guideFor(ctx: AssistantContext): SizeGuideId | null {
  return ctx.lines.find((l) => l.product.sizeGuide)?.product.sizeGuide ?? null;
}

function sizeGuideReply(id: SizeGuideId): Reply {
  const g = sizeGuides[id];
  const [, ...measures] = g.columns;
  const rows = g.rows.map(([size, ...values]) => `- **${size}:** ${values.map((v, i) => `${measures[i]} ${v}`).join(' · ')}`);
  return {
    text: [`**Guía de ${g.title.toLowerCase()}** (medidas en cm):`, ...rows, '', 'Si estás entre dos tallas, te recomendamos la mayor.'].join('\n'),
    actions: [{ kind: 'link', label: 'Calcular mi talla', to: '/info/guia-de-tallas' }],
    chips: ['Ver productos', 'Envíos y entregas'],
  };
}

// ---------------------------------------------------------------------------
// Búsqueda de productos
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  'a al algo algun alguna busco buscando de del el en es esta este estos hay la las lo los me mi muestrame necesito para por que quiero ropa se si su tienen tienes un una unos unas y ver ensename dame tengo con sin muy mas menos hasta precio presupuesto quetzales q color talla tallas productos producto'.split(
    ' ',
  ),
);

const CATEGORY_WORDS: [RegExp, CategoryId][] = [
  [/\b(calzado|tenis|zapatos?|zapatillas?|sneakers?)\b/, 'calzado'],
  [/\b(accesorios?|bolsas?|bolsones?|rodilleras?|guantes?|calcetas?|straps?)\b/, 'accesorios'],
  [/\b(hombres?|caballeros?|masculin[oa])\b/, 'hombre'],
  [/\b(mujer(es)?|damas?|femenin[oa])\b/, 'mujer'],
];

interface Criteria {
  tokens: string[];
  category?: CategoryId;
  maxPrice?: number;
  minPrice?: number;
  size?: string;
  color?: string;
  newest?: boolean;
  cheapest?: boolean;
}

const allColors = [...new Set(products.flatMap((p) => p.colors.map((c) => c.name)))];
const allSizes = [...new Set(products.flatMap((p) => p.sizes))];

function parseCriteria(t: string): Criteria {
  const c: Criteria = { tokens: [] };
  let rest = t;

  const max = rest.match(/(?:hasta|menos de|maximo|no mas de|presupuesto(?: de)?|por debajo de|debajo de)\s*q?\s*(\d{2,5})/);
  const min = rest.match(/(?:mas de|desde|minimo|arriba de)\s*q?\s*(\d{2,5})/);
  const bare = rest.match(/\bq\s?(\d{2,5})\b/);
  if (max) c.maxPrice = Number(max[1]);
  else if (bare && !min) c.maxPrice = Number(bare[1]);
  if (min) c.minPrice = Number(min[1]);
  rest = rest.replace(/\bq?\s?\d{2,5}\s*(quetzales)?/g, ' ');

  for (const [re, id] of CATEGORY_WORDS)
    if (re.test(rest)) {
      c.category = id;
      rest = rest.replace(re, ' ');
      break;
    }

  const size = rest.match(/\btalla\s+([a-z0-9./]+)/);
  if (size) {
    const wanted = size[1].toUpperCase();
    if (allSizes.includes(wanted)) c.size = wanted;
    rest = rest.replace(size[0], ' ');
  }

  const color = allColors.find((name) => new RegExp(`\\b${normalize(name)}s?\\b`).test(rest));
  if (color) {
    c.color = color;
    rest = rest.replace(new RegExp(`\\b${normalize(color)}s?\\b`), ' ');
  }

  if (has(rest, 'novedad', 'nuevo', 'nueva', 'lo ultimo', 'recien')) c.newest = true;
  if (has(rest, 'barato', 'economico', 'mas bajo')) c.cheapest = true;

  c.tokens = rest
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^(novedad|novedades|nuevo|nueva|nuevos|nuevas|barato|baratos|economico)$/.test(w));
  return c;
}

const stem = (w: string) => (w.length > 4 ? w.replace(/(es|s)$/, '') : w);

function score(p: Product, tokens: string[]) {
  const name = normalize(p.name);
  const haystack = normalize([p.name, categoryName(p.category), p.description, ...p.details].join(' '));
  let total = 0;
  for (const t of tokens) {
    const s = stem(t);
    if (name.includes(s)) total += 3;
    else if (haystack.includes(s)) total += 1;
  }
  return total;
}

export function searchProducts(c: Criteria) {
  const list = products
    .filter((p) => !c.category || p.category === c.category)
    .filter((p) => c.maxPrice === undefined || currentPrice(p) <= c.maxPrice)
    .filter((p) => c.minPrice === undefined || currentPrice(p) >= c.minPrice)
    .filter((p) => !c.size || p.sizes.includes(c.size))
    .filter((p) => !c.color || p.colors.some((col) => col.name === c.color))
    .map((p, i) => ({ p, i, s: c.tokens.length ? score(p, c.tokens) : 0 }))
    .filter((r) => !c.tokens.length || r.s > 0);

  list.sort((a, b) => {
    if (c.cheapest) return currentPrice(a.p) - currentPrice(b.p);
    if (c.newest) return b.p.addedAt.localeCompare(a.p.addedAt);
    return b.s - a.s || Number(!!b.p.featured) - Number(!!a.p.featured) || a.i - b.i;
  });
  return list.map((r) => r.p);
}

function describe(c: Criteria) {
  const parts = [
    c.tokens.length ? `“${c.tokens.join(' ')}”` : '',
    c.category ? `en ${categoryName(c.category)}` : '',
    c.color ? `color ${c.color.toLowerCase()}` : '',
    c.size ? `talla ${c.size}` : '',
    c.maxPrice !== undefined ? `hasta ${formatPrice(c.maxPrice)}` : '',
    c.minPrice !== undefined ? `desde ${formatPrice(c.minPrice)}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

function catalogLink(c: Criteria) {
  const params = new URLSearchParams();
  if (c.tokens.length) params.set('q', c.tokens.join(' '));
  if (c.category) params.set('categoria', c.category);
  if (c.size) params.set('talla', c.size);
  if (c.newest) params.set('orden', 'novedades');
  if (c.cheapest) params.set('orden', 'precio-asc');
  const qs = params.toString();
  return `/catalogo${qs ? `?${qs}` : ''}`;
}

const isSearchable = (c: Criteria) =>
  c.tokens.length > 0 || !!c.category || c.maxPrice !== undefined || c.minPrice !== undefined || !!c.size || !!c.color || !!c.newest || !!c.cheapest;

function productReply(c: Criteria): Reply {
  const found = searchProducts(c);
  const what = describe(c);
  if (!found.length)
    return {
      text: `No encontré productos${what ? ` para ${what}` : ''}. Prueba con otra palabra o menos filtros, o revisa todo el catálogo.`,
      actions: [
        { kind: 'link', label: 'Ver catálogo', to: '/catalogo' },
        whatsappAction(`Hola, ${storeConfig.name}. Busco: ${what || 'un producto'}`),
      ],
      chips: categories.map((cat) => cat.name),
    };
  const shown = found.slice(0, 4);
  return {
    text:
      found.length === 1
        ? `Encontré **1 producto**${what ? ` para ${what}` : ''}:`
        : `Encontré **${found.length} productos**${what ? ` para ${what}` : ''}. Te muestro ${shown.length === found.length ? 'todos' : `los ${shown.length} primeros`}:`,
    products: shown,
    actions: found.length > shown.length ? [{ kind: 'link', label: `Ver los ${found.length} en el catálogo`, to: catalogLink(c) }] : undefined,
    chips: c.size ? ['Guía de tallas', 'Ver mi carrito'] : ['Guía de tallas', 'Promociones'],
  };
}

// ---------------------------------------------------------------------------
// Respuesta principal
// ---------------------------------------------------------------------------

export function answer(input: string, ctx: AssistantContext): Reply {
  const t = normalize(input).replace(/[¿?¡!.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return GREETING;

  // Botones del menú y de las respuestas rápidas.
  if (t === 'menu' || t === 'inicio' || t === 'ayuda') return GREETING;
  if (t === 'ver productos')
    return {
      text: '¿Qué tipo de producto buscas? Elige una categoría o escribe lo que necesitas (por ejemplo **leggings**, **conjunto**, **tenis**).',
      chips: [...categories.map((c) => c.name), 'Novedades'],
    };
  if (t === 'novedades') return productReply({ tokens: [], newest: true });
  const category = categories.find((c) => normalize(c.name) === t);
  if (category) return productReply({ tokens: [], category: category.id });
  const guide = t.match(/^tallas de (mujer|hombre|calzado)$/);
  if (guide) return sizeGuideReply(guide[1] as SizeGuideId);
  if (t === 'guia de tallas') return TOPICS.find((x) => x.match('talla'))!.reply(ctx);
  if (t === 'formas de pago') return TOPICS.find((x) => x.match('pago'))!.reply(ctx);

  // Temas de la tienda (envíos, tallas, promociones…); si no, búsqueda de productos.
  const criteria = parseCriteria(t);
  // "leggings negros talla M" es una búsqueda, no una consulta de la guía de tallas.
  const asksForProduct = criteria.tokens.length > 0 || !!criteria.category || !!criteria.color;
  const topic = TOPICS.find((x) => x.match(t) && !(x.yieldsToSearch && asksForProduct));
  if (topic) return topic.reply(ctx);

  if (isSearchable(criteria)) return productReply(criteria);

  return {
    text: 'Disculpa, no logré entender tu consulta. Puedes elegir una opción o escribir el producto que buscas. Si prefieres, te atiende una persona por WhatsApp.',
    actions: [whatsappAction()],
    chips: MENU,
  };
}

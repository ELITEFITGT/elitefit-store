import { storeConfig } from '../config/store';
import type { CartPort } from '../context/CartContext';
import { getInfoPage, sizeGuides, sizeGuideTips } from '../data/info';
import type { SizeGuideId } from '../data/info';
import { categories, categoryName, getProductById, products, shoeSizeOrder, sizeOrder } from '../data/products';
import { cartTotals, detailLines, lineKey } from '../lib/cart';
import type { DetailedLine } from '../lib/cart';
import { formatPrice, normalize } from '../lib/format';
import type { CategoryId, Product } from '../types';
import type { ToolCall } from './protocol';
import { isToolName } from './toolDefinitions';
import type { ToolName } from './toolDefinitions';

/** Elementos visuales que la tienda muestra en el chat a partir del resultado real de una herramienta. */
export type UiArtifact =
  | { kind: 'cart'; text: string }
  | { kind: 'confirmRemoval'; itemIds: string[]; labels: string[]; status: 'pending' | 'done' | 'cancelled' }
  | { kind: 'order' };

export interface ToolExecution {
  output: Record<string, unknown>;
  isError: boolean;
  ui?: UiArtifact;
}

const MAX = storeConfig.maxQuantityPerItem;

// ---------- Validación de argumentos ----------

class ArgError extends Error {}

type Spec = Record<string, { type: 'string' | 'number' | 'integer' | 'stringOrNull' | 'stringArray'; required?: boolean; max?: number }>;

/** Valida los argumentos contra un esquema mínimo: sin propiedades extra, tipos y longitudes. */
function parseArgs(input: unknown, spec: Spec): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new ArgError('Los argumentos deben ser un objeto.');
  const args = input as Record<string, unknown>;
  for (const key of Object.keys(args)) if (!(key in spec)) throw new ArgError(`Argumento no permitido: ${key}.`);
  for (const [key, rule] of Object.entries(spec)) {
    const v = args[key];
    if (v === undefined) {
      if (rule.required) throw new ArgError(`Falta el argumento ${key}.`);
      continue;
    }
    const max = rule.max ?? 100;
    const okString = (x: unknown) => typeof x === 'string' && x.length <= max;
    const valid =
      rule.type === 'string'
        ? okString(v)
        : rule.type === 'stringOrNull'
          ? v === null || okString(v)
          : rule.type === 'number'
            ? typeof v === 'number' && Number.isFinite(v)
            : rule.type === 'integer'
              ? typeof v === 'number' && Number.isInteger(v)
              : Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && x.length <= 100);
    if (!valid) throw new ArgError(`El argumento ${key} no es válido.`);
  }
  return args;
}

const error = (code: string, message: string, extra: Record<string, unknown> = {}): ToolExecution => ({
  output: { error: code, message, ...extra },
  isError: true,
});

// ---------- Presentación de datos para el modelo ----------

const productUrl = (p: Product) => `/producto/${p.slug}`;

const productSummary = (p: Product) => ({
  productId: p.id,
  name: p.name,
  category: categoryName(p.category),
  price: p.price,
  priceText: formatPrice(p.price),
  colors: p.colors.map((c) => c.name),
  sizes: p.sizes.length ? p.sizes : 'Talla única',
  isNew: Boolean(p.isNew),
  url: productUrl(p),
});

const lineSummary = (l: DetailedLine) => ({
  itemId: l.key,
  productId: l.productId,
  name: l.product.name,
  size: l.size ?? 'Única',
  color: l.color,
  quantity: l.quantity,
  unitPrice: l.unitPrice,
  unitPriceText: formatPrice(l.unitPrice),
  subtotal: l.subtotal,
  subtotalText: formatPrice(l.subtotal),
});

const variantLabel = (name: string, size: string | null, color: string) => `${name} (${size ?? 'talla única'}, ${color})`;

// ---------- Búsqueda ----------

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'para', 'con', 'y', 'o', 'en', 'por', 'que', 'me', 'mi', 'ropa', 'algo', 'busco', 'quiero']);

function searchScore(p: Product, tokens: string[]) {
  const name = normalize(p.name);
  const haystack = normalize([p.name, categoryName(p.category), p.description, ...p.details, ...p.colors.map((c) => c.name)].join(' '));
  let score = 0;
  for (const t of tokens) {
    const stem = t.length > 4 ? t.replace(/(es|s)$/, '') : t;
    if (name.includes(stem)) score += 3;
    else if (haystack.includes(stem)) score += 1;
  }
  return score;
}

// ---------- Controlador ----------

export function createToolController(port: CartPort) {
  // Huellas de acciones ya ejecutadas por turno: evita duplicados si el modelo repite una llamada.
  const fingerprints = new Set<string>();
  const currentLines = () => detailLines(port.getLines(), products);
  const cartSnapshot = () => {
    const lines = currentLines();
    const { units, total } = cartTotals(lines);
    return {
      items: lines.map(lineSummary),
      units,
      total,
      totalText: formatPrice(total),
      shipping: 'Costo de envío por confirmar por WhatsApp',
      maxQuantityPerItem: MAX,
    };
  };

  const tools: Record<ToolName, (input: unknown, turn: number) => ToolExecution> = {
    searchProducts(input) {
      const a = parseArgs(input, {
        query: { type: 'string', max: 80 },
        category: { type: 'string', max: 20 },
        minPrice: { type: 'number' },
        maxPrice: { type: 'number' },
        size: { type: 'string', max: 5 },
        color: { type: 'string', max: 30 },
        sort: { type: 'string', max: 20 },
        limit: { type: 'integer' },
      });
      const category = a.category as string | undefined;
      if (category && !categories.some((c) => c.id === category))
        return error('invalid_category', 'Categoría inexistente.', { validCategories: categories.map((c) => c.id) });
      const limit = Math.min(Math.max((a.limit as number | undefined) ?? 6, 1), 10);
      const size = (a.size as string | undefined)?.toUpperCase();
      const color = a.color ? normalize(a.color as string) : '';
      const tokens = normalize((a.query as string | undefined) ?? '')
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 1 && !STOPWORDS.has(t));

      let results = products
        .filter((p) => !category || p.category === (category as CategoryId))
        .filter((p) => a.minPrice === undefined || p.price >= (a.minPrice as number))
        .filter((p) => a.maxPrice === undefined || p.price <= (a.maxPrice as number))
        .filter((p) => !size || p.sizes.includes(size))
        .filter((p) => !color || p.colors.some((c) => normalize(c.name).includes(color)))
        .map((p, index) => ({ p, index, score: tokens.length ? searchScore(p, tokens) : 0 }))
        .filter((r) => !tokens.length || r.score > 0);

      const sort = a.sort as string | undefined;
      results.sort((x, y) => {
        if (sort === 'precio-asc') return x.p.price - y.p.price;
        if (sort === 'precio-desc') return y.p.price - x.p.price;
        if (sort === 'novedades') return y.p.addedAt.localeCompare(x.p.addedAt);
        return y.score - x.score || Number(!!y.p.featured) - Number(!!x.p.featured) || x.index - y.index;
      });
      const total = results.length;
      results = results.slice(0, limit);
      return {
        output: {
          totalMatches: total,
          products: results.map((r) => productSummary(r.p)),
          ...(total === 0 ? { note: 'Sin coincidencias. Prueba con menos filtros o con otra categoría.' } : {}),
        },
        isError: false,
      };
    },

    getProductDetails(input) {
      const a = parseArgs(input, { productId: { type: 'string', required: true, max: 20 } });
      const p = getProductById(a.productId as string);
      if (!p) return error('product_not_found', 'No existe un producto con ese id. Usa searchProducts.');
      return {
        output: {
          ...productSummary(p),
          description: p.description,
          details: p.details,
          sizeGuide: p.sizeGuide ?? null,
          requiresSize: p.sizes.length > 0,
          availability: 'Sin inventario conectado: la disponibilidad se confirma por WhatsApp.',
        },
        isError: false,
      };
    },

    getSizeGuide(input) {
      const a = parseArgs(input, { guide: { type: 'string', max: 10 }, productId: { type: 'string', max: 20 } });
      let guideId = a.guide as string | undefined;
      if (a.productId) {
        const p = getProductById(a.productId as string);
        if (!p) return error('product_not_found', 'No existe un producto con ese id.');
        if (!p.sizeGuide) return { output: { productId: p.id, note: 'Este producto es de talla única y no tiene guía de tallas.' }, isError: false };
        guideId = p.sizeGuide;
      }
      if (!guideId || !(guideId in sizeGuides)) return error('invalid_guide', 'Indica guide "mujer", "hombre" o "calzado", o un productId.');
      const g = sizeGuides[guideId as SizeGuideId];
      return {
        output: {
          guide: guideId,
          unit: 'cm',
          columns: g.columns,
          rows: g.rows,
          howToMeasure: sizeGuideTips,
          note: 'Medidas de referencia. No garantizan el ajuste; si el cliente está entre dos tallas, sugiere consultarlo por WhatsApp.',
        },
        isError: false,
      };
    },

    getStoreInformation(input) {
      const a = parseArgs(input, { topic: { type: 'string', max: 30 } });
      const topic = (a.topic as string | undefined) ?? 'general';
      const base = {
        storeName: storeConfig.name,
        currency: 'Quetzales (Q)',
        orderChannel: 'Los pedidos se finalizan por WhatsApp; la página no cobra ni confirma pedidos.',
        inventoryConnected: false,
        notConfigured: ['descuentos o promociones', 'tiempos de entrega', 'costos de envío', 'métodos de pago', 'existencias'],
      };
      if (topic === 'contacto' || topic === 'general') {
        return {
          output: {
            ...base,
            contact: {
              whatsapp: 'Disponible desde el botón "Continuar por WhatsApp" o el pie de página.',
              location: storeConfig.contact.location || 'No configurado',
              hours: storeConfig.contact.hours || 'No configurado',
            },
            categories: categories.map((c) => c.name),
            sizesOffered: { ropa: sizeOrder, calzadoUS: shoeSizeOrder },
            maxQuantityPerItem: MAX,
          },
          isError: false,
        };
      }
      const page = getInfoPage(topic);
      if (!page) return error('invalid_topic', 'Tema no disponible.');
      return { output: { ...base, title: page.title, intro: page.intro, sections: page.sections }, isError: false };
    },

    getCart(input) {
      parseArgs(input, {});
      return { output: cartSnapshot(), isError: false };
    },

    addToCart(input, turn) {
      const a = parseArgs(input, {
        productId: { type: 'string', required: true, max: 20 },
        size: { type: 'stringOrNull', max: 5 },
        color: { type: 'string', required: true, max: 30 },
        quantity: { type: 'integer', required: true },
      });
      const p = getProductById(a.productId as string);
      if (!p) return error('product_not_found', 'No existe un producto con ese id. Usa searchProducts.');

      const color = p.colors.find((c) => normalize(c.name) === normalize(a.color as string));
      if (!color) return error('invalid_color', `El color no existe para ${p.name}.`, { availableColors: p.colors.map((c) => c.name) });

      let size: string | null = null;
      const requested = typeof a.size === 'string' ? a.size.trim().toUpperCase() : null;
      if (p.sizes.length) {
        if (!requested) return error('missing_size', `${p.name} requiere talla. Pregunta al cliente cuál desea.`, { availableSizes: p.sizes });
        if (!p.sizes.includes(requested)) return error('invalid_size', `La talla ${requested} no existe para ${p.name}.`, { availableSizes: p.sizes });
        size = requested;
      } else if (requested && !['UNICA', 'ÚNICA'].includes(requested)) {
        return error('invalid_size', `${p.name} es de talla única.`);
      }

      const quantity = a.quantity as number;
      if (quantity < 1) return error('invalid_quantity', 'La cantidad debe ser un entero mayor que cero.');
      const key = lineKey({ productId: p.id, size, color: color.name });
      const inCart = port.getLines().find((l) => lineKey(l) === key)?.quantity ?? 0;
      if (inCart + quantity > MAX)
        return error('quantity_limit', `El máximo es ${MAX} unidades por artículo.`, { alreadyInCart: inCart, maxQuantityPerItem: MAX });

      const fingerprint = `${turn}|add|${key}|${quantity}`;
      if (fingerprints.has(fingerprint))
        return error('duplicate_action', 'Esta misma acción ya se ejecutó en este turno; no se repitió. Consulta getCart.');
      fingerprints.add(fingerprint);

      port.apply({ type: 'add', line: { productId: p.id, size, color: color.name, quantity }, max: MAX });
      const label = variantLabel(p.name, size, color.name);
      return {
        output: {
          status: 'added',
          added: { itemId: key, name: p.name, size: size ?? 'Única', color: color.name, quantity, unitPriceText: formatPrice(p.price) },
          cart: cartSnapshot(),
        },
        isError: false,
        ui: { kind: 'cart', text: `Agregado al carrito: ${label} × ${quantity}` },
      };
    },

    updateCartItem(input) {
      const a = parseArgs(input, { itemId: { type: 'string', required: true, max: 80 }, quantity: { type: 'integer', required: true } });
      const line = currentLines().find((l) => l.key === a.itemId);
      if (!line) return error('item_not_found', 'Ese artículo no está en el carrito. Consulta getCart.');
      const quantity = a.quantity as number;
      if (quantity < 1 || quantity > MAX)
        return error('invalid_quantity', `La cantidad debe ser un entero entre 1 y ${MAX}. Para quitar el artículo usa removeFromCart.`);
      port.apply({ type: 'setQuantity', key: line.key, quantity, max: MAX });
      return {
        output: { status: 'updated', itemId: line.key, quantity, cart: cartSnapshot() },
        isError: false,
        ui: { kind: 'cart', text: `Cantidad actualizada: ${variantLabel(line.product.name, line.size, line.color)} × ${quantity}` },
      };
    },

    removeFromCart(input) {
      const a = parseArgs(input, { itemIds: { type: 'stringArray', required: true, max: 20 } });
      const ids = [...new Set(a.itemIds as string[])];
      if (!ids.length) return error('invalid_items', 'Indica al menos un artículo.');
      const lines = currentLines();
      const missing = ids.filter((id) => !lines.some((l) => l.key === id));
      if (missing.length) return error('item_not_found', 'Algunos artículos no están en el carrito. Consulta getCart.', { missing });
      const selected = lines.filter((l) => ids.includes(l.key));
      const labels = selected.map((l) => variantLabel(l.product.name, l.size, l.color));

      if (selected.length > 1) {
        return {
          output: {
            status: 'awaiting_customer_confirmation',
            message: 'No se eliminó nada todavía. La tienda mostró un botón para que el cliente confirme la eliminación.',
            items: labels,
          },
          isError: false,
          ui: { kind: 'confirmRemoval', itemIds: ids, labels, status: 'pending' },
        };
      }
      port.apply({ type: 'remove', key: selected[0].key });
      return {
        output: { status: 'removed', removed: labels[0], cart: cartSnapshot() },
        isError: false,
        ui: { kind: 'cart', text: `Eliminado del carrito: ${labels[0]}` },
      };
    },

    prepareWhatsAppOrder(input) {
      parseArgs(input, {});
      const snapshot = cartSnapshot();
      if (!snapshot.items.length) return error('empty_cart', 'El carrito está vacío. Ayuda al cliente a elegir productos primero.');
      return {
        output: {
          status: 'ready_for_customer',
          ...snapshot,
          nextStep:
            'Se mostró al cliente el resumen y el botón "Continuar por WhatsApp". Al pulsarlo completará nombre, modalidad de entrega y dirección en un formulario local y abrirá WhatsApp. El pedido no está enviado ni confirmado hasta que el cliente envíe el mensaje.',
        },
        isError: false,
        ui: { kind: 'order' },
      };
    },
  };

  return {
    execute(call: ToolCall, turn: number): ToolExecution {
      if (!isToolName(call.name)) return error('unknown_tool', 'Herramienta no permitida.');
      try {
        return tools[call.name](call.input, turn);
      } catch (e) {
        if (e instanceof ArgError) return error('invalid_arguments', e.message);
        return error('tool_failed', 'No se pudo completar la acción.');
      }
    },

    /** Ejecuta una eliminación múltiple que el cliente confirmó con el botón en pantalla. */
    confirmRemoval(itemIds: string[]) {
      const lines = currentLines();
      const removed = lines.filter((l) => itemIds.includes(l.key));
      for (const l of removed) port.apply({ type: 'remove', key: l.key });
      return removed.map((l) => variantLabel(l.product.name, l.size, l.color));
    },
  };
}

export type ToolController = ReturnType<typeof createToolController>;

/** Productos del catálogo mencionados por su nombre exacto en un texto (para mostrar tarjetas). */
export function mentionedProducts(text: string, max = 4): Product[] {
  const t = normalize(text);
  return products
    .map((p) => ({ p, at: t.indexOf(normalize(p.name)) }))
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, max)
    .map((x) => x.p);
}

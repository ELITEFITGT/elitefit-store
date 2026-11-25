/**
 * Lógica de promociones, compartida entre la tienda (navegador) y el servidor (/api/pedidos),
 * para que el descuento que ve el cliente sea el mismo que se registra en el pedido.
 * No importa nada del catálogo ni de Vite: el servidor también usa este archivo.
 *
 * Reglas:
 * - Solo cuentan las promociones 'activa', dentro de sus fechas y con el canal 'tienda-en-linea'.
 * - A cada producto se le aplica una sola promoción: la de menor `priority` (1 = primera).
 * - Las reglas por unidad (percent, amount) bajan el precio de cada unidad.
 * - Las reglas por cantidad (nth-unit) se calculan sobre todo el carrito: por cada `every` unidades
 *   que entran en la promoción, una lleva el descuento (por defecto, la de menor precio).
 */
import { promotions as storePromotions } from '../data/promotions.js';
import type { CategoryId, Promotion } from '../types.js';

export const STORE_TIME_ZONE = 'America/Guatemala';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha de hoy en Guatemala (AAAA-MM-DD), sin importar la zona horaria del equipo o del servidor. */
export const storeToday = (now: Date = new Date()) => dayFormatter.format(now);

const round = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Vigencia y alcance
// ---------------------------------------------------------------------------

export const isOnline = (p: Promotion) => p.channels.includes('tienda-en-linea');

/** Activa y dentro de sus fechas (en cualquier canal). */
export const isPromotionActive = (p: Promotion, today = storeToday()) => p.status === 'activa' && p.startsAt <= today && today <= p.endsAt;

const byPriority = (a: Promotion, b: Promotion) => a.priority - b.priority || a.endsAt.localeCompare(b.endsAt);

/** Promociones de la tienda en línea vigentes hoy, por prioridad. Las de solo sucursales no se muestran en la web. */
export const activePromotions = (list: Promotion[] = storePromotions, today = storeToday()) =>
  list.filter((p) => isOnline(p) && isPromotionActive(p, today)).sort(byPriority);

/** Promociones de la tienda en línea que aún no empiezan, de la más próxima a la más lejana. */
export const upcomingPromotions = (list: Promotion[] = storePromotions, today = storeToday()) =>
  list.filter((p) => isOnline(p) && p.status === 'activa' && today < p.startsAt).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

/** Nombre en minúsculas, sin tildes ni signos: "Termo ELITEFIT" => "termo-elitefit". */
export const nameKey = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Lo mínimo de un producto para decidir sus promociones (sirve igual con datos del catálogo o de la base). */
export interface PromotionTarget {
  name: string;
  category: CategoryId;
}

export function promotionAppliesTo(p: Promotion, target: PromotionTarget) {
  if (p.appliesTo === 'all') return true;
  const { categories = [], products = [] } = p.appliesTo;
  if (categories.includes(target.category)) return true;
  const key = nameKey(target.name);
  return products.some((name) => nameKey(name) === key);
}

/** La promoción que le toca a un producto en la tienda en línea (la de mayor prioridad), o null. */
export function promotionFor(target: PromotionTarget, list: Promotion[] = storePromotions, today = storeToday()) {
  return list.filter((p) => isOnline(p) && isPromotionActive(p, today) && promotionAppliesTo(p, target)).sort(byPriority)[0] ?? null;
}

// ---------------------------------------------------------------------------
// Precio por unidad (tarjetas, página del producto, filtros)
// ---------------------------------------------------------------------------

export const isPerUnit = (p: Promotion) => p.rule.type === 'percent' || p.rule.type === 'amount';

/** Precio de una unidad con una regla por unidad (nunca negativo). Las reglas por cantidad no cambian el precio unitario. */
export function applyDiscount(price: number, p: Promotion) {
  const r = p.rule;
  if (r.type === 'percent') return Math.max(0, round(price * (1 - Math.min(Math.max(r.value, 0), 100) / 100)));
  if (r.type === 'amount') return Math.max(0, round(price - Math.max(r.value, 0)));
  return price;
}

export interface PriceInfo {
  /** Precio por unidad a mostrar (con descuento si la promoción es por unidad). */
  price: number;
  /** Precio normal, sin descuento. */
  originalPrice: number;
  /** Promoción del producto (también las de cantidad, que no cambian `price`). */
  promotion: Promotion | null;
  /** Porcentaje de ahorro por unidad, redondeado. 0 si no hay o si la promoción es por cantidad. */
  percentOff: number;
}

export function priceWithPromotion(
  target: PromotionTarget,
  price: number,
  list: Promotion[] = storePromotions,
  today = storeToday(),
): PriceInfo {
  const promotion = promotionFor(target, list, today);
  if (!promotion) return { price, originalPrice: price, promotion: null, percentOff: 0 };
  const discounted = applyDiscount(price, promotion);
  // Una promoción por unidad que dejaría el precio en cero se ignora (sería un error de captura).
  if (isPerUnit(promotion) && discounted <= 0) return { price, originalPrice: price, promotion: null, percentOff: 0 };
  return {
    price: discounted,
    originalPrice: price,
    promotion,
    percentOff: discounted < price ? Math.round((1 - discounted / price) * 100) : 0,
  };
}

/** Precio actual por unidad (con descuento si hay promoción por unidad). */
export const currentPrice = (p: PromotionTarget & { price: number }) => priceWithPromotion(p, p.price).price;

/**
 * Oferta por cantidad de un producto, para mostrarla junto al precio:
 * "Segundo par a mitad" con precio 1100 => { units: 2, total: 1650, savings: 550 }.
 * null si la promoción no es por cantidad.
 */
export function bundleOffer(p: Promotion | null, price: number) {
  if (!p || p.rule.type !== 'nth-unit' || p.rule.every < 2) return null;
  const savings = round((price * Math.min(Math.max(p.rule.percent, 0), 100)) / 100);
  if (savings <= 0) return null;
  return { units: p.rule.every, total: round(price * p.rule.every - savings), savings };
}

// ---------------------------------------------------------------------------
// Carrito completo (reglas por cantidad incluidas)
// ---------------------------------------------------------------------------

export interface CartPricingItem extends PromotionTarget {
  /** Identificador del artículo (producto + talla + color). */
  key: string;
  /** Producto: con combineProducts = false, solo se juntan unidades del mismo producto. */
  productId: string;
  /** Precio normal por unidad. */
  unitPrice: number;
  quantity: number;
}

export interface CartPricingLine {
  key: string;
  promotion: Promotion | null;
  /** Descuento total del artículo. */
  discount: number;
  /** Precio por unidad que se cobra (promedio si el descuento es solo en algunas unidades). */
  unitPrice: number;
  /** unitPrice × cantidad. Se calcula igual en el servidor, así que el total coincide al centavo. */
  subtotal: number;
}

export interface PromotionHint {
  promotion: Promotion;
  /** Unidades que faltan para ganar el siguiente descuento. */
  missing: number;
}

/**
 * Aplica las promociones a todo el carrito. Devuelve el precio cobrado por artículo
 * y, para las reglas por cantidad, cuántas unidades faltan para el siguiente descuento.
 */
export function priceCart(
  items: CartPricingItem[],
  list: Promotion[] = storePromotions,
  today = storeToday(),
): { lines: CartPricingLine[]; hints: PromotionHint[] } {
  const discount = new Map<string, number>();
  const promoOf = new Map<string, Promotion | null>();
  const groups = new Map<string, { promotion: Promotion; units: { key: string; price: number }[] }>();

  for (const item of items) {
    const promotion = promotionFor(item, list, today);
    promoOf.set(item.key, promotion);
    if (!promotion) continue;
    const r = promotion.rule;
    if (r.type === 'nth-unit') {
      const groupKey = promotion.combineProducts ? promotion.id : `${promotion.id}::${item.productId}`;
      const group = groups.get(groupKey) ?? { promotion, units: [] };
      for (let i = 0; i < item.quantity; i++) group.units.push({ key: item.key, price: item.unitPrice });
      groups.set(groupKey, group);
    } else {
      const each = item.unitPrice - applyDiscount(item.unitPrice, promotion);
      if (each > 0 && each < item.unitPrice) discount.set(item.key, round(each * item.quantity));
    }
  }

  const hints: PromotionHint[] = [];
  for (const { promotion, units } of groups.values()) {
    const r = promotion.rule;
    if (r.type !== 'nth-unit' || r.every < 1) continue;
    const free = Math.floor(units.length / r.every);
    const cheapestFirst = r.cheapestFirst !== false;
    units.sort((a, b) => (cheapestFirst ? a.price - b.price : b.price - a.price));
    for (const u of units.slice(0, free)) {
      discount.set(u.key, round((discount.get(u.key) ?? 0) + (u.price * Math.min(Math.max(r.percent, 0), 100)) / 100));
    }
    const rest = units.length % r.every;
    if (rest) hints.push({ promotion, missing: r.every - rest });
  }

  const lines = items.map((item) => {
    const d = Math.min(discount.get(item.key) ?? 0, item.unitPrice * item.quantity);
    // Si el promedio no es exacto, se redondea hacia abajo: los centavos quedan a favor del cliente.
    const unitPrice = d > 0 ? Math.floor(((item.unitPrice * item.quantity - d) / item.quantity) * 100 + 1e-6) / 100 : item.unitPrice;
    return {
      key: item.key,
      promotion: d > 0 ? (promoOf.get(item.key) ?? null) : null,
      discount: round(item.unitPrice * item.quantity - unitPrice * item.quantity),
      unitPrice,
      subtotal: round(unitPrice * item.quantity),
    };
  });
  return { lines, hints };
}

// ---------------------------------------------------------------------------
// Textos para el cliente
// Solo lo que necesita saber: qué gana, en qué productos y hasta cuándo. Los datos internos
// (estado, canales, prioridad, fecha de inicio) no se muestran.
// ---------------------------------------------------------------------------

/** Qué gana el cliente: "Llévate 2 y el de menor precio sale a mitad de precio." */
export function benefitText(p: Promotion) {
  const r = p.rule;
  if (r.type === 'percent') return `${r.value} % de descuento.`;
  if (r.type === 'amount') return `Q${r.value} de descuento en cada unidad.`;
  const who = r.cheapestFirst === false ? 'el de mayor precio' : 'el de menor precio';
  const benefit = r.percent >= 100 ? 'te sale gratis' : r.percent === 50 ? 'sale a mitad de precio' : `tiene ${r.percent} % de descuento`;
  return `Llévate ${r.every} y ${who} ${benefit}.`;
}

const categoryNames: Record<CategoryId, string> = {
  mujer: 'ropa de mujer',
  hombre: 'ropa de hombre',
  calzado: 'calzado',
  accesorios: 'accesorios',
};

/** En qué productos vale: "Válido en zapatos. Puedes combinar modelos." */
export function scopeText(p: Promotion) {
  let target = p.appliesToLabel?.toLowerCase();
  if (!target) {
    if (p.appliesTo === 'all') target = 'toda la tienda';
    else {
      const parts = [...(p.appliesTo.categories ?? []).map((c) => categoryNames[c]), ...(p.appliesTo.products ?? [])];
      target = parts.join(', ') || 'productos seleccionados';
    }
  }
  const combine = p.rule.type === 'nth-unit' ? (p.combineProducts ? ' Puedes combinar modelos.' : ' En el mismo modelo.') : '';
  return `Válido en ${target}.${combine}`;
}

/** Etiqueta corta para fotos de producto: "-25%", "-Q20", "2.º par a mitad", "2x1". */
export function badgeText(p: Promotion) {
  if (p.badge) return p.badge;
  const r = p.rule;
  if (r.type === 'percent') return `-${r.value}%`;
  if (r.type === 'amount') return `-Q${r.value}`;
  if (r.percent >= 100) return `${r.every}x${r.every - 1}`;
  return `${r.every}.ª unidad -${r.percent}%`;
}

const longDate = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/** "30 de noviembre" a partir de "2026-11-30". */
export const formatPromoDate = (isoDay: string) => longDate.format(new Date(`${isoDay}T12:00:00Z`));

/** Días que faltan para que termine (0 = termina hoy). */
export const daysLeft = (p: Promotion, today = storeToday()) =>
  Math.round((Date.parse(`${p.endsAt}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

/** "Termina hoy", "Termina mañana", "Quedan 5 días" o "Válida hasta el 30 de noviembre". */
export function endsText(p: Promotion, today = storeToday()) {
  const days = daysLeft(p, today);
  if (days <= 0) return 'Termina hoy';
  if (days === 1) return 'Termina mañana';
  if (days <= 7) return `Quedan ${days} días`;
  return `Válida hasta el ${formatPromoDate(p.endsAt)}`;
}

/** Aviso del carrito: "Agrega 1 más y el de menor precio sale a mitad de precio." */
export function hintText({ promotion, missing }: PromotionHint) {
  const r = promotion.rule;
  if (r.type !== 'nth-unit') return '';
  const who = r.cheapestFirst === false ? 'el de mayor precio' : 'el de menor precio';
  const benefit = r.percent >= 100 ? 'te sale gratis' : r.percent === 50 ? 'sale a mitad de precio' : `tiene ${r.percent} % de descuento`;
  return `${promotion.title}: agrega ${missing} más y ${who} ${benefit}.`;
}

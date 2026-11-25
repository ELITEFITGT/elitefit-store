import type { CartLine, Product } from '../types';
import { roundMoney } from './format';
import { priceCart } from './promotions';
import type { CartPricingItem } from './promotions';
import type { Promotion } from '../types';

export const CART_STORAGE_KEY = 'fitstore-cart-v1';

/** Cada combinación de producto + talla + color es un artículo distinto. */
export const lineKey = (line: Pick<CartLine, 'productId' | 'size' | 'color'>) =>
  `${line.productId}::${line.size ?? ''}::${line.color}`;

export type CartAction =
  | { type: 'add'; line: CartLine; max: number }
  | { type: 'setQuantity'; key: string; quantity: number; max: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'replace'; lines: CartLine[] };

const clamp = (n: number, max: number) => Math.min(Math.max(Math.floor(n), 1), max);

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.line);
      const existing = lines.find((l) => lineKey(l) === key);
      if (existing) {
        return lines.map((l) =>
          l === existing ? { ...l, quantity: clamp(l.quantity + action.line.quantity, action.max) } : l,
        );
      }
      return [...lines, { ...action.line, quantity: clamp(action.line.quantity, action.max) }];
    }
    case 'setQuantity':
      return lines.map((l) => (lineKey(l) === action.key ? { ...l, quantity: clamp(action.quantity, action.max) } : l));
    case 'remove':
      return lines.filter((l) => lineKey(l) !== action.key);
    case 'clear':
      return [];
    case 'replace':
      return action.lines;
  }
}

export interface DetailedLine extends CartLine {
  key: string;
  product: Product;
  /** Precio por unidad que se cobra (promedio si el descuento es solo en algunas unidades). */
  unitPrice: number;
  /** Precio normal por unidad, sin descuento. */
  originalUnitPrice: number;
  /** Promoción que bajó el precio de este artículo (null si no tiene descuento). */
  promotion: Promotion | null;
  /** Descuento total del artículo. */
  discount: number;
  subtotal: number;
}

/**
 * Une cada artículo con los datos actuales del catálogo. Descarta artículos cuyo producto,
 * talla o color ya no existen (por ejemplo, si se editó el catálogo).
 */
export function detailLines(lines: CartLine[], catalog: Product[]): DetailedLine[] {
  const valid = lines.flatMap((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    if (!product) return [];
    if (!product.colors.some((c) => c.name === line.color)) return [];
    const sizeOk = product.sizes.length ? !!line.size && product.sizes.includes(line.size) : line.size === null;
    if (!sizeOk) return [];
    return [{ line, product, key: lineKey(line) }];
  });
  // Las promociones se calculan sobre todo el carrito (p. ej. "segundo par a mitad de precio").
  const { lines: priced } = priceCart(valid.map(pricingItem));
  return valid.map(({ line, product, key }, i) => ({
    ...line,
    key,
    product,
    unitPrice: priced[i].unitPrice,
    originalUnitPrice: product.price,
    promotion: priced[i].promotion,
    discount: priced[i].discount,
    subtotal: priced[i].subtotal,
  }));
}

const pricingItem = ({ line, product, key }: { line: CartLine; product: Product; key: string }): CartPricingItem => ({
  key,
  productId: product.id,
  name: product.name,
  category: product.category,
  unitPrice: product.price,
  quantity: line.quantity,
});

/** Sugerencias del tipo "Agrega 1 unidad más y el de menor precio sale a mitad". */
export const cartPromotionHints = (lines: DetailedLine[]) =>
  priceCart(lines.map((l) => pricingItem({ line: l, product: l.product, key: l.key }))).hints;

export const cartTotals = (lines: DetailedLine[]) => ({
  units: lines.reduce((sum, l) => sum + l.quantity, 0),
  total: roundMoney(lines.reduce((sum, l) => sum + l.subtotal, 0)),
  /** Cuánto ahorra el cliente con las promociones. */
  savings: roundMoney(lines.reduce((sum, l) => sum + l.discount, 0)),
});

/** Lee el carrito guardado. Ignora datos corruptos o con formato inválido. */
export function loadCart(storage: Pick<Storage, 'getItem'> | undefined, max: number): CartLine[] {
  try {
    const raw = storage?.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): CartLine[] => {
      if (!item || typeof item !== 'object') return [];
      const { productId, size, color, quantity } = item as Record<string, unknown>;
      if (typeof productId !== 'string' || typeof color !== 'string') return [];
      if (size !== null && typeof size !== 'string') return [];
      if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 1) return [];
      return [{ productId, size, color, quantity: clamp(quantity, max) }];
    });
  } catch {
    return [];
  }
}

export function saveCart(storage: Pick<Storage, 'setItem'> | undefined, lines: CartLine[]) {
  try {
    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Almacenamiento lleno o bloqueado: el carrito sigue funcionando en memoria.
  }
}

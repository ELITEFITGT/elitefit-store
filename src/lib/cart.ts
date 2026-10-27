import type { CartLine, Product } from '../types';
import { roundMoney } from './format';

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
  unitPrice: number;
  subtotal: number;
}

/**
 * Une cada artículo con los datos actuales del catálogo. Descarta artículos cuyo producto,
 * talla o color ya no existen (por ejemplo, si se editó el catálogo).
 */
export function detailLines(lines: CartLine[], catalog: Product[]): DetailedLine[] {
  return lines.flatMap((line) => {
    const product = catalog.find((p) => p.id === line.productId);
    if (!product) return [];
    if (!product.colors.some((c) => c.name === line.color)) return [];
    const sizeOk = product.sizes.length ? !!line.size && product.sizes.includes(line.size) : line.size === null;
    if (!sizeOk) return [];
    return [
      {
        ...line,
        key: lineKey(line),
        product,
        unitPrice: product.price,
        subtotal: roundMoney(product.price * line.quantity),
      },
    ];
  });
}

export const cartTotals = (lines: DetailedLine[]) => ({
  units: lines.reduce((sum, l) => sum + l.quantity, 0),
  total: roundMoney(lines.reduce((sum, l) => sum + l.subtotal, 0)),
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

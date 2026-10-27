import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { storeConfig } from '../config/store';
import { products } from '../data/products';
import { CART_STORAGE_KEY, cartReducer, cartTotals, detailLines, lineKey, loadCart, saveCart } from '../lib/cart';
import type { CartAction, DetailedLine } from '../lib/cart';
import type { CartLine } from '../types';

/** Acceso de bajo nivel al carrito para el asistente: lectura y cambios síncronos. */
export interface CartPort {
  getLines: () => CartLine[];
  apply: (action: CartAction) => CartLine[];
}

interface CartContextValue {
  lines: DetailedLine[];
  units: number;
  total: number;
  /** Agrega un artículo. Devuelve true si la cantidad se limitó al máximo permitido. */
  addItem: (line: CartLine) => boolean;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  lastAddedKey: string | null;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  port: CartPort;
}

const CartContext = createContext<CartContextValue | null>(null);

const MAX = storeConfig.maxQuantityPerItem;
const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

export function CartProvider({ children }: { children: ReactNode }) {
  const [rawLines, dispatch] = useReducer(cartReducer, undefined, () => loadCart(storage, MAX));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);

  // Copia síncrona del estado: varias acciones seguidas (p. ej. del asistente) ven siempre el último valor.
  const linesRef = useRef(rawLines);
  const apply = useCallback((action: CartAction) => {
    const next = cartReducer(linesRef.current, action);
    linesRef.current = next;
    dispatch({ type: 'replace', lines: next });
    return next;
  }, []);
  const port = useMemo<CartPort>(() => ({ getLines: () => linesRef.current, apply }), [apply]);

  useEffect(() => {
    saveCart(storage, rawLines);
  }, [rawLines]);

  // Sincroniza el carrito entre pestañas abiertas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== CART_STORAGE_KEY) return;
      apply({ type: 'replace', lines: loadCart(storage, MAX) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [apply]);

  const lines = useMemo(() => detailLines(rawLines, products), [rawLines]);
  const { units, total } = useMemo(() => cartTotals(lines), [lines]);

  const addItem = useCallback(
    (line: CartLine) => {
      const key = lineKey(line);
      const current = linesRef.current.find((l) => lineKey(l) === key)?.quantity ?? 0;
      apply({ type: 'add', line, max: MAX });
      setLastAddedKey(key);
      setCheckoutOpen(false);
      setDrawerOpen(true);
      return current + line.quantity > MAX;
    },
    [apply],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      units,
      total,
      addItem,
      setQuantity: (key, quantity) => apply({ type: 'setQuantity', key, quantity, max: MAX }),
      removeItem: (key) => apply({ type: 'remove', key }),
      clear: () => apply({ type: 'clear' }),
      lastAddedKey,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => {
        setDrawerOpen(false);
        setLastAddedKey(null);
      },
      checkoutOpen,
      openCheckout: () => {
        setDrawerOpen(false);
        setCheckoutOpen(true);
      },
      closeCheckout: () => setCheckoutOpen(false),
      port,
    }),
    [lines, units, total, addItem, apply, lastAddedKey, drawerOpen, checkoutOpen, port],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}

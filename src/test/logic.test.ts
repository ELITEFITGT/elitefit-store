import { products } from '../data/products';
import { cartReducer, cartTotals, detailLines, lineKey, loadCart, saveCart, CART_STORAGE_KEY } from '../lib/cart';
import { emptyFilters, filterProducts, filtersFromParams, filtersToParams, countActiveFilters } from '../lib/catalog';
import { formatPrice } from '../lib/format';
import { buildOrderMessage, buildWhatsAppUrl, validateOrder } from '../lib/whatsapp';
import type { CartLine } from '../types';

const MAX = 10;
const leggings = products.find((p) => p.id === 'p01')!; // Q329, tallas XS–XL
const mat = products.find((p) => p.id === 'p14')!; // Q279, talla única

describe('datos de productos', () => {
  it('tiene al menos 12 productos con datos coherentes', () => {
    expect(products.length).toBeGreaterThanOrEqual(12);
    const ids = new Set(products.map((p) => p.id));
    const slugs = new Set(products.map((p) => p.slug));
    expect(ids.size).toBe(products.length);
    expect(slugs.size).toBe(products.length);
    for (const p of products) {
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.colors.length).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
      p.images.forEach((img) => expect(img.alt.length).toBeGreaterThan(5));
    }
  });
});

describe('carrito', () => {
  const add = (lines: CartLine[], line: CartLine) => cartReducer(lines, { type: 'add', line, max: MAX });

  it('suma cantidades si se agrega la misma combinación', () => {
    let lines = add([], { productId: 'p01', size: 'M', color: 'Negro', quantity: 2 });
    lines = add(lines, { productId: 'p01', size: 'M', color: 'Negro', quantity: 3 });
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(5);
  });

  it('trata como artículos distintos cada talla y color', () => {
    let lines = add([], { productId: 'p01', size: 'M', color: 'Negro', quantity: 1 });
    lines = add(lines, { productId: 'p01', size: 'L', color: 'Negro', quantity: 1 });
    lines = add(lines, { productId: 'p01', size: 'M', color: 'Oliva', quantity: 1 });
    expect(lines).toHaveLength(3);
    expect(new Set(lines.map(lineKey)).size).toBe(3);
  });

  it('limita la cantidad entre 1 y el máximo', () => {
    let lines = add([], { productId: 'p01', size: 'M', color: 'Negro', quantity: 8 });
    lines = add(lines, { productId: 'p01', size: 'M', color: 'Negro', quantity: 8 });
    expect(lines[0].quantity).toBe(MAX);
    const key = lineKey(lines[0]);
    expect(cartReducer(lines, { type: 'setQuantity', key, quantity: 0, max: MAX })[0].quantity).toBe(1);
    expect(cartReducer(lines, { type: 'setQuantity', key, quantity: 4, max: MAX })[0].quantity).toBe(4);
  });

  it('elimina artículos', () => {
    const lines = add([], { productId: 'p01', size: 'M', color: 'Negro', quantity: 1 });
    expect(cartReducer(lines, { type: 'remove', key: lineKey(lines[0]) })).toEqual([]);
  });

  it('calcula subtotales y total', () => {
    const lines = detailLines(
      [
        { productId: 'p01', size: 'M', color: 'Negro', quantity: 2 },
        { productId: 'p14', size: null, color: 'Negro', quantity: 3 },
      ],
      products,
    );
    expect(lines[0].subtotal).toBe(leggings.price * 2);
    expect(lines[1].subtotal).toBe(mat.price * 3);
    expect(cartTotals(lines)).toEqual({ units: 5, total: leggings.price * 2 + mat.price * 3 });
  });

  it('descarta artículos con producto, talla o color inexistentes', () => {
    const lines = detailLines(
      [
        { productId: 'nope', size: 'M', color: 'Negro', quantity: 1 },
        { productId: 'p01', size: 'XXXL', color: 'Negro', quantity: 1 },
        { productId: 'p01', size: 'M', color: 'Rosa', quantity: 1 },
        { productId: 'p01', size: null, color: 'Negro', quantity: 1 },
      ],
      products,
    );
    expect(lines).toEqual([]);
  });

  it('guarda y recupera el carrito en el almacenamiento', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    const lines: CartLine[] = [{ productId: 'p01', size: 'M', color: 'Negro', quantity: 2 }];
    saveCart(storage, lines);
    expect(loadCart(storage, MAX)).toEqual(lines);

    store.set(CART_STORAGE_KEY, '{no es json');
    expect(loadCart(storage, MAX)).toEqual([]);
    store.set(CART_STORAGE_KEY, JSON.stringify([{ productId: 'p01', color: 'Negro', size: 'M', quantity: -1 }, { foo: 1 }]));
    expect(loadCart(storage, MAX)).toEqual([]);
  });
});

describe('filtros del catálogo', () => {
  it('busca por nombre sin importar mayúsculas ni tildes', () => {
    const r = filterProducts(products, { ...emptyFilters, q: 'LEGGINGS' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((p) => p.name.toLowerCase().includes('leggings'))).toBe(true);
    expect(filterProducts(products, { ...emptyFilters, q: 'sudadera crew' }).map((p) => p.id)).toEqual(['p10']);
    expect(filterProducts(products, { ...emptyFilters, q: 'zzzz' })).toEqual([]);
  });

  it('filtra por categoría, talla y precio', () => {
    const accesorios = filterProducts(products, { ...emptyFilters, categories: ['accesorios'] });
    expect(accesorios.every((p) => p.category === 'accesorios')).toBe(true);

    const xxl = filterProducts(products, { ...emptyFilters, sizes: ['XXL'] });
    expect(xxl.length).toBeGreaterThan(0);
    expect(xxl.every((p) => p.sizes.includes('XXL'))).toBe(true);

    const cheap = filterProducts(products, { ...emptyFilters, price: 'hasta-200' });
    expect(cheap.every((p) => p.price < 200)).toBe(true);
    const mid = filterProducts(products, { ...emptyFilters, price: '200-350' });
    expect(mid.every((p) => p.price >= 200 && p.price < 350)).toBe(true);

    const combined = filterProducts(products, { ...emptyFilters, categories: ['mujer'], sizes: ['XS'], price: 'mas-de-350' });
    expect(combined.map((p) => p.id)).toEqual(['p04']);
  });

  it('ordena por precio y novedades', () => {
    const asc = filterProducts(products, { ...emptyFilters, sort: 'precio-asc' }).map((p) => p.price);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = filterProducts(products, { ...emptyFilters, sort: 'precio-desc' }).map((p) => p.price);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const news = filterProducts(products, { ...emptyFilters, sort: 'novedades' }).map((p) => p.addedAt);
    expect(news).toEqual([...news].sort().reverse());
  });

  it('lee y escribe filtros en la URL', () => {
    const f = filtersFromParams(new URLSearchParams('q=top&categoria=mujer,otra&talla=s,m&precio=200-350&orden=precio-asc'));
    expect(f).toEqual({ q: 'top', categories: ['mujer'], sizes: ['S', 'M'], price: '200-350', sort: 'precio-asc' });
    expect(countActiveFilters(f)).toBe(5);
    expect(filtersFromParams(filtersToParams(f))).toEqual(f);
    expect(filtersFromParams(new URLSearchParams('precio=x&orden=y'))).toEqual(emptyFilters);
  });
});

describe('pedido por WhatsApp', () => {
  const lines = detailLines(
    [
      { productId: 'p01', size: 'M', color: 'Oliva', quantity: 2 },
      { productId: 'p14', size: null, color: 'Lavanda', quantity: 1 },
    ],
    products,
  );

  it('valida nombre y dirección solo cuando es envío', () => {
    expect(validateOrder({ name: '', delivery: 'recoger', address: '', notes: '' })).toHaveProperty('name');
    expect(validateOrder({ name: 'Ana', delivery: 'envio', address: '', notes: '' })).toHaveProperty('address');
    expect(validateOrder({ name: 'Ana', delivery: 'recoger', address: '', notes: '' })).toEqual({});
  });

  it('construye un mensaje legible con todos los datos', () => {
    const msg = buildOrderMessage('ELITEFIT', lines, {
      name: ' Ana López ',
      delivery: 'envio',
      address: '5a avenida 10-20, zona 1',
      notes: 'Entregar por la tarde',
    });
    expect(msg).toContain('*Cliente:* Ana López');
    expect(msg).toContain('1. Leggings Sculpt Tiro Alto');
    expect(msg).toContain('Talla: M | Color: Oliva');
    expect(msg).toContain(`Cantidad: 2 x ${formatPrice(329)} = ${formatPrice(658)}`);
    expect(msg).toContain('2. Mat de Yoga 6 mm');
    expect(msg).toContain('Talla única | Color: Lavanda');
    expect(msg).toContain(`*Total de productos:* ${formatPrice(658 + 279)}`);
    expect(msg).toContain('*Envío:* por confirmar');
    expect(msg).toContain('*Entrega:* Envío a domicilio');
    expect(msg).toContain('*Dirección:* 5a avenida 10-20, zona 1');
    expect(msg).toContain('*Observaciones:* Entregar por la tarde');
  });

  it('omite dirección y observaciones cuando no aplican', () => {
    const msg = buildOrderMessage('ELITEFIT', lines, { name: 'Ana', delivery: 'recoger', address: 'no usar', notes: '' });
    expect(msg).toContain('*Entrega:* Recoger');
    expect(msg).not.toContain('Dirección');
    expect(msg).not.toContain('Observaciones');
  });

  it('genera un enlace wa.me con el texto codificado', () => {
    const msg = 'Hola & adiós #1\nQ100';
    const url = buildWhatsAppUrl('+502 1234-5678', msg);
    expect(url).toBe(`https://wa.me/50212345678?text=${encodeURIComponent(msg)}`);
    expect(decodeURIComponent(new URL(url).searchParams.get('text')!)).toBe(msg);
  });

  it('formatea precios en quetzales', () => {
    expect(formatPrice(1234.5)).toMatch(/^Q\s?1,234\.50$/);
  });
});

import { createToolController, mentionedProducts } from '../chat/controller';
import type { CartPort } from '../context/CartContext';
import { products } from '../data/products';
import { cartReducer, lineKey } from '../lib/cart';
import type { CartLine } from '../types';

function memoryPort(initial: CartLine[] = []): CartPort & { lines: CartLine[] } {
  const port = {
    lines: initial,
    getLines: () => port.lines,
    apply: (action: Parameters<CartPort['apply']>[0]) => (port.lines = cartReducer(port.lines, action)),
  };
  return port;
}

const call = (name: string, input: unknown, id = Math.random().toString()) => ({ id, name, input });
const out = (r: { output: Record<string, unknown> }) => r.output as Record<string, any>;

describe('herramientas del asistente: catálogo', () => {
  const c = createToolController(memoryPort());

  it('busca por presupuesto y devuelve solo productos reales dentro del rango', () => {
    const r = out(c.execute(call('searchProducts', { maxPrice: 300 }), 1));
    expect(r.products.length).toBeGreaterThan(0);
    const ids = new Set(products.map((p) => p.id));
    for (const p of r.products) {
      expect(ids.has(p.productId)).toBe(true);
      expect(p.price).toBeLessThanOrEqual(300);
      expect(products.find((x) => x.id === p.productId)!.price).toBe(p.price); // precio del catálogo
    }
    expect(r.products.length).toBe(Math.min(6, products.filter((p) => p.price <= 300).length));
  });

  it('busca por texto, categoría, talla y color', () => {
    const r = out(c.execute(call('searchProducts', { query: 'leggings', color: 'negro', size: 'M', limit: 10 }), 1));
    expect(r.products.length).toBeGreaterThan(1);
    for (const p of r.products) {
      expect(p.name.toLowerCase()).toContain('leggings');
      expect(p.colors).toContain('Negro');
      expect(p.sizes).toContain('M');
    }
    expect(out(c.execute(call('searchProducts', { query: 'bicicleta eléctrica' }), 1)).products).toEqual([]);
    expect(c.execute(call('searchProducts', { category: 'niños' }), 1).isError).toBe(true);
  });

  it('rechaza argumentos fuera del esquema y herramientas no permitidas', () => {
    expect(out(c.execute(call('searchProducts', { query: 5 }), 1)).error).toBe('invalid_arguments');
    expect(out(c.execute(call('searchProducts', { sql: 'DROP TABLE' }), 1)).error).toBe('invalid_arguments');
    expect(out(c.execute(call('runCode', {}), 1)).error).toBe('unknown_tool');
    expect(out(c.execute(call('getProductDetails', { productId: 'p999' }), 1)).error).toBe('product_not_found');
  });

  it('entrega guía de tallas con aviso de referencia e información con datos no configurados', () => {
    const g = out(c.execute(call('getSizeGuide', { productId: 'p01' }), 1));
    expect(g.guide).toBe('mujer');
    expect(g.note).toMatch(/no garantizan/i);
    expect(out(c.execute(call('getSizeGuide', { productId: 'p14' }), 1)).note).toMatch(/talla única/);
    const info = out(c.execute(call('getStoreInformation', {}), 1));
    expect(info.inventoryConnected).toBe(false);
    expect(info.notConfigured).toContain('descuentos o promociones');
  });

  it('detecta productos mencionados por su nombre exacto', () => {
    expect(mentionedProducts('Te recomiendo los Leggings Power 7/8 y el Mat de Yoga 6 mm.').map((p) => p.id)).toEqual(['p05', 'p14']);
    expect(mentionedProducts('No tenemos zapatillas.')).toEqual([]);
  });
});

describe('herramientas del asistente: carrito', () => {
  it('pide aclaración cuando falta talla y rechaza variantes inexistentes', () => {
    const port = memoryPort();
    const c = createToolController(port);
    const missing = out(c.execute(call('addToCart', { productId: 'p01', size: null, color: 'Negro', quantity: 1 }), 1));
    expect(missing.error).toBe('missing_size');
    expect(missing.availableSizes).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    expect(out(c.execute(call('addToCart', { productId: 'p01', size: 'XXL', color: 'Negro', quantity: 1 }), 1)).error).toBe('invalid_size');
    expect(out(c.execute(call('addToCart', { productId: 'p01', size: 'M', color: 'Rosa', quantity: 1 }), 1)).error).toBe('invalid_color');
    expect(out(c.execute(call('addToCart', { productId: 'p01', size: 'M', quantity: 1 }), 1)).error).toBe('invalid_arguments');
    expect(port.lines).toEqual([]);
  });

  it('rechaza cantidades inválidas y respeta el límite por artículo', () => {
    const port = memoryPort();
    const c = createToolController(port);
    for (const quantity of [0, -2, 1.5, '2']) {
      expect(c.execute(call('addToCart', { productId: 'p01', size: 'M', color: 'Negro', quantity }), 1).isError).toBe(true);
    }
    expect(c.execute(call('addToCart', { productId: 'p01', size: 'M', color: 'Negro', quantity: 8 }), 1).isError).toBe(false);
    const over = out(c.execute(call('addToCart', { productId: 'p01', size: 'M', color: 'Negro', quantity: 3 }), 2));
    expect(over.error).toBe('quantity_limit');
    expect(over.alreadyInCart).toBe(8);
    expect(port.lines[0].quantity).toBe(8);
  });

  it('agrega al carrito compartido con precio del catálogo y evita duplicados en el mismo turno', () => {
    const port = memoryPort();
    const c = createToolController(port);
    const args = { productId: 'p05', size: 'm', color: 'negro', quantity: 2 };
    const first = c.execute(call('addToCart', args), 7);
    expect(first.isError).toBe(false);
    expect(first.ui).toEqual({ kind: 'cart', text: 'Agregado al carrito: Leggings Power 7/8 (M, Negro) × 2' });
    expect(out(first).cart.total).toBe(289 * 2);

    // El modelo repite la misma llamada en el mismo turno: no se duplica.
    expect(out(c.execute(call('addToCart', args), 7)).error).toBe('duplicate_action');
    expect(port.lines).toEqual([{ productId: 'p05', size: 'M', color: 'Negro', quantity: 2 }]);

    // En un turno nuevo, el cliente puede pedir otra vez lo mismo y se suma.
    c.execute(call('addToCart', args), 8);
    expect(port.lines[0].quantity).toBe(4);
  });

  it('acepta talla única como null y cambia cantidades', () => {
    const port = memoryPort();
    const c = createToolController(port);
    expect(c.execute(call('addToCart', { productId: 'p14', size: null, color: 'Lavanda', quantity: 1 }), 1).isError).toBe(false);
    expect(c.execute(call('addToCart', { productId: 'p14', size: 'M', color: 'Lavanda', quantity: 1 }), 2).isError).toBe(true);
    const itemId = lineKey({ productId: 'p14', size: null, color: 'Lavanda' });
    expect(out(c.execute(call('updateCartItem', { itemId, quantity: 3 }), 2)).status).toBe('updated');
    expect(port.lines[0].quantity).toBe(3);
    expect(c.execute(call('updateCartItem', { itemId, quantity: 11 }), 2).isError).toBe(true);
    expect(c.execute(call('updateCartItem', { itemId: 'no-existe', quantity: 1 }), 2).isError).toBe(true);
    const cart = out(c.execute(call('getCart', {}), 2));
    expect(cart.items[0]).toMatchObject({ itemId, name: 'Mat de Yoga 6 mm', size: 'Única', quantity: 3, subtotal: 837 });
  });

  it('elimina un artículo de inmediato y pide confirmación en pantalla para varios', () => {
    const port = memoryPort([
      { productId: 'p01', size: 'M', color: 'Negro', quantity: 1 },
      { productId: 'p07', size: 'L', color: 'Blanco', quantity: 1 },
      { productId: 'p14', size: null, color: 'Negro', quantity: 1 },
    ]);
    const c = createToolController(port);
    const [a, b, d] = port.lines.map(lineKey);

    const single = c.execute(call('removeFromCart', { itemIds: [d] }), 1);
    expect(out(single).status).toBe('removed');
    expect(port.lines).toHaveLength(2);

    const multi = c.execute(call('removeFromCart', { itemIds: [a, b] }), 1);
    expect(out(multi).status).toBe('awaiting_customer_confirmation');
    expect(multi.ui).toMatchObject({ kind: 'confirmRemoval', status: 'pending' });
    expect(port.lines).toHaveLength(2); // nada eliminado aún

    expect(c.confirmRemoval([a, b])).toHaveLength(2);
    expect(port.lines).toEqual([]);
  });

  it('prepara el pedido de WhatsApp solo con carrito y totales calculados', () => {
    const port = memoryPort();
    const c = createToolController(port);
    expect(out(c.execute(call('prepareWhatsAppOrder', {}), 1)).error).toBe('empty_cart');
    port.apply({ type: 'add', line: { productId: 'p07', size: 'L', color: 'Blanco', quantity: 2 }, max: 10 });
    const r = c.execute(call('prepareWhatsAppOrder', {}), 1);
    expect(r.ui).toEqual({ kind: 'order' });
    expect(out(r)).toMatchObject({ status: 'ready_for_customer', total: 358, units: 2 });
    expect(out(r).nextStep).toMatch(/no está enviado ni confirmado/);
  });
});

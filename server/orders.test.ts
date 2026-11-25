import { promotions } from '../src/data/promotions';
import { createOrder, parseOrderBody } from './orders';
import type { OrdersConfig } from './orders';

const PID = '11111111-1111-4111-8111-111111111111';
const cfg: OrdersConfig = {
  url: 'https://x.supabase.co',
  secretKey: 'sb_secret_test',
  usuarioId: '44444444-4444-4444-8444-444444444444',
  maxQuantityPerItem: 10,
  deliveryValues: { envio: 'envio_domicilio', recoger: 'retiro_tienda' },
};

const body = (over: Record<string, unknown> = {}) => ({
  checkoutId: '22222222-2222-4222-8222-222222222222',
  customer: { name: 'Ana', phone: '5555 1234', delivery: 'recoger', department: '', municipality: '', address: '', reference: '' },
  lines: [{ productId: PID, color: 'Negro', size: 'M', quantity: 2 }],
  ...over,
});

const variants = [
  { id: 'v-m', producto_id: PID, precio: '150.00', talla: { nombre: 'Mediana', codigo: 'M' }, color: { nombre: 'Negro' }, producto: { nombre: 'Top', estado: 'activo' } },
  { id: 'v-s', producto_id: PID, precio: '150.00', talla: { nombre: 'Chica', codigo: 'S' }, color: { nombre: 'Negro' }, producto: { nombre: 'Top', estado: 'activo' } },
];

/** Supabase simulado: registra cada llamada y responde según la ruta. */
function fakeSupabase(opts: { existing?: unknown[]; detailsFail?: boolean } = {}) {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
  const fetchImpl = (async (input: string, init: RequestInit = {}) => {
    const path = input.replace('https://x.supabase.co/rest/v1/', '');
    const method = init.method ?? 'GET';
    calls.push({ method, path, body: init.body ? JSON.parse(init.body as string) : undefined });
    if (method === 'GET' && path.startsWith('pedidos_carrito?')) return json(opts.existing ?? []);
    if (method === 'GET' && path.startsWith('variantes?')) return json(variants);
    if (method === 'POST' && path.startsWith('pedidos_carrito?')) return json([{ id: 'ped-1', numero_pedido: 7, total: '300.00' }], 201);
    if (method === 'POST' && path.startsWith('pedidos_carrito_detalles'))
      return opts.detailsFail ? json({ message: 'boom' }, 400) : new Response(null, { status: 201 });
    if (method === 'DELETE') return new Response(null, { status: 204 });
    return json({}, 404);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const parsed = (b: unknown) => {
  const r = parseOrderBody(b, 10);
  if (!r.ok) throw new Error(r.message);
  return r.order;
};

describe('pedidos: validación del cuerpo', () => {
  it('rechaza datos incompletos o no válidos', () => {
    expect(parseOrderBody(null, 10).ok).toBe(false);
    expect(parseOrderBody(body({ checkoutId: 'x' }), 10).ok).toBe(false);
    expect(parseOrderBody(body({ lines: [] }), 10)).toMatchObject({ ok: false, error: 'empty_cart' });
    expect(parseOrderBody(body({ lines: [{ productId: PID, color: 'Negro', size: 'M', quantity: 99 }] }), 10).ok).toBe(false);
    const envioSinDireccion = body({ customer: { ...body().customer, delivery: 'envio' } });
    expect(parseOrderBody(envioSinDireccion, 10)).toMatchObject({ ok: false, error: 'invalid_customer' });
  });
});

describe('pedidos: registro en Supabase', () => {
  it('usa el precio de Supabase (no el del navegador) y guarda encabezado y artículos', async () => {
    const sb = fakeSupabase();
    const r = await createOrder(parsed(body()), cfg, sb.fetchImpl);
    expect(r).toEqual({ ok: true, orderNumber: 7, total: 300 });

    const header = sb.calls.find((c) => c.method === 'POST' && c.path.startsWith('pedidos_carrito?'))!.body as Record<string, unknown>;
    expect(header).toMatchObject({
      usuario_id: '44444444-4444-4444-8444-444444444444',
      nombre_cliente: 'Ana',
      telefono_cliente: '5555 1234',
      metodo_entrega: 'retiro_tienda',
      subtotal: 300,
      direccion: null,
    });
    const details = sb.calls.find((c) => c.path.startsWith('pedidos_carrito_detalles'))!.body as Record<string, unknown>[];
    expect(details).toEqual([
      { pedido_id: 'ped-1', variante_id: 'v-m', nombre_producto: 'Top', talla: 'M', color: 'Negro', cantidad: 2, precio_unitario: 150 },
    ]);
    // Nunca se pide el costo de las variantes.
    expect(sb.calls.find((c) => c.path.startsWith('variantes?'))!.path).not.toContain('costo');
  });

  it('aplica la promoción vigente al precio registrado', async () => {
    promotions.push({
      id: 'test-top',
      title: 'Top al 20 %',
      banner: { src: '', alt: '' },
      status: 'activa',
      rule: { type: 'percent', value: 20 },
      appliesTo: { products: ['TOP'] },
      startsAt: '2000-01-01',
      endsAt: '2999-12-31',
      channels: ['tienda-en-linea'],
      priority: 1,
    });
    try {
      const sb = fakeSupabase();
      await createOrder(parsed(body()), cfg, sb.fetchImpl);
      const header = sb.calls.find((c) => c.method === 'POST' && c.path.startsWith('pedidos_carrito?'))!.body as Record<string, unknown>;
      expect(header.subtotal).toBe(240);
      const [detail] = sb.calls.find((c) => c.path.startsWith('pedidos_carrito_detalles'))!.body as Record<string, unknown>[];
      expect(detail.precio_unitario).toBe(120);
    } finally {
      promotions.length = 0;
    }
  });

  it('aplica promociones por cantidad sobre todo el pedido (segundo a mitad de precio)', async () => {
    promotions.push({
      id: 'test-2do',
      title: 'Segundo a mitad',
      banner: { src: '', alt: '' },
      status: 'activa',
      rule: { type: 'nth-unit', every: 2, percent: 50 },
      appliesTo: 'all',
      combineProducts: true,
      startsAt: '2000-01-01',
      endsAt: '2999-12-31',
      channels: ['tienda-en-linea'],
      priority: 1,
    });
    try {
      const sb = fakeSupabase();
      // 2 en talla M + 1 en talla S, Q150 cada uno: 3 unidades, una a mitad de precio.
      const lines = [
        { productId: PID, color: 'Negro', size: 'M', quantity: 2 },
        { productId: PID, color: 'Negro', size: 'S', quantity: 1 },
      ];
      await createOrder(parsed(body({ lines })), cfg, sb.fetchImpl);
      const details = sb.calls.find((c) => c.path.startsWith('pedidos_carrito_detalles'))!.body as Record<string, unknown>[];
      expect(details.map((d) => d.precio_unitario)).toEqual([112.5, 150]);
      const header = sb.calls.find((c) => c.method === 'POST' && c.path.startsWith('pedidos_carrito?'))!.body as Record<string, unknown>;
      expect(header.subtotal).toBe(375);
    } finally {
      promotions.length = 0;
    }
  });

  it('no duplica un pedido reenviado con el mismo checkout', async () => {
    const sb = fakeSupabase({ existing: [{ numero_pedido: 5, total: '120.00' }] });
    expect(await createOrder(parsed(body()), cfg, sb.fetchImpl)).toEqual({ ok: true, orderNumber: 5, total: 120 });
    expect(sb.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('avisa si una variante ya no existe y no inserta nada', async () => {
    const sb = fakeSupabase();
    const r = await createOrder(parsed(body({ lines: [{ productId: PID, color: 'Rosa', size: 'M', quantity: 1 }] })), cfg, sb.fetchImpl);
    expect(r).toMatchObject({ ok: false, error: 'unavailable' });
    expect(sb.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('borra el encabezado si fallan los artículos', async () => {
    const sb = fakeSupabase({ detailsFail: true });
    await expect(createOrder(parsed(body()), cfg, sb.fetchImpl)).rejects.toThrow(/artículos/);
    expect(sb.calls.at(-1)).toMatchObject({ method: 'DELETE', path: 'pedidos_carrito?id=eq.ped-1' });
  });
});

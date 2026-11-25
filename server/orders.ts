/**
 * Registro de pedidos web en Supabase (solo servidor, con SUPABASE_SECRET_KEY).
 *
 * - Valida los datos del cliente y del carrito.
 * - Vuelve a leer de Supabase el precio de cada variante: el navegador nunca decide precios.
 *   Aplica las promociones vigentes de src/data/promotions.ts sobre todo el carrito (la misma lógica que ve
 *   el cliente, incluidas las de cantidad como "segundo par a mitad de precio").
 * - Inserta el encabezado en `pedidos_carrito` y los artículos en `pedidos_carrito_detalles`.
 *   Si falla el detalle, borra el encabezado para no dejar pedidos incompletos.
 * - Es idempotente por `checkout_id`: reenviar el mismo pedido devuelve el ya registrado.
 */
import { UUID, validateCustomer } from '../src/lib/order.js';
import type { DeliveryMode, OrderRequestBody, OrderResponseBody } from '../src/lib/order.js';
import { priceCart } from '../src/lib/promotions.js';
import type { CartPricingItem } from '../src/lib/promotions.js';
import { isUniqueSize, sizeLabel, toCategory } from './supabaseCatalog.js';

export interface OrdersConfig {
  url: string;
  secretKey: string;
  /** Usuario de Supabase Auth al que se asignan los pedidos web (pedidos_carrito.usuario_id). */
  usuarioId: string;
  maxQuantityPerItem: number;
  /** Valor que se guarda en `metodo_entrega` para cada modalidad (debe cumplir las reglas de la tabla). */
  deliveryValues: Record<DeliveryMode, string>;
}

const MAX_LINES = 50;

type Fail = Extract<OrderResponseBody, { ok: false }>;
const fail = (error: string, message: string): Fail => ({
  ok: false,
  error,
  message,
});

/** Revisa la forma del cuerpo recibido. Devuelve el pedido limpio o un error. */
export function parseOrderBody(body: unknown, maxQuantity: number): { ok: true; order: OrderRequestBody } | Fail {
  const b = body as Partial<OrderRequestBody> | null;
  if (!b || typeof b !== 'object') return fail('invalid_request', 'Formato de pedido no válido.');
  if (typeof b.checkoutId !== 'string' || !UUID.test(b.checkoutId)) return fail('invalid_request', 'Falta el identificador del pedido.');

  const c = b.customer as Record<string, unknown> | undefined;
  const str = (k: string) => (typeof c?.[k] === 'string' ? (c[k] as string).trim() : '');
  const delivery = c?.delivery === 'recoger' ? 'recoger' : c?.delivery === 'envio' ? 'envio' : null;
  if (!delivery) return fail('invalid_request', 'Modalidad de entrega no válida.');
  const customer = {
    name: str('name'),
    phone: str('phone'),
    delivery,
    department: str('department'),
    municipality: str('municipality'),
    address: str('address'),
    reference: str('reference'),
  } as const;
  const errors = validateCustomer(customer);
  const firstError = Object.values(errors)[0];
  if (firstError) return fail('invalid_customer', firstError);

  if (!Array.isArray(b.lines) || !b.lines.length) return fail('empty_cart', 'Tu carrito está vacío.');
  if (b.lines.length > MAX_LINES) return fail('invalid_request', 'El pedido tiene demasiados artículos.');
  const lines = [];
  for (const l of b.lines as unknown[]) {
    const line = l as Record<string, unknown>;
    const productId = typeof line?.productId === 'string' ? line.productId : '';
    const color = typeof line?.color === 'string' ? line.color.trim() : '';
    const size = line?.size === null ? null : typeof line?.size === 'string' ? line.size.trim() : undefined;
    const quantity = Number(line?.quantity);
    if (!productId || productId.length > 64 || !color || color.length > 80 || size === undefined || (size && size.length > 30))
      return fail('invalid_request', 'Hay un artículo no válido en el carrito.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity)
      return fail('invalid_request', `La cantidad por artículo debe estar entre 1 y ${maxQuantity}.`);
    lines.push({ productId, color, size, quantity });
  }
  return { ok: true, order: { checkoutId: b.checkoutId, customer, lines } };
}

interface DbVariant {
  id: string;
  producto_id: string;
  precio: number | string | null;
  talla: { nombre: string; codigo: string | null } | null;
  color: { nombre: string } | null;
  producto: {
    nombre: string;
    estado: string;
    genero: string | null;
    categoria: { nombre: string; slug: string | null } | null;
    subcategoria: { nombre: string; slug: string | null } | null;
  } | null;
}

export async function createOrder(order: OrderRequestBody, cfg: OrdersConfig, fetchImpl: typeof fetch = fetch): Promise<OrderResponseBody> {
  const base = cfg.url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const headers = {
    apikey: cfg.secretKey,
    Authorization: `Bearer ${cfg.secretKey}`,
    'Content-Type': 'application/json',
  };
  const api = (path: string, init: RequestInit = {}) =>
    fetchImpl(`${base}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string>) },
      signal: AbortSignal.timeout(15_000),
    });

  // 1. ¿Ya se registró este mismo pedido (doble clic o reintento)?
  const existing = await api(`pedidos_carrito?select=numero_pedido,total&checkout_id=eq.${order.checkoutId}&limit=1`);
  if (!existing.ok) throw new Error(`Supabase ${existing.status}: ${(await existing.text()).slice(0, 300)}`);
  const [prev] = (await existing.json()) as {
    numero_pedido: number;
    total: number | string;
  }[];
  if (prev)
    return {
      ok: true,
      orderNumber: prev.numero_pedido,
      total: Number(prev.total),
    };

  // 2. Precios y datos reales de las variantes.
  const ids = [...new Set(order.lines.map((l) => l.productId))];
  if (ids.some((id) => !UUID.test(id)))
    return fail('unavailable', 'Algún producto de tu carrito ya no está disponible. Actualiza la página.');
  const res = await api(
    `variantes?select=id,producto_id,precio,talla:tallas(nombre,codigo),color:colores(nombre),producto:productos(nombre,estado,genero,categoria:categorias(nombre,slug),subcategoria:subcategorias(nombre,slug))&producto_id=in.(${ids.join(',')})`,
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const variants = (await res.json()) as DbVariant[];

  const found: { line: (typeof order.lines)[number]; v: DbVariant & { producto: NonNullable<DbVariant['producto']> }; price: number }[] = [];
  for (const line of order.lines) {
    const v = variants.find((x) => {
      if (x.producto_id !== line.productId || x.producto?.estado !== 'activo') return false;
      const colorOk = (x.color?.nombre.trim() ?? 'Único') === line.color;
      const label = sizeLabel(x.talla);
      const sizeOk = line.size === null ? isUniqueSize(label) : label === line.size;
      return colorOk && sizeOk;
    });
    const regularPrice = Number(v?.precio);
    if (!v || !v.producto || !Number.isFinite(regularPrice) || regularPrice <= 0)
      return fail(
        'unavailable',
        `"${v?.producto?.nombre ?? 'Un producto'}" en color ${line.color}${line.size ? ` talla ${line.size}` : ''} ya no está disponible. Quítalo del carrito para continuar.`,
      );
    found.push({ line, v: v as DbVariant & { producto: NonNullable<DbVariant['producto']> }, price: regularPrice });
  }

  // Promociones sobre todo el carrito, igual que en la tienda. Con descuentos por cantidad,
  // precio_unitario es el promedio por unidad del artículo.
  const items: CartPricingItem[] = found.map(({ line, v, price }, i) => ({
    key: String(i),
    productId: line.productId,
    name: v.producto.nombre.trim(),
    category: toCategory(v.producto),
    unitPrice: price,
    quantity: line.quantity,
  }));
  const { lines: priced } = priceCart(items);
  const details = found.map(({ line, v }, i) => ({
    variante_id: v.id,
    nombre_producto: v.producto.nombre.trim(),
    talla: line.size ?? 'Única',
    color: line.color,
    cantidad: line.quantity,
    precio_unitario: priced[i].unitPrice,
    // subtotal_linea es una columna calculada en la tabla: no se envía.
  }));
  const subtotal = Math.round(details.reduce((s, d) => s + d.precio_unitario * d.cantidad, 0) * 100) / 100;

  // 3. Encabezado del pedido.
  const c = order.customer;
  const envio = c.delivery === 'envio';
  const insert = await api('pedidos_carrito?select=id,numero_pedido,total', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      usuario_id: cfg.usuarioId,
      checkout_id: order.checkoutId,
      nombre_cliente: c.name,
      telefono_cliente: c.phone,
      metodo_entrega: cfg.deliveryValues[c.delivery],
      departamento: envio ? c.department : null,
      municipio: envio ? c.municipality : null,
      direccion: envio ? c.address : null,
      referencia_direccion: envio && c.reference ? c.reference : null,
      subtotal,
    }),
  });
  if (!insert.ok) throw new Error(`No se pudo crear el pedido (Supabase ${insert.status}): ${(await insert.text()).slice(0, 400)}`);
  const [pedido] = (await insert.json()) as {
    id: string;
    numero_pedido: number;
    total: number | string | null;
  }[];

  // 4. Artículos. Si fallan, se borra el encabezado para no dejar un pedido vacío.
  const lines = await api('pedidos_carrito_detalles', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(details.map((d) => ({ ...d, pedido_id: pedido.id }))),
  });
  if (!lines.ok) {
    const reason = (await lines.text()).slice(0, 400);
    await api(`pedidos_carrito?id=eq.${pedido.id}`, { method: 'DELETE' }).catch(() => undefined);
    throw new Error(`No se pudieron guardar los artículos (Supabase ${lines.status}): ${reason}`);
  }

  return {
    ok: true,
    orderNumber: pedido.numero_pedido,
    total: Number(pedido.total ?? subtotal),
  };
}

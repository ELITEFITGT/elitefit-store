/**
 * Endpoint POST /api/pedidos: registra el pedido del carrito en Supabase.
 * Se monta en `npm run dev` / `npm run preview` (vite.config.ts) y en Vercel (api/pedidos.ts).
 */
import type { ServerResponse } from 'node:http';
import { storeConfig } from '../src/config/store.js';
import type { OrderResponseBody } from '../src/lib/order.js';
import { clientIp, originAllowed, readJson, send } from './http.js';
import type { NodeRequest } from './http.js';
import { createOrder, parseOrderBody } from './orders.js';
import type { OrdersConfig } from './orders.js';
import { createRateLimiter } from './rateLimit.js';

interface Deps {
  env?: NodeJS.ProcessEnv;
  /** Permite sustituir Supabase en pruebas. */
  fetchImpl?: typeof fetch;
}

export function createOrderHandler(deps: Deps = {}) {
  const env = deps.env ?? process.env;
  const limiter = createRateLimiter({ perMinute: 5, perDay: 40 });
  const allowedOrigins = (env.CHAT_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return async function handleOrder(req: NodeRequest, res: ServerResponse) {
    const reply = (status: number, body: OrderResponseBody, headers?: Record<string, string>) => send(res, status, body, headers);
    if (req.method !== 'POST') return reply(405, { ok: false, error: 'invalid_request', message: 'Método no permitido.' }, { Allow: 'POST' });
    if (!originAllowed(req, allowedOrigins)) return reply(403, { ok: false, error: 'forbidden', message: 'Origen no permitido.' });

    const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const secretKey = env.SUPABASE_SECRET_KEY;
    // pedidos_carrito.usuario_id debe ser un usuario de Supabase Auth: los pedidos web quedan a nombre de este usuario.
    const usuarioId = env.ORDER_USUARIO_ID?.trim();
    if (!url || !secretKey || !usuarioId) {
      console.error('[pedidos] Falta configurar', [!url && 'VITE_SUPABASE_URL', !secretKey && 'SUPABASE_SECRET_KEY', !usuarioId && 'ORDER_USUARIO_ID'].filter(Boolean).join(', '));
      return reply(503, { ok: false, error: 'not_configured', message: 'Los pedidos en línea todavía no están configurados.' });
    }

    const rate = limiter(clientIp(req));
    if (!rate.allowed)
      return reply(
        429,
        { ok: false, error: 'rate_limited', message: 'Enviaste varios pedidos seguidos. Espera un momento e intenta de nuevo.' },
        { 'Retry-After': String(rate.retryAfterSeconds) },
      );

    let body: unknown;
    try {
      body = await readJson(req, 50_000);
    } catch {
      return reply(400, { ok: false, error: 'invalid_request', message: 'Formato de pedido no válido.' });
    }
    const parsed = parseOrderBody(body, storeConfig.maxQuantityPerItem);
    if (!parsed.ok) return reply(400, parsed);

    const cfg: OrdersConfig = {
      url,
      secretKey,
      usuarioId,
      maxQuantityPerItem: storeConfig.maxQuantityPerItem,
      deliveryValues: {
        envio: env.ORDER_DELIVERY_ENVIO?.trim() || 'envio_domicilio',
        recoger: env.ORDER_DELIVERY_RECOGER?.trim() || 'retiro_tienda',
      },
    };
    try {
      const result = await createOrder(parsed.order, cfg, deps.fetchImpl);
      return reply(result.ok ? 201 : 409, result);
    } catch (error) {
      // El detalle técnico queda en el registro del servidor; al cliente, un mensaje claro.
      console.error('[pedidos]', (error as Error).message);
      return reply(502, {
        ok: false,
        error: 'save_failed',
        message: 'No pudimos registrar tu pedido. Intenta de nuevo en unos minutos.',
      });
    }
  };
}

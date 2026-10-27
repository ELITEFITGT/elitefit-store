import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ChatResponseBody, ChatStatusBody } from '../src/chat/protocol.js';
import { createAnthropicCaller } from './anthropic.js';
import type { ModelCaller } from './anthropic.js';
import { getServerConfig } from './config.js';
import type { ServerConfig } from './config.js';
import { createRateLimiter } from './rateLimit.js';
import { validateConversation } from './validate.js';

interface HandlerDeps {
  config?: ServerConfig;
  /** Permite sustituir el proveedor en pruebas. */
  callModel?: ModelCaller;
  rateLimiter?: ReturnType<typeof createRateLimiter>;
}

type NodeRequest = IncomingMessage & { body?: unknown };

const send = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
};

const header = (req: IncomingMessage, name: string) => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

function clientIp(req: IncomingMessage) {
  return header(req, 'x-forwarded-for')?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'desconocida';
}

/** Solo acepta solicitudes desde la propia tienda (o los orígenes configurados). */
function originAllowed(req: IncomingMessage, config: ServerConfig) {
  const origin = header(req, 'origin');
  if (!origin) return true; // Solicitudes del mismo origen sin cabecera Origin (navegadores antiguos o herramientas).
  if (config.allowedOrigins.length) return config.allowedOrigins.includes(origin);
  try {
    const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readJson(req: NodeRequest, maxBytes: number): Promise<unknown> {
  // Algunas plataformas (Vercel) ya entregan el cuerpo interpretado.
  if (req.body !== undefined) {
    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(parsed).length > maxBytes) throw new RangeError('too_large');
    return parsed;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) throw new RangeError('too_large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createChatHandler(deps: HandlerDeps = {}) {
  const config = deps.config ?? getServerConfig();
  const limiter = deps.rateLimiter ?? createRateLimiter(config.rateLimit);
  let callModel = deps.callModel;

  return async function handleChat(req: NodeRequest, res: ServerResponse) {
    if (req.method === 'GET') {
      const status: ChatStatusBody = { configured: Boolean(deps.callModel || config.apiKey), provider: config.providerLabel };
      return send(res, 200, status);
    }
    if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'invalid_request', message: 'Método no permitido.' }, { Allow: 'GET, POST' });

    const reply = (status: number, body: ChatResponseBody, headers?: Record<string, string>) => send(res, status, body, headers);

    if (!originAllowed(req, config)) return reply(403, { ok: false, error: 'forbidden', message: 'Origen no permitido.' });
    if (!deps.callModel && !config.apiKey)
      return reply(503, { ok: false, error: 'not_configured', message: 'El asistente todavía no está configurado.' });

    const rate = limiter(clientIp(req));
    if (!rate.allowed)
      return reply(
        429,
        { ok: false, error: 'rate_limited', message: 'Hiciste muchas consultas seguidas. Espera un momento e intenta de nuevo.' },
        { 'Retry-After': String(rate.retryAfterSeconds) },
      );

    let body: unknown;
    try {
      body = await readJson(req, config.limits.maxBodyBytes);
    } catch (error) {
      if (error instanceof RangeError)
        return reply(413, { ok: false, error: 'conversation_too_long', message: 'La conversación es demasiado larga. Inicia una nueva.' });
      return reply(400, { ok: false, error: 'invalid_request', message: 'Formato de solicitud no válido.' });
    }

    const validation = validateConversation(body, config.limits);
    if (!validation.ok) {
      const status = validation.error === 'conversation_too_long' ? 413 : 400;
      return reply(status, { ok: false, error: validation.error, message: validation.message });
    }

    callModel ??= createAnthropicCaller(config);
    const result = await callModel(validation.messages);
    if (result.ok) return reply(200, result);
    const status = { not_configured: 503, refusal: 200, incomplete: 502, provider_error: 502 }[result.error as string] ?? 400;
    return reply(status, result);
  };
}

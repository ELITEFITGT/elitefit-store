/** Utilidades HTTP compartidas por los endpoints del servidor (/api/chat y /api/pedidos). */
import type { IncomingMessage, ServerResponse } from 'node:http';

export type NodeRequest = IncomingMessage & { body?: unknown };

export const send = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
};

export const header = (req: IncomingMessage, name: string) => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

export function clientIp(req: IncomingMessage) {
  return header(req, 'x-forwarded-for')?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'desconocida';
}

/** Solo acepta solicitudes desde la propia tienda (o los orígenes configurados). */
export function originAllowed(req: IncomingMessage, allowedOrigins: string[]) {
  const origin = header(req, 'origin');
  if (!origin) return true; // Solicitudes del mismo origen sin cabecera Origin (navegadores antiguos o herramientas).
  if (allowedOrigins.length) return allowedOrigins.includes(origin);
  try {
    const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(req: NodeRequest, maxBytes: number): Promise<unknown> {
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

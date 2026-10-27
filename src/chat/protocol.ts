/**
 * Formato de intercambio entre el navegador y el endpoint /api/chat.
 * Independiente del proveedor de IA: el servidor lo traduce al formato del proveedor.
 * Este archivo no importa nada porque también lo usa el servidor.
 */

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ApiToolResult {
  id: string;
  output: string;
  isError: boolean;
}

export type ApiMessage =
  | { role: 'user'; text: string }
  /** `content` es el contenido original del proveedor: se reenvía sin cambios. */
  | { role: 'assistant'; content: unknown[] }
  | { role: 'tool'; results: ApiToolResult[] };

export interface ChatRequestBody {
  messages: ApiMessage[];
}

export type ChatErrorCode =
  | 'not_configured'
  | 'rate_limited'
  | 'forbidden'
  | 'invalid_request'
  | 'conversation_too_long'
  | 'too_many_tool_calls'
  | 'refusal'
  | 'incomplete'
  | 'provider_error';

export type ChatResponseBody =
  | { ok: true; content: unknown[]; text: string; toolCalls: ToolCall[] }
  | { ok: false; error: ChatErrorCode; message: string };

export interface ChatStatusBody {
  configured: boolean;
  provider: string;
}

export const CHAT_ENDPOINT = '/api/chat';

import Anthropic from '@anthropic-ai/sdk';
import type { ApiMessage, ChatResponseBody, ToolCall } from '../src/chat/protocol.js';
import { toolDefinitions } from '../src/chat/toolDefinitions.js';
import type { ServerConfig } from './config.js';
import { SYSTEM_PROMPT } from './prompt.js';

/** Traduce la conversación neutral al formato de mensajes de Anthropic. */
function toAnthropicMessages(messages: ApiMessage[]): Anthropic.Beta.BetaMessageParam[] {
  return messages.map((m): Anthropic.Beta.BetaMessageParam => {
    if (m.role === 'user') return { role: 'user', content: m.text };
    if (m.role === 'assistant') {
      // El contenido del asistente (incluidos los bloques de razonamiento) se reenvía tal cual.
      return { role: 'assistant', content: m.content as Anthropic.Beta.BetaContentBlockParam[] };
    }
    return {
      role: 'user',
      content: m.results.map((r) => ({ type: 'tool_result' as const, tool_use_id: r.id, content: r.output, is_error: r.isError })),
    };
  });
}

const tools = toolDefinitions as unknown as Anthropic.Beta.BetaTool[];

export type ModelCaller = (messages: ApiMessage[]) => Promise<ChatResponseBody>;

/** `clientOptions` permite inyectar, por ejemplo, un `fetch` simulado en las pruebas. */
export function createAnthropicCaller(config: ServerConfig, clientOptions: ConstructorParameters<typeof Anthropic>[0] = {}): ModelCaller {
  const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 1, timeout: config.timeoutMs, ...clientOptions });

  return async (messages) => {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages.create({
        model: config.model,
        max_tokens: config.maxOutputTokens,
        system: SYSTEM_PROMPT,
        tools,
        messages: toAnthropicMessages(messages),
        output_config: { effort: config.effort },
        cache_control: { type: 'ephemeral' },
        ...(config.serverFallbacks ? { fallbacks: 'default' as const, betas: ['server-side-fallback-2026-07-01'] } : {}),
      });
    } catch (error) {
      // Solo se registra el tipo de error, nunca el contenido de la conversación.
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        console.error('[chat] El proveedor rechazó la credencial (revisa ANTHROPIC_API_KEY).');
        return { ok: false, error: 'not_configured', message: 'El asistente no está disponible por un problema de configuración.' };
      }
      if (error instanceof Anthropic.RateLimitError) {
        console.error('[chat] Límite del proveedor alcanzado.');
        return { ok: false, error: 'provider_error', message: 'El asistente está recibiendo muchas consultas. Intenta de nuevo en un momento.' };
      }
      if (error instanceof Anthropic.BadRequestError) {
        console.error(`[chat] Solicitud rechazada por el proveedor (${error.status}).`);
        return { ok: false, error: 'invalid_request', message: 'No pude procesar esta conversación. Inicia una nueva.' };
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`[chat] Error del proveedor (${error.status ?? 'sin estado'}).`);
      } else {
        console.error('[chat] Error de conexión con el proveedor.');
      }
      return { ok: false, error: 'provider_error', message: 'No pude conectar con el asistente. Intenta de nuevo.' };
    }

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'refusal', message: 'No puedo ayudarte con esa solicitud. Puedo ayudarte con productos, tallas y tu pedido.' };
    }

    const toolCalls: ToolCall[] = [];
    const texts: string[] = [];
    for (const block of response.content) {
      if (block.type === 'text') texts.push(block.text);
      if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, input: block.input });
    }

    // Con la respuesta cortada, los argumentos de una herramienta pueden estar incompletos: no se ejecutan.
    if (response.stop_reason === 'max_tokens' && toolCalls.length) {
      return { ok: false, error: 'incomplete', message: 'La respuesta quedó incompleta. Intenta de nuevo.' };
    }
    if (!toolCalls.length && !texts.join('').trim()) {
      return { ok: false, error: 'incomplete', message: 'No recibí una respuesta. Intenta de nuevo.' };
    }

    return { ok: true, content: response.content as unknown[], text: texts.join('\n\n').trim(), toolCalls };
  };
}

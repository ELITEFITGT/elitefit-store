import type { ApiMessage, ChatErrorCode } from '../src/chat/protocol.js';
import { isToolName } from '../src/chat/toolDefinitions.js';
import type { ServerConfig } from './config.js';

type Result = { ok: true; messages: ApiMessage[] } | { ok: false; error: ChatErrorCode; message: string };

const ASSISTANT_BLOCK_TYPES = new Set(['text', 'thinking', 'redacted_thinking', 'tool_use', 'fallback']);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (error: ChatErrorCode, message: string): Result => ({ ok: false, error, message });

/**
 * Valida la conversación recibida del navegador. Todo lo que llega se trata como dato
 * no confiable: se revisa forma, tamaños, nombres de herramientas y que cada resultado
 * corresponda a una llamada previa del asistente.
 */
export function validateConversation(body: unknown, limits: ServerConfig['limits']): Result {
  if (!isObject(body) || !Array.isArray(body.messages)) return fail('invalid_request', 'Formato de solicitud no válido.');
  const raw = body.messages;
  if (raw.length === 0) return fail('invalid_request', 'La conversación está vacía.');
  if (raw.length > limits.maxMessages)
    return fail('conversation_too_long', 'La conversación es demasiado larga. Inicia una nueva.');

  const messages: ApiMessage[] = [];
  let pendingToolIds: string[] = [];
  let roundsSinceUser = 0;

  for (const [i, m] of raw.entries()) {
    if (!isObject(m)) return fail('invalid_request', `Mensaje ${i} no válido.`);

    if (m.role === 'user') {
      if (pendingToolIds.length) return fail('invalid_request', 'Faltan resultados de herramientas.');
      if (typeof m.text !== 'string' || !m.text.trim()) return fail('invalid_request', 'Mensaje vacío.');
      if (m.text.length > limits.maxUserChars) return fail('invalid_request', 'El mensaje es demasiado largo.');
      messages.push({ role: 'user', text: m.text });
      roundsSinceUser = 0;
    } else if (m.role === 'assistant') {
      if (pendingToolIds.length) return fail('invalid_request', 'Faltan resultados de herramientas.');
      if (!Array.isArray(m.content) || m.content.length === 0 || m.content.length > 40)
        return fail('invalid_request', 'Respuesta del asistente no válida.');
      for (const block of m.content) {
        if (!isObject(block) || typeof block.type !== 'string' || !ASSISTANT_BLOCK_TYPES.has(block.type))
          return fail('invalid_request', 'Bloque de contenido no permitido.');
        if (block.type === 'tool_use') {
          if (typeof block.id !== 'string' || !isToolName(block.name) || !isObject(block.input))
            return fail('invalid_request', 'Llamada a herramienta no permitida.');
          pendingToolIds.push(block.id);
        }
      }
      if (pendingToolIds.length > limits.maxToolCallsPerRound) return fail('too_many_tool_calls', 'Demasiadas acciones en una respuesta.');
      messages.push({ role: 'assistant', content: m.content });
    } else if (m.role === 'tool') {
      if (!Array.isArray(m.results) || m.results.length === 0) return fail('invalid_request', 'Resultados no válidos.');
      const ids = new Set<string>();
      for (const r of m.results) {
        if (!isObject(r) || typeof r.id !== 'string' || typeof r.output !== 'string' || typeof r.isError !== 'boolean')
          return fail('invalid_request', 'Resultado de herramienta no válido.');
        if (r.output.length > limits.maxToolResultChars) return fail('invalid_request', 'Resultado de herramienta demasiado grande.');
        ids.add(r.id);
      }
      // Cada resultado debe responder exactamente a las llamadas del mensaje anterior.
      if (ids.size !== pendingToolIds.length || !pendingToolIds.every((id) => ids.has(id)))
        return fail('invalid_request', 'Los resultados no corresponden a las herramientas solicitadas.');
      messages.push({
        role: 'tool',
        results: (m.results as Record<string, unknown>[]).map((r) => ({ id: r.id as string, output: r.output as string, isError: r.isError as boolean })),
      });
      pendingToolIds = [];
      roundsSinceUser += 1;
      if (roundsSinceUser > limits.maxToolRoundsPerTurn)
        return fail('too_many_tool_calls', 'Se alcanzó el límite de acciones para este mensaje.');
    } else {
      return fail('invalid_request', `Rol no permitido en el mensaje ${i}.`);
    }
  }

  if (messages[0].role !== 'user') return fail('invalid_request', 'La conversación debe empezar con un mensaje del cliente.');
  const last = messages[messages.length - 1];
  if (last.role === 'assistant') return fail('invalid_request', 'No hay nada que responder.');
  return { ok: true, messages };
}

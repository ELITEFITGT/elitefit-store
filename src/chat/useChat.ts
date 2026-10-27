import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartPort } from '../context/CartContext';
import { createToolController } from './controller';
import type { ToolExecution, UiArtifact } from './controller';
import { CHAT_ENDPOINT } from './protocol';
import type { ApiMessage, ApiToolResult, ChatErrorCode, ChatResponseBody, ChatStatusBody, ToolCall } from './protocol';

export type ChatEntry =
  | { id: string; role: 'user'; text: string; notice?: boolean }
  | { id: string; role: 'assistant'; content: unknown[]; text: string; toolCalls: ToolCall[] }
  | { id: string; role: 'tool'; results: (ApiToolResult & { name: string; ui?: UiArtifact })[] };

export type Availability = 'checking' | 'ready' | 'not_configured' | 'unavailable';

export interface ChatError {
  code: ChatErrorCode | 'network' | 'unavailable';
  message: string;
  retryable: boolean;
}

export const MAX_INPUT_CHARS = 1000;
/** Límite de mensajes guardados; el historial no se recorta (el modelo exige historial íntegro). */
const MAX_ENTRIES = 80;
/** Rondas de herramientas que el navegador ejecuta por mensaje; el servidor permite algunas más. */
const MAX_TOOL_ROUNDS = 6;
const REQUEST_TIMEOUT_MS = 60_000;
const STORAGE_KEY = 'elitefit-chat-v1';
export const NOTICE_PREFIX = '[Aviso de la tienda] ';

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

interface Persisted {
  entries: ChatEntry[];
  turn: number;
}

function loadSession(): Persisted {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Persisted;
      if (Array.isArray(data.entries) && typeof data.turn === 'number') return data;
    }
  } catch {
    // Sesión dañada o almacenamiento bloqueado: se empieza de cero.
  }
  return { entries: [], turn: 0 };
}

/** Convierte las entradas del chat al formato del endpoint (sin datos solo visuales). */
function toApiMessages(entries: ChatEntry[]): ApiMessage[] {
  return entries.map((e): ApiMessage => {
    if (e.role === 'user') return { role: 'user', text: e.text };
    if (e.role === 'assistant') return { role: 'assistant', content: e.content };
    return { role: 'tool', results: e.results.map(({ id, output, isError }) => ({ id, output, isError })) };
  });
}

const RETRYABLE = new Set<ChatError['code']>(['network', 'provider_error', 'rate_limited', 'incomplete', 'unavailable']);

async function postChat(messages: ApiMessage[], signal: AbortSignal): Promise<ChatResponseBody | { ok: false; error: 'network' | 'unavailable'; message: string }> {
  let res: Response;
  try {
    res = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch {
    return { ok: false, error: 'network', message: 'No hay conexión con el asistente. Revisa tu internet e intenta de nuevo.' };
  }
  try {
    return (await res.json()) as ChatResponseBody;
  } catch {
    return { ok: false, error: 'unavailable', message: 'El asistente no está disponible en este momento.' };
  }
}

export function useChat(port: CartPort) {
  const controller = useMemo(() => createToolController(port), [port]);
  const initial = useMemo(loadSession, []);
  const [entries, setEntriesState] = useState<ChatEntry[]>(initial.entries);
  const entriesRef = useRef(initial.entries);
  const turnRef = useRef(initial.turn);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<ChatError | null>(null);
  const [availability, setAvailability] = useState<Availability>('checking');
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const setEntries = useCallback((next: ChatEntry[]) => {
    entriesRef.current = next;
    setEntriesState(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: next, turn: turnRef.current }));
    } catch {
      // Sin almacenamiento de sesión: la conversación vive solo en memoria.
    }
  }, []);
  const append = useCallback((entry: ChatEntry) => setEntries([...entriesRef.current, entry]), [setEntries]);

  const checkStatus = useCallback(async () => {
    setAvailability('checking');
    try {
      const res = await fetch(CHAT_ENDPOINT, { method: 'GET' });
      const data = (await res.json()) as ChatStatusBody;
      setAvailability(data.configured ? 'ready' : 'not_configured');
      return data;
    } catch {
      setAvailability('unavailable');
      return null;
    }
  }, []);

  /** Ciclo: pide respuesta, ejecuta las herramientas solicitadas y devuelve sus resultados reales. */
  const run = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const gen = generation.current;
    const turn = turnRef.current;

    try {
      for (let round = 0; ; round++) {
        const abort = new AbortController();
        abortRef.current = abort;
        const timer = window.setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
        const res = await postChat(toApiMessages(entriesRef.current), abort.signal);
        window.clearTimeout(timer);
        if (gen !== generation.current) return; // Se inició una conversación nueva mientras tanto.

        if (!res.ok) {
          if (res.error === 'not_configured') setAvailability('not_configured');
          let draft: string | undefined;
          if (res.error === 'refusal') {
            // Se retira el último mensaje sin respuesta para no repetir el rechazo.
            const last = entriesRef.current[entriesRef.current.length - 1];
            if (last?.role === 'user' && !last.notice) {
              draft = last.text;
              setEntries(entriesRef.current.slice(0, -1));
            }
          }
          setError({ code: res.error, message: res.message, retryable: RETRYABLE.has(res.error) });
          return draft;
        }

        append({ id: newId(), role: 'assistant', content: res.content, text: res.text, toolCalls: res.toolCalls });
        if (!res.toolCalls.length) return;

        // Cada llamada se ejecuta una sola vez y su resultado se guarda en el mismo paso; un reintento
        // reenvía el historial ya guardado y no repite acciones. Las llamadas idénticas dentro del mismo
        // mensaje del cliente las bloquea el controlador.
        const results = res.toolCalls.map((call) => {
          const exec: ToolExecution =
            round >= MAX_TOOL_ROUNDS
              ? { output: { error: 'turn_limit', message: 'Límite de acciones alcanzado. Responde al cliente con la información que ya tienes.' }, isError: true }
              : controller.execute(call, turn);
          return { id: call.id, name: call.name, output: JSON.stringify(exec.output), isError: exec.isError, ui: exec.ui };
        });
        append({ id: newId(), role: 'tool', results });
      }
    } finally {
      if (gen === generation.current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [append, controller, setEntries]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim().slice(0, MAX_INPUT_CHARS);
      if (!clean || busyRef.current) return;
      if (entriesRef.current.length >= MAX_ENTRIES) {
        setError({ code: 'conversation_too_long', message: 'La conversación es muy larga. Inicia una nueva para continuar.', retryable: false });
        return;
      }
      turnRef.current += 1;
      append({ id: newId(), role: 'user', text: clean });
      return run();
    },
    [append, run],
  );

  const retry = useCallback(() => run(), [run]);

  const reset = useCallback(() => {
    generation.current += 1;
    abortRef.current?.abort();
    busyRef.current = false;
    setBusy(false);
    setError(null);
    turnRef.current = 0;
    setEntries([]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que borrar.
    }
  }, [setEntries]);

  /** Respuesta del cliente al botón de confirmar o cancelar una eliminación múltiple. */
  const resolveRemoval = useCallback(
    (entryId: string, resultId: string, accept: boolean) => {
      if (busyRef.current) return;
      let ids: string[] | null = null;
      const next = entriesRef.current.map((e) => {
        if (e.id !== entryId || e.role !== 'tool') return e;
        return {
          ...e,
          results: e.results.map((r) => {
            if (r.id !== resultId || r.ui?.kind !== 'confirmRemoval' || r.ui.status !== 'pending') return r;
            ids = r.ui.itemIds;
            return { ...r, ui: { ...r.ui, status: accept ? ('done' as const) : ('cancelled' as const) } };
          }),
        };
      });
      if (!ids) return;
      setEntries(next);
      const note = accept
        ? (() => {
            const removed = controller.confirmRemoval(ids);
            return removed.length
              ? `El cliente confirmó en pantalla y se eliminaron del carrito: ${removed.join('; ')}.`
              : 'El cliente confirmó, pero esos artículos ya no estaban en el carrito.';
          })()
        : 'El cliente canceló la eliminación en pantalla. El carrito no cambió.';
      append({ id: newId(), role: 'user', text: NOTICE_PREFIX + note, notice: true });
    },
    [append, controller, setEntries],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { entries, busy, error, availability, checkStatus, send, retry, reset, resolveRemoval, dismissError: () => setError(null) };
}

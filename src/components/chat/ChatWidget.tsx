import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronUp, MessageCircle, Minus, RotateCcw, SendHorizontal, X } from 'lucide-react';
import { storeConfig } from '../../config/store';
import { useCart } from '../../context/CartContext';
import { GREETING, answer } from '../../chat/assistant';
import type { Reply, ReplyAction } from '../../chat/assistant';
import monogram from '../../assets/brand/monograma-ink.png';
import { OrderCard, ProductMiniCards } from './ChatCards';
import { RichText } from './RichText';

export const MAX_INPUT_CHARS = 300;
const STORAGE_KEY = 'elitefit-asistente-v2';
/** Pausa breve antes de responder, para que la conversación se lea con naturalidad. */
const TYPING_MS = 450;

type Entry = { id: string; from: 'user'; text: string } | { id: string; from: 'bot'; reply: Reply };

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches;

function loadEntries(): Entry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as Entry[]) : null;
    if (Array.isArray(data)) return data;
  } catch {
    // Almacenamiento bloqueado o dañado: se empieza de cero.
  }
  return [];
}

type Mode = 'closed' | 'open' | 'minimized';

export function ChatWidget() {
  const cart = useCart();
  const [mode, setMode] = useState<Mode>('closed');
  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const panelId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-60)));
    } catch {
      // Sin almacenamiento: la conversación vive solo mientras la página está abierta.
    }
  }, [entries]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (mode === 'open' && !isSmallScreen()) requestAnimationFrame(() => inputRef.current?.focus());
  }, [mode]);

  // Mantiene visible el último mensaje.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, typing, mode]);

  // Ajusta la altura del campo de texto al contenido (hasta 4 líneas).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const close = (next: Mode) => {
    setMode(next);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };
  // En celular el chat ocupa la pantalla: se minimiza al ir a un producto o al formulario del pedido.
  const collapseOnSmall = () => isSmallScreen() && setMode('minimized');

  const send = (text: string) => {
    const clean = text.trim().slice(0, MAX_INPUT_CHARS);
    if (!clean || typing) return;
    setInput('');
    setEntries((e) => [...e, { id: newId(), from: 'user', text: clean }]);
    setTyping(true);
    timer.current = window.setTimeout(() => {
      const reply = answer(clean, { lines: cart.lines, units: cart.units, total: cart.total });
      setEntries((e) => [...e, { id: newId(), from: 'bot', reply }]);
      setTyping(false);
    }, TYPING_MS);
  };

  const reset = () => {
    window.clearTimeout(timer.current);
    setTyping(false);
    setEntries([]);
    setInput('');
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  if (mode !== 'open') {
    return (
      <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
        {mode === 'minimized' ? (
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setMode('open')}
            aria-controls={panelId}
            aria-expanded="false"
            className="flex items-center gap-3 rounded-full bg-ink py-2 pl-2 pr-4 text-canvas shadow-2xl shadow-ink/30 transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-left text-sm leading-tight">
              <span className="block font-semibold">Asistente {storeConfig.name}</span>
              <span className="block text-xs text-canvas/70">Continuar conversación</span>
            </span>
            <ChevronUp className="h-4 w-4 text-canvas/70" aria-hidden="true" />
          </button>
        ) : (
          <button
            ref={launcherRef}
            type="button"
            onClick={() => setMode('open')}
            aria-controls={panelId}
            aria-expanded="false"
            aria-label="Abrir asistente de la tienda"
            className="group flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-ink text-canvas shadow-2xl shadow-ink/30 transition-transform motion-safe:hover:-translate-y-0.5 sm:w-auto sm:pl-4 sm:pr-5"
          >
            <span className="relative">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-ink" aria-hidden="true" />
            </span>
            <span className="hidden text-sm font-semibold sm:inline" aria-hidden="true">
              ¿Te ayudamos?
            </span>
          </button>
        )}
      </div>
    );
  }

  const lastBotIndex = entries.map((e) => e.from).lastIndexOf('bot');

  return (
    <section
      id={panelId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close('minimized');
        }
      }}
      className="fixed inset-0 z-[45] flex flex-col bg-canvas motion-safe:animate-scale-in sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-7rem))] sm:w-[390px] sm:overflow-hidden sm:rounded-lg sm:border sm:border-line sm:shadow-2xl sm:shadow-ink/20"
    >
      <header className="flex items-center gap-3 bg-ink px-4 py-3 text-canvas">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas">
          <img src={monogram} alt="" width={21} height={22} className="h-[22px] w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-[15px] font-bold leading-tight">
            Asistente {storeConfig.name}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-canvas/70">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            En línea
          </p>
        </div>
        <button
          type="button"
          className="icon-btn h-10 w-10 text-canvas hover:bg-canvas/10"
          onClick={reset}
          disabled={!entries.length}
          aria-label="Iniciar una conversación nueva"
          title="Nueva conversación"
        >
          <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn h-10 w-10 text-canvas hover:bg-canvas/10"
          onClick={() => close('minimized')}
          aria-label="Minimizar asistente"
          title="Minimizar"
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn -mr-1 h-10 w-10 text-canvas hover:bg-canvas/10"
          onClick={() => close('closed')}
          aria-label="Cerrar asistente"
          title="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4" role="log" aria-live="polite" aria-label="Conversación">
        <BotMessage reply={GREETING} showChips={!entries.length} disabled={typing} onChip={send} onNavigate={collapseOnSmall} />

        {entries.map((entry, i) =>
          entry.from === 'user' ? (
            <div key={entry.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg rounded-br-sm bg-ink px-4 py-2.5 text-[14px] leading-relaxed text-canvas">
                <span className="sr-only">Tú: </span>
                {entry.text}
              </p>
            </div>
          ) : (
            <BotMessage
              key={entry.id}
              reply={entry.reply}
              showChips={i === lastBotIndex && !typing}
              disabled={typing}
              onChip={send}
              onNavigate={collapseOnSmall}
            />
          ),
        )}

        {typing && (
          <div className="inline-flex items-center gap-1.5 rounded-lg rounded-bl-sm bg-surface px-4 py-3.5" role="status">
            <span className="sr-only">El asistente está escribiendo…</span>
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-2 w-2 rounded-full bg-muted/60 motion-safe:animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onFormSubmit} className="border-t border-line bg-surface p-3">
        <div className="flex items-end gap-2">
          <label htmlFor={`${panelId}-input`} className="sr-only">
            Escribe tu consulta
          </label>
          <textarea
            ref={inputRef}
            id={`${panelId}-input`}
            rows={1}
            value={input}
            maxLength={MAX_INPUT_CHARS}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Escribe tu consulta…"
            className="max-h-[120px] min-h-11 flex-1 resize-none rounded-lg border border-line bg-canvas px-4 py-2.5 text-[15px] leading-snug placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink transition-colors hover:bg-accent/85 disabled:opacity-40"
            aria-label="Enviar consulta"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">Asistente automático de la tienda · No compartas datos de pago</p>
      </form>
    </section>
  );
}

function BotMessage({
  reply,
  showChips,
  disabled,
  onChip,
  onNavigate,
}: {
  reply: Reply;
  showChips: boolean;
  disabled: boolean;
  onChip: (text: string) => void;
  onNavigate: () => void;
}) {
  return (
    <div className="min-w-0 max-w-[92%] space-y-2 motion-safe:animate-fade-in">
      <div className="break-words rounded-lg rounded-bl-sm bg-surface px-4 py-3 text-[14px] leading-relaxed">
        <span className="sr-only">Asistente: </span>
        <RichText text={reply.text} />
      </div>
      {reply.products && reply.products.length > 0 && <ProductMiniCards products={reply.products} onNavigate={onNavigate} />}
      {reply.cart && <OrderCard onContinue={onNavigate} />}
      {reply.actions && reply.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reply.actions.map((a) => (
            <ActionButton key={a.label} action={a} onNavigate={onNavigate} />
          ))}
        </div>
      )}
      {showChips && reply.chips && reply.chips.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1" aria-label="Opciones sugeridas">
          {reply.chips.map((c) => (
            <li key={c}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChip(c)}
                className="rounded-full border border-ink/15 bg-canvas px-3.5 py-2 text-left text-[13px] font-medium transition-colors hover:border-ink hover:bg-surface disabled:opacity-50"
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const actionClass =
  'inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-ink/15 bg-canvas px-3.5 text-[13px] font-semibold transition-colors hover:border-ink';

function ActionButton({ action, onNavigate }: { action: ReplyAction; onNavigate: () => void }) {
  const { openCheckout } = useCart();
  if (action.kind === 'link')
    return (
      <Link to={action.to} onClick={onNavigate} className={actionClass}>
        {action.label}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    );
  if (action.kind === 'external')
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={actionClass}>
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {action.label}
      </a>
    );
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate();
        openCheckout();
      }}
      className={`${actionClass} border-accent bg-accent text-accent-ink hover:bg-accent/90`}
    >
      {action.label}
    </button>
  );
}

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { AlertCircle, ChevronUp, MessageCircle, Minus, RotateCcw, SendHorizontal, Sparkles, X } from 'lucide-react';
import { storeConfig } from '../../config/store';
import { useCart } from '../../context/CartContext';
import { mentionedProducts } from '../../chat/controller';
import { MAX_INPUT_CHARS, NOTICE_PREFIX, useChat } from '../../chat/useChat';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import monogram from '../../assets/brand/monograma-ink.png';
import { ProductMiniCards, ToolArtifact } from './ChatCards';
import { RichText } from './RichText';

const SUGGESTIONS = ['Busco ropa para entrenar', 'Tengo un presupuesto de Q300', 'Ayúdame a armar mi pedido', '¿Qué tallas tienen?'];

const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches;

type Mode = 'closed' | 'open' | 'minimized';

export function ChatWidget() {
  const { port } = useCart();
  const chat = useChat(port);
  const [mode, setMode] = useState<Mode>('closed');
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState('un proveedor externo');
  const checked = useRef(false);
  const panelId = useId();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const whatsappUrl = buildWhatsAppUrl(storeConfig.whatsappNumber, `Hola, ${storeConfig.name}. Tengo una consulta.`);
  const disabled = chat.availability === 'not_configured' || chat.availability === 'unavailable';

  const open = () => {
    setMode('open');
    if (!checked.current) {
      checked.current = true;
      void chat.checkStatus().then((s) => s && setProvider(s.provider));
    }
  };
  const close = (next: Mode) => {
    setMode(next);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };
  // En celular el chat ocupa la pantalla: se minimiza al ir a un producto o al formulario de pedido.
  const collapseOnSmall = () => isSmallScreen() && setMode('minimized');

  useEffect(() => {
    if (mode === 'open') requestAnimationFrame(() => inputRef.current?.focus());
  }, [mode]);

  // Mantiene visible el último mensaje.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.entries, chat.busy, chat.error, mode]);

  // Ajusta la altura del campo de texto al contenido (hasta 4 líneas).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const submit = async (text: string) => {
    if (!text.trim() || chat.busy || disabled) return;
    setInput('');
    const draft = await chat.send(text);
    if (draft) setInput(draft);
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(input);
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit(input);
    }
  };

  if (mode !== 'open') {
    return (
      <div className="fixed bottom-4 right-4 z-30 sm:bottom-6 sm:right-6">
        {mode === 'minimized' ? (
          <button
            ref={launcherRef}
            type="button"
            onClick={open}
            aria-controls={panelId}
            aria-expanded="false"
            className="flex items-center gap-3 rounded-full bg-ink py-2 pl-2 pr-4 text-canvas shadow-2xl shadow-ink/30 transition-transform motion-safe:hover:-translate-y-0.5"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-ink">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-left text-sm leading-tight">
              <span className="block font-semibold">Asistente {storeConfig.name}</span>
              <span className="block text-xs text-canvas/70">{chat.busy ? 'Respondiendo…' : 'Continuar conversación'}</span>
            </span>
            <ChevronUp className="h-4 w-4 text-canvas/70" aria-hidden="true" />
          </button>
        ) : (
          <button
            ref={launcherRef}
            type="button"
            onClick={open}
            aria-controls={panelId}
            aria-expanded="false"
            aria-label="Asesor de compras"
            className="group flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-ink text-canvas shadow-2xl shadow-ink/30 transition-transform motion-safe:hover:-translate-y-0.5 sm:w-auto sm:pl-4 sm:pr-5"
          >
            <span className="relative">
              <MessageCircle className="h-6 w-6" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-ink" aria-hidden="true" />
            </span>
            <span className="hidden text-sm font-semibold sm:inline" aria-hidden="true">
              Asesor de compras
            </span>
          </button>
        )}
      </div>
    );
  }

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
      className="fixed inset-0 z-[45] flex flex-col bg-canvas motion-safe:animate-scale-in sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(680px,calc(100dvh-7rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-line sm:shadow-2xl sm:shadow-ink/20"
    >
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas">
          <img src={monogram} alt="" width={21} height={22} className="h-[22px] w-auto bg-transparent" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate text-[15px] font-bold leading-tight">
            Asesor {storeConfig.name}
          </h2>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Sparkles className="h-3 w-3 text-accent-strong" aria-hidden="true" />
            Asistente con IA
          </p>
        </div>
        <button
          type="button"
          className="icon-btn h-10 w-10"
          onClick={() => {
            chat.reset();
            setInput('');
            inputRef.current?.focus();
          }}
          disabled={!chat.entries.length && !chat.error}
          aria-label="Iniciar una conversación nueva"
          title="Nueva conversación"
        >
          <RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn h-10 w-10" onClick={() => close('minimized')} aria-label="Minimizar asistente" title="Minimizar">
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn -mr-1 h-10 w-10" onClick={() => close('closed')} aria-label="Cerrar asistente" title="Cerrar">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" role="log" aria-live="polite" aria-label="Conversación">
        <p className="rounded-xl bg-surface px-3 py-2 text-[11px] leading-relaxed text-muted">
          Las respuestas las genera una IA y las consultas se procesan con {provider}. No compartas datos personales ni de pago:
          tus datos de entrega se completan en el formulario del pedido.
        </p>

        <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-[14px] leading-relaxed">
          ¡Hola! Soy el asesor de {storeConfig.name}. Te ayudo a encontrar ropa, elegir talla y armar tu pedido. ¿Qué estás buscando?
        </div>

        {disabled && (
          <div className="rounded-2xl border border-line bg-surface p-4 text-sm" role="status">
            <p className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-accent-strong" aria-hidden="true" />
              {chat.availability === 'not_configured' ? 'El asistente aún no está configurado' : 'El asistente no está disponible'}
            </p>
            <p className="mt-1 text-muted">
              {chat.availability === 'not_configured'
                ? 'Falta conectar el servicio de IA de la tienda. Mientras tanto puedes seguir comprando o escribirnos por WhatsApp.'
                : 'No pudimos conectar con el servicio. Tu carrito sigue guardado; puedes seguir comprando o escribirnos por WhatsApp.'}
            </p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-semibold underline underline-offset-4">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Escribir por WhatsApp
            </a>
          </div>
        )}

        {!chat.entries.length && !disabled && (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label="Sugerencias">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  disabled={chat.busy}
                  onClick={() => void submit(s)}
                  className="rounded-full border border-ink/15 bg-surface px-3.5 py-2 text-left text-[13px] font-medium transition-colors hover:border-ink disabled:opacity-50"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}

        {chat.entries.map((entry) => {
          if (entry.role === 'user') {
            if (entry.notice)
              return (
                <p key={entry.id} className="text-center text-xs text-muted">
                  {entry.text.replace(NOTICE_PREFIX, '')}
                </p>
              );
            return (
              <div key={entry.id} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-[14px] leading-relaxed text-canvas">
                  <span className="sr-only">Tú: </span>
                  {entry.text}
                </p>
              </div>
            );
          }
          if (entry.role === 'assistant') {
            if (!entry.text) return null;
            const suggested = mentionedProducts(entry.text);
            return (
              <div key={entry.id} className="max-w-[92%]">
                <div className="break-words rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-[14px] leading-relaxed">
                  <span className="sr-only">Asesor: </span>
                  <RichText text={entry.text} />
                </div>
                {suggested.length > 0 && <ProductMiniCards products={suggested} onNavigate={collapseOnSmall} />}
              </div>
            );
          }
          const visible = entry.results.filter((r) => r.ui);
          if (!visible.length) return null;
          return (
            <div key={entry.id} className="max-w-[92%] space-y-2">
              {visible.map((r) => (
                <ToolArtifact
                  key={r.id}
                  artifact={r.ui!}
                  busy={chat.busy}
                  onResolveRemoval={(accept) => chat.resolveRemoval(entry.id, r.id, accept)}
                  onContinueOrder={collapseOnSmall}
                />
              ))}
            </div>
          );
        })}

        {chat.busy && (
          <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-surface px-4 py-3.5" role="status">
            <span className="sr-only">El asesor está escribiendo…</span>
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

        {chat.error && (
          <div className="rounded-2xl border border-danger/30 bg-danger/5 p-3 text-sm" role="alert">
            <p className="flex items-start gap-2 text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {chat.error.message}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-6">
              {chat.error.retryable && (
                <button type="button" onClick={() => void chat.retry()} className="font-semibold underline underline-offset-4">
                  Reintentar
                </button>
              )}
              {chat.error.code === 'conversation_too_long' || chat.error.code === 'invalid_request' ? (
                <button type="button" onClick={chat.reset} className="font-semibold underline underline-offset-4">
                  Nueva conversación
                </button>
              ) : null}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">
                Escribir por WhatsApp
              </a>
            </div>
            <p className="mt-2 pl-6 text-xs text-muted">Tu carrito no se modificó y puedes seguir comprando.</p>
          </div>
        )}
      </div>

      <form onSubmit={onFormSubmit} className="border-t border-line bg-surface p-3">
        <div className="flex items-end gap-2">
          <label htmlFor={`${panelId}-input`} className="sr-only">
            Escribe tu mensaje
          </label>
          <textarea
            ref={inputRef}
            id={`${panelId}-input`}
            rows={1}
            value={input}
            maxLength={MAX_INPUT_CHARS}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            disabled={disabled}
            placeholder={disabled ? 'Asistente no disponible' : 'Escribe tu mensaje…'}
            className="max-h-[120px] min-h-11 flex-1 resize-none rounded-2xl border border-line bg-canvas px-4 py-2.5 text-[15px] leading-snug placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || chat.busy || disabled}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent/85 disabled:opacity-40"
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {input.length > MAX_INPUT_CHARS - 100 && (
          <p className="mt-1 text-right text-xs text-muted" aria-live="polite">
            {input.length}/{MAX_INPUT_CHARS}
          </p>
        )}
      </form>
    </section>
  );
}

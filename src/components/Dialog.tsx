import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Variant = 'center' | 'right' | 'left';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  variant?: Variant;
  /** Contenido fijo en la parte inferior (botones de acción). */
  footer?: ReactNode;
  /** Elemento que recibe el foco al abrir. Por defecto, el primer elemento enfocable. */
  initialFocusRef?: RefObject<HTMLElement>;
  size?: 'md' | 'lg';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Pila de diálogos abiertos: solo el superior responde a Escape y Tab.
const stack: symbol[] = [];

const panelStyles: Record<Variant, string> = {
  center:
    'relative m-auto flex max-h-[min(92dvh,52rem)] w-[calc(100%-2rem)] flex-col rounded-3xl bg-surface shadow-2xl motion-safe:animate-scale-in',
  right:
    'ml-auto flex h-full w-full max-w-md flex-col bg-surface shadow-2xl motion-safe:animate-slide-in-right sm:rounded-l-3xl',
  left: 'mr-auto flex h-full w-[88%] max-w-sm flex-col bg-surface shadow-2xl motion-safe:animate-slide-in-left',
};

export function Dialog({ open, onClose, title, children, variant = 'center', footer, initialFocusRef, size = 'md' }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const initialFocus = useRef(initialFocusRef);
  initialFocus.current = initialFocusRef;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('dialog');
    stack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Bloquea el desplazamiento de la página sin provocar saltos por la barra de scroll.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = initialFocus.current?.current ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panelRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      if (!stack.length) {
        document.body.style.overflow = overflow;
        document.body.style.paddingRight = paddingRight;
      }
      // Devuelve el foco al elemento que abrió el diálogo, si sigue en la página.
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] motion-safe:animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${panelStyles[variant]} ${variant === 'center' ? (size === 'lg' ? 'max-w-2xl' : 'max-w-lg') : ''} relative z-10 focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="icon-btn -mr-2" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-line px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

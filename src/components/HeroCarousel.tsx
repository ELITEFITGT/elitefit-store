import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { storeConfig } from '../config/store';
import { HERO_SLIDE_SECONDS, heroSlides } from '../data/hero';
import { imageSources } from '../lib/image';
import { useSplashActive } from '../lib/splash';

const DURATION = HERO_SLIDE_SECONDS * 1000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Foco por teclado (no por clic o toque). Navegadores sin :focus-visible: se asume teclado. */
const isKeyboardFocus = (el: Element) => {
  try {
    return el.matches(':focus-visible');
  } catch {
    return true;
  }
};

/**
 * Portada a pantalla completa, solo con fotos, que avanza por pasos.
 * Sigue avanzando aunque el cursor esté encima. Se pausa al navegar con teclado dentro (no con clics o toques),
 * con el botón de pausa, cuando la pestaña no está visible y, por defecto,
 * si el sistema pide reducir el movimiento.
 */
export function HeroCarousel() {
  const count = heroSlides.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const elapsed = useRef(0);
  const touchX = useRef<number | null>(null);
  // Espera a que termine la pantalla de entrada para que el primer paso dure completo.
  const splashActive = useSplashActive();
  const running = playing && !splashActive && !focused && pageVisible && count > 1;
  const current = heroSlides[index];

  const goTo = useCallback(
    (i: number) => {
      elapsed.current = 0;
      barRefs.current.forEach((bar) => bar?.style.setProperty('transform', 'scaleX(0)'));
      setIndex(((i % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Avance automático: la barra del paso activo se llena y al completarse pasa al siguiente.
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      elapsed.current += now - last;
      last = now;
      if (elapsed.current >= DURATION) {
        goTo(index + 1);
        return;
      }
      // Se actualiza la barra directamente para no volver a renderizar el carrusel en cada cuadro.
      const bar = barRefs.current[index];
      if (bar) bar.style.transform = `scaleX(${elapsed.current / DURATION})`;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running, index, goTo]);

  // Las diapositivas ocultas no deben recibir foco ni leerse.
  useEffect(() => {
    slideRefs.current.forEach((el, i) => el?.toggleAttribute('inert', i !== index));
  }, [index]);

  const onTouchStart = (e: TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1));
  };

  const onStepsKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + count) % count;
    goTo(next);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-step]')[next]?.focus();
  };

  return (
    <section
      aria-roledescription="carrusel"
      aria-labelledby="hero-title"
      className="relative isolate h-[100svh] min-h-[32rem] overflow-hidden bg-ink text-canvas"
      onFocus={(e) => isKeyboardFocus(e.target) && setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <h1 id="hero-title" className="sr-only">
        {storeConfig.name}: ropa fitness para mujer y hombre
      </h1>

      <div aria-live={running ? 'off' : 'polite'}>
        {heroSlides.map((slide, i) => {
          const active = i === index;
          // Una sola foto horizontal; en celular se encuadra en el navegador con object-position.
          const sources = imageSources(slide.image.src, 1920, 1080);
          const position = {
            '--pos-m': slide.position?.mobile ?? 'center',
            '--pos-d': slide.position?.desktop ?? 'center',
          } as CSSProperties;
          return (
            <div
              key={slide.label}
              ref={(el) => (slideRefs.current[i] = el)}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${count}: ${slide.label}`}
              aria-hidden={!active}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${active ? 'z-10 opacity-100' : 'z-0 opacity-0'}`}
            >
              <img
                  src={sources.src}
                  srcSet={sources.srcSet}
                  sizes="max(100vw, 178svh)"
                  alt={slide.image.alt}
                  width={1920}
                  height={1080}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding={i === 0 ? 'sync' : 'async'}
                  {...(i === 0 ? { fetchpriority: 'high' } : {})}
                  style={position}
                  className={`absolute inset-0 h-full w-full bg-transparent object-cover [object-position:var(--pos-m)] md:[object-position:var(--pos-d)] transition-transform duration-[6000ms] ease-out ${
                    active ? 'scale-100' : 'motion-safe:scale-105'
                  }`}
                />
            </div>
          );
        })}
      </div>

      {/* Degradados suaves: arriba para leer el encabezado transparente y abajo para los controles. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-black/55 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-gradient-to-t from-black/65 to-transparent" aria-hidden="true" />

      <div className="shell absolute inset-x-0 bottom-0 z-20 pb-5 sm:pb-8">
        <Link
          key={current.label}
          to={current.cta.to}
          className="btn-light mb-5 h-11 px-6 motion-safe:animate-fade-up sm:mb-6"
        >
          {current.cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>

        {count > 1 && (
          // Puntos discretos; el activo se alarga y se llena mientras dura el paso.
          <div className="flex items-center gap-3">
            <div role="group" aria-label="Elegir paso del carrusel" className="flex items-center" onKeyDown={onStepsKeyDown}>
              {heroSlides.map((slide, i) => {
                const active = i === index;
                return (
                  <button
                    key={slide.label}
                    type="button"
                    data-step
                    onClick={() => goTo(i)}
                    aria-label={`Paso ${i + 1}: ${slide.label}`}
                    aria-current={active ? 'step' : undefined}
                    tabIndex={active ? 0 : -1}
                    className="group flex h-8 items-center justify-center px-1.5"
                  >
                    <span
                      className={`relative block h-2 overflow-hidden rounded-full transition-[width,background-color] duration-500 ease-out ${
                        active ? 'w-8 bg-canvas/35' : 'w-2 bg-canvas/50 group-hover:bg-canvas/80'
                      }`}
                    >
                      <span
                        ref={(el) => (barRefs.current[i] = el)}
                        className={`absolute inset-0 origin-left rounded-full bg-canvas ${active ? '' : 'hidden'}`}
                        style={{ transform: 'scaleX(0)' }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-canvas/70 transition-colors hover:bg-canvas/10 hover:text-canvas"
              aria-label={playing ? 'Pausar carrusel' : 'Reanudar carrusel'}
            >
              {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

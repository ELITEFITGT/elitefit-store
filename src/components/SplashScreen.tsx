import { Component, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { storeConfig } from '../config/store';
import { finishSplash, isSplashActive } from '../lib/splash';
// Logo de la pantalla de entrada: corona rosa y nombre claro (versión para fondo oscuro).
import monogram from '../assets/brand/monograma-pink.png';
import wordmark from '../assets/brand/elitefit-light.png';

/** Tiempo mínimo visible y tope máximo antes de salir (ms). */
const TIMING = {
  normal: { min: 2000, max: 2600, exit: 700 },
  reduced: { min: 900, max: 1400, exit: 250 },
};
/** Pase lo que pase, la pantalla se retira a este tiempo (respaldo ante cualquier fallo). */
const HARD_LIMIT_MS = 4000;

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

type Phase = 'show' | 'exit' | 'done';

function SplashOverlay() {
  const [phase, setPhase] = useState<Phase>(() => (isSplashActive() ? 'show' : 'done'));

  useEffect(() => {
    if (phase !== 'show') return;
    const timing = prefersReducedMotion() ? TIMING.reduced : TIMING.normal;
    let exiting = false;
    const exit = () => {
      if (exiting) return;
      exiting = true;
      // La página se libera en cuanto empieza la salida: scroll y carrusel vuelven a funcionar.
      finishSplash();
      setPhase('exit');
    };
    const onLoad = () => exit();
    // Sale al cumplirse el mínimo si la página ya cargó; si no, al terminar de cargar o al llegar al tope.
    const minTimer = window.setTimeout(() => {
      if (document.readyState === 'complete') exit();
      else window.addEventListener('load', onLoad, { once: true });
    }, timing.min);
    const maxTimer = window.setTimeout(exit, timing.max);
    const hardTimer = window.setTimeout(exit, HARD_LIMIT_MS);
    // Cualquier tecla permite saltarla.
    window.addEventListener('keydown', exit);
    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
      window.clearTimeout(hardTimer);
      window.removeEventListener('load', onLoad);
      window.removeEventListener('keydown', exit);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const timing = prefersReducedMotion() ? TIMING.reduced : TIMING.normal;
    const t = window.setTimeout(() => setPhase('done'), timing.exit);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === 'done') return null;

  const { phrase } = storeConfig.splash;
  return (
    // Decorativa: el contenido real ya está cargado debajo y los lectores de pantalla lo leen directamente.
    <div
      className="splash"
      data-state={phase}
      aria-hidden="true"
      onClick={() => {
        finishSplash();
        setPhase('exit');
      }}
    >
      <div className="splash-lines">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="splash-inner">
        <div className="splash-mark">
          <span className="splash-ring" />
          <span className="splash-ring splash-ring--late" />
          <img src={monogram} alt="" width={298} height={320} draggable={false} />
        </div>
        <img className="splash-word" src={wordmark} alt="" width={1200} height={187} draggable={false} />
        {phrase && <p className="splash-phrase">{phrase}</p>}
        <div className="splash-bar">
          <span />
        </div>
      </div>
    </div>
  );
}

/** Si algo falla dentro de la pantalla de entrada, se retira y la tienda sigue funcionando. */
export class SplashBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    finishSplash();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Pantalla de entrada animada (2–3 s) que se muestra al abrir la tienda. */
export function SplashScreen() {
  return (
    <SplashBoundary>
      <SplashOverlay />
    </SplashBoundary>
  );
}

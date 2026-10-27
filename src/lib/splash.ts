import { useSyncExternalStore } from 'react';
import { storeConfig } from '../config/store';

/**
 * Estado compartido de la pantalla de entrada.
 * index.html agrega la clase `splash-pending` a <html> antes de cargar la app (fondo oscuro sin parpadeo);
 * aquí se decide si la pantalla se muestra y se avisa cuando termina (p. ej. para iniciar el carrusel).
 */

/** Clave de sessionStorage para la opción oncePerSession. */
export const SPLASH_SEEN_KEY = 'elitefit-splash-seen';
const PENDING_CLASS = 'splash-pending';

const readSeen = () => {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

const shouldShow = () =>
  typeof document !== 'undefined' &&
  document.documentElement.classList.contains(PENDING_CLASS) &&
  storeConfig.splash.enabled &&
  !(storeConfig.splash.oncePerSession && readSeen());

let active = shouldShow();
const listeners = new Set<() => void>();

// Si no se va a mostrar, se quita de inmediato el fondo oscuro preparado por index.html.
if (!active && typeof document !== 'undefined') document.documentElement.classList.remove(PENDING_CLASS);

export const isSplashActive = () => active;

/** Termina la pantalla de entrada. Es seguro llamarla varias veces. */
export function finishSplash() {
  document.documentElement.classList.remove(PENDING_CLASS);
  if (storeConfig.splash.oncePerSession) {
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      // Sin almacenamiento disponible: se volverá a mostrar en la próxima carga.
    }
  }
  if (!active) return;
  active = false;
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** true mientras la pantalla de entrada está visible. */
export const useSplashActive = () => useSyncExternalStore(subscribe, isSplashActive, () => false);

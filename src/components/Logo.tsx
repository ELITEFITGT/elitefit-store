import { Link } from 'react-router-dom';
import { storeConfig } from '../config/store';
import monogramInk from '../assets/brand/monograma-ink.png';
import monogramPink from '../assets/brand/monograma-pink.png';
import wordmarkInk from '../assets/brand/elitefit-ink.png';
import wordmarkLight from '../assets/brand/elitefit-light.png';

/**
 * Logo de la marca. Para reemplazarlo, cambia los archivos de src/assets/brand
 * conservando fondo transparente y recortados al borde del dibujo.
 * - light: sobre fondos claros (encabezado): corona y nombre en negro.
 * - dark: sobre fondos oscuros (pie de página): corona rosa y nombre claro.
 */
const variants = {
  light: { monogram: monogramInk, wordmark: wordmarkInk },
  dark: { monogram: monogramPink, wordmark: wordmarkLight },
};

// Proporciones de los archivos (ancho / alto) para reservar su espacio y evitar saltos.
const MONOGRAM_RATIO = 298 / 320;
const WORDMARK_RATIO = 1200 / 187;

interface LogoProps {
  variant?: keyof typeof variants;
  /** Altura de la corona en píxeles. El nombre se escala en proporción. */
  size?: number;
  className?: string;
}

export function Logo({ variant = 'light', size = 34, className = '' }: LogoProps) {
  const { monogram, wordmark } = variants[variant];
  const wordHeight = Math.round(size * 0.42);
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 ${className}`} aria-label={`${storeConfig.name}, inicio`}>
      <img
        src={monogram}
        alt=""
        width={Math.round(size * MONOGRAM_RATIO)}
        height={size}
        className="shrink-0 bg-transparent"
        style={{ height: size, width: 'auto' }}
      />
      <img
        src={wordmark}
        alt=""
        width={Math.round(wordHeight * WORDMARK_RATIO)}
        height={wordHeight}
        className="shrink-0 bg-transparent"
        style={{ height: wordHeight, width: 'auto' }}
      />
    </Link>
  );
}

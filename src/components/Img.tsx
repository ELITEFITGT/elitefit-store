import type { ImgHTMLAttributes } from 'react';
import { imageSources } from '../lib/image';

interface ImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'alt'> {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Imágenes visibles en la primera pantalla: se cargan de inmediato. */
  priority?: boolean;
}

/** Imagen con dimensiones definidas, srcset automático y carga diferida por defecto. */
export function Img({ src, alt, width, height, priority = false, sizes, ...rest }: ImgProps) {
  const sources = imageSources(src, width, height);
  return (
    <img
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sources.srcSet ? (sizes ?? '100vw') : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      {...(priority ? { fetchpriority: 'high' } : {})}
      {...rest}
    />
  );
}

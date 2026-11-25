import type { ProductImage } from '../types';
import { Img } from './Img';

interface PageBannerProps {
  title: string;
  description?: string;
  image: ProductImage;
  /** Cantidad grande a la derecha (centrada en celular), con su texto debajo. */
  count?: { value: number; singular: string; plural: string };
}

/** Encabezado de página con foto de fondo, título y, opcionalmente, una cantidad. */
export function PageBanner({ title, description, image, count }: PageBannerProps) {
  return (
    <div className="relative mt-5 overflow-hidden rounded-lg bg-ink">
      <Img
        key={image.src}
        src={image.src}
        alt=""
        width={1600}
        height={500}
        priority
        sizes="(min-width: 1280px) 1280px, 100vw"
        className="absolute inset-0 h-full w-full object-cover motion-safe:animate-fade-in"
      />
      {/* Degradado para que el texto se lea sobre cualquier foto. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" aria-hidden="true" />
      <div className="relative flex min-h-[200px] flex-wrap items-end justify-between gap-x-6 gap-y-2 p-6 sm:min-h-[260px] sm:p-10 lg:min-h-[300px]">
        <div>
          <h1 className="display text-[clamp(3rem,10vw,6rem)] text-white">{title}</h1>
          {description && <p className="mt-2 text-sm text-white/85 sm:text-base">{description}</p>}
        </div>
        {count && (
          <p className="flex w-full flex-col items-center pb-1 text-white sm:w-auto sm:items-end" aria-live="polite">
            <span className="display text-[clamp(2.5rem,6vw,4rem)] leading-none tabular-nums">{count.value}</span>{' '}
            <span className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
              {count.value === 1 ? count.singular : count.plural}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

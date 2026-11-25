import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Clock, Tag } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Img } from '../components/Img';
import { ProductGrid } from '../components/ProductCard';
import { products } from '../data/products';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { activePromotions, benefitText, endsText, formatPromoDate, promotionFor, scopeText, upcomingPromotions } from '../lib/promotions';
import type { Product, Promotion } from '../types';

/** Cuántos productos se ven por promoción antes de "Ver todos". */
const PREVIEW_COUNT = 8;

/** Productos de la promoción (los que la tienen como promoción principal: cada producto aparece una sola vez). */
const productsFor = (promo: Promotion) => products.filter((p) => promotionFor(p)?.id === promo.id);

/** Banner de la promoción, tal cual (el arte ya trae su texto). */
function Banner({ promo, priority = false, className = '' }: { promo: Promotion; priority?: boolean; className?: string }) {
  return (
    <Img
      src={promo.banner.src}
      alt={promo.banner.alt}
      width={1600}
      height={580}
      priority={priority}
      sizes="(min-width: 1024px) 760px, 100vw"
      className={`aspect-[11/4] w-full object-cover ${className}`}
    />
  );
}

/** Datos para el cliente: qué gana, en qué productos y hasta cuándo. */
function PromoInfo({ promo, titleId }: { promo: Promotion; titleId: string }) {
  return (
    <div className="flex flex-col justify-center gap-3">
      <h2 id={titleId} className="text-2xl font-bold leading-tight sm:text-3xl">
        {promo.title}
      </h2>
      <p className="text-lg font-bold leading-snug text-accent-strong">{benefitText(promo)}</p>
      <p className="text-[15px] text-muted">{scopeText(promo)}</p>
      <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-accent-strong" aria-hidden="true" />
        {endsText(promo)}
      </p>
    </div>
  );
}

function PromotionSection({ promo, items, first }: { promo: Promotion; items: Product[]; first: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const titleId = `promo-${promo.id}-title`;

  return (
    <section id={promo.id} aria-labelledby={titleId} className="scroll-mt-28">
      {/* El banner se muestra cerca de su tamaño real para que se vea nítido. */}
      <div className="grid overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(0,760px)_1fr]">
        <Banner promo={promo} priority={first} />
        <div className="p-5 sm:p-8">
          <PromoInfo promo={promo} titleId={titleId} />
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-8">
          <ProductGrid products={visible} />
          {items.length > PREVIEW_COUNT && !expanded && (
            <div className="mt-10 flex justify-center">
              <button type="button" className="btn-outline" onClick={() => setExpanded(true)}>
                Ver los {items.length} productos
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function UpcomingCard({ promo }: { promo: Promotion }) {
  return (
    <li className="overflow-hidden rounded-lg border border-line bg-surface">
      <Banner promo={promo} />
      <div className="p-5">
        <h3 className="font-bold leading-snug">{promo.title}</h3>
        <p className="mt-1 text-sm font-semibold text-accent-strong">{benefitText(promo)}</p>
        <p className="mt-1 text-sm text-muted">{scopeText(promo)}</p>
        <p className="mt-3 text-sm font-semibold">Desde el {formatPromoDate(promo.startsAt)}</p>
      </div>
    </li>
  );
}

export function PromotionsPage() {
  useDocumentTitle('Promociones');
  const { hash } = useLocation();
  const active = activePromotions().map((promo) => ({ promo, items: productsFor(promo) }));
  const upcoming = upcomingPromotions();

  // Enlaces del tipo /promociones#segundo-par-mitad: se espera un cuadro para que el desplazamiento
  // al inicio de la página (Layout) no lo anule.
  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [hash]);

  return (
    <div className="shell pb-20 pt-6 sm:pb-28 sm:pt-8">
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Promociones' }]} />

      {/* Encabezado con los colores de la marca. */}
      <header className="relative mt-5 overflow-hidden rounded-lg bg-night px-6 py-10 text-canvas sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgb(var(--color-accent)/0.45),transparent_40%),radial-gradient(circle_at_10%_100%,rgb(var(--color-ink)),transparent_60%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              <span className="h-px w-8 bg-accent" aria-hidden="true" />
              Ofertas por tiempo limitado
            </p>
            <h1 className="display text-[clamp(3rem,10vw,6rem)]">
              Promo<span className="text-accent">ciones</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm text-canvas/80 sm:text-base">
              Descuentos vigentes en la tienda. Se aplican solos en tu carrito al cumplir la promoción.
            </p>
          </div>
          {active.length > 0 && (
            <p className="flex flex-col items-start sm:items-end">
              <span className="display text-[clamp(3rem,7vw,5rem)] leading-none tabular-nums text-accent">{active.length}</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-canvas/75">
                {active.length === 1 ? 'Promoción vigente' : 'Promociones vigentes'}
              </span>
            </p>
          )}
        </div>

        {active.length > 1 && (
          <nav aria-label="Promociones vigentes" className="relative mt-8">
            <ul className="flex flex-wrap gap-2">
              {active.map(({ promo }) => (
                <li key={promo.id}>
                  <a
                    href={`#${promo.id}`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-canvas/20 px-4 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
                  >
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    {promo.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {active.length ? (
        <div className="mt-10 space-y-20 sm:mt-14 sm:space-y-28">
          {active.map(({ promo, items }, i) => (
            <PromotionSection key={promo.id} promo={promo} items={items} first={i === 0} />
          ))}
        </div>
      ) : (
        <div className="mt-12 rounded-lg bg-surface px-6 py-14 text-center sm:mt-16">
          <Tag className="mx-auto h-8 w-8 text-accent-strong" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-bold">No hay promociones activas en este momento</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">
            {upcoming.length ? 'Mira abajo lo que viene muy pronto.' : 'Vuelve pronto: publicamos descuentos cada temporada.'}
          </p>
          <Link to="/catalogo" className="btn-primary mt-6">
            Ver el catálogo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mt-20 sm:mt-28" aria-labelledby="proximamente-title">
          <p className="eyebrow mb-3">Ponlo en tu calendario</p>
          <h2 id="proximamente-title" className="display text-[clamp(2.4rem,7vw,4.5rem)]">
            Próximamente
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {upcoming.map((promo) => (
              <UpcomingCard key={promo.id} promo={promo} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

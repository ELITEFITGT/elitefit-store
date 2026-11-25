import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { HeroCarousel } from '../components/HeroCarousel';
import { Img } from '../components/Img';
import { ProductGrid } from '../components/ProductCard';
import { categories, homeImages, products } from '../data/products';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice } from '../lib/format';
import { activePromotions, benefitText, currentPrice, endsText } from '../lib/promotions';

function SectionHeader({ eyebrow, title, id, link }: { eyebrow: string; title: string; id: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 id={id} className="display text-[clamp(2.4rem,7vw,4.5rem)]">
          {title}
        </h2>
      </div>
      {link && (
        <Link to={link.to} className="group hidden shrink-0 items-center gap-1.5 pb-2 text-sm font-semibold sm:inline-flex">
          <span className="border-b border-ink/30 transition-colors group-hover:border-ink">{link.label}</span>
          <ArrowUpRight
            className="h-4 w-4 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}

function Categories() {
  return (
    <section className="shell mt-20 sm:mt-28" aria-labelledby="categorias-title">
      <SectionHeader eyebrow="Compra por categoría" title="Categorías" id="categorias-title" />
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              to={`/catalogo?categoria=${c.id}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-ink sm:aspect-[3/4]"
            >
              <Img
                src={c.image.src}
                alt={c.image.alt}
                width={700}
                height={900}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 motion-safe:group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-canvas sm:p-6">
                <div>
                  <h3 className="display text-4xl sm:text-5xl lg:text-4xl xl:text-[2.6rem]">{c.name}</h3>
                  <p className="mt-1.5 text-sm text-canvas/80">{c.description}</p>
                </div>
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-canvas text-ink transition-transform motion-safe:group-hover:-rotate-45">
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Promotions() {
  const active = activePromotions().slice(0, 3);
  if (!active.length) return null;
  const single = active.length === 1;
  return (
    <section className="shell mt-20 sm:mt-28" aria-labelledby="promos-title">
      <SectionHeader
        eyebrow="Ofertas por tiempo limitado"
        title="Promociones"
        id="promos-title"
        link={{ to: '/promociones', label: 'Ver todas' }}
      />
      {/* Una promoción: banner junto a la información (cerca de su tamaño real, para que se vea nítido). Varias: en columnas. */}
      <ul className={`grid gap-3 sm:gap-5 ${active.length > 1 ? 'md:grid-cols-2' : ''} ${active.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {active.map((promo) => (
          <li key={promo.id}>
            <Link
              to={`/promociones#${promo.id}`}
              className={`group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-accent ${
                single ? 'lg:grid lg:grid-cols-[minmax(0,760px)_1fr]' : ''
              }`}
            >
              <span className="block overflow-hidden">
                <Img
                  src={promo.banner.src}
                  alt={promo.banner.alt}
                  width={1600}
                  height={580}
                  sizes={single ? '(min-width: 1024px) 760px, 100vw' : '(min-width: 768px) 50vw, 100vw'}
                  className="aspect-[11/4] w-full object-cover transition duration-700 motion-safe:group-hover:scale-[1.02]"
                />
              </span>
              <span className={`flex flex-1 items-center justify-between gap-4 p-5 sm:px-6 ${single ? 'lg:px-8' : ''}`}>
                <span>
                  <span className={`block font-bold leading-tight ${single ? 'text-lg lg:text-2xl' : 'text-lg'}`}>{promo.title}</span>
                  <span className="mt-1 block text-sm font-semibold text-accent-strong">{benefitText(promo)}</span>
                  <span className="mt-1 block text-sm text-muted">{endsText(promo)}</span>
                </span>
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform motion-safe:group-hover:-rotate-45">
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Featured() {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  return (
    <section className="shell mt-20 sm:mt-28" aria-labelledby="destacados-title">
      <SectionHeader
        eyebrow="Lo más elegido"
        title="Destacados"
        id="destacados-title"
        link={{ to: '/catalogo', label: 'Ver todo el catálogo' }}
      />
      <ProductGrid products={featured} />
      <Link to="/catalogo" className="btn-outline mt-10 w-full sm:hidden">
        Ver todo el catálogo
      </Link>
    </section>
  );
}

function NewCollection() {
  const newest = [...products]
    .filter((p) => p.isNew)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, 4);
  return (
    <section className="mt-20 bg-ink py-16 text-canvas sm:mt-28 sm:py-24" aria-labelledby="nueva-title">
      <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <Img
            src={homeImages.newCollection.src}
            alt={homeImages.newCollection.alt}
            width={900}
            height={1100}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="aspect-[4/5] w-full rounded-3xl object-cover sm:aspect-[5/5] lg:aspect-[4/5]"
          />
          <Img
            src={homeImages.newCollectionSecondary.src}
            alt={homeImages.newCollectionSecondary.alt}
            width={400}
            height={500}
            sizes="200px"
            className="absolute -bottom-6 right-4 hidden w-40 rounded-2xl object-cover shadow-2xl ring-4 ring-ink sm:block lg:-right-8 lg:w-48"
          />
        </div>
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-accent">Recién llegado</p>
          <h2 id="nueva-title" className="display text-[clamp(2.8rem,8vw,5.5rem)]">
            Nueva colección
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-canvas/75 sm:text-lg">
            Tonos tierra, tejidos suaves y cortes pensados para moverte sin distracciones. Descubre lo último que llegó a la tienda.
          </p>
          <ul className="mt-8 divide-y divide-canvas/15 border-y border-canvas/15">
            {newest.map((p) => (
              <li key={p.id}>
                <Link to={`/producto/${p.slug}`} className="group flex items-center gap-4 py-3.5">
                  <Img
                    src={p.images[0].src}
                    alt=""
                    width={112}
                    height={140}
                    sizes="56px"
                    className="h-[70px] w-14 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="text-sm tabular-nums text-canvas/60">{formatPrice(currentPrice(p))}</span>
                  </span>
                  <ArrowUpRight
                    className="h-5 w-5 shrink-0 text-canvas/50 transition group-hover:text-canvas motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Link to="/catalogo?orden=novedades" className="btn-accent mt-8">
            Ver novedades
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: 'Elige y agrega',
    text: 'Explora el catálogo, selecciona talla, color y cantidad, y agrégalo al carrito. Tu carrito se guarda en este navegador.',
  },
  {
    title: 'Confirma tu pedido',
    text: 'Completa tus datos de contacto y entrega, y confirma. Tu pedido queda registrado con un número.',
  },
  {
    title: 'Te contactamos',
    text: 'Te llamamos o escribimos para confirmar disponibilidad, costo de envío y forma de pago.',
  },
];

/** Tres pasos en zigzag: foto de un lado y descripción del otro, alternando. */
function HowToBuy() {
  return (
    <section className="shell mt-20 sm:mt-28" aria-labelledby="como-title">
      <SectionHeader eyebrow="Así de simple" title="Cómo comprar" id="como-title" link={{ to: '/info/como-comprar', label: 'Más detalles' }} />
      <ol className="space-y-12 sm:space-y-16 lg:space-y-20">
        {steps.map(({ title, text }, i) => {
          const image = homeImages.howToBuy[i];
          const reversed = i % 2 === 1;
          return (
            <li key={title} className="grid items-center gap-6 sm:gap-8 md:grid-cols-2 lg:gap-16">
              {/* Foto con el filtro de color de la marca, para que las tres se vean como una serie. */}
              <div className={`relative isolate overflow-hidden rounded-lg bg-ink ${reversed ? 'md:order-2' : ''}`}>
                <Img
                  src={image.src}
                  alt={image.alt}
                  width={900}
                  height={675}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="aspect-[4/3] w-full object-cover saturate-[.85] lg:aspect-[3/2]"
                />
                <div className="absolute inset-0 bg-ink opacity-30 mix-blend-color" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-t from-night/40 to-transparent" aria-hidden="true" />
              </div>
              <div className={reversed ? 'md:order-1 md:text-right' : ''}>
                <p className="display text-6xl text-accent sm:text-7xl" aria-hidden="true">
                  0{i + 1}
                </p>
                <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {title}
                </h3>
                <p className={`mt-3 max-w-md text-base leading-relaxed text-muted sm:text-lg ${reversed ? 'md:ml-auto' : ''}`}>{text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function HomePage() {
  useDocumentTitle();
  return (
    <>
      <HeroCarousel />
      <Categories />
      <Promotions />
      <Featured />
      <NewCollection />
      <HowToBuy />
    </>
  );
}

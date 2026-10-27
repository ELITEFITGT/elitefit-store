import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CheckCircle2, MessageCircle, ShoppingBag } from 'lucide-react';
import { HeroCarousel } from '../components/HeroCarousel';
import { Img } from '../components/Img';
import { ProductGrid } from '../components/ProductCard';
import { categories, homeImages, products } from '../data/products';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice } from '../lib/format';

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
          <ArrowUpRight className="h-4 w-4 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" />
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

function Featured() {
  const featured = products.filter((p) => p.featured).slice(0, 8);
  return (
    <section className="shell mt-20 sm:mt-28" aria-labelledby="destacados-title">
      <SectionHeader eyebrow="Lo más elegido" title="Destacados" id="destacados-title" link={{ to: '/catalogo', label: 'Ver todo el catálogo' }} />
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
                    <span className="text-sm tabular-nums text-canvas/60">{formatPrice(p.price)}</span>
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
  { Icon: ShoppingBag, title: 'Elige y agrega', text: 'Selecciona talla, color y cantidad. Tu carrito se guarda en este navegador.' },
  { Icon: MessageCircle, title: 'Pide por WhatsApp', text: 'Completa tus datos y abriremos WhatsApp con el detalle del pedido.' },
  { Icon: CheckCircle2, title: 'Confirmamos contigo', text: 'Por chat confirmamos disponibilidad, costo de envío y forma de pago.' },
];

function HowToBuy() {
  return (
    <section className="shell mt-20 sm:mt-28" aria-labelledby="como-title">
      <SectionHeader eyebrow="Así de simple" title="Cómo comprar" id="como-title" link={{ to: '/info/como-comprar', label: 'Más detalles' }} />
      <ol className="grid gap-3 sm:grid-cols-3 sm:gap-5">
        {steps.map(({ Icon, title, text }, i) => (
          <li key={title} className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-canvas">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="display text-5xl text-line" aria-hidden="true">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-8 text-lg font-bold">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
          </li>
        ))}
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
      <Featured />
      <NewCollection />
      <HowToBuy />
    </>
  );
}

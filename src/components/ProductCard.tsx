import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { categoryName } from '../data/products';
import { formatPrice } from '../lib/format';
import type { Product } from '../types';
import { Img } from './Img';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [main, alt] = product.images;
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-line/40">
        <Img
          src={main.src}
          alt={main.alt}
          width={600}
          height={750}
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="h-full w-full object-cover transition duration-700 ease-out motion-safe:group-hover:scale-[1.03]"
        />
        {alt && (
          <Img
            src={alt.src}
            alt=""
            width={600}
            height={750}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block"
          />
        )}
        {product.isNew && (
          <span className="absolute left-3 top-3 rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            Nuevo
          </span>
        )}
        <span
          className="absolute bottom-3 right-3 hidden h-10 w-10 items-center justify-center rounded-full bg-canvas text-ink opacity-0 shadow-sm transition duration-300 group-hover:opacity-100 md:inline-flex motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0"
          aria-hidden="true"
        >
          <ArrowUpRight className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1 sm:mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{categoryName(product.category)}</p>
        <h3 className="text-sm font-semibold leading-snug sm:text-base">
          {/* El enlace cubre toda la tarjeta para facilitar el toque en celular. */}
          <Link
            to={`/producto/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-accent-strong"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="font-bold tabular-nums">{formatPrice(product.price)}</p>
          <ul className="flex items-center -space-x-1" aria-label="Colores disponibles">
            {product.colors.slice(0, 4).map((c) => (
              <li key={c.name} className="h-3.5 w-3.5 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18)] ring-2 ring-canvas" style={{ backgroundColor: c.hex }}>
                <span className="sr-only">{c.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Product[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-y-12">
      {products.map((p, i) => (
        <li key={p.id} className="flex">
          <div className="w-full">
            <ProductCard product={p} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}

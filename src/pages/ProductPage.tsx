import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Check, MessageCircle, Ruler, ShoppingBag } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Dialog } from '../components/Dialog';
import { Img } from '../components/Img';
import { ProductGrid } from '../components/ProductCard';
import { QuantitySelector } from '../components/QuantitySelector';
import { SizeGuide } from '../components/SizeGuide';
import { storeConfig } from '../config/store';
import { useCart } from '../context/CartContext';
import { categoryName, getProductBySlug, products } from '../data/products';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice } from '../lib/format';
import type { Product } from '../types';
import { NotFoundPage } from './NotFoundPage';

function Gallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const image = product.images[active] ?? product.images[0];
  const multiple = product.images.length > 1;

  return (
    // self-start/items-start: la galería mide lo que mide la foto y no se estira con la columna de información.
    <div className="flex flex-col gap-3 self-start md:flex-row-reverse md:items-start md:gap-4">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-3xl bg-line/40">
        <Img
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={1000}
          height={1250}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="aspect-[4/5] w-full object-cover motion-safe:animate-fade-in"
        />
        {multiple && (
          <p className="absolute bottom-3 right-3 rounded-full bg-canvas/90 px-3 py-1 text-xs font-semibold tabular-nums md:hidden">
            {active + 1} / {product.images.length}
          </p>
        )}
      </div>
      {multiple && (
        <ul className="flex gap-2 md:w-20 md:flex-col lg:w-24" aria-label="Miniaturas">
          {product.images.map((img, i) => (
            <li key={img.src} className="w-20 md:w-full">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver imagen ${i + 1} de ${product.images.length}`}
                aria-current={i === active ? 'true' : undefined}
                className={`block w-full overflow-hidden rounded-xl ring-offset-2 ring-offset-canvas transition ${
                  i === active ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Img src={img.src} alt="" width={160} height={200} sizes="96px" className="aspect-[4/5] w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart();
  const needsSize = product.sizes.length > 0;
  const [color, setColor] = useState<string | null>(product.colors.length === 1 ? product.colors[0].name : null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<{ color?: boolean; size?: boolean }>({});
  const [added, setAdded] = useState(false);
  const [capped, setCapped] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const colorGroupRef = useRef<HTMLFieldSetElement>(null);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);
  const uid = useId();

  useDocumentTitle(product.name);

  useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 2500);
    return () => window.clearTimeout(t);
  }, [added]);

  const handleAdd = () => {
    const missing = { color: !color, size: needsSize && !size };
    setErrors(missing);
    if (missing.color || missing.size) {
      const group = missing.color ? colorGroupRef.current : sizeGroupRef.current;
      group?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    const wasCapped = addItem({ productId: product.id, color: color!, size: needsSize ? size : null, quantity });
    setCapped(wasCapped);
    setAdded(true);
    setQuantity(1);
  };

  const related = [
    ...products.filter((p) => p.category === product.category && p.id !== product.id),
    ...products.filter((p) => p.category !== product.category),
  ].slice(0, 4);

  return (
    <>
      <div className="shell pt-6 sm:pt-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', to: '/' },
            { label: categoryName(product.category), to: `/catalogo?categoria=${product.category}` },
            { label: product.name },
          ]}
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14 xl:gap-20">
          <Gallery product={product} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">{categoryName(product.category)}</p>
            <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.75rem)]">{product.name}</h1>
            <p className="mt-4 text-2xl font-bold tabular-nums">{formatPrice(product.price)}</p>
            <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-muted sm:text-base">{product.description}</p>

            <div className="mt-8 space-y-7">
              {/* Color */}
              <fieldset
                ref={colorGroupRef}
                aria-describedby={errors.color ? `${uid}-color-error` : undefined}
                aria-invalid={errors.color || undefined}
              >
                <legend className="mb-3 text-sm font-bold">
                  Color: <span className="font-normal text-muted">{color ?? 'Selecciona un color'}</span>
                </legend>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((c) => {
                    const id = `${uid}-color-${c.name}`;
                    return (
                      <div key={c.name}>
                        <input
                          id={id}
                          type="radio"
                          name={`${uid}-color`}
                          value={c.name}
                          checked={color === c.name}
                          onChange={() => {
                            setColor(c.name);
                            setErrors((e) => ({ ...e, color: false }));
                          }}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={id}
                          title={c.name}
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full ring-1 ring-ink/15 ring-offset-2 ring-offset-canvas transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent-strong"
                        >
                          <span className="h-9 w-9 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: c.hex }} />
                          <span className="sr-only">{c.name}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
                {errors.color && (
                  <p id={`${uid}-color-error`} role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    Selecciona un color.
                  </p>
                )}
              </fieldset>

              {/* Talla */}
              {needsSize ? (
                <fieldset
                  ref={sizeGroupRef}
                  aria-describedby={errors.size ? `${uid}-size-error` : undefined}
                  aria-invalid={errors.size || undefined}
                >
                  <legend className="sr-only">Talla</legend>
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <p className="text-sm font-bold" aria-hidden="true">
                      Talla: <span className="font-normal text-muted">{size ?? 'Selecciona una talla'}</span>
                    </p>
                    {product.sizeGuide && (
                      <button
                        type="button"
                        onClick={() => setGuideOpen(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:text-accent-strong"
                        aria-haspopup="dialog"
                      >
                        <Ruler className="h-4 w-4" aria-hidden="true" />
                        Guía de tallas
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:max-w-sm">
                    {product.sizes.map((s) => {
                      const id = `${uid}-size-${s}`;
                      return (
                        <div key={s}>
                          <input
                            id={id}
                            type="radio"
                            name={`${uid}-size`}
                            value={s}
                            checked={size === s}
                            onChange={() => {
                              setSize(s);
                              setErrors((e) => ({ ...e, size: false }));
                            }}
                            className="peer sr-only"
                          />
                          <label
                            htmlFor={id}
                            className={`flex h-12 cursor-pointer items-center justify-center rounded-xl border bg-surface text-sm font-semibold transition-colors hover:border-ink/50 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong ${
                              errors.size ? 'border-danger/60' : 'border-line'
                            }`}
                          >
                            {s}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {errors.size && (
                    <p id={`${uid}-size-error`} role="alert" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger">
                      <AlertCircle className="h-4 w-4" aria-hidden="true" />
                      Selecciona una talla.
                    </p>
                  )}
                </fieldset>
              ) : (
                <p className="text-sm">
                  <span className="font-bold">Talla:</span> <span className="text-muted">Única</span>
                </p>
              )}

              {/* Cantidad y botón */}
              <div>
                <p className="mb-3 text-sm font-bold">
                  Cantidad
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <QuantitySelector value={quantity} onChange={setQuantity} max={storeConfig.maxQuantityPerItem} label={product.name} />
                  <button
                    type="button"
                    onClick={handleAdd}
                    className={`btn flex-1 text-[15px] ${added ? 'bg-success text-white' : 'bg-ink text-canvas hover:bg-ink/85'}`}
                  >
                    {added ? (
                      <>
                        <Check className="h-5 w-5" aria-hidden="true" />
                        Agregado al carrito
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                        Agregar al carrito
                      </>
                    )}
                  </button>
                </div>
                <div aria-live="polite" className="text-sm">
                  {added && capped && (
                    <p className="mt-3 text-muted">
                      Se ajustó la cantidad al máximo de {storeConfig.maxQuantityPerItem} unidades por artículo.
                    </p>
                  )}
                </div>
              </div>

              <p className="flex gap-2.5 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-muted">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
                <span>
                  Pedido por WhatsApp. La disponibilidad, el costo de envío y el pago se confirman por ese medio.{' '}
                  <Link to="/info/como-comprar" className="font-semibold text-ink underline underline-offset-4">
                    Cómo comprar
                  </Link>
                </span>
              </p>

              <details className="group border-t border-line pt-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold [&::-webkit-details-marker]:hidden">
                  Características
                  <span className="text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-muted">
                  {product.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>

      <section className="shell mt-20 sm:mt-28" aria-labelledby="relacionados-title">
        <h2 id="relacionados-title" className="display mb-8 text-[clamp(2.2rem,6vw,3.75rem)]">
          También te puede gustar
        </h2>
        <ProductGrid products={related} />
      </section>

      {product.sizeGuide && (
        <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} title="Guía de tallas" size="lg">
          <div className="px-5 py-6 sm:px-6">
            <p className="mb-5 text-sm text-muted">
              Medidas de referencia en centímetros. Si estás entre dos tallas, te recomendamos consultarnos por WhatsApp.
            </p>
            <SizeGuide only={product.sizeGuide} />
          </div>
        </Dialog>
      )}
    </>
  );
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const product = getProductBySlug(slug);
  if (!product) return <NotFoundPage message="Este producto no existe o ya no está disponible." />;
  // La clave reinicia la selección al navegar entre productos.
  return <ProductDetail key={product.id} product={product} />;
}

import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../lib/format';
import { priceWithPromotion } from '../../lib/promotions';
import type { Product } from '../../types';
import { Img } from '../Img';

export function ProductMiniCards({ products, onNavigate }: { products: Product[]; onNavigate: () => void }) {
  return (
    <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2" aria-label="Productos sugeridos">
      {products.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
          <Img src={p.images[0].src} alt={p.images[0].alt} width={112} height={140} sizes="56px" priority className="h-[70px] w-14 shrink-0 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
            <PriceLine product={p} />
          </div>
          <Link
            to={`/producto/${p.slug}`}
            onClick={onNavigate}
            className="shrink-0 rounded-lg border border-ink/15 px-3 py-2 text-xs font-semibold transition-colors hover:border-ink"
            aria-label={`Ver producto ${p.name}`}
          >
            Ver producto
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OrderCard({ onContinue }: { onContinue: () => void }) {
  const { lines, units, total, openCheckout } = useCart();
  if (!lines.length)
    return <p className="rounded-lg border border-line bg-surface p-3 text-sm text-muted">Tu carrito está vacío en este momento.</p>;
  return (
    <section className="rounded-lg border border-line bg-surface p-4" aria-label="Resumen del pedido">
      <p className="text-sm font-bold">Resumen de tu pedido</p>
      <ul className="mt-2 divide-y divide-line text-sm">
        {lines.map((l) => (
          <li key={l.key} className="flex justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block font-medium">{l.product.name}</span>
              <span className="text-muted">
                {l.size ?? 'Talla única'} · {l.color} · {l.quantity} × {formatPrice(l.unitPrice)}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatPrice(l.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm text-muted">
          Total de productos ({units} {units === 1 ? 'unidad' : 'unidades'})
        </span>
        <span className="font-bold tabular-nums">{formatPrice(total)}</span>
      </div>
      <p className="mt-1 text-xs text-muted">Costo de envío por confirmar.</p>
      <button
        type="button"
        className="btn-accent mt-3 min-h-11 w-full"
        onClick={() => {
          onContinue();
          openCheckout();
        }}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        Confirmar pedido
      </button>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Completarás tus datos de contacto y entrega en un formulario. Registramos tu pedido y te contactamos para confirmar
        disponibilidad, entrega y pago.
      </p>
    </section>
  );
}

function PriceLine({ product }: { product: Product }) {
  const { price, originalPrice } = priceWithPromotion(product, product.price);
  return (
    <p className="text-sm tabular-nums">
      <span className={price < originalPrice ? 'font-semibold text-accent-strong' : 'text-muted'}>{formatPrice(price)}</span>
      {price < originalPrice && <s className="ml-1.5 text-xs text-muted">{formatPrice(originalPrice)}</s>}
    </p>
  );
}

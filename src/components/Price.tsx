import { formatPrice } from '../lib/format';
import { badgeText, bundleOffer } from '../lib/promotions';
import type { Promotion } from '../types';

interface PriceProps {
  price: number;
  /** Precio normal; si es mayor que `price`, se muestra tachado. */
  originalPrice?: number;
  className?: string;
  /** Clases del precio principal (tamaño y peso). */
  priceClassName?: string;
}

/** Precio con el normal tachado cuando hay descuento. Los lectores de pantalla oyen "antes Q…". */
export function Price({ price, originalPrice, className = '', priceClassName = 'font-bold' }: PriceProps) {
  const discounted = originalPrice !== undefined && originalPrice > price;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 tabular-nums ${className}`}>
      <span className={`${priceClassName} ${discounted ? 'text-accent-strong' : ''}`}>{formatPrice(price)}</span>
      {discounted && (
        <s className="text-[0.85em] font-normal text-muted">
          <span className="sr-only">antes </span>
          {formatPrice(originalPrice)}
        </s>
      )}
    </span>
  );
}

/** Etiqueta rosa de la promoción para fotos de producto: "-25%", "2.º par a mitad"… */
export function PromoBadge({ promotion, className = '' }: { promotion: Promotion | null; className?: string }) {
  if (!promotion) return null;
  return (
    <span className={`rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-wide text-accent-ink ${className}`}>
      <span className="sr-only">Promoción: </span>
      {badgeText(promotion)}
    </span>
  );
}

/** Oferta por cantidad junto al precio: "Llévate 2 por Q1,650.00 · ahorras Q550.00". */
export function BundleOffer({
  promotion,
  price,
  showSavings = false,
  className = '',
}: {
  promotion: Promotion | null;
  price: number;
  showSavings?: boolean;
  className?: string;
}) {
  const offer = bundleOffer(promotion, price);
  if (!offer) return null;
  return (
    <p className={`font-semibold text-accent-strong ${className}`}>
      Llévate {offer.units} por <span className="tabular-nums">{formatPrice(offer.total)}</span>
      {showSavings && (
        <span className="font-normal text-muted">
          {' '}
          · ahorras <span className="tabular-nums">{formatPrice(offer.savings)}</span>
        </span>
      )}
    </p>
  );
}

import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { storeConfig } from '../config/store';
import { useCart } from '../context/CartContext';
import type { DetailedLine } from '../lib/cart';
import { formatPrice } from '../lib/format';
import { Img } from './Img';
import { QuantitySelector } from './QuantitySelector';

interface CartLineItemProps {
  line: DetailedLine;
  compact?: boolean;
  highlight?: boolean;
  onNavigate?: () => void;
}

export function CartLineItem({ line, compact = false, highlight = false, onNavigate }: CartLineItemProps) {
  const { setQuantity, removeItem } = useCart();
  const { product } = line;
  const color = product.colors.find((c) => c.name === line.color);
  const image = product.images[0];

  return (
    <li
      className={`flex gap-4 py-5 transition-colors duration-700 ${highlight ? 'motion-safe:animate-fade-up' : ''}`}
      data-testid="cart-line"
    >
      <Link
        to={`/producto/${product.slug}`}
        onClick={onNavigate}
        className={`block shrink-0 overflow-hidden rounded-xl ${compact ? 'w-20' : 'w-24 sm:w-32'}`}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Img src={image.src} alt="" width={256} height={320} sizes="128px" className="aspect-[4/5] h-full w-full object-cover" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`font-semibold leading-snug ${compact ? 'text-[15px]' : 'text-base sm:text-lg'}`}>
              <Link to={`/producto/${product.slug}`} onClick={onNavigate} className="hover:underline">
                {product.name}
              </Link>
            </h3>
            <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
              <div className="flex gap-1">
                <dt>Talla:</dt>
                <dd className="font-medium text-ink">{line.size ?? 'Única'}</dd>
              </div>
              <div className="flex items-center gap-1">
                <dt>Color:</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  {color && (
                    <span className="h-3 w-3 rounded-full ring-1 ring-ink/15" style={{ backgroundColor: color.hex }} aria-hidden="true" />
                  )}
                  {line.color}
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-sm text-muted tabular-nums">{formatPrice(line.unitPrice)} c/u</p>
          </div>
          <p className="shrink-0 font-bold tabular-nums">{formatPrice(line.subtotal)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <QuantitySelector
            value={line.quantity}
            onChange={(q) => setQuantity(line.key, q)}
            max={storeConfig.maxQuantityPerItem}
            label={`${product.name} (${line.size ?? 'talla única'}, ${line.color})`}
            size="sm"
          />
          <button
            type="button"
            onClick={() => removeItem(line.key)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-danger/5 hover:text-danger"
            aria-label={`Eliminar ${product.name} (${line.size ?? 'talla única'}, ${line.color})`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span className="max-sm:sr-only">Eliminar</span>
          </button>
        </div>
      </div>
    </li>
  );
}

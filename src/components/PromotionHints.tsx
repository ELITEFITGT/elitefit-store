import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { hintText } from '../lib/promotions';

/** Avisos del carrito: "Agrega 1 unidad más de … y el de menor precio sale a mitad de precio." */
export function PromotionHints({ onNavigate, className = '' }: { onNavigate?: () => void; className?: string }) {
  const { promotionHints } = useCart();
  if (!promotionHints.length) return null;
  return (
    <ul className={`space-y-2 ${className}`}>
      {promotionHints.map((hint) => (
        <li key={hint.promotion.id} className="flex gap-2.5 rounded-lg bg-accent/15 px-3.5 py-3 text-[13px] leading-snug text-ink">
          <Tag className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
          <span>
            {hintText(hint)}{' '}
            <Link
              to={`/promociones#${hint.promotion.id}`}
              onClick={onNavigate}
              className="font-semibold text-accent-strong underline underline-offset-2"
            >
              Ver productos
            </Link>
          </span>
        </li>
      ))}
    </ul>
  );
}

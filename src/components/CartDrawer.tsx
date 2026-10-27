import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { CartLineItem } from './CartLineItem';
import { Dialog } from './Dialog';

export function CartDrawer() {
  const { lines, units, total, drawerOpen, closeDrawer, openCheckout, lastAddedKey } = useCart();
  const justAdded = lines.find((l) => l.key === lastAddedKey);

  return (
    <Dialog
      open={drawerOpen}
      onClose={closeDrawer}
      variant="right"
      title={
        <span className="flex items-baseline gap-2">
          Tu carrito <span className="text-sm font-medium text-muted">({units})</span>
        </span>
      }
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Total de productos</span>
              <span className="text-lg font-bold tabular-nums">{formatPrice(total)}</span>
            </div>
            <p className="text-[13px] text-muted">Costo de envío por confirmar.</p>
            <button type="button" className="btn-accent w-full" onClick={openCheckout}>
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
              Realizar pedido por WhatsApp
            </button>
            <Link to="/carrito" onClick={closeDrawer} className="btn-outline w-full">
              Ver carrito
            </Link>
          </div>
        )
      }
    >
      {justAdded && (
        <p
          role="status"
          className="mx-5 mt-4 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success sm:mx-6"
        >
          <CheckCircle2 className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          Agregaste {justAdded.product.name} al carrito.
        </p>
      )}
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-8 py-16 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-canvas">
            <ShoppingBag className="h-7 w-7 text-muted" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold">Tu carrito está vacío</p>
            <p className="mt-1 text-sm text-muted">Explora el catálogo y agrega tus favoritos.</p>
          </div>
          <Link to="/catalogo" onClick={closeDrawer} className="btn-primary mt-2">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line px-5 sm:px-6">
          {lines.map((l) => (
            <CartLineItem key={l.key} line={l} compact highlight={l.key === lastAddedKey} onNavigate={closeDrawer} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

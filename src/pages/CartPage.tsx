import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Info, MessageCircle, ShoppingBag } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CartLineItem } from '../components/CartLineItem';
import { Dialog } from '../components/Dialog';
import { useCart } from '../context/CartContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatPrice } from '../lib/format';

export function CartPage() {
  const { lines, units, total, openCheckout, clear } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  useDocumentTitle('Carrito');

  return (
    <div className="shell pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Carrito' }]} />
      <h1 className="display mt-5 text-[clamp(3rem,10vw,6rem)]">Carrito</h1>

      {lines.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center sm:py-24">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface">
            <ShoppingBag className="h-7 w-7 text-muted" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold">Tu carrito está vacío</h2>
          <p className="mt-2 max-w-sm text-[15px] text-muted">Agrega productos desde el catálogo y aparecerán aquí.</p>
          <Link to="/catalogo" className="btn-primary mt-6">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-14">
          <section aria-labelledby="articulos-title">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 id="articulos-title" className="font-bold">
                {units} {units === 1 ? 'artículo' : 'artículos'}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="text-sm font-medium text-muted underline underline-offset-4 hover:text-danger"
                aria-haspopup="dialog"
              >
                Vaciar carrito
              </button>
            </div>
            <ul className="divide-y divide-line border-b border-line">
              {lines.map((l) => (
                <CartLineItem key={l.key} line={l} />
              ))}
            </ul>
            <Link to="/catalogo" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:text-accent-strong">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Seguir comprando
            </Link>
          </section>

          <aside aria-labelledby="resumen-title" className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl bg-surface p-6 sm:p-8">
              <h2 id="resumen-title" className="text-lg font-bold">
                Resumen del pedido
              </h2>
              <dl className="mt-6 space-y-3 text-[15px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Subtotal ({units} {units === 1 ? 'unidad' : 'unidades'})</dt>
                  <dd className="font-semibold tabular-nums">{formatPrice(total)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Envío</dt>
                  <dd className="text-right font-medium">Costo de envío por confirmar</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
                  <dt className="font-bold">Total de productos</dt>
                  <dd className="text-2xl font-bold tabular-nums" data-testid="cart-total">
                    {formatPrice(total)}
                  </dd>
                </div>
              </dl>
              <button type="button" onClick={openCheckout} className="btn-accent mt-6 w-full">
                <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
                Realizar pedido por WhatsApp
              </button>
              <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-muted">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                La disponibilidad, el costo de envío y el pago se confirman por WhatsApp. El total no incluye envío.
              </p>
            </div>
          </aside>
        </div>
      )}

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Vaciar el carrito?"
        footer={
          <div className="flex gap-3">
            <button type="button" className="btn-outline flex-1" onClick={() => setConfirmClear(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn flex-1 bg-danger text-white hover:bg-danger/90"
              onClick={() => {
                clear();
                setConfirmClear(false);
              }}
            >
              Vaciar
            </button>
          </div>
        }
      >
        <p className="px-5 py-6 text-[15px] text-muted sm:px-6">Se eliminarán todos los productos del carrito.</p>
      </Dialog>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Check, MessageCircle, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../types';
import type { UiArtifact } from '../../chat/controller';
import { Img } from '../Img';

export function ProductMiniCards({ products, onNavigate }: { products: Product[]; onNavigate: () => void }) {
  return (
    <ul className="mt-2 grid gap-2" aria-label="Productos sugeridos">
      {products.map((p) => (
        <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-2">
          <Img src={p.images[0].src} alt={p.images[0].alt} width={112} height={140} sizes="56px" priority className="h-[70px] w-14 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{p.name}</p>
            <p className="text-sm tabular-nums text-muted">{formatPrice(p.price)}</p>
          </div>
          <Link
            to={`/producto/${p.slug}`}
            onClick={onNavigate}
            className="shrink-0 rounded-full border border-ink/15 px-3 py-2 text-xs font-semibold transition-colors hover:border-ink"
            aria-label={`Ver producto ${p.name}`}
          >
            Ver producto
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OrderCard({ onContinue }: { onContinue: () => void }) {
  const { lines, units, total, openCheckout } = useCart();
  if (!lines.length)
    return <p className="rounded-2xl border border-line bg-surface p-3 text-sm text-muted">Tu carrito está vacío en este momento.</p>;
  return (
    <section className="rounded-2xl border border-line bg-surface p-4" aria-label="Resumen del pedido">
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
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Continuar por WhatsApp
      </button>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Completarás tus datos de entrega en un formulario y se abrirá WhatsApp con el pedido. No queda confirmado hasta que envíes el
        mensaje y coordinemos disponibilidad, entrega y pago.
      </p>
    </section>
  );
}

interface ArtifactProps {
  artifact: UiArtifact;
  onResolveRemoval: (accept: boolean) => void;
  onContinueOrder: () => void;
  busy: boolean;
}

export function ToolArtifact({ artifact, onResolveRemoval, onContinueOrder, busy }: ArtifactProps) {
  if (artifact.kind === 'cart')
    return (
      <p className="inline-flex items-start gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success" role="status">
        <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {artifact.text}
      </p>
    );
  if (artifact.kind === 'order') return <OrderCard onContinue={onContinueOrder} />;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 text-sm" aria-label="Confirmar eliminación">
      <p className="font-semibold">¿Eliminar estos artículos del carrito?</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-muted">
        {artifact.labels.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      {artifact.status === 'pending' ? (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={busy} onClick={() => onResolveRemoval(true)} className="btn min-h-10 flex-1 bg-danger px-4 text-white hover:bg-danger/90">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Sí, eliminar
          </button>
          <button type="button" disabled={busy} onClick={() => onResolveRemoval(false)} className="btn-outline min-h-10 flex-1 px-4">
            Cancelar
          </button>
        </div>
      ) : (
        <p className="mt-2 font-medium" role="status">
          {artifact.status === 'done' ? 'Artículos eliminados.' : 'Eliminación cancelada.'}
        </p>
      )}
    </section>
  );
}

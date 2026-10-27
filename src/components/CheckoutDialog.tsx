import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ExternalLink, Info, MessageCircle, Store, Truck } from 'lucide-react';
import { storeConfig } from '../config/store';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { buildOrderMessage, buildWhatsAppUrl, validateOrder } from '../lib/whatsapp';
import type { DeliveryMode, OrderDetails, OrderErrors } from '../lib/whatsapp';
import { Dialog } from './Dialog';

const deliveryOptions: { id: DeliveryMode; label: string; hint: string; Icon: typeof Truck }[] = [
  { id: 'envio', label: 'Envío', hint: 'A tu dirección', Icon: Truck },
  { id: 'recoger', label: 'Recoger', hint: 'Coordinamos el punto', Icon: Store },
];

export function CheckoutDialog() {
  const { lines, units, total, checkoutOpen, closeCheckout } = useCart();
  const [order, setOrder] = useState<OrderDetails>({ name: '', delivery: 'envio', address: '', notes: '' });
  const [errors, setErrors] = useState<OrderErrors>({});
  const [openedUrl, setOpenedUrl] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const ids = { name: useId(), address: useId(), notes: useId(), delivery: useId() };

  // Cada vez que se abre, vuelve al formulario (los datos escritos se conservan).
  useEffect(() => {
    if (checkoutOpen) {
      setOpenedUrl(null);
      setErrors({});
    }
  }, [checkoutOpen]);

  // El botón de envío desaparece: el foco pasa al mensaje para que no se pierda.
  useEffect(() => {
    if (openedUrl) successRef.current?.focus();
  }, [openedUrl]);

  const update = <K extends keyof OrderDetails>(key: K, value: OrderDetails[K]) => {
    setOrder((o) => ({ ...o, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateOrder(order);
    setErrors(found);
    if (found.name) return nameRef.current?.focus();
    if (found.address) return addressRef.current?.focus();
    if (!lines.length) return;

    const url = buildWhatsAppUrl(storeConfig.whatsappNumber, buildOrderMessage(storeConfig.name, lines, order));
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpenedUrl(url);
  };

  return (
    <Dialog
      open={checkoutOpen}
      onClose={closeCheckout}
      title={openedUrl ? 'Continúa en WhatsApp' : 'Datos para tu pedido'}
      initialFocusRef={nameRef}
    >
      {openedUrl ? (
        <div ref={successRef} tabIndex={-1} className="space-y-5 px-5 py-6 focus:outline-none sm:px-6" role="status">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/25 text-accent-strong">
            <MessageCircle className="h-7 w-7" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-lg font-bold">Abrimos WhatsApp con el detalle de tu pedido.</p>
            <p className="text-[15px] leading-relaxed text-muted">
              Para continuar, <strong className="text-ink">envía el mensaje en WhatsApp</strong>. Tu pedido aún no está
              confirmado: por ese medio te confirmaremos la disponibilidad, el costo de envío y la forma de pago.
            </p>
            <p className="text-[15px] leading-relaxed text-muted">Tu carrito sigue guardado en este navegador.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={openedUrl} target="_blank" rel="noopener noreferrer" className="btn-accent flex-1">
              <ExternalLink className="h-[18px] w-[18px]" aria-hidden="true" />
              Abrir WhatsApp de nuevo
            </a>
            <button type="button" onClick={closeCheckout} className="btn-outline flex-1">
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5 px-5 py-6 sm:px-6">
          <div className="flex items-baseline justify-between rounded-2xl bg-canvas px-4 py-3 text-sm">
            <span className="text-muted">
              {units} {units === 1 ? 'artículo' : 'artículos'} · envío por confirmar
            </span>
            <span className="text-base font-bold tabular-nums">{formatPrice(total)}</span>
          </div>

          <div>
            <label htmlFor={ids.name} className="label">
              Nombre <span className="text-danger" aria-hidden="true">*</span>
            </label>
            <input
              ref={nameRef}
              id={ids.name}
              type="text"
              autoComplete="name"
              required
              value={order.name}
              onChange={(e) => update('name', e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${ids.name}-error` : undefined}
              className={`field ${errors.name ? 'field-error' : ''}`}
            />
            {errors.name && (
              <p id={`${ids.name}-error`} className="mt-1.5 text-sm text-danger">
                {errors.name}
              </p>
            )}
          </div>

          <fieldset>
            <legend id={ids.delivery} className="label">
              Modalidad de entrega
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {deliveryOptions.map(({ id, label, hint, Icon }) => (
                <label
                  key={id}
                  className="relative flex cursor-pointer flex-col gap-1 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:ring-1 has-[:checked]:ring-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-strong"
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={id}
                    checked={order.delivery === id}
                    onChange={() => update('delivery', id)}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="font-semibold">{label}</span>
                  <span className="text-[13px] text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {order.delivery === 'envio' && (
            <div className="motion-safe:animate-fade-in">
              <label htmlFor={ids.address} className="label">
                Dirección de entrega <span className="text-danger" aria-hidden="true">*</span>
              </label>
              <textarea
                ref={addressRef}
                id={ids.address}
                rows={2}
                autoComplete="street-address"
                required
                value={order.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Calle, número, zona, municipio"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? `${ids.address}-error` : undefined}
                className={`field resize-none ${errors.address ? 'field-error' : ''}`}
              />
              {errors.address && (
                <p id={`${ids.address}-error`} className="mt-1.5 text-sm text-danger">
                  {errors.address}
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor={ids.notes} className="label">
              Observaciones <span className="font-normal text-muted">(opcional)</span>
            </label>
            <textarea
              id={ids.notes}
              rows={2}
              value={order.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Horario de entrega, referencias, dudas sobre tallas…"
              className="field resize-none"
            />
          </div>

          <p className="flex gap-2 text-[13px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Se abrirá WhatsApp con tu pedido listo para enviar. La disponibilidad, el envío y el pago se confirman por ese
            medio.
          </p>

          <button type="submit" className="btn-accent w-full" disabled={!lines.length}>
            <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
            Abrir WhatsApp con mi pedido
          </button>
        </form>
      )}
    </Dialog>
  );
}

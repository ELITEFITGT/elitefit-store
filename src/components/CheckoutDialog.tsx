import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, Store, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { departamentos, emptyCustomer, validateCustomer } from '../lib/order';
import type { DeliveryMode, OrderCustomer, OrderErrors, OrderRequestBody, OrderResponseBody } from '../lib/order';
import { Dialog } from './Dialog';

export const ORDER_ENDPOINT = '/api/pedidos';

const deliveryOptions: { id: DeliveryMode; label: string; hint: string; Icon: typeof Truck }[] = [
  { id: 'envio', label: 'Envío', hint: 'A tu dirección', Icon: Truck },
  { id: 'recoger', label: 'Recoger', hint: 'Coordinamos el punto', Icon: Store },
];

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

type Status = { state: 'form' } | { state: 'sending' } | { state: 'done'; orderNumber: number; total: number };

export function CheckoutDialog() {
  const { lines, units, total, savings, checkoutOpen, closeCheckout, clear } = useCart();
  const [customer, setCustomer] = useState<OrderCustomer>(emptyCustomer);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [status, setStatus] = useState<Status>({ state: 'form' });
  const [serverError, setServerError] = useState<string | null>(null);
  // Un identificador por intento de compra: si se reenvía, el servidor no duplica el pedido.
  const checkoutId = useRef(uuid());
  const refs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    department: useRef<HTMLSelectElement>(null),
    municipality: useRef<HTMLInputElement>(null),
    address: useRef<HTMLTextAreaElement>(null),
  };
  const successRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const id = (k: string) => `${uid}-${k}`;

  // Al abrir: vuelve al formulario si el pedido anterior ya se registró (los datos escritos se conservan).
  useEffect(() => {
    if (!checkoutOpen) return;
    setErrors({});
    setServerError(null);
    setStatus((s) => (s.state === 'done' ? { state: 'form' } : s));
  }, [checkoutOpen]);

  useEffect(() => {
    if (status.state === 'done') successRef.current?.focus();
  }, [status.state]);

  const update = <K extends keyof OrderCustomer>(key: K, value: OrderCustomer[K]) => {
    setCustomer((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.state === 'sending' || !lines.length) return;
    const found = validateCustomer(customer);
    setErrors(found);
    setServerError(null);
    const first = (Object.keys(refs) as (keyof typeof refs)[]).find((k) => found[k]);
    if (first) return refs[first].current?.focus();

    const body: OrderRequestBody = {
      checkoutId: checkoutId.current,
      customer,
      lines: lines.map((l) => ({ productId: l.productId, color: l.color, size: l.size, quantity: l.quantity })),
    };
    setStatus({ state: 'sending' });
    try {
      const res = await fetch(ORDER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as OrderResponseBody | null;
      if (!data?.ok) throw new Error(data?.message || 'No pudimos registrar tu pedido. Intenta de nuevo.');
      setStatus({ state: 'done', orderNumber: data.orderNumber, total: data.total });
      clear();
      checkoutId.current = uuid();
      setCustomer((c) => ({ ...emptyCustomer, name: c.name, phone: c.phone }));
    } catch (err) {
      setStatus({ state: 'form' });
      setServerError(
        err instanceof TypeError || (err as Error).message.startsWith('Unexpected')
          ? 'No pudimos conectar con la tienda. Revisa tu conexión e intenta de nuevo.'
          : (err as Error).message,
      );
    }
  };

  const sending = status.state === 'sending';

  return (
    <Dialog
      open={checkoutOpen}
      onClose={closeCheckout}
      title={status.state === 'done' ? '¡Pedido recibido!' : 'Datos para tu pedido'}
      initialFocusRef={refs.name}
    >
      {status.state === 'done' ? (
        <div ref={successRef} tabIndex={-1} className="space-y-5 px-5 py-6 text-center focus:outline-none sm:px-6" role="status">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/25 text-accent-strong motion-safe:animate-pop">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Pedido</p>
            <p className="display text-5xl tabular-nums">#{status.orderNumber}</p>
            <p className="text-[15px] leading-relaxed text-muted">
              Total de productos: <strong className="text-ink">{formatPrice(status.total)}</strong>
            </p>
            <p className="text-[15px] leading-relaxed text-muted">
              Recibimos tu pedido. <strong className="text-ink">Te contactaremos al teléfono que nos diste</strong> para confirmar la
              disponibilidad, el costo de envío y la forma de pago.
            </p>
          </div>
          <button type="button" onClick={closeCheckout} className="btn-primary w-full">
            Seguir comprando
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5 px-5 py-6 sm:px-6" aria-busy={sending}>
          <div className="flex items-baseline justify-between rounded-lg bg-canvas px-4 py-3 text-sm">
            <span className="text-muted">
              {units} {units === 1 ? 'artículo' : 'artículos'} · envío por confirmar
              {savings > 0 && (
                <span className="mt-0.5 block font-semibold text-accent-strong">Ahorras {formatPrice(savings)}</span>
              )}
            </span>
            <span className="text-base font-bold tabular-nums">{formatPrice(total)}</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" id={id('name')} error={errors.name}>
              <input
                ref={refs.name}
                id={id('name')}
                type="text"
                autoComplete="name"
                value={customer.name}
                onChange={(e) => update('name', e.target.value)}
                {...fieldProps(id('name'), errors.name)}
              />
            </Field>
            <Field label="Teléfono" id={id('phone')} error={errors.phone}>
              <input
                ref={refs.phone}
                id={id('phone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="5555 5555"
                value={customer.phone}
                onChange={(e) => update('phone', e.target.value)}
                {...fieldProps(id('phone'), errors.phone)}
              />
            </Field>
          </div>

          <fieldset>
            <legend className="label">Modalidad de entrega</legend>
            <div className="grid grid-cols-2 gap-3">
              {deliveryOptions.map(({ id: opt, label, hint, Icon }) => (
                <label
                  key={opt}
                  className="relative flex cursor-pointer flex-col gap-1 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-ink/40 has-[:checked]:border-ink has-[:checked]:ring-1 has-[:checked]:ring-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-strong"
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={opt}
                    checked={customer.delivery === opt}
                    onChange={() => update('delivery', opt)}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="font-semibold">{label}</span>
                  <span className="text-[13px] text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {customer.delivery === 'envio' && (
            <div className="space-y-5 motion-safe:animate-fade-in">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Departamento" id={id('department')} error={errors.department}>
                  <select
                    ref={refs.department}
                    id={id('department')}
                    autoComplete="address-level1"
                    value={customer.department}
                    onChange={(e) => update('department', e.target.value)}
                    {...fieldProps(id('department'), errors.department)}
                  >
                    <option value="">Selecciona…</option>
                    {departamentos.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Municipio" id={id('municipality')} error={errors.municipality}>
                  <input
                    ref={refs.municipality}
                    id={id('municipality')}
                    type="text"
                    autoComplete="address-level2"
                    value={customer.municipality}
                    onChange={(e) => update('municipality', e.target.value)}
                    {...fieldProps(id('municipality'), errors.municipality)}
                  />
                </Field>
              </div>
              <Field label="Dirección" id={id('address')} error={errors.address}>
                <textarea
                  ref={refs.address as RefObject<HTMLTextAreaElement>}
                  id={id('address')}
                  rows={2}
                  autoComplete="street-address"
                  placeholder="Calle, número, zona, colonia"
                  value={customer.address}
                  onChange={(e) => update('address', e.target.value)}
                  {...fieldProps(id('address'), errors.address, 'resize-none')}
                />
              </Field>
              <Field label="Referencia" id={id('reference')} optional error={errors.reference}>
                <input
                  id={id('reference')}
                  type="text"
                  placeholder="Color de la casa, frente a…"
                  value={customer.reference}
                  onChange={(e) => update('reference', e.target.value)}
                  {...fieldProps(id('reference'), errors.reference)}
                />
              </Field>
            </div>
          )}

          {serverError && (
            <p role="alert" className="flex gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {serverError}
            </p>
          )}

          <p className="flex gap-2 text-[13px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Al confirmar, registramos tu pedido y te contactamos para confirmar disponibilidad, envío y pago.
          </p>

          <button type="submit" className="btn-accent w-full" disabled={!lines.length || sending}>
            {sending ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
                Enviando pedido…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-[18px] w-[18px]" aria-hidden="true" />
                Confirmar pedido
              </>
            )}
          </button>
        </form>
      )}
    </Dialog>
  );
}

function fieldProps(fieldId: string, error: string | undefined, extra = '') {
  return {
    'aria-invalid': !!error,
    'aria-describedby': error ? `${fieldId}-error` : undefined,
    className: `field ${extra} ${error ? 'field-error' : ''}`,
  };
}

function Field({
  label,
  id,
  error,
  optional,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}{' '}
        {optional ? <span className="font-normal text-muted">(opcional)</span> : <span className="text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

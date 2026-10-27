import type { DetailedLine } from './cart';
import { cartTotals } from './cart';
import { formatPrice } from './format';

export type DeliveryMode = 'envio' | 'recoger';

export interface OrderDetails {
  name: string;
  delivery: DeliveryMode;
  address: string;
  notes: string;
}

export const deliveryLabels: Record<DeliveryMode, string> = {
  envio: 'Envío a domicilio',
  recoger: 'Recoger',
};

export type OrderErrors = Partial<Record<'name' | 'address', string>>;

export function validateOrder(order: OrderDetails): OrderErrors {
  const errors: OrderErrors = {};
  if (order.name.trim().length < 2) errors.name = 'Escribe tu nombre (mínimo 2 caracteres).';
  if (order.delivery === 'envio' && order.address.trim().length < 5)
    errors.address = 'Escribe la dirección de entrega para el envío.';
  return errors;
}

/** Construye el texto del pedido que se envía por WhatsApp. */
export function buildOrderMessage(storeName: string, lines: DetailedLine[], order: OrderDetails): string {
  const { units, total } = cartTotals(lines);
  const items = lines.map((l, i) =>
    [
      `${i + 1}. ${l.product.name}`,
      `   ${l.size ? `Talla: ${l.size}` : 'Talla única'} | Color: ${l.color}`,
      `   Cantidad: ${l.quantity} x ${formatPrice(l.unitPrice)} = ${formatPrice(l.subtotal)}`,
    ].join('\n'),
  );

  const parts = [
    `Hola, ${storeName}. Quiero hacer un pedido:`,
    '',
    `*Cliente:* ${order.name.trim()}`,
    '',
    '*Productos:*',
    items.join('\n\n'),
    '',
    `*Artículos:* ${units} ${units === 1 ? 'unidad' : 'unidades'}`,
    `*Total de productos:* ${formatPrice(total)}`,
    '*Envío:* por confirmar',
    '',
    `*Entrega:* ${deliveryLabels[order.delivery]}`,
  ];
  if (order.delivery === 'envio') parts.push(`*Dirección:* ${order.address.trim()}`);
  if (order.notes.trim()) parts.push(`*Observaciones:* ${order.notes.trim()}`);
  parts.push('', 'Quedo pendiente de la confirmación de disponibilidad, envío y pago.');
  return parts.join('\n');
}

/** Enlace wa.me con el mensaje codificado. Acepta números con espacios o "+". */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

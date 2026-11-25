/**
 * Pedido web: tipos y validaciones compartidos entre la tienda (navegador) y el servidor (/api/pedidos).
 * El pedido se guarda en Supabase (pedidos_carrito y pedidos_carrito_detalles); el equipo contacta al cliente.
 */

export type DeliveryMode = 'envio' | 'recoger';

export const deliveryLabels: Record<DeliveryMode, string> = {
  envio: 'Envío a domicilio',
  recoger: 'Recoger',
};

export const departamentos = [
  'Alta Verapaz',
  'Baja Verapaz',
  'Chimaltenango',
  'Chiquimula',
  'El Progreso',
  'Escuintla',
  'Guatemala',
  'Huehuetenango',
  'Izabal',
  'Jalapa',
  'Jutiapa',
  'Petén',
  'Quetzaltenango',
  'Quiché',
  'Retalhuleu',
  'Sacatepéquez',
  'San Marcos',
  'Santa Rosa',
  'Sololá',
  'Suchitepéquez',
  'Totonicapán',
  'Zacapa',
] as const;

export interface OrderCustomer {
  name: string;
  phone: string;
  delivery: DeliveryMode;
  department: string;
  municipality: string;
  address: string;
  reference: string;
}

export interface OrderLineInput {
  productId: string;
  color: string;
  size: string | null;
  quantity: number;
}

export interface OrderRequestBody {
  /** Identificador de este intento de compra: si se reenvía (doble clic, reintento) no se duplica el pedido. */
  checkoutId: string;
  customer: OrderCustomer;
  lines: OrderLineInput[];
}

export type OrderResponseBody =
  | { ok: true; orderNumber: number; total: number }
  | { ok: false; error: string; message: string };

export type OrderErrors = Partial<Record<keyof OrderCustomer, string>>;

export const emptyCustomer: OrderCustomer = {
  name: '',
  phone: '',
  delivery: 'envio',
  department: '',
  municipality: '',
  address: '',
  reference: '',
};

const digits = (s: string) => s.replace(/\D/g, '');

/** Validación del formulario (se repite en el servidor). */
export function validateCustomer(c: OrderCustomer): OrderErrors {
  const errors: OrderErrors = {};
  if (c.name.trim().length < 2) errors.name = 'Escribe tu nombre (mínimo 2 caracteres).';
  else if (c.name.trim().length > 80) errors.name = 'El nombre es demasiado largo.';
  const phone = digits(c.phone);
  if (phone.length < 8 || phone.length > 15) errors.phone = 'Escribe un teléfono válido (8 dígitos).';
  if (c.delivery === 'envio') {
    if (!(departamentos as readonly string[]).includes(c.department)) errors.department = 'Elige el departamento.';
    if (c.municipality.trim().length < 2) errors.municipality = 'Escribe el municipio.';
    if (c.address.trim().length < 5) errors.address = 'Escribe la dirección de entrega.';
  }
  for (const key of ['municipality', 'address', 'reference'] as const)
    if (c[key].length > 200 && !errors[key]) errors[key] = 'El texto es demasiado largo.';
  return errors;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

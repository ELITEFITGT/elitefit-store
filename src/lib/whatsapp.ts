/**
 * WhatsApp solo para consultas (los pedidos se registran en Supabase: ver src/lib/order.ts).
 * Enlace wa.me con el mensaje codificado. Acepta números con espacios o "+".
 */
export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

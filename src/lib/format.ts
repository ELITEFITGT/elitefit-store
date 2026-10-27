import { storeConfig } from '../config/store';

const formatter = new Intl.NumberFormat(storeConfig.currency.locale, {
  style: 'currency',
  currency: storeConfig.currency.code,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea un monto en quetzales, p. ej. 1234.5 => "Q1,234.50". */
export const formatPrice = (amount: number) => formatter.format(amount);

/** Redondea a centavos para evitar errores de punto flotante. */
export const roundMoney = (amount: number) => Math.round(amount * 100) / 100;

/** Minúsculas y sin tildes, para búsquedas. */
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

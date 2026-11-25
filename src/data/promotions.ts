import type { Promotion } from '../types.js';

/**
 * PROMOCIONES Y DESCUENTOS (por ahora se editan aquí; más adelante vendrán de la base de datos)
 * Los campos son los mismos del panel de promociones. Para agregar una, copia un bloque { ... }.
 *
 * - id: único, sin espacios. Se puede enlazar con /promociones#<id>.
 * - banner: arte de la promoción. Guarda la imagen en public/promociones/ (ideal 1600 × 580 px, proporción 11:4).
 * - status: 'activa' o 'pausada'.
 * - rule (regla de descuento):
 *     { type: 'percent', value: 25 }                    25 % de descuento en cada unidad
 *     { type: 'amount', value: 20 }                     Q20 de descuento en cada unidad
 *     { type: 'nth-unit', every: 2, percent: 50 }       50 % en 1 de cada 2 unidades (segundo par a mitad)
 *     { type: 'nth-unit', every: 2, percent: 100 }      2x1
 *   En las reglas por cantidad el descuento va a las unidades de menor precio
 *   (cheapestFirst: false para dárselo a las de mayor precio).
 * - appliesTo: 'all', o { categories: ['mujer', 'hombre', 'calzado', 'accesorios'] } y/o
 *   { products: ['Nombre del producto'] } (no importan mayúsculas ni tildes).
 * - appliesToLabel: texto de "Aplica a …" (p. ej. 'Zapatos').
 * - combineProducts: solo reglas por cantidad; true = "combinando productos" (un par de cada modelo cuenta).
 * - startsAt / endsAt: AAAA-MM-DD, ambos días incluidos (hora de Guatemala).
 * - channels: ['tienda-en-linea', 'sucursales']. Si no incluye 'tienda-en-linea', la web la anuncia
 *   como "Solo en sucursales" pero no la cobra.
 * - priority: 1 = la primera. A cada producto se le aplica una sola promoción: la de menor número.
 * - badge: etiqueta corta en las fotos de producto (opcional).
 */
export const promotions: Promotion[] = [
  {
    id: 'segundo-par-mitad',
    title: 'Segundo par a mitad de precio',
    banner: {
      src: '/promociones/sneakers-segundo-par.jpg',
      alt: 'Sneakers ELITEFIT: segundo par a mitad de precio',
    },
    status: 'activa',
    rule: { type: 'nth-unit', every: 2, percent: 50 },
    appliesTo: { categories: ['calzado'] },
    appliesToLabel: 'Zapatos',
    combineProducts: true,
    startsAt: '2026-11-08',
    endsAt: '2026-12-15',
    channels: ['sucursales', 'tienda-en-linea'],
    priority: 1,
    badge: '2.º par a mitad',
  },
];

export type CategoryId = 'mujer' | 'hombre' | 'calzado' | 'accesorios';

export interface ProductImage {
  /** URL completa de la imagen (Unsplash u otra) o ruta local, p. ej. /productos/leggings.jpg */
  src: string;
  alt: string;
  /** Color que muestra la foto (nombre igual al de `colors`). Sin valor: foto general del producto. */
  color?: string;
}

export interface ProductColor {
  name: string;
  /** Color en formato hexadecimal para la muestra visual. */
  hex: string;
}

export interface Product {
  id: string;
  /** Parte final de la URL: /producto/<slug> */
  slug: string;
  name: string;
  category: CategoryId;
  price: number;
  description: string;
  details: string[];
  /** Tallas disponibles. Un arreglo vacío significa talla única (no se pide selección). */
  sizes: string[];
  colors: ProductColor[];
  images: ProductImage[];
  /** Fecha de ingreso (AAAA-MM-DD). Se usa para ordenar por novedades. */
  addedAt: string;
  featured?: boolean;
  isNew?: boolean;
  /** Tabla de guía de tallas que aplica (si tiene tallas). */
  sizeGuide?: 'mujer' | 'hombre' | 'calzado';
}

export interface CartLine {
  productId: string;
  size: string | null;
  color: string;
  quantity: number;
}

/**
 * Regla de descuento de una promoción.
 * - percent: porcentaje de descuento en cada unidad (25 = 25 %).
 * - amount: quetzales de descuento en cada unidad.
 * - nth-unit: `percent` de descuento en 1 de cada `every` unidades
 *   (every 2 + percent 50 = "segundo par a mitad de precio"; every 2 + percent 100 = "2x1").
 *   Por defecto el descuento va a las unidades de menor precio.
 */
export type PromotionRule =
  | { type: 'percent'; value: number }
  | { type: 'amount'; value: number }
  | { type: 'nth-unit'; every: number; percent: number; cheapestFirst?: boolean };

export type PromotionStatus = 'activa' | 'pausada';
export type PromotionChannel = 'tienda-en-linea' | 'sucursales';

export interface Promotion {
  /** Identificador único; también se usa como ancla en /promociones#<id>. */
  id: string;
  title: string;
  /** Banner de la promoción (arte con su propio texto). Se muestra tal cual, sin filtros ni textos encima. */
  banner: ProductImage;
  /** 'pausada' la oculta y deja de aplicarla aunque esté en fechas. */
  status: PromotionStatus;
  rule: PromotionRule;
  /** Productos a los que aplica: 'all' (toda la tienda), categorías y/o productos por su nombre. */
  appliesTo: 'all' | { categories?: CategoryId[]; products?: string[] };
  /** Cómo se nombra lo que aplica en el texto "Aplica a …" (p. ej. "Zapatos"). Sin valor: se arma solo. */
  appliesToLabel?: string;
  /** Solo reglas por cantidad: true = se pueden combinar productos distintos para completar la cantidad. */
  combineProducts?: boolean;
  /** Fechas de inicio y fin (AAAA-MM-DD), ambas incluidas, en hora de Guatemala. */
  startsAt: string;
  endsAt: string;
  /** Dónde vale. Solo las que incluyen 'tienda-en-linea' se cobran en la web. */
  channels: PromotionChannel[];
  /** 1 = la primera. Si a un producto le aplican varias, se usa la de menor número. */
  priority: number;
  /** Etiqueta corta para las fotos de producto (p. ej. "2.º par a mitad"). Sin valor: se arma sola. */
  badge?: string;
}

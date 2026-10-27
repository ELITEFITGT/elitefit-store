export type CategoryId = 'mujer' | 'hombre' | 'calzado' | 'accesorios';

export interface ProductImage {
  /** URL completa de la imagen (Unsplash u otra) o ruta local, p. ej. /productos/leggings.jpg */
  src: string;
  alt: string;
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

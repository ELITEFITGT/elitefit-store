import type { ProductImage } from '../types';
import { unsplash } from './products';

/**
 * CARRUSEL DE LA PORTADA (pantalla completa, sin textos sobre la foto)
 * Cada diapositiva es un paso del carrusel. Edita las fotos y los botones aquí.
 * - label: nombre del paso (lo leen los lectores de pantalla; no se muestra).
 * - position: encuadre de la foto (CSS object-position) en pantallas anchas y en celular.
 * Usa fotos de entrenamiento o ropa fitness que no se repitan en el resto de la tienda
 * y que se vean bien recortadas en horizontal (computadora) y en vertical (celular).
 */
export interface HeroSlide {
  label: string;
  image: ProductImage;
  position?: { desktop?: string; mobile?: string };
  cta: { label: string; to: string };
}

/** Segundos que permanece cada paso antes de avanzar. */
export const HERO_SLIDE_SECONDS = 4.5;

export const heroSlides: HeroSlide[] = [
  {
    label: 'Mujer',
    image: unsplash('1546483875-ad9014c88eba', 'Mujer con top blanco y leggings rojos entrenando con mancuernas en el gimnasio'),
    position: { desktop: 'center 40%', mobile: '66% center' },
    cta: { label: 'Ver Mujer', to: '/catalogo?categoria=mujer' },
  },
  {
    label: 'Hombre',
    image: unsplash('1483721310020-03333e577078', 'Hombre con camiseta deportiva negra atándose las zapatillas antes de entrenar'),
    position: { desktop: 'center 20%', mobile: '64% center' },
    cta: { label: 'Ver Hombre', to: '/catalogo?categoria=hombre' },
  },
  {
    label: 'Entrenamiento',
    image: unsplash('1599058917212-d750089bc07e', 'Hombre con ropa deportiva entrenando con cuerdas de batalla en un espacio urbano'),
    position: { desktop: 'center 55%', mobile: '78% center' },
    cta: { label: 'Ver colección', to: '/catalogo' },
  },
  {
    label: 'Novedades',
    image: unsplash('1550259979-ed79b48d2a30', 'Mujer con top deportivo y leggings haciendo plancha lateral en el gimnasio'),
    position: { desktop: 'center 25%', mobile: '74% center' },
    cta: { label: 'Ver novedades', to: '/catalogo?orden=novedades' },
  },
];

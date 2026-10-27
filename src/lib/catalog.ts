import type { CategoryId, Product } from '../types';
import { normalize } from './format';

export const sortOptions = [
  { id: 'destacados', label: 'Destacados' },
  { id: 'novedades', label: 'Novedades' },
  { id: 'precio-asc', label: 'Menor precio' },
  { id: 'precio-desc', label: 'Mayor precio' },
] as const;
export type SortId = (typeof sortOptions)[number]['id'];

/** Rangos del filtro de precio (en quetzales). Edítalos libremente. */
export const priceRanges = [
  { id: 'hasta-200', label: 'Hasta Q200', min: 0, max: 200 },
  { id: '200-350', label: 'Q200 a Q350', min: 200, max: 350 },
  { id: 'mas-de-350', label: 'Más de Q350', min: 350, max: Infinity },
] as const;
export type PriceRangeId = (typeof priceRanges)[number]['id'];

export interface CatalogFilters {
  q: string;
  categories: CategoryId[];
  sizes: string[];
  price: PriceRangeId | null;
  sort: SortId;
}

export const emptyFilters: CatalogFilters = { q: '', categories: [], sizes: [], price: null, sort: 'destacados' };

const categoryIds: CategoryId[] = ['mujer', 'hombre', 'calzado', 'accesorios'];

/** Lee los filtros desde los parámetros de la URL, ignorando valores desconocidos. */
export function filtersFromParams(params: URLSearchParams): CatalogFilters {
  const list = (key: string) =>
    (params.get(key) ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  const sort = params.get('orden');
  const price = params.get('precio');
  return {
    q: params.get('q') ?? '',
    categories: list('categoria').filter((c): c is CategoryId => categoryIds.includes(c as CategoryId)),
    sizes: list('talla').map((s) => s.toUpperCase()),
    price: priceRanges.some((r) => r.id === price) ? (price as PriceRangeId) : null,
    sort: sortOptions.some((o) => o.id === sort) ? (sort as SortId) : 'destacados',
  };
}

/** Convierte los filtros en parámetros de URL (omite los vacíos). */
export function filtersToParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q);
  if (filters.categories.length) params.set('categoria', filters.categories.join(','));
  if (filters.sizes.length) params.set('talla', filters.sizes.join(','));
  if (filters.price) params.set('precio', filters.price);
  if (filters.sort !== 'destacados') params.set('orden', filters.sort);
  return params;
}

export function countActiveFilters(filters: CatalogFilters) {
  return (filters.q.trim() ? 1 : 0) + filters.categories.length + filters.sizes.length + (filters.price ? 1 : 0);
}

export function filterProducts(products: Product[], filters: CatalogFilters): Product[] {
  const query = normalize(filters.q);
  const range = priceRanges.find((r) => r.id === filters.price);

  const result = products.filter((p) => {
    if (query && !normalize(p.name).includes(query)) return false;
    if (filters.categories.length && !filters.categories.includes(p.category)) return false;
    if (filters.sizes.length && !p.sizes.some((s) => filters.sizes.includes(s))) return false;
    if (range && (p.price < range.min || p.price >= range.max)) return false;
    return true;
  });

  // Se conserva el índice original para que el orden sea estable.
  const indexed = result.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => {
    switch (filters.sort) {
      case 'precio-asc':
        return a.p.price - b.p.price || a.i - b.i;
      case 'precio-desc':
        return b.p.price - a.p.price || a.i - b.i;
      case 'novedades':
        return b.p.addedAt.localeCompare(a.p.addedAt) || a.i - b.i;
      default:
        return Number(!!b.p.featured) - Number(!!a.p.featured) || a.i - b.i;
    }
  });
  return indexed.map(({ p }) => p);
}

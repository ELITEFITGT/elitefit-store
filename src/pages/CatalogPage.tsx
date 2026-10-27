import { useEffect, useId, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownUp, ChevronDown, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { CatalogFilters } from '../components/CatalogFilters';
import { Dialog } from '../components/Dialog';
import { ProductGrid } from '../components/ProductCard';
import { categories, categoryName, products } from '../data/products';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  countActiveFilters,
  emptyFilters,
  filterProducts,
  filtersFromParams,
  filtersToParams,
  priceRanges,
  sortOptions,
} from '../lib/catalog';
import type { CatalogFilters as Filters, SortId } from '../lib/catalog';
import type { CategoryId } from '../types';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const results = useMemo(() => filterProducts(products, filters), [filters]);
  const activeCount = countActiveFilters(filters);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState(filters.q);
  const searchId = useId();
  const sortId = useId();

  // Mantiene el campo de búsqueda alineado con la URL (p. ej. al buscar desde el encabezado).
  useEffect(() => {
    setQuery(filters.q);
  }, [filters.q]);

  const apply = (next: Filters) => setParams(filtersToParams(next), { replace: true });

  // Cuenta por categoría con el resto de filtros aplicados (sin el de categoría).
  const categoryCounts = useMemo(() => {
    const base = filterProducts(products, { ...filters, categories: [] });
    return Object.fromEntries(categories.map((c) => [c.id, base.filter((p) => p.category === c.id).length])) as Record<
      CategoryId,
      number
    >;
  }, [filters]);

  const title =
    filters.categories.length === 1 ? categoryName(filters.categories[0]) : filters.sort === 'novedades' && !activeCount ? 'Novedades' : 'Catálogo';
  useDocumentTitle(title);

  const chips = [
    ...(filters.q.trim() ? [{ key: 'q', label: `“${filters.q.trim()}”`, remove: () => apply({ ...filters, q: '' }) }] : []),
    ...filters.categories.map((c) => ({
      key: `c-${c}`,
      label: categoryName(c),
      remove: () => apply({ ...filters, categories: filters.categories.filter((x) => x !== c) }),
    })),
    ...filters.sizes.map((s) => ({
      key: `s-${s}`,
      label: `Talla ${s}`,
      remove: () => apply({ ...filters, sizes: filters.sizes.filter((x) => x !== s) }),
    })),
    ...(filters.price
      ? [{ key: 'p', label: priceRanges.find((r) => r.id === filters.price)!.label, remove: () => apply({ ...filters, price: null }) }]
      : []),
  ];

  const clearAll = () => apply({ ...emptyFilters, sort: filters.sort });

  return (
    <div className="shell pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: title }]} />

      <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="display text-[clamp(3rem,10vw,6rem)]">{title}</h1>
        <p className="pb-2 text-sm text-muted" aria-live="polite">
          {results.length} {results.length === 1 ? 'producto' : 'productos'}
        </p>
      </div>

      {/* Barra de herramientas: búsqueda, filtros (móvil) y orden */}
      <div className="sticky top-16 z-30 -mx-4 mt-6 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
            <label htmlFor={searchId} className="sr-only">
              Buscar por nombre
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                apply({ ...filters, q: e.target.value });
              }}
              placeholder="Buscar por nombre"
              autoComplete="off"
              className="h-12 w-full rounded-full border border-line bg-surface pl-11 pr-4 text-base placeholder:text-muted/80 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:max-w-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="btn-outline h-12 flex-1 px-4 sm:flex-none lg:hidden"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filtros
            {activeCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-ink">
                {activeCount}
              </span>
            )}
          </button>

          <div className="relative flex-1 sm:flex-none">
            <label htmlFor={sortId} className="sr-only">
              Ordenar por
            </label>
            <select
              id={sortId}
              value={filters.sort}
              onChange={(e) => apply({ ...filters, sort: e.target.value as SortId })}
              className="h-12 w-full appearance-none rounded-full border border-line bg-surface pl-10 pr-10 text-sm font-semibold focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink sm:w-auto"
            >
              {sortOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <ArrowDownUp className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros activos" role="group">
          <span className="mr-1 text-sm text-muted">
            {activeCount} {activeCount === 1 ? 'filtro activo' : 'filtros activos'}:
          </span>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.remove}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-medium text-canvas transition-colors hover:bg-ink/80"
              aria-label={`Quitar filtro ${c.label}`}
            >
              {c.label}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={clearAll} className="h-9 px-2 text-sm font-semibold underline underline-offset-4 hover:text-accent-strong">
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_1fr] xl:gap-14">
        <aside className="hidden lg:block" aria-label="Filtros">
          <div className="sticky top-28">
            <CatalogFilters filters={filters} onChange={apply} categoryCounts={categoryCounts} idPrefix="desk" />
          </div>
        </aside>

        <section aria-label="Resultados">
          {results.length > 0 ? (
            <ProductGrid products={results} priorityCount={4} />
          ) : (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center sm:py-24">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                <SearchX className="h-7 w-7 text-muted" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-bold">No encontramos productos</h2>
              <p className="mt-2 max-w-sm text-[15px] text-muted">
                Prueba con otro término de búsqueda o quita algunos filtros para ver más resultados.
              </p>
              <button type="button" onClick={clearAll} className="btn-primary mt-6">
                Limpiar filtros
              </button>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Filtros"
        variant="right"
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={clearAll} className="btn-outline flex-1 px-4" disabled={!activeCount}>
              Limpiar
            </button>
            <button type="button" onClick={() => setMobileOpen(false)} className="btn-primary flex-[2] px-4">
              Ver {results.length} {results.length === 1 ? 'producto' : 'productos'}
            </button>
          </div>
        }
      >
        <div className="px-5 py-6">
          <CatalogFilters filters={filters} onChange={apply} categoryCounts={categoryCounts} idPrefix="mob" />
        </div>
      </Dialog>
    </div>
  );
}

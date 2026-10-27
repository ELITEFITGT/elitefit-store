import { categories, shoeSizeOrder, sizeOrder } from '../data/products';

const sizeGroups = [
  { id: 'ropa', legend: 'Talla', sizes: sizeOrder },
  { id: 'calzado', legend: 'Talla de calzado (US)', sizes: shoeSizeOrder },
];
import { priceRanges } from '../lib/catalog';
import type { CatalogFilters as Filters } from '../lib/catalog';
import type { CategoryId } from '../types';

interface CatalogFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  /** Cantidad de productos por categoría, para mostrar junto a cada opción. */
  categoryCounts: Record<CategoryId, number>;
  idPrefix: string;
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function CatalogFilters({ filters, onChange, categoryCounts, idPrefix }: CatalogFiltersProps) {
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-3 text-sm font-bold uppercase tracking-[0.12em]">Categoría</legend>
        <ul className="space-y-1">
          {categories.map((c) => {
            const id = `${idPrefix}-cat-${c.id}`;
            return (
              <li key={c.id}>
                <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-[15px]">
                  <input
                    id={id}
                    type="checkbox"
                    checked={filters.categories.includes(c.id)}
                    onChange={() => onChange({ ...filters, categories: toggle(filters.categories, c.id) })}
                    className="h-5 w-5 rounded border-line accent-ink"
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-sm tabular-nums text-muted">{categoryCounts[c.id]}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {sizeGroups.map((group) => (
        <fieldset key={group.id}>
          <legend className="mb-3 text-sm font-bold uppercase tracking-[0.12em]">{group.legend}</legend>
          <ul className="grid grid-cols-4 gap-2 lg:grid-cols-3">
            {group.sizes.map((s) => {
              const id = `${idPrefix}-size-${s}`;
              const checked = filters.sizes.includes(s);
              return (
                <li key={s}>
                  <input
                    id={id}
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => onChange({ ...filters, sizes: toggle(filters.sizes, s) })}
                  />
                  <label
                    htmlFor={id}
                    className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-sm font-semibold transition-colors hover:border-ink/50 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-canvas peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-strong"
                  >
                    {s}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      <fieldset>
        <legend className="mb-3 text-sm font-bold uppercase tracking-[0.12em]">Precio</legend>
        <ul className="space-y-1">
          {[{ id: null, label: 'Cualquier precio' }, ...priceRanges].map((r) => {
            const id = `${idPrefix}-price-${r.id ?? 'todos'}`;
            return (
              <li key={id}>
                <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg py-1.5 text-[15px]">
                  <input
                    id={id}
                    type="radio"
                    name={`${idPrefix}-price`}
                    checked={filters.price === r.id}
                    onChange={() => onChange({ ...filters, price: r.id })}
                    className="h-5 w-5 border-line accent-ink"
                  />
                  {r.label}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </div>
  );
}

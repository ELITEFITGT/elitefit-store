import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-[13px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && (
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
            )}
            <li className="min-w-0">
              {item.to ? (
                <Link to={item.to} className="hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="block truncate font-medium text-ink">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

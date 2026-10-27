import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { navLinks } from '../config/navigation';
import { infoPages } from '../data/info';
import { Dialog } from './Dialog';
import { SearchForm } from './SearchForm';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Cierra el menú al navegar a otra página.
  useEffect(() => {
    onCloseRef.current();
  }, [location.pathname, location.search]);

  return (
    <Dialog open={open} onClose={onClose} title="Menú" variant="left" initialFocusRef={firstLinkRef}>
      <div className="flex flex-col gap-8 px-5 py-6">
        <nav aria-label="Menú móvil">
          <ul className="divide-y divide-line border-y border-line">
            {navLinks.map((l, i) => (
              <li key={l.to}>
                <Link
                  ref={i === 0 ? firstLinkRef : undefined}
                  to={l.to}
                  onClick={onClose}
                  className="display flex items-center justify-between py-4 text-[28px]"
                >
                  {l.label}
                  <ArrowRight className="h-5 w-5 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <SearchForm onSubmitted={onClose} />
        <div>
          <p className="eyebrow mb-3">Información</p>
          <ul className="space-y-2.5 text-[15px]">
            {infoPages.map((p) => (
              <li key={p.slug}>
                <Link to={`/info/${p.slug}`} onClick={onClose} className="text-muted hover:text-ink">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}

import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { navLinks } from '../config/navigation';
import { storeConfig } from '../config/store';
import { useCart } from '../context/CartContext';
import { Logo } from './Logo';
import { MobileMenu } from './MobileMenu';
import { SearchForm } from './SearchForm';

const AnnouncementBar = forwardRef<HTMLDivElement, { overlay: boolean }>(function AnnouncementBar({ overlay }, ref) {
  if (!storeConfig.announcement) return null;
  return (
    <div ref={ref} className={`text-canvas transition-colors duration-300 ${overlay ? 'border-b border-white/15 bg-black/20' : 'bg-ink'}`}>
      <p className="shell py-2 text-center text-[12px] font-medium tracking-wide sm:text-[13px]">{storeConfig.announcement}</p>
    </div>
  );
});

/** Distancia de scroll a partir de la cual el encabezado recupera su fondo en la portada. */
const SOLID_AFTER_PX = 24;

export function Header() {
  const { units, openDrawer } = useCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const [announcementHeight, setAnnouncementHeight] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // En la portada el encabezado flota transparente sobre la foto y se vuelve sólido al hacer scroll.
  const isHome = location.pathname === '/';
  const overlay = isHome && !scrolled && !searchOpen;

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > SOLID_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  useLayoutEffect(() => {
    const el = announcementRef.current;
    if (!el) return;
    const measure = () => setAnnouncementHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  const iconTone = overlay ? 'text-canvas hover:bg-white/10' : '';
  const isActive = (to: string) => `${location.pathname}${location.search}` === to;

  return (
    <>
      {/* En la portada la barra superior y el encabezado se fijan sobre la foto; al hacer scroll, la barra se oculta. */}
      <div
        className={isHome ? 'fixed inset-x-0 top-0 z-40 transition-transform duration-300 ease-out' : 'contents'}
        style={isHome && scrolled ? { transform: `translateY(-${announcementHeight}px)` } : undefined}
      >
      <AnnouncementBar ref={announcementRef} overlay={overlay} />
      <header
        className={`z-40 border-b transition-colors duration-300 ${isHome ? '' : 'sticky top-0'} ${
          overlay
            ? 'border-transparent bg-transparent text-canvas'
            : 'border-line/80 bg-canvas/90 text-ink backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75'
        }`}
      >
        <div className="shell flex h-16 items-center gap-3 lg:h-[72px] lg:gap-5 xl:gap-8">
          <button
            type="button"
            className={`icon-btn -ml-2 lg:hidden ${iconTone}`}
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            aria-haspopup="dialog"
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <Logo size={32} variant={overlay ? 'dark' : 'light'} className="max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2" />

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    aria-current={isActive(l.to) ? 'page' : undefined}
                    className={`relative rounded-full px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3 ${
                      overlay ? 'hover:bg-white/10 aria-[current=page]:text-accent' : 'hover:bg-ink/5 aria-[current=page]:text-accent-strong'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:gap-3">
            <SearchForm className="hidden w-48 lg:block xl:w-72" tone={overlay ? 'overlay' : 'default'} />
            <button
              ref={searchToggleRef}
              type="button"
              className={`icon-btn lg:hidden ${iconTone}`}
              onClick={() => setSearchOpen((v) => !v)}
              aria-expanded={searchOpen}
              aria-controls="mobile-search"
              aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar'}
            >
              {searchOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={openDrawer}
              className={`icon-btn relative -mr-2 lg:mr-0 ${iconTone}`}
              aria-label={`Abrir carrito, ${units} ${units === 1 ? 'artículo' : 'artículos'}`}
              aria-haspopup="dialog"
            >
              <ShoppingBag className="h-[22px] w-[22px]" aria-hidden="true" />
              {units > 0 && (
                <span
                  key={units}
                  className="absolute right-0.5 top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold tabular-nums text-accent-ink motion-safe:animate-pop"
                  aria-hidden="true"
                >
                  {units > 99 ? '99+' : units}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div id="mobile-search" className="shell pb-3 lg:hidden motion-safe:animate-fade-in">
            <SearchForm
              autoFocus
              onSubmitted={() => {
                setSearchOpen(false);
                searchToggleRef.current?.focus();
              }}
            />
          </div>
        )}
      </header>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

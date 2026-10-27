import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { CartDrawer } from './CartDrawer';
import { ChatWidget } from './chat/ChatWidget';
import { CheckoutDialog } from './CheckoutDialog';
import { Footer } from './Footer';
import { Header } from './Header';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-canvas"
      >
        Saltar al contenido
      </a>
      <ScrollToTop />
      <Header />
      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <CheckoutDialog />
      <ChatWidget />
    </div>
  );
}

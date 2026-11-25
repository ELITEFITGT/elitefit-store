import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { promotions } from '../data/promotions';
import { CART_STORAGE_KEY } from '../lib/cart';
import { formatPrice } from '../lib/format';
import {
  activePromotions,
  applyDiscount,
  benefitText,
  bundleOffer,
  badgeText,
  endsText,
  hintText,
  priceCart,
  priceWithPromotion,
  scopeText,
  storeToday,
  upcomingPromotions,
} from '../lib/promotions';
import type { CartPricingItem } from '../lib/promotions';
import type { Promotion } from '../types';

const promo = (over: Partial<Promotion>): Promotion => ({
  id: 'x',
  title: 'Promo',
  banner: { src: 'https://images.unsplash.com/photo-1', alt: 'Banner' },
  status: 'activa',
  rule: { type: 'percent', value: 25 },
  appliesTo: 'all',
  startsAt: '2026-11-01',
  endsAt: '2026-11-30',
  channels: ['sucursales', 'tienda-en-linea'],
  priority: 1,
  ...over,
});

const segundoPar = promo({
  id: 'segundo-par',
  title: 'Segundo par a mitad de precio',
  rule: { type: 'nth-unit', every: 2, percent: 50 },
  appliesTo: { categories: ['calzado'] },
  appliesToLabel: 'Zapatos',
  combineProducts: true,
});

/** Precio como lo lee Testing Library (el espacio duro se normaliza a espacio común). */
const money = (n: number) => formatPrice(n).replace(/\s/g, ' ');

const leggings = { name: 'Leggings Sculpt Tiro Alto', category: 'mujer' as const };
const shoe = (key: string, unitPrice: number, quantity = 1, productId = key): CartPricingItem => ({
  key,
  productId,
  name: `Tenis ${key}`,
  category: 'calzado',
  unitPrice,
  quantity,
});
const TODAY = '2026-11-10';

describe('promociones: reglas por unidad', () => {
  it('calcula descuentos por porcentaje y por monto, sin bajar de cero', () => {
    expect(applyDiscount(329, promo({ rule: { type: 'percent', value: 25 } }))).toBe(246.75);
    expect(applyDiscount(95, promo({ rule: { type: 'amount', value: 20 } }))).toBe(75);
    expect(applyDiscount(15, promo({ rule: { type: 'amount', value: 20 } }))).toBe(0);
  });

  it('respeta fechas, estado, canal y prioridad', () => {
    const list = [
      promo({ id: 'a', priority: 2, rule: { type: 'percent', value: 50 } }),
      promo({ id: 'b', priority: 1, rule: { type: 'percent', value: 30 }, appliesTo: { categories: ['mujer'] } }),
    ];
    // Gana la de prioridad 1 aunque la otra descuente más.
    expect(priceWithPromotion(leggings, 100, list, '2026-11-01')).toMatchObject({ price: 70, percentOff: 30, promotion: { id: 'b' } });
    expect(priceWithPromotion(leggings, 100, list, '2026-11-30').price).toBe(70);
    expect(priceWithPromotion(leggings, 100, list, '2026-12-01').promotion).toBeNull();
    expect(priceWithPromotion(leggings, 100, [promo({ status: 'pausada' })], TODAY).promotion).toBeNull();
    // Solo en sucursales: se anuncia, pero no se cobra en línea.
    expect(priceWithPromotion(leggings, 100, [promo({ channels: ['sucursales'] })], TODAY).promotion).toBeNull();
  });

  it('identifica productos por nombre sin importar mayúsculas ni tildes', () => {
    const list = [promo({ appliesTo: { products: ['LEGGINGS sculpt tiro álto'] } })];
    expect(priceWithPromotion(leggings, 100, list, TODAY).price).toBe(75);
    expect(priceWithPromotion({ name: 'Otro', category: 'mujer' }, 100, list, TODAY).promotion).toBeNull();
  });
});

describe('promociones: segundo par a mitad de precio', () => {
  it('no cambia el precio unitario, pero marca el producto', () => {
    expect(priceWithPromotion({ name: 'Tenis', category: 'calzado' }, 500, [segundoPar], TODAY)).toMatchObject({
      price: 500,
      percentOff: 0,
      promotion: { id: 'segundo-par' },
    });
  });

  it('descuenta 50 % al par de menor precio, combinando productos', () => {
    const { lines, hints } = priceCart([shoe('a', 600), shoe('b', 400)], [segundoPar], TODAY);
    expect(lines.map((l) => l.discount)).toEqual([0, 200]);
    expect(lines.map((l) => l.subtotal)).toEqual([600, 200]);
    expect(lines[0].promotion).toBeNull();
    expect(lines[1].promotion?.id).toBe('segundo-par');
    expect(hints).toEqual([]);
  });

  it('con 3 pares descuenta 1 y sugiere agregar otro; con 4 descuenta los 2 más baratos', () => {
    const three = priceCart([shoe('a', 500, 3)], [segundoPar], TODAY);
    expect(three.lines[0]).toMatchObject({ discount: 250.02, unitPrice: 416.66, subtotal: 1249.98 });
    expect(three.hints).toEqual([{ promotion: segundoPar, missing: 1 }]);
    expect(hintText(three.hints[0])).toBe('Segundo par a mitad de precio: agrega 1 más y el de menor precio sale a mitad de precio.');

    const four = priceCart([shoe('a', 300, 2), shoe('b', 500, 2)], [segundoPar], TODAY);
    expect(four.lines.map((l) => l.discount)).toEqual([300, 0]);
  });

  it('sin combinar productos, cuenta los pares de cada producto por separado', () => {
    const own = { ...segundoPar, combineProducts: false };
    const { lines, hints } = priceCart([shoe('a', 600), shoe('b', 400)], [own], TODAY);
    expect(lines.map((l) => l.discount)).toEqual([0, 0]);
    expect(hints).toHaveLength(2);
    // Dos tallas del mismo modelo sí cuentan juntas.
    const sameModel = priceCart([shoe('a-7', 500, 1, 'm'), shoe('a-8', 500, 1, 'm')], [own], TODAY);
    expect(sameModel.lines.map((l) => l.discount)).toEqual([250, 0]);
  });

  it('calcula la oferta por cantidad para mostrarla junto al precio', () => {
    expect(bundleOffer(segundoPar, 1100)).toEqual({ units: 2, total: 1650, savings: 550 });
    expect(bundleOffer(promo({}), 1100)).toBeNull();
    expect(bundleOffer(null, 1100)).toBeNull();
  });

  it('arma textos claros para el cliente', () => {
    expect(benefitText(segundoPar)).toBe('Llévate 2 y el de menor precio sale a mitad de precio.');
    expect(scopeText(segundoPar)).toBe('Válido en zapatos. Puedes combinar modelos.');
    expect(badgeText(segundoPar)).toBe('2.ª unidad -50%');
    expect(badgeText({ ...segundoPar, badge: '2.º par a mitad' })).toBe('2.º par a mitad');
    expect(badgeText(promo({ rule: { type: 'nth-unit', every: 2, percent: 100 } }))).toBe('2x1');
  });
});

describe('promociones: vigencia', () => {
  it('separa vigentes y próximas, y describe cuándo terminan', () => {
    const list = [promo({ id: 'nov' }), promo({ id: 'dic', startsAt: '2026-12-16', endsAt: '2026-12-31' })];
    expect(activePromotions(list, TODAY).map((p) => p.id)).toEqual(['nov']);
    expect(upcomingPromotions(list, TODAY).map((p) => p.id)).toEqual(['dic']);
    expect(endsText(list[0], '2026-11-30')).toBe('Termina hoy');
    expect(endsText(list[0], '2026-11-29')).toBe('Termina mañana');
    expect(endsText(list[0], '2026-11-25')).toBe('Quedan 5 días');
    expect(endsText(list[0], '2026-11-01')).toBe('Válida hasta el 30 de noviembre');
  });

  it('no muestra en la web las promociones solo de sucursales', () => {
    const list = [promo({ id: 'tienda', channels: ['sucursales'] }), promo({ id: 'web' })];
    expect(activePromotions(list, TODAY).map((p) => p.id)).toEqual(['web']);
  });

  it('usa la fecha de Guatemala (UTC-6)', () => {
    // 3:00 UTC del 1 de diciembre = 21:00 del 30 de noviembre en Guatemala.
    expect(storeToday(new Date('2026-12-01T03:00:00Z'))).toBe('2026-11-30');
  });
});

describe('promociones: tienda', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>,
    );
  const always = { startsAt: '2000-01-01', endsAt: '2999-12-31' };

  beforeEach(() => {
    localStorage.clear();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    promotions.push(
      promo({ id: 'mujer-25', title: 'Mujer al 25 %', appliesTo: { categories: ['mujer'] }, ...always }),
      { ...segundoPar, ...always },
      promo({ id: 'futura', title: 'Promo futura', startsAt: '2999-01-01', endsAt: '2999-12-31' }),
    );
  });
  afterEach(() => {
    promotions.length = 0;
  });

  it('muestra la página con las promociones vigentes, sus productos y la próxima', () => {
    renderAt('/promociones');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/promociones/i);
    const section = screen.getByRole('region', { name: 'Segundo par a mitad de precio' });
    expect(within(section).getByText('Llévate 2 y el de menor precio sale a mitad de precio.')).toBeInTheDocument();
    expect(within(section).getByText('Válido en zapatos. Puedes combinar modelos.')).toBeInTheDocument();
    expect(within(section).getAllByRole('article').length).toBeGreaterThan(1);
    expect(screen.getByRole('region', { name: 'Mujer al 25 %' })).toBeInTheDocument();
    // Datos internos que el cliente no debe ver.
    expect(screen.queryByText(/sucursales|prioridad|menor precio primero|combinando productos/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Activa')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Promo futura' })).toBeInTheDocument();
  });

  it('cobra el precio con descuento por unidad y muestra el ahorro', () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: 'p01', size: 'M', color: 'Oliva', quantity: 2 }]));
    renderAt('/carrito');
    expect(screen.getByTestId('cart-total').textContent).toBe(formatPrice(246.75 * 2));
    expect(screen.getByTestId('cart-savings')).toHaveTextContent(money(82.25 * 2));
  });

  it('aplica el segundo par a mitad en el carrito y sugiere completar el par', () => {
    // p23: Tenis Court Blanco, Q499.
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: 'p23', size: '8', color: 'Blanco', quantity: 1 }]));
    const view = renderAt('/carrito');
    expect(screen.getByTestId('cart-total').textContent).toBe(formatPrice(499));
    expect(screen.getByText(/segundo par a mitad de precio: agrega 1 más/i)).toBeInTheDocument();
    view.unmount();

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: 'p23', size: '8', color: 'Blanco', quantity: 2 }]));
    renderAt('/carrito');
    expect(screen.getByTestId('cart-total').textContent).toBe(formatPrice(748.5));
    expect(screen.getByTestId('cart-savings')).toHaveTextContent(money(249.5));
    expect(screen.queryByText(/agrega 1 más/i)).not.toBeInTheDocument();
  });

  it('muestra en el producto cuánto cuestan 2 con el segundo par a mitad', () => {
    // p23: Tenis Court Blanco, Q499 => 2 por Q748.50, ahorras Q249.50.
    renderAt('/producto/tenis-court-blanco');
    // La del producto es la que dice cuánto ahorras (las tarjetas de relacionados solo muestran el total).
    const offer = screen.getAllByText(/llévate 2 por/i).find((el) => /ahorras/i.test(el.textContent ?? ''));
    expect(offer).toHaveTextContent(money(748.5));
    expect(offer).toHaveTextContent(money(249.5));
  });

  it('muestra el precio tachado y el aviso de la promoción en la página del producto', async () => {
    renderAt('/producto/leggings-sculpt-tiro-alto');
    expect(screen.getByText(money(246.75))).toBeInTheDocument();
    expect(screen.getByText(money(329)).closest('s')).not.toBeNull();
    await userEvent.setup().click(screen.getByRole('link', { name: /ver la promoción/i }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/promociones/i);
  });
});

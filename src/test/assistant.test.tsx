import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { answer } from '../chat/assistant';
import { CART_STORAGE_KEY, detailLines } from '../lib/cart';
import { products } from '../data/products';
import { currentPrice } from '../lib/promotions';

const empty = { lines: [], units: 0, total: 0 };

describe('asistente de la tienda (sin IA)', () => {
  it('saluda y ofrece el menú', () => {
    const r = answer('Hola', empty);
    expect(r.text).toMatch(/asistente/i);
    expect(r.chips).toContain('Promociones');
  });

  it('busca productos por categoría y precio máximo', () => {
    const r = answer('tenis hasta Q500', empty);
    expect(r.products?.length).toBeGreaterThan(0);
    for (const p of r.products!) {
      expect(p.category).toBe('calzado');
      expect(currentPrice(p)).toBeLessThanOrEqual(500);
    }
  });

  it('busca por palabra, talla y color', () => {
    const r = answer('leggings negro talla M', empty);
    expect(r.products?.length).toBeGreaterThan(0);
    for (const p of r.products!) {
      expect(p.sizes).toContain('M');
      expect(p.colors.some((c) => c.name === 'Negro')).toBe(true);
    }
  });

  it('responde temas de la tienda con su información', () => {
    expect(answer('¿Cuánto cuesta el envío?', empty).actions?.[0]).toMatchObject({ to: '/info/envios-y-entregas' });
    expect(answer('formas de pago', empty).text).toMatch(/no cobra en línea/);
    expect(answer('Quiero hablar con una persona', empty).actions?.[0]).toMatchObject({ kind: 'external', href: expect.stringContaining('wa.me') });
    expect(answer('Tallas de mujer', empty).text).toMatch(/Guía de mujer/);
  });

  it('muestra el carrito y permite confirmar el pedido', () => {
    const lines = detailLines([{ productId: products[0].id, size: products[0].sizes[0] ?? null, color: products[0].colors[0].name, quantity: 1 }], products);
    const r = answer('ver mi carrito', { lines, units: 1, total: lines[0].subtotal });
    expect(r.cart).toBe(true);
    expect(answer('¿cómo hago un pedido?', { lines, units: 1, total: 0 }).actions?.[0]).toMatchObject({ kind: 'checkout' });
  });

  it('si no encuentra nada, ofrece el catálogo y WhatsApp', () => {
    const r = answer('xyzzy qwerty', empty);
    expect(r.text).toMatch(/No encontré productos/);
    expect(r.actions).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'external' }), expect.objectContaining({ to: '/catalogo' })]));
    expect(answer('???', empty).chips).toContain('Ver productos');
  });

  it('en la tienda: abre, responde al instante con productos y no llama a ningún servidor', async () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(CART_STORAGE_KEY, '[]');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Abrir asistente de la tienda' }));
    const chat = screen.getByRole('dialog', { name: /asistente/i });
    expect(within(chat).queryByText(/IA/)).not.toBeInTheDocument();

    await user.click(within(chat).getByRole('button', { name: 'Promociones' }));
    await waitFor(() => expect(within(chat).queryByText('El asistente está escribiendo…')).not.toBeInTheDocument());
    await user.type(within(chat).getByLabelText('Escribe tu consulta'), 'leggings{Enter}');
    expect(await within(chat).findAllByRole('link', { name: /ver producto/i })).not.toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

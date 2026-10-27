import { render, screen, within, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { CART_STORAGE_KEY } from '../lib/cart';
import { formatPrice } from '../lib/format';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  );

const storedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('detalle del producto y carrito', () => {
  it('exige talla y color antes de agregar', async () => {
    const user = userEvent.setup();
    renderAt('/producto/leggings-sculpt-tiro-alto');

    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }));
    expect(screen.getByText('Selecciona un color.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona una talla.')).toBeInTheDocument();
    expect(storedCart()).toEqual([]);

    await user.click(screen.getByLabelText('Oliva'));
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }));
    expect(screen.queryByText('Selecciona un color.')).not.toBeInTheDocument();
    expect(screen.getByText('Selecciona una talla.')).toBeInTheDocument();
    expect(storedCart()).toEqual([]);
  });

  it('agrega variantes, suma cantidades, abre el carrito y persiste', async () => {
    const user = userEvent.setup();
    // Tras agregar, el botón muestra "Agregado al carrito" unos segundos.
    const addButton = () => screen.getByRole('button', { name: /^(agregar|agregado) al carrito$/i });
    const view = renderAt('/producto/leggings-sculpt-tiro-alto');

    await user.click(screen.getByLabelText('Oliva'));
    await user.click(screen.getByLabelText('M'));
    await user.click(screen.getByRole('button', { name: 'Aumentar cantidad de Leggings Sculpt Tiro Alto' }));
    await user.click(screen.getByRole('button', { name: /agregar al carrito/i }));

    // Se abre el carrito lateral con confirmación.
    const drawer = await screen.findByRole('dialog', { name: /tu carrito/i });
    expect(within(drawer).getByText(/agregaste leggings sculpt tiro alto/i)).toBeInTheDocument();
    expect(storedCart()).toEqual([{ productId: 'p01', size: 'M', color: 'Oliva', quantity: 2 }]);

    // Escape cierra el carrito.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Misma combinación: suma. Otra talla: artículo distinto.
    await user.click(addButton());
    await user.keyboard('{Escape}');
    await user.click(screen.getByLabelText('L'));
    await user.click(addButton());
    expect(storedCart()).toEqual([
      { productId: 'p01', size: 'M', color: 'Oliva', quantity: 3 },
      { productId: 'p01', size: 'L', color: 'Oliva', quantity: 1 },
    ]);
    await user.keyboard('{Escape}');

    // Al "recargar" (nuevo montaje), el carrito se conserva.
    view.unmount();
    cleanup();
    renderAt('/carrito');
    const items = screen.getAllByTestId('cart-line');
    expect(items).toHaveLength(2);
    expect(screen.getByTestId('cart-total').textContent).toBe(formatPrice(329 * 4));
    expect(screen.getByText('Costo de envío por confirmar')).toBeInTheDocument();

    // Cambiar cantidad y eliminar.
    await user.click(within(items[1]).getByRole('button', { name: /aumentar cantidad/i }));
    expect(screen.getByTestId('cart-total').textContent).toBe(formatPrice(329 * 5));
    await user.click(within(items[0]).getByRole('button', { name: /eliminar/i }));
    expect(screen.getAllByTestId('cart-line')).toHaveLength(1);
    expect(screen.getByTestId('cart-total').textContent).toBe(formatPrice(329 * 2));
    expect(storedCart()).toEqual([{ productId: 'p01', size: 'L', color: 'Oliva', quantity: 2 }]);
  });

  it('muestra el carrito vacío con enlace al catálogo', () => {
    renderAt('/carrito');
    expect(screen.getByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver al catálogo/i })).toHaveAttribute('href', '/catalogo');
  });
});

describe('pedido por WhatsApp', () => {
  it('valida el formulario, abre wa.me con el mensaje y no vacía el carrito', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: 'p07', size: 'L', color: 'Blanco', quantity: 2 },
        { productId: 'p16', size: null, color: 'Blanco', quantity: 1 },
      ]),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    renderAt('/carrito');

    await user.click(screen.getByRole('button', { name: /realizar pedido por whatsapp/i }));
    const dialog = await screen.findByRole('dialog', { name: /datos para tu pedido/i });

    // Sin nombre ni dirección (envío por defecto) no abre WhatsApp.
    await user.click(within(dialog).getByRole('button', { name: /abrir whatsapp/i }));
    expect(within(dialog).getByText(/escribe tu nombre/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/escribe la dirección/i)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();

    // Al elegir "Recoger" la dirección deja de ser obligatoria.
    await user.type(within(dialog).getByLabelText(/nombre/i), 'Carlos Pérez');
    await user.click(within(dialog).getByLabelText(/recoger/i));
    expect(within(dialog).queryByLabelText(/dirección de entrega/i)).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/observaciones/i), 'Paso el sábado');
    await user.click(within(dialog).getByRole('button', { name: /abrir whatsapp/i }));

    expect(open).toHaveBeenCalledTimes(1);
    const url = new URL(open.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://wa.me/50242709260');
    const text = url.searchParams.get('text')!;
    expect(text).toContain('*Cliente:* Carlos Pérez');
    expect(text).toContain('1. Camiseta Dry Training');
    expect(text).toContain('Talla: L | Color: Blanco');
    expect(text).toContain(`Cantidad: 2 x ${formatPrice(179)} = ${formatPrice(358)}`);
    expect(text).toContain('Talla única | Color: Blanco');
    expect(text).toContain(`*Total de productos:* ${formatPrice(358 + 129)}`);
    expect(text).toContain('*Envío:* por confirmar');
    expect(text).toContain('*Entrega:* Recoger');
    expect(text).not.toContain('Dirección');
    expect(text).toContain('*Observaciones:* Paso el sábado');

    // No se muestra como confirmado y el carrito se conserva.
    expect(await screen.findByText(/tu pedido aún no está confirmado/i)).toBeInTheDocument();
    expect(screen.queryByText(/pedido enviado/i)).not.toBeInTheDocument();
    expect(storedCart()).toHaveLength(2);
    open.mockRestore();
  });
});

describe('catálogo', () => {
  it('filtra, muestra filtros activos, estado vacío y permite limpiar', async () => {
    const user = userEvent.setup();
    renderAt('/catalogo?categoria=accesorios');
    expect(screen.getByRole('heading', { level: 1, name: 'Accesorios' })).toBeInTheDocument();
    const results = screen.getByRole('region', { name: 'Resultados' });
    expect(within(results).getAllByRole('article')).toHaveLength(4);
    expect(screen.getByText('1 filtro activo:')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar por nombre'), 'gorra');
    await waitFor(() => expect(within(results).getAllByRole('article')).toHaveLength(1));

    await user.type(screen.getByLabelText('Buscar por nombre'), 'xyz');
    expect(await screen.findByText('No encontramos productos')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]);
    expect(within(results).getAllByRole('article').length).toBeGreaterThanOrEqual(12);
  });
});

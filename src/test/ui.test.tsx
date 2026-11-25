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
    const addButton = () => screen.getByRole('button', { name: /^(agregar al carrito|agregado a la bolsa)$/i });
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

describe('confirmar pedido', () => {
  it('valida el formulario, envía el pedido a /api/pedidos, muestra el número y vacía el carrito', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: 'p07', size: 'L', color: 'Blanco', quantity: 2 },
        { productId: 'p16', size: null, color: 'Blanco', quantity: 1 },
      ]),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, orderNumber: 1024, total: 487 }), { status: 201 }),
    );
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    renderAt('/carrito');

    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    const dialog = await screen.findByRole('dialog', { name: /datos para tu pedido/i });

    // Sin datos (envío por defecto) no se envía.
    await user.click(within(dialog).getByRole('button', { name: /confirmar pedido/i }));
    expect(within(dialog).getByText(/escribe tu nombre/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/teléfono válido/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/elige el departamento/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/escribe la dirección/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/nombre/i), 'Carlos Pérez');
    await user.type(within(dialog).getByLabelText(/teléfono/i), '5555 1234');
    await user.selectOptions(within(dialog).getByLabelText(/departamento/i), 'Guatemala');
    await user.type(within(dialog).getByLabelText(/municipio/i), 'Mixco');
    await user.type(within(dialog).getByLabelText(/^dirección/i), '5a avenida 10-20, zona 1');
    await user.click(within(dialog).getByRole('button', { name: /confirmar pedido/i }));

    expect(await screen.findByText('#1024')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/pedidos');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.customer).toMatchObject({
      name: 'Carlos Pérez',
      phone: '5555 1234',
      delivery: 'envio',
      department: 'Guatemala',
      municipality: 'Mixco',
      address: '5a avenida 10-20, zona 1',
    });
    expect(body.lines).toEqual([
      { productId: 'p07', size: 'L', color: 'Blanco', quantity: 2 },
      { productId: 'p16', size: null, color: 'Blanco', quantity: 1 },
    ]);
    // No se usa WhatsApp y el carrito queda vacío.
    expect(open).not.toHaveBeenCalled();
    expect(storedCart()).toEqual([]);
    fetchMock.mockRestore();
    open.mockRestore();
  });

  it('muestra el error del servidor y conserva el carrito', async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: 'p16', size: null, color: 'Blanco', quantity: 1 }]));
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'save_failed', message: 'No pudimos registrar tu pedido.' }), { status: 502 }));
    const user = userEvent.setup();
    renderAt('/carrito');

    await user.click(screen.getByRole('button', { name: /confirmar pedido/i }));
    const dialog = await screen.findByRole('dialog', { name: /datos para tu pedido/i });
    await user.type(within(dialog).getByLabelText(/nombre/i), 'Ana');
    await user.type(within(dialog).getByLabelText(/teléfono/i), '55551234');
    await user.click(within(dialog).getByLabelText(/recoger/i));
    await user.click(within(dialog).getByRole('button', { name: /confirmar pedido/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos registrar tu pedido.');
    expect(storedCart()).toHaveLength(1);
    fetchMock.mockRestore();
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

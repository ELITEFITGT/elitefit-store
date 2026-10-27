import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { CART_STORAGE_KEY } from '../lib/cart';
import type { ChatResponseBody } from '../chat/protocol';

type Reply = { status: number; body: unknown };

/** Simula el endpoint /api/chat: devuelve respuestas en orden y guarda lo que recibió. */
function mockServer(configured: boolean, replies: Reply[]) {
  const posts: { messages: Record<string, unknown>[] }[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
    if (!init || init.method === 'GET') return new Response(JSON.stringify({ configured, provider: 'Anthropic (Claude)' }));
    posts.push(JSON.parse(String(init.body)));
    const next = replies.shift();
    if (!next) throw new Error('Sin respuesta preparada');
    return new Response(JSON.stringify(next.body), { status: next.status });
  });
  return { posts, spy };
}

const ok = (text: string, toolCalls: { id: string; name: string; input: unknown }[] = []): Reply => ({
  status: 200,
  body: {
    ok: true,
    text,
    toolCalls,
    content: [...(text ? [{ type: 'text', text }] : []), ...toolCalls.map((c) => ({ type: 'tool_use', ...c }))],
  } satisfies ChatResponseBody,
});

const storedCart = () => JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
const toolResults = (post: { messages: Record<string, unknown>[] }) => {
  const last = post.messages[post.messages.length - 1] as { role: string; results: { id: string; output: string; isError: boolean }[] };
  expect(last.role).toBe('tool');
  return last.results.map((r) => ({ ...r, output: JSON.parse(r.output) }));
};

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  );
}

async function openChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /asesor de compras/i }));
  return screen.getByRole('dialog', { name: /asesor elitefit/i });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => vi.restoreAllMocks());

describe('asistente de compras', () => {
  it('muestra un aviso claro si el servicio no está configurado', async () => {
    mockServer(false, []);
    const user = userEvent.setup();
    renderApp();
    const chat = await openChat(user);
    expect(await within(chat).findByText('El asistente aún no está configurado')).toBeInTheDocument();
    expect(within(chat).getByRole('textbox', { name: /escribe tu mensaje/i })).toBeDisabled();
    expect(within(chat).getByRole('link', { name: /escribir por whatsapp/i })).toHaveAttribute('href', expect.stringContaining('https://wa.me/'));
    expect(within(chat).getByText(/las respuestas las genera una ia/i)).toBeInTheDocument();
  });

  it('modifica el carrito compartido solo con acciones validadas, sin duplicados, y conserva el carrito ante errores', async () => {
    const add = { productId: 'p05', size: 'M', color: 'Negro', quantity: 2 };
    const server = mockServer(true, [
      // El modelo repite la misma acción y además pide una talla inexistente.
      ok('', [
        { id: 'a1', name: 'addToCart', input: add },
        { id: 'a2', name: 'addToCart', input: add },
        { id: 'a3', name: 'addToCart', input: { ...add, size: 'XXL' } },
      ]),
      ok('Listo, agregué 2 **Leggings Power 7/8** en talla M, color Negro.'),
      { status: 502, body: { ok: false, error: 'provider_error', message: 'No pude conectar con el asistente. Intenta de nuevo.' } },
      ok('', [{ id: 'w1', name: 'prepareWhatsAppOrder', input: {} }]),
      ok('Aquí tienes el resumen. Pulsa "Continuar por WhatsApp" para terminar.'),
    ]);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const user = userEvent.setup();
    renderApp();
    const chat = await openChat(user);

    await user.type(within(chat).getByRole('textbox', { name: /escribe tu mensaje/i }), 'Agrega dos Leggings Power 7/8 negros talla M{Enter}');

    expect(await within(chat).findByText(/Listo, agregué 2/)).toBeInTheDocument();
    expect(within(chat).getByText('Agregado al carrito: Leggings Power 7/8 (M, Negro) × 2')).toBeInTheDocument();
    expect(within(chat).getByRole('link', { name: 'Ver producto Leggings Power 7/8' })).toHaveAttribute('href', '/producto/leggings-power-7-8');

    // Mismo carrito que la tienda: localStorage y contador del encabezado.
    expect(storedCart()).toEqual([{ productId: 'p05', size: 'M', color: 'Negro', quantity: 2 }]);
    expect(screen.getByRole('button', { name: /abrir carrito, 2 artículos/i })).toBeInTheDocument();

    // Resultados reales devueltos al modelo antes de su respuesta.
    const results = toolResults(server.posts[1]);
    expect(results[0]).toMatchObject({ id: 'a1', isError: false, output: { status: 'added' } });
    expect(results[1]).toMatchObject({ id: 'a2', isError: true, output: { error: 'duplicate_action' } });
    expect(results[2]).toMatchObject({ id: 'a3', isError: true, output: { error: 'invalid_size' } });

    // Error del proveedor: se informa, el carrito no cambia y se puede reintentar.
    await user.type(within(chat).getByRole('textbox', { name: /escribe tu mensaje/i }), 'Quiero comprar{Enter}');
    const alert = await within(chat).findByRole('alert');
    expect(alert).toHaveTextContent('No pude conectar con el asistente');
    expect(storedCart()).toHaveLength(1);
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(server.posts[3].messages).toEqual(server.posts[2].messages); // el reintento no duplica mensajes

    // Resumen con botón que abre el formulario local; WhatsApp no se abre solo.
    const continuar = await within(chat).findByRole('button', { name: 'Continuar por WhatsApp' });
    expect(within(chat).getByText(/No queda confirmado hasta que envíes el mensaje/)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
    await user.click(continuar);
    expect(await screen.findByRole('dialog', { name: /datos para tu pedido/i })).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();

    // Al modelo nunca se le enviaron datos de entrega.
    expect(JSON.stringify(server.posts)).not.toMatch(/direcci[oó]n de entrega|street-address/i);
  });

  it('pide confirmación en pantalla antes de eliminar varios artículos', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { productId: 'p07', size: 'L', color: 'Blanco', quantity: 1 },
        { productId: 'p16', size: null, color: 'Blanco', quantity: 1 },
      ]),
    );
    mockServer(true, [
      ok('', [{ id: 'r1', name: 'removeFromCart', input: { itemIds: ['p07::L::Blanco', 'p16::::Blanco'] } }]),
      ok('¿Confirmas que quieres eliminar ambos artículos? Usa el botón de abajo.'),
    ]);
    const user = userEvent.setup();
    renderApp();
    const chat = await openChat(user);
    await user.type(within(chat).getByRole('textbox', { name: /escribe tu mensaje/i }), 'Vacía mi carrito{Enter}');

    const confirmBox = await within(chat).findByRole('region', { name: 'Confirmar eliminación' });
    expect(storedCart()).toHaveLength(2);
    await user.click(within(confirmBox).getByRole('button', { name: /sí, eliminar/i }));
    await waitFor(() => expect(storedCart()).toEqual([]));
    expect(within(chat).getByText(/se eliminaron del carrito/)).toBeInTheDocument();
  });

  it('permite iniciar una conversación nueva sin tocar el carrito', async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ productId: 'p07', size: 'L', color: 'Blanco', quantity: 1 }]));
    mockServer(true, [ok('¡Claro! ¿Para qué actividad buscas ropa?')]);
    const user = userEvent.setup();
    renderApp();
    const chat = await openChat(user);
    await user.click(within(chat).getByRole('button', { name: 'Busco ropa para entrenar' }));
    expect(await within(chat).findByText(/para qué actividad/i)).toBeInTheDocument();

    await user.click(within(chat).getByRole('button', { name: /conversación nueva/i }));
    expect(within(chat).queryByText(/para qué actividad/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('elitefit-chat-v1')).toBeNull();
    expect(storedCart()).toHaveLength(1);

    // Escape minimiza y devuelve el foco al botón del asistente.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /asesor elitefit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /asistente elitefit/i })).toBeInTheDocument();
  });
});

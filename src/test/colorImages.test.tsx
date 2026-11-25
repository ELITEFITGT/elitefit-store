import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../types';
import { toProducts } from '../../server/supabaseCatalog';

// Catálogo simulado: un producto con dos fotos ligadas a color, una general y un color sin foto.
const product: Product = {
  id: 'x1',
  slug: 'conjunto-prueba',
  name: 'Conjunto Prueba',
  category: 'mujer',
  price: 200,
  description: 'Descripción',
  details: [],
  sizes: ['S', 'M'],
  colors: [
    { name: 'Negro', hex: '#000000' },
    { name: 'Rosa', hex: '#FFC0CB' },
    { name: 'Azul', hex: '#0000FF' },
  ],
  images: [
    { src: '/general.jpg', alt: 'General' },
    { src: '/negro.jpg', alt: 'Negro', color: 'Negro' },
    { src: '/rosa.jpg', alt: 'Rosa', color: 'Rosa' },
  ],
  addedAt: '2026-10-01',
};

vi.mock('virtual:supabase-catalog', () => ({ default: [product] }));

const { App } = await import('../App');

const mainImage = () => screen.getAllByRole('img').find((img) => img.getAttribute('width') === '1000')!;

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('foto según el color elegido', () => {
  it('cambia a la foto del color y la conserva si el color no tiene foto', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/producto/conjunto-prueba']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>,
    );
    const colors = screen.getByRole('group', { name: /color/i });

    expect(mainImage()).toHaveAttribute('src', '/general.jpg');

    await user.click(within(colors).getByLabelText('Rosa'));
    expect(mainImage()).toHaveAttribute('src', '/rosa.jpg');

    await user.click(within(colors).getByLabelText('Negro'));
    expect(mainImage()).toHaveAttribute('src', '/negro.jpg');

    // Azul no tiene foto: se queda la actual.
    await user.click(within(colors).getByLabelText('Azul'));
    expect(mainImage()).toHaveAttribute('src', '/negro.jpg');
  });
});

describe('conversión desde Supabase', () => {
  it('liga cada foto al color de su variante', () => {
    const [p] = toProducts(
      [
        {
          id: 'p1',
          nombre: 'Top',
          descripcion: null,
          genero: 'mujer',
          etiquetas: [],
          created_at: '2026-10-01T00:00:00Z',
          categoria: null,
          subcategoria: null,
          variantes: [
            { id: 'v1', precio: 150, talla: null, color: { nombre: 'Negro', hex: '#000', orden: 1 } },
            { id: 'v2', precio: 150, talla: null, color: { nombre: 'Rosa', hex: '#f0c', orden: 2 } },
          ],
          producto_imagenes: [
            { url: 'https://img/general.webp', storage_path: null, alt: null, orden: 0, variante_id: null },
            { url: 'https://img/rosa.webp', storage_path: null, alt: null, orden: 1, variante_id: 'v2' },
          ],
        },
      ],
      'https://x.supabase.co',
      'productos',
    );
    expect(p.images).toEqual([
      { src: 'https://img/general.webp', alt: 'Top' },
      { src: 'https://img/rosa.webp', alt: 'Top – Rosa', color: 'Rosa' },
    ]);
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { SizeGuide } from '../components/SizeGuide';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('guía de tallas interactiva', () => {
  it('recomienda la talla según las medidas y elige la mayor si no coinciden', async () => {
    const user = userEvent.setup();
    render(<SizeGuide only="mujer" />);

    await user.type(screen.getByLabelText('Cintura'), '72');
    expect(screen.getByText('Te recomendamos la talla M')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cadera'), '103');
    expect(screen.getByText('Te recomendamos la talla L')).toBeInTheDocument();
    expect(screen.getByText(/caen en tallas distintas/)).toBeInTheDocument();
  });

  it('calcula la talla de calzado por el largo del pie', async () => {
    const user = userEvent.setup();
    render(<SizeGuide only="calzado" />);
    await user.type(screen.getByLabelText('Largo del pie'), '25');
    expect(screen.getByText('Te recomendamos la talla 8')).toBeInTheDocument();
  });

  it('cambia de guía con las pestañas en la página de guía de tallas', async () => {
    const user = userEvent.setup();
    renderAt('/info/guia-de-tallas');
    const tabs = screen.getByRole('tablist', { name: 'Tipo de guía' });
    expect(within(tabs).getByRole('tab', { name: 'Mujer' })).toHaveAttribute('aria-selected', 'true');

    await user.click(within(tabs).getByRole('tab', { name: 'Calzado' }));
    expect(within(tabs).getByRole('tab', { name: 'Calzado' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Largo del pie')).toBeInTheDocument();
  });

  it('en el producto, elige la talla recomendada y cierra la guía', async () => {
    const user = userEvent.setup();
    renderAt('/producto/leggings-sculpt-tiro-alto');

    await user.click(screen.getByRole('button', { name: /guía de tallas/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Cintura'), '72');
    await user.click(within(dialog).getByRole('button', { name: 'Elegir talla M' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'M' })).toBeChecked();
  });
});

import { act, render } from '@testing-library/react';

// index.html marca <html> antes de cargar la app; el módulo de la pantalla lo lee al importarse.
async function loadSplash() {
  vi.resetModules();
  const { SplashScreen, SplashBoundary } = await import('../components/SplashScreen');
  const splash = await import('../lib/splash');
  return { SplashScreen, SplashBoundary, ...splash };
}

beforeEach(() => {
  sessionStorage.clear();
  document.documentElement.classList.add('splash-pending');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.documentElement.classList.remove('splash-pending');
});

describe('pantalla de entrada', () => {
  it('se muestra al entrar y libera la página en 2–3 segundos', async () => {
    const { SplashScreen, isSplashActive } = await loadSplash();
    const { container } = render(<SplashScreen />);
    expect(container.querySelector('.splash')).toBeInTheDocument();
    expect(isSplashActive()).toBe(true);

    act(() => void vi.advanceTimersByTime(2600));
    expect(isSplashActive()).toBe(false);
    expect(document.documentElement).not.toHaveClass('splash-pending');

    act(() => void vi.advanceTimersByTime(800));
    expect(container.querySelector('.splash')).not.toBeInTheDocument();
  });

  it('se muestra en cada carga de la página', async () => {
    sessionStorage.setItem('elitefit-splash-seen', '1');
    const { SplashScreen, isSplashActive } = await loadSplash();
    const { container } = render(<SplashScreen />);
    expect(isSplashActive()).toBe(true);
    expect(container.querySelector('.splash')).toBeInTheDocument();
  });

  it('con oncePerSession no se repite en la misma pestaña', async () => {
    vi.resetModules();
    const { storeConfig } = await import('../config/store');
    vi.doMock('../config/store', () => ({ storeConfig: { ...storeConfig, splash: { ...storeConfig.splash, oncePerSession: true } } }));
    sessionStorage.setItem('elitefit-splash-seen', '1');
    const { SplashScreen } = await import('../components/SplashScreen');
    const { isSplashActive } = await import('../lib/splash');
    const { container } = render(<SplashScreen />);
    vi.doUnmock('../config/store');
    expect(isSplashActive()).toBe(false);
    expect(container.querySelector('.splash')).not.toBeInTheDocument();
    expect(document.documentElement).not.toHaveClass('splash-pending');
  });

  it('se puede saltar con una tecla', async () => {
    const { SplashScreen, isSplashActive } = await loadSplash();
    render(<SplashScreen />);
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(isSplashActive()).toBe(false);
  });

  it('si algo falla dentro, se retira y no bloquea la tienda', async () => {
    const { SplashBoundary, isSplashActive } = await loadSplash();
    const Broken = (): JSX.Element => {
      throw new Error('fallo');
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <SplashBoundary>
        <Broken />
      </SplashBoundary>,
    );
    spy.mockRestore();
    expect(container).toBeEmptyDOMElement();
    expect(isSplashActive()).toBe(false);
    expect(document.documentElement).not.toHaveClass('splash-pending');
  });
});

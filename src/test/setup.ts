import '@testing-library/jest-dom/vitest';

// Las promociones reales dependen de la fecha: en las pruebas se empieza sin ninguna.
// Las pruebas de promociones agregan las suyas a este mismo arreglo.
vi.mock('../data/promotions', () => ({ promotions: [] }));

// jsdom no implementa scrollIntoView (lo usan los enlaces del tipo /promociones#id).
if (typeof Element !== 'undefined') Element.prototype.scrollIntoView = () => {};

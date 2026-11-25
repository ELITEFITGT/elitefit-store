/**
 * Animación "volar a la bolsa": una copia de la imagen del producto viaja en curva hasta el
 * ícono del carrito del encabezado (marcado con data-cart-target) y el ícono rebota al llegar.
 *
 * Devuelve una promesa que se resuelve al terminar. Si no hay soporte de animaciones, el
 * usuario prefiere menos movimiento o no se encuentra el ícono, se resuelve de inmediato.
 */
export function flyToCart(source: HTMLElement | null): Promise<void> {
  const target = document.querySelector<HTMLElement>('[data-cart-target]');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!source || !target || reduced || typeof source.animate !== 'function') return Promise.resolve();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return Promise.resolve();

  // Copia de la imagen, del tamaño de una miniatura, centrada sobre la foto original.
  const size = Math.min(from.width, from.height, 220);
  const startX = from.left + from.width / 2 - size / 2;
  const startY = from.top + from.height / 2 - size / 2;
  const dx = to.left + to.width / 2 - (startX + size / 2);
  const dy = to.top + to.height / 2 - (startY + size / 2);

  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('srcset');
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '8px',
    zIndex: '60',
    pointerEvents: 'none',
    boxShadow: '0 12px 30px rgb(0 0 0 / 0.25)',
    margin: '0',
  });
  document.body.appendChild(ghost);

  // Curva: sube un poco primero y luego cae hacia la bolsa mientras se encoge.
  const fly = ghost.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, borderRadius: '8px' },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 80}px) scale(0.55)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.6, borderRadius: '50%' },
    ],
    { duration: 750, easing: 'cubic-bezier(0.5, 0, 0.3, 1)', fill: 'forwards' },
  );

  return fly.finished
    .catch(() => undefined)
    .then(() => {
      ghost.remove();
      target.animate(
        [
          { transform: 'scale(1) rotate(0)' },
          { transform: 'scale(1.3) rotate(-10deg)', offset: 0.35 },
          { transform: 'scale(0.92) rotate(6deg)', offset: 0.7 },
          { transform: 'scale(1) rotate(0)' },
        ],
        { duration: 450, easing: 'ease-out' },
      );
    });
}

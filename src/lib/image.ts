/**
 * Genera src y srcSet optimizados cuando la imagen viene de Unsplash.
 * Para imágenes locales devuelve la ruta sin cambios.
 */
export function imageSources(src: string, width: number, height: number) {
  if (!src.includes('images.unsplash.com')) return { src };
  const ratio = height / width;
  const url = (w: number) => `${src}?auto=format&fit=crop&w=${w}&h=${Math.round(w * ratio)}&q=75`;
  const widths = [Math.round(width / 2), width, Math.round(width * 1.5), width * 2];
  return {
    src: url(width),
    srcSet: widths.map((w) => `${url(w)} ${w}w`).join(', '),
  };
}

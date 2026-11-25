/**
 * Lee el catálogo desde Supabase y lo convierte al formato `Product` de la tienda.
 *
 * Corre SOLO en Node (dentro de Vite, al iniciar `npm run dev` o al compilar) y usa la
 * Secret key (SUPABASE_SECRET_KEY). La clave nunca llega al navegador: a la tienda solo
 * llega el resultado ya convertido, sin costos ni datos internos.
 *
 * Solo hace consultas de lectura (GET). No modifica tablas ni datos.
 */
import type { CategoryId, Product, ProductColor, ProductImage } from '../src/types';

interface DbVariante {
  id: string;
  precio: number | string | null;
  talla: { nombre: string; codigo: string | null; orden: number | null } | null;
  color: { nombre: string; hex: string | null; orden: number | null } | null;
}

interface DbImagen {
  url: string | null;
  storage_path: string | null;
  alt: string | null;
  orden: number | null;
  variante_id: string | null;
}

export interface DbProducto {
  id: string;
  nombre: string;
  descripcion: string | null;
  genero: string | null;
  etiquetas: string[] | null;
  created_at: string;
  categoria: { nombre: string; slug: string | null } | null;
  subcategoria: { nombre: string; slug: string | null } | null;
  variantes: DbVariante[];
  producto_imagenes: DbImagen[];
}

export interface SupabaseCatalogOptions {
  url: string;
  secretKey: string;
  /** Bucket de Storage donde están las fotos cuando solo hay `storage_path`. */
  imageBucket?: string;
}

// Solo las columnas que usa la tienda (el costo de las variantes nunca se pide).
const SELECT = [
  'id,nombre,descripcion,genero,etiquetas,created_at',
  'categoria:categorias(nombre,slug)',
  'subcategoria:subcategorias(nombre,slug)',
  'variantes(id,precio,talla:tallas(nombre,codigo,orden),color:colores(nombre,hex,orden))',
  'producto_imagenes(url,storage_path,alt,orden,variante_id)',
].join(',');

const PAGE = 1000;

export async function fetchSupabaseProducts(opts: SupabaseCatalogOptions): Promise<Product[]> {
  const base = opts.url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const headers = { apikey: opts.secretKey, Authorization: `Bearer ${opts.secretKey}` };
  const rows: DbProducto[] = [];

  for (let from = 0; ; from += PAGE) {
    const query = `select=${SELECT}&estado=eq.activo&order=created_at.desc`;
    const res = await fetch(`${base}/rest/v1/productos?${query}`, {
      headers: { ...headers, Range: `${from}-${from + PAGE - 1}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Supabase respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const page = (await res.json()) as DbProducto[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  return toProducts(rows, base, opts.imageBucket ?? 'productos');
}

export function toProducts(rows: DbProducto[], baseUrl: string, bucket: string): Product[] {
  const usedSlugs = new Set<string>();
  const products = rows
    .map((row) => toProduct(row, baseUrl, bucket, usedSlugs))
    .filter((p): p is Product => p !== null);

  // Si nada está marcado como destacado, se destacan los más recientes para que el inicio no quede vacío.
  if (!products.some((p) => p.featured)) {
    [...products]
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
      .slice(0, 8)
      .forEach((p) => (p.featured = true));
  }
  return products;
}

const NEW_DAYS = 45;

function toProduct(row: DbProducto, baseUrl: string, bucket: string, usedSlugs: Set<string>): Product | null {
  const prices = row.variantes.map((v) => Number(v.precio)).filter((n) => Number.isFinite(n) && n > 0);
  if (!prices.length) return null; // Sin precio no se puede vender.

  const category = toCategory(row);
  const tags = (row.etiquetas ?? []).map((t) => t.toLowerCase());
  const addedAt = row.created_at.slice(0, 10);
  const { description, details } = splitDescription(row.descripcion ?? '');

  return {
    id: row.id,
    slug: uniqueSlug(row.nombre, usedSlugs),
    name: row.nombre.trim(),
    category,
    price: Math.min(...prices),
    description,
    details,
    sizes: toSizes(row.variantes),
    colors: toColors(row.variantes),
    images: toImages(row, baseUrl, bucket),
    addedAt,
    featured: tags.includes('destacado') || tags.includes('destacados') || undefined,
    isNew: tags.includes('nuevo') || Date.now() - Date.parse(row.created_at) < NEW_DAYS * 86_400_000 || undefined,
    sizeGuide: category === 'accesorios' ? undefined : category,
  };
}

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Las categorías de la tienda son fijas: mujer, hombre, calzado y accesorios. */
export function toCategory(row: Pick<DbProducto, 'categoria' | 'subcategoria' | 'genero'>): CategoryId {
  const text = plain([row.categoria?.slug, row.categoria?.nombre, row.subcategoria?.slug, row.subcategoria?.nombre].join(' '));
  if (/calzado|tenis|zapat/.test(text)) return 'calzado';
  if (/hombre/.test(text)) return 'hombre';
  if (/accesori|bolsa|bolso|mochila|cuidado|botell|termo|gorra|guante/.test(text)) return 'accesorios';
  if (plain(row.genero ?? '').startsWith('hombre')) return 'hombre';
  return 'mujer';
}

function uniqueSlug(name: string, used: Set<string>) {
  const base =
    plain(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'producto';
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  used.add(slug);
  return slug;
}

/** Separa el texto principal de las secciones "DETALLES" / "CUIDADOS" que traen las descripciones. */
function splitDescription(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const idx = lines.findIndex((l) => /^detalles:?$/i.test(l));
  if (idx === -1) return { description: text.trim(), details: [] };
  const description = lines.slice(0, idx).filter(Boolean).join('\n\n');
  const details = lines
    .slice(idx + 1)
    .filter((l) => l && !/^cuidados:?$/i.test(l));
  return { description, details };
}

const UNIQUE_SIZE = /^(u|unica|talla unica|unitalla|os|one size|n\/a|na)$/;

/** Etiqueta de talla que usa la tienda: el código (XS, S, M… / "8 US" → "8"); si no hay, el nombre. */
export function sizeLabel(talla: { nombre: string; codigo?: string | null } | null | undefined): string {
  return (talla?.codigo || talla?.nombre || '').trim().replace(/\s*US$/i, '');
}

/** true si la talla es "única" (o no hay talla): en la tienda se muestra como talla única. */
export const isUniqueSize = (label: string) => !label || UNIQUE_SIZE.test(plain(label));

function toSizes(variantes: DbVariante[]): string[] {
  const map = new Map<string, number>();
  for (const v of variantes) {
    // Se usa el código (XS, S, M… / "8 US" → "8") para que coincida con los filtros de la tienda.
    const label = sizeLabel(v.talla);
    if (label) map.set(label, v.talla?.orden ?? 999);
  }
  const sizes = [...map.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
  return sizes.every((s) => UNIQUE_SIZE.test(plain(s))) ? [] : sizes.filter((s) => !UNIQUE_SIZE.test(plain(s)));
}

function toColors(variantes: DbVariante[]): ProductColor[] {
  const map = new Map<string, { hex: string; orden: number }>();
  for (const v of variantes)
    if (v.color?.nombre) map.set(v.color.nombre.trim(), { hex: v.color.hex || '#CCCCCC', orden: v.color.orden ?? 999 });
  const colors = [...map.entries()].sort((a, b) => a[1].orden - b[1].orden).map(([name, c]) => ({ name, hex: c.hex }));
  return colors.length ? colors : [{ name: 'Único', hex: '#CCCCCC' }];
}

/**
 * Imagen de reemplazo para productos sin fotos (los componentes esperan al menos una).
 * Un solo color de fondo y el nombre de la tienda en otro. Cambia aquí los dos colores:
 */
const PLACEHOLDER_BG = '#0E4344'; // verde azulado de la marca
const PLACEHOLDER_TEXT = '#F0509F'; // rosa de la marca
const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">' +
      `<rect width="400" height="500" fill="${PLACEHOLDER_BG}"/>` +
      `<text x="200" y="262" font-family="sans-serif" font-size="28" letter-spacing="6" fill="${PLACEHOLDER_TEXT}" text-anchor="middle">ELITEFIT</text>` +
      '</svg>',
  );

function toImages(row: DbProducto, baseUrl: string, bucket: string): ProductImage[] {
  const seen = new Set<string>();
  const images = [...row.producto_imagenes]
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
    .map((img) => {
      const src = img.url || (img.storage_path ? `${baseUrl}/storage/v1/object/public/${bucket}/${img.storage_path.replace(/^\/+/, '')}` : '');
      // Si la foto está ligada a una variante, se toma el color de esa variante.
      const color = row.variantes.find((v) => v.id === img.variante_id)?.color?.nombre.trim();
      return color ? { src, alt: img.alt || `${row.nombre} – ${color}`, color } : { src, alt: img.alt || row.nombre };
    })
    .filter((img) => img.src && !seen.has(img.src) && seen.add(img.src));
  return images.length ? images : [{ src: PLACEHOLDER, alt: row.nombre }];
}

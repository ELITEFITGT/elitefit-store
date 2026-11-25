/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import type { Connect, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Monta el endpoint de pedidos (/api/pedidos) en `npm run dev` y `npm run preview`.
 * Las variables de .env se cargan solo en el proceso de Node: las que no empiezan
 * con VITE_ nunca llegan al código del navegador.
 */
// Vive en globalThis porque Vite vuelve a importar este archivo en cada reinicio.
const store = globalThis as typeof globalThis & { __elitefitInjectedEnv?: Set<string> };
const injectedEnv = (store.__elitefitInjectedEnv ??= new Set<string>());

function ordersApi(mode: string): Plugin {
  const mount = async (middlewares: Connect.Server) => {
    // Al reiniciar (p. ej. tras editar .env) se descartan los valores cargados antes desde .env.
    for (const key of injectedEnv) delete process.env[key];
    injectedEnv.clear();
    const env = loadEnv(mode, process.cwd(), '');
    for (const [key, value] of Object.entries(env)) {
      if (key in process.env) continue; // Las variables del sistema tienen prioridad.
      process.env[key] = value;
      injectedEnv.add(key);
    }
    const { createOrderHandler } = await import('./server/orderHandler.js');
    const orders = createOrderHandler();
    middlewares.use('/api/pedidos', (req, res) => void orders(req, res));
  };
  return {
    name: 'elitefit-orders-api',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

/**
 * Catálogo desde Supabase: expone el módulo `virtual:supabase-catalog` con los productos ya convertidos.
 * Se lee en Node con SUPABASE_SECRET_KEY al iniciar `npm run dev` o al compilar (reinicia para refrescar).
 * Si falta la clave, falla la consulta o se corren las pruebas, devuelve [] y la tienda usa los productos de ejemplo.
 */
function supabaseCatalog(mode: string): Plugin {
  const id = 'virtual:supabase-catalog';
  const resolved = '\0' + id;
  return {
    name: 'elitefit-supabase-catalog',
    resolveId: (source) => (source === id ? resolved : null),
    async load(moduleId) {
      if (moduleId !== resolved) return null;
      const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
      const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
      const secretKey = env.SUPABASE_SECRET_KEY;
      let products: unknown[] = [];
      if (env.VITEST) {
        // Las pruebas usan siempre los productos de ejemplo.
      } else if (!url || !secretKey) {
        this.warn('Falta VITE_SUPABASE_URL o SUPABASE_SECRET_KEY en .env: se usan los productos de ejemplo.');
      } else {
        try {
          const { fetchSupabaseProducts } = await import('./server/supabaseCatalog.js');
          products = await fetchSupabaseProducts({ url, secretKey, imageBucket: env.SUPABASE_IMAGE_BUCKET });
          console.log(`[supabase] ${products.length} productos cargados desde Supabase.`);
        } catch (err) {
          this.warn(`No se pudo leer el catálogo de Supabase (${(err as Error).message}). Se usan los productos de ejemplo.`);
        }
      }
      return `export default ${JSON.stringify(products)};`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Ruta donde se publica la tienda. En GitHub Pages es /<nombre-del-repositorio>/ (lo define el workflow);
  // en Vercel o un dominio propio, la raíz.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), ordersApi(mode), supabaseCatalog(mode)],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Las pruebas de interfaz simulan a una persona llenando formularios completos; en máquinas
    // lentas o en GitHub Actions superan los 5 s por defecto aunque todo funcione bien.
    testTimeout: 20_000,
  },
}));

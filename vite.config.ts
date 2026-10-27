/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import type { Connect, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Monta el endpoint del asistente (/api/chat) en `npm run dev` y `npm run preview`.
 * Las variables de .env se cargan solo en el proceso de Node: las que no empiezan
 * con VITE_ nunca llegan al código del navegador.
 */
// Vive en globalThis porque Vite vuelve a importar este archivo en cada reinicio.
const store = globalThis as typeof globalThis & { __elitefitInjectedEnv?: Set<string> };
const injectedEnv = (store.__elitefitInjectedEnv ??= new Set<string>());

function chatApi(mode: string): Plugin {
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
    const { createChatHandler } = await import('./server/chatHandler.js');
    const handler = createChatHandler();
    middlewares.use('/api/chat', (req, res) => void handler(req, res));
  };
  return {
    name: 'elitefit-chat-api',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), chatApi(mode)],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
}));

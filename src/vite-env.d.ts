/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Productos leídos de Supabase al iniciar o compilar (ver vite.config.ts). Vacío si no hay conexión. */
declare module 'virtual:supabase-catalog' {
  const products: import('./types').Product[];
  export default products;
}

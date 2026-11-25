import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente de Supabase para el navegador.
 * Usa solo la clave pública (anon / publishable). Protege las tablas con RLS.
 * Es null si faltan las variables, para que la tienda siga funcionando sin base de datos.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

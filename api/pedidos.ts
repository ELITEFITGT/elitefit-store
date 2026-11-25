/**
 * Función serverless para Vercel: POST /api/pedidos (registra el pedido en Supabase).
 * Variables de entorno del proyecto: VITE_SUPABASE_URL y SUPABASE_SECRET_KEY.
 */
import { createOrderHandler } from '../server/orderHandler.js';

export default createOrderHandler();

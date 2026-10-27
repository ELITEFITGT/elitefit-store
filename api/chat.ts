/**
 * Función serverless para Vercel: GET /api/chat (estado) y POST /api/chat (conversación).
 * Usa el mismo manejador que el servidor de desarrollo de Vite.
 * La clave del proveedor se configura como variable de entorno del proyecto (ANTHROPIC_API_KEY).
 */
import { createChatHandler } from '../server/chatHandler.js';

export default createChatHandler();

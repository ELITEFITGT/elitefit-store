/**
 * HERRAMIENTAS DEL ASISTENTE
 * Definiciones compartidas por el servidor (se envían al modelo) y el navegador
 * (el controlador solo ejecuta estas herramientas y valida sus argumentos).
 * Este archivo no debe importar código del navegador: también lo usa el servidor.
 */

export const TOOL_NAMES = [
  'searchProducts',
  'getProductDetails',
  'getSizeGuide',
  'getStoreInformation',
  'getCart',
  'addToCart',
  'updateCartItem',
  'removeFromCart',
  'prepareWhatsAppOrder',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const isToolName = (name: unknown): name is ToolName =>
  typeof name === 'string' && (TOOL_NAMES as readonly string[]).includes(name);

const CATEGORIES = ['mujer', 'hombre', 'calzado', 'accesorios'];
const INFO_TOPICS = ['general', 'como-comprar', 'envios-y-entregas', 'cambios-y-devoluciones', 'preguntas-frecuentes', 'contacto'];

interface ToolDefinition {
  name: ToolName;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties: false;
  };
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'searchProducts',
    description:
      'Busca productos reales del catálogo. Todos los filtros son opcionales y se combinan. Devuelve id, nombre, categoría, precio, colores y tallas. Úsala antes de recomendar o mencionar cualquier producto.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', maxLength: 80, description: 'Palabras clave: tipo de prenda, actividad o nombre (p. ej. "leggings", "yoga", "sudadera").' },
        category: { type: 'string', enum: CATEGORIES },
        minPrice: { type: 'number', minimum: 0, description: 'Precio mínimo en quetzales.' },
        maxPrice: { type: 'number', minimum: 0, description: 'Precio máximo en quetzales.' },
        size: { type: 'string', maxLength: 5, description: 'Talla que debe estar disponible, p. ej. "M".' },
        color: { type: 'string', maxLength: 30, description: 'Color que debe estar disponible, p. ej. "Negro".' },
        sort: { type: 'string', enum: ['destacados', 'novedades', 'precio-asc', 'precio-desc'] },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getProductDetails',
    description: 'Devuelve la ficha completa de un producto: descripción, características, tallas, colores, precio y guía de tallas aplicable.',
    input_schema: {
      type: 'object',
      properties: { productId: { type: 'string', maxLength: 20 } },
      required: ['productId'],
      additionalProperties: false,
    },
  },
  {
    name: 'getSizeGuide',
    description:
      'Devuelve la tabla de medidas de referencia (cm). Indica "guide" ("mujer", "hombre" o "calzado") o un "productId" para usar la guía de ese producto.',
    input_schema: {
      type: 'object',
      properties: {
        guide: { type: 'string', enum: ['mujer', 'hombre', 'calzado'] },
        productId: { type: 'string', maxLength: 20 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'getStoreInformation',
    description:
      'Devuelve la información configurada de la tienda: cómo comprar, envíos, cambios, preguntas frecuentes, contacto y qué datos NO están configurados.',
    input_schema: {
      type: 'object',
      properties: { topic: { type: 'string', enum: INFO_TOPICS } },
      additionalProperties: false,
    },
  },
  {
    name: 'getCart',
    description: 'Devuelve el carrito actual del cliente con itemId, producto, talla, color, cantidad, precios y total calculados por la tienda.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'addToCart',
    description:
      'Agrega un producto al carrito del cliente. Requiere productId, color exacto, talla exacta (null solo si el producto es de talla única) y cantidad. Úsala solo cuando el cliente confirmó o dio la instrucción completa y explícita.',
    input_schema: {
      type: 'object',
      properties: {
        productId: { type: 'string', maxLength: 20 },
        size: { type: ['string', 'null'], maxLength: 5 },
        color: { type: 'string', maxLength: 30 },
        quantity: { type: 'integer', minimum: 1 },
      },
      required: ['productId', 'size', 'color', 'quantity'],
      additionalProperties: false,
    },
  },
  {
    name: 'updateCartItem',
    description: 'Cambia la cantidad de un artículo del carrito (usa el itemId devuelto por getCart). Para quitarlo usa removeFromCart.',
    input_schema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', maxLength: 80 },
        quantity: { type: 'integer', minimum: 1 },
      },
      required: ['itemId', 'quantity'],
      additionalProperties: false,
    },
  },
  {
    name: 'removeFromCart',
    description:
      'Elimina artículos del carrito por itemId. Con un artículo se elimina de inmediato; con varios, la tienda muestra al cliente un botón para confirmar y no elimina nada hasta que lo pulse.',
    input_schema: {
      type: 'object',
      properties: {
        itemIds: { type: 'array', items: { type: 'string', maxLength: 80 }, minItems: 1, maxItems: 20 },
      },
      required: ['itemIds'],
      additionalProperties: false,
    },
  },
  {
    name: 'prepareWhatsAppOrder',
    description:
      'Prepara el pedido con el carrito actual y muestra al cliente el resumen y el botón "Continuar por WhatsApp". Los datos de entrega se completan en un formulario local; no los pidas en el chat.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

/**
 * CONFIGURACIÓN GENERAL DE LA TIENDA
 * Edita este archivo para cambiar el nombre, el número de WhatsApp,
 * el mensaje de la barra superior, los datos de contacto y las redes.
 * Los colores se cambian en src/index.css.
 */
export const storeConfig = {
  /** Nombre visible de la tienda (logo, títulos y mensaje de WhatsApp). */
  name: 'ELITEFIT',

  /** Frase corta que acompaña al nombre en el pie de página. */
  tagline: 'Ropa fitness para entrenar con intención.',

  /**
   * Número de WhatsApp que recibe los pedidos.
   * Formato internacional SIN "+", espacios ni guiones. Ej.: 502 + número => '50212345678'.
   * Número de pruebas (4270-9260). Cámbialo por el número definitivo antes de publicar.
   */
  whatsappNumber: '50242709260',

  /** Mensaje de la barra superior. Déjalo vacío ('') para ocultar la barra. */
  announcement: 'Haz tu pedido por WhatsApp · Disponibilidad y envío se confirman por chat',

  /**
   * Pantalla de entrada que se muestra al abrir la tienda (src/components/SplashScreen.tsx).
   * - enabled: false la desactiva por completo.
   * - phrase: frase motivadora debajo del logo. Déjala vacía ('') para ocultarla.
   * - oncePerSession: true la muestra solo la primera vez que se abre la pestaña;
   *   false la muestra en cada recarga.
   */
  splash: {
    enabled: true,
    phrase: 'Prepárate para superar tus límites',
    oncePerSession: false,
  },

  /** Moneda: se usa para mostrar precios. */
  currency: { code: 'GTQ', locale: 'es-GT' },

  /** Cantidad máxima por artículo (misma combinación de producto, talla y color). */
  maxQuantityPerItem: 10,

  /** Datos de contacto del pie de página. Deja un campo vacío ('') para ocultarlo. */
  contact: {
    email: '',
    location: 'Ciudad de Guatemala',
    hours: 'Lunes a sábado, 9:00 a 18:00',
  },

  /**
   * Redes sociales. DATOS DE DEMOSTRACIÓN: reemplaza las direcciones por las reales.
   * Elimina una entrada para ocultarla.
   */
  social: [
    { network: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/' },
    { network: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/' },
  ] as { network: 'instagram' | 'facebook' | 'other'; label: string; url: string }[],
} as const;

export type StoreConfig = typeof storeConfig;

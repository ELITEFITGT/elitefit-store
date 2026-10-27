/**
 * PÁGINAS DE INFORMACIÓN (enlaces del pie de página)
 * Texto de ejemplo: revísalo y edítalo según las políticas reales de la tienda.
 * Cada página se abre en /info/<slug>. Cada sección admite varios párrafos.
 */
export interface InfoPage {
  slug: string;
  title: string;
  intro: string;
  sections: { heading: string; paragraphs: string[] }[];
}

export const infoPages: InfoPage[] = [
  {
    slug: 'como-comprar',
    title: 'Cómo comprar',
    intro: 'Tu pedido se arma en esta página y se completa en una conversación por WhatsApp.',
    sections: [
      {
        heading: '1. Elige tus productos',
        paragraphs: ['Explora el catálogo, selecciona talla y color, y agrega los productos al carrito.'],
      },
      {
        heading: '2. Envía tu pedido por WhatsApp',
        paragraphs: [
          'Desde el carrito completa tu nombre y la modalidad de entrega. Se abrirá WhatsApp con el detalle del pedido listo para enviar.',
        ],
      },
      {
        heading: '3. Confirmamos contigo',
        paragraphs: [
          'Por WhatsApp te confirmamos la disponibilidad, el costo de envío y la forma de pago. El pedido queda confirmado solo cuando lo acordemos por ese medio.',
        ],
      },
    ],
  },
  {
    slug: 'envios-y-entregas',
    title: 'Envíos y entregas',
    intro: 'Puedes recibir tu pedido a domicilio o recogerlo.',
    sections: [
      {
        heading: 'Costo de envío',
        paragraphs: ['El costo y el tiempo de envío dependen de tu ubicación y se confirman por WhatsApp antes de cerrar el pedido.'],
      },
      {
        heading: 'Recoger',
        paragraphs: ['Si eliges recoger, te indicaremos por WhatsApp el punto y el horario de entrega.'],
      },
    ],
  },
  {
    slug: 'cambios-y-devoluciones',
    title: 'Cambios y devoluciones',
    intro: 'Si necesitas cambiar una talla o un color, escríbenos.',
    sections: [
      {
        heading: 'Solicitar un cambio',
        paragraphs: [
          'Escríbenos por WhatsApp con el detalle de tu pedido y el cambio que necesitas. Te indicaremos las condiciones y la disponibilidad de la talla o el color.',
        ],
      },
    ],
  },
  {
    slug: 'guia-de-tallas',
    title: 'Guía de tallas',
    intro: 'Medidas de referencia en centímetros. Si estás entre dos tallas, escríbenos y te ayudamos a elegir.',
    sections: [],
  },
  {
    slug: 'preguntas-frecuentes',
    title: 'Preguntas frecuentes',
    intro: 'Respuestas rápidas sobre cómo funciona la tienda.',
    sections: [
      {
        heading: '¿El pedido se paga en la página?',
        paragraphs: ['No. La página solo prepara el mensaje de tu pedido. La forma de pago se acuerda por WhatsApp.'],
      },
      {
        heading: '¿Mi pedido queda confirmado al abrir WhatsApp?',
        paragraphs: ['No. Primero debes enviar el mensaje y luego confirmamos contigo la disponibilidad, el envío y el pago.'],
      },
      {
        heading: '¿Se guarda mi carrito?',
        paragraphs: ['Sí, el carrito se guarda en este navegador. Si lo abres en otro dispositivo, estará vacío.'],
      },
    ],
  },
];

export const getInfoPage = (slug: string) => infoPages.find((p) => p.slug === slug);

/**
 * GUÍA DE TALLAS (medidas de referencia en cm). Edita los valores según tu proveedor.
 */
export const sizeGuides = {
  mujer: {
    title: 'Mujer',
    columns: ['Talla', 'Busto', 'Cintura', 'Cadera'],
    rows: [
      ['XS', '78–82', '60–64', '86–90'],
      ['S', '83–87', '65–69', '91–95'],
      ['M', '88–92', '70–74', '96–100'],
      ['L', '93–98', '75–80', '101–106'],
      ['XL', '99–104', '81–86', '107–112'],
    ],
  },
  hombre: {
    title: 'Hombre',
    columns: ['Talla', 'Pecho', 'Cintura', 'Cadera'],
    rows: [
      ['S', '88–94', '74–80', '90–96'],
      ['M', '95–101', '81–87', '97–103'],
      ['L', '102–108', '88–94', '104–110'],
      ['XL', '109–115', '95–101', '111–117'],
      ['XXL', '116–122', '102–108', '118–124'],
    ],
  },
  calzado: {
    title: 'Calzado',
    columns: ['Talla (US)', 'EU', 'Largo del pie'],
    rows: [
      ['5', '35.5', '22.0–22.5'],
      ['6', '36.5', '22.6–23.5'],
      ['7', '38', '23.6–24.5'],
      ['8', '40', '24.6–25.5'],
      ['9', '41', '25.6–26.5'],
      ['10', '42.5', '26.6–27.5'],
      ['11', '44', '27.6–28.5'],
    ],
  },
} as const;

export type SizeGuideId = keyof typeof sizeGuides;

export const sizeGuideTips = [
  'Busto o pecho: mide alrededor de la parte más amplia, con la cinta horizontal.',
  'Cintura: mide alrededor de la parte más estrecha del torso.',
  'Cadera: mide alrededor de la parte más amplia de la cadera.',
  'Largo del pie: apoya el talón contra la pared y mide hasta la punta del dedo más largo. Si estás entre dos tallas, elige la mayor.',
];

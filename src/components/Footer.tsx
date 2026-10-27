import { Link } from 'react-router-dom';
import { Clock, Facebook, Globe, Instagram, Mail, MapPin, MessageCircle } from 'lucide-react';
import { navLinks } from '../config/navigation';
import { storeConfig } from '../config/store';
import { infoPages } from '../data/info';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { Logo } from './Logo';

const socialIcons = { instagram: Instagram, facebook: Facebook, other: Globe };

export function Footer() {
  const { contact, social } = storeConfig;
  const whatsappUrl = buildWhatsAppUrl(storeConfig.whatsappNumber, `Hola, ${storeConfig.name}. Tengo una consulta.`);

  return (
    <footer className="mt-24 bg-ink text-canvas sm:mt-32">
      <div className="shell grid gap-12 py-14 sm:py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo variant="dark" size={56} />
          <p className="mt-4 text-[15px] leading-relaxed text-canvas/70">{storeConfig.tagline}</p>
          {social.length > 0 && (
            <ul className="mt-6 flex gap-2" aria-label="Redes sociales">
              {social.map((s) => {
                const Icon = socialIcons[s.network];
                return (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-canvas/20 transition-colors hover:border-canvas hover:bg-canvas hover:text-ink"
                      aria-label={`${s.label} (se abre en una pestaña nueva)`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <nav aria-label="Tienda">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-canvas/50">Tienda</h2>
          <ul className="space-y-3 text-[15px]">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-canvas/80 transition-colors hover:text-canvas">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Información">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-canvas/50">Información</h2>
          <ul className="space-y-3 text-[15px]">
            {infoPages.map((p) => (
              <li key={p.slug}>
                <Link to={`/info/${p.slug}`} className="text-canvas/80 transition-colors hover:text-canvas">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-canvas/50">Contacto</h2>
          <ul className="space-y-3.5 text-[15px] text-canvas/80">
            <li>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 transition-colors hover:text-canvas"
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Escríbenos por WhatsApp
              </a>
            </li>
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2.5 break-all transition-colors hover:text-canvas">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {contact.email}
                </a>
              </li>
            )}
            {contact.location && (
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {contact.location}
              </li>
            )}
            {contact.hours && (
              <li className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                {contact.hours}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-canvas/10">
        <div className="shell flex flex-col gap-2 py-6 text-[13px] text-canvas/50 sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {storeConfig.name}. Precios en quetzales (Q).
          </p>
          <p>Pedidos, envío y pago se confirman por WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}

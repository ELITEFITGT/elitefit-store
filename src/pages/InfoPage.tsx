import { Link, useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { SizeGuide } from '../components/SizeGuide';
import { storeConfig } from '../config/store';
import { getInfoPage, infoPages } from '../data/info';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { buildWhatsAppUrl } from '../lib/whatsapp';
import { NotFoundPage } from './NotFoundPage';

export function InfoPage() {
  const { slug = '' } = useParams();
  const page = getInfoPage(slug);
  useDocumentTitle(page?.title ?? 'Página no encontrada');
  if (!page) return <NotFoundPage />;

  return (
    <div className="shell pt-6 sm:pt-8">
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: page.title }]} />
      <div className="mt-8 grid gap-12 lg:grid-cols-[14rem_1fr] lg:gap-20">
        <nav aria-label="Información" className="order-last lg:order-first">
          <p className="eyebrow mb-4">Información</p>
          <ul className="space-y-1">
            {infoPages.map((p) => (
              <li key={p.slug}>
                <Link
                  to={`/info/${p.slug}`}
                  aria-current={p.slug === page.slug ? 'page' : undefined}
                  className="block rounded-xl px-3 py-2 text-[15px] text-muted transition-colors hover:bg-surface hover:text-ink aria-[current=page]:bg-surface aria-[current=page]:font-semibold aria-[current=page]:text-ink"
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article className="max-w-2xl">
          <h1 className="display text-[clamp(2.8rem,8vw,5rem)]">{page.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{page.intro}</p>
          <div className="mt-10 space-y-8">
            {page.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-xl font-bold">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-3 text-[15px] leading-relaxed text-muted sm:text-base">
                    {p}
                  </p>
                ))}
              </section>
            ))}
            {page.slug === 'guia-de-tallas' && <SizeGuide />}
          </div>
          <div className="mt-12 rounded-3xl bg-surface p-6 sm:p-8">
            <p className="font-bold">¿Tienes otra pregunta?</p>
            <p className="mt-1 text-[15px] text-muted">Escríbenos y te respondemos por WhatsApp.</p>
            <a
              href={buildWhatsAppUrl(storeConfig.whatsappNumber, `Hola, ${storeConfig.name}. Tengo una consulta.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-5"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
              Escribir por WhatsApp
            </a>
          </div>
        </article>
      </div>
    </div>
  );
}

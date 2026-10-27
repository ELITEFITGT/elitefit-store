import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage({ message = 'La página que buscas no existe o fue movida.' }: { message?: string }) {
  useDocumentTitle('Página no encontrada');
  return (
    <div className="shell flex flex-col items-start py-20 sm:py-32">
      <p className="eyebrow">Error 404</p>
      <h1 className="display mt-4 text-[clamp(3rem,12vw,7rem)]">No encontrado</h1>
      <p className="mt-5 max-w-md text-lg text-muted">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/catalogo" className="btn-primary">
          Ir al catálogo
        </Link>
        <Link to="/" className="btn-outline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

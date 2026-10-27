import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

interface SearchFormProps {
  onSubmitted?: () => void;
  /** "overlay": versión translúcida para mostrarse sobre una foto. */
  tone?: 'default' | 'overlay';
  autoFocus?: boolean;
  className?: string;
}

/** Buscador del encabezado: lleva al catálogo con el término de búsqueda. */
export function SearchForm({ onSubmitted, autoFocus, className = '', tone = 'default' }: SearchFormProps) {
  const overlay = tone === 'overlay';
  const navigate = useNavigate();
  const location = useLocation();
  const id = useId();
  const [value, setValue] = useState('');

  // Refleja la búsqueda actual cuando se está en el catálogo.
  useEffect(() => {
    if (location.pathname === '/catalogo') setValue(new URLSearchParams(location.search).get('q') ?? '');
    else setValue('');
  }, [location.pathname, location.search]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const params = location.pathname === '/catalogo' ? new URLSearchParams(location.search) : new URLSearchParams();
    if (value.trim()) params.set('q', value.trim());
    else params.delete('q');
    const qs = params.toString();
    navigate(`/catalogo${qs ? `?${qs}` : ''}`);
    onSubmitted?.();
  };

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Buscar productos
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar productos"
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        className={`h-11 w-full rounded-full border pl-11 pr-4 text-[15px] transition-colors focus:outline-none focus:ring-1 ${
          overlay
            ? 'border-white/35 bg-white/10 text-canvas placeholder:text-canvas/75 backdrop-blur-md focus:border-canvas focus:ring-canvas'
            : 'border-line bg-surface placeholder:text-muted/80 focus:border-ink focus:ring-ink'
        }`}
      />
      <button
        type="submit"
        className={`absolute left-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full ${
          overlay ? 'text-canvas/80 hover:text-canvas' : 'text-muted hover:text-ink'
        }`}
        aria-label="Buscar"
      >
        <Search className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
    </form>
  );
}

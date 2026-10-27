import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  /** Nombre del producto para etiquetas accesibles. */
  label: string;
  size?: 'sm' | 'md';
}

export function QuantitySelector({ value, onChange, max, label, size = 'md' }: QuantitySelectorProps) {
  const btn = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';
  return (
    <div
      className="inline-flex items-center rounded-full border border-line bg-surface"
      role="group"
      aria-label={`Cantidad de ${label}`}
    >
      <button
        type="button"
        className={`${btn} inline-flex items-center justify-center rounded-full transition-colors hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label={`Disminuir cantidad de ${label}`}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <output className={`${size === 'sm' ? 'w-7 text-sm' : 'w-9'} text-center font-semibold tabular-nums`} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={`${btn} inline-flex items-center justify-center rounded-full transition-colors hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent`}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Aumentar cantidad de ${label}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

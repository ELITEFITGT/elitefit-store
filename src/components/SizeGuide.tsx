import { useId, useMemo, useState } from 'react';
import { Check, Info, Ruler } from 'lucide-react';
import { sizeGuides } from '../data/info';
import type { SizeGuideId } from '../data/info';

/* ------------------------------------------------------------------------------------------------
 * Guía de tallas interactiva: ilustración con las líneas de medida, calculadora de talla y tabla.
 * Las medidas se editan en src/data/info.ts (sizeGuides).
 * ---------------------------------------------------------------------------------------------- */

interface SizeGuideProps {
  /** Muestra solo esta guía (página de producto). Sin valor: pestañas con todas las guías. */
  only?: SizeGuideId;
  /** Tallas que tiene el producto; las demás filas se ven atenuadas. */
  productSizes?: string[];
  /** Si se indica, aparece un botón para elegir la talla recomendada o la fila seleccionada. */
  onSelectSize?: (size: string) => void;
  /** Diseño angosto para paneles laterales (drawer): medidas una debajo de otra. */
  narrow?: boolean;
}

/** Cómo medir cada columna (el nombre coincide con las columnas de sizeGuides). */
const howTo: Record<string, string> = {
  Busto: 'Pasa la cinta horizontal por la parte más amplia del busto, sin apretar.',
  Pecho: 'Pasa la cinta horizontal por la parte más amplia del pecho, bajo las axilas.',
  Cintura: 'Mide alrededor de la parte más estrecha del torso, por encima del ombligo.',
  Cadera: 'Con los pies juntos, mide alrededor de la parte más amplia de la cadera.',
  'Largo del pie': 'Apoya el talón contra la pared y mide hasta la punta del dedo más largo. Si estás entre dos tallas, elige la mayor.',
};

/** Columnas que son medidas del cuerpo (índices en `columns`) y dónde se dibuja cada línea. */
const figureConfig: Record<SizeGuideId, { label: string; measures: number[] }> = {
  mujer: { label: 'Mujer', measures: [1, 2, 3] },
  hombre: { label: 'Hombre', measures: [1, 2, 3] },
  calzado: { label: 'Calzado', measures: [2] },
};

const DASH = /\s*[–-]\s*/;
const parseRange = (value: string): [number, number] => {
  const [a, b = a] = value.split(DASH).map(Number);
  return [a, b];
};

type Recommendation = { index: number; mixed: boolean; outOfRange: boolean } | null;

/** Talla recomendada: para cada medida, la primera talla cuyo máximo la cubre; se elige la mayor. */
function recommend(rows: readonly (readonly string[])[], measures: number[], values: Record<number, string>): Recommendation {
  const picks: number[] = [];
  let outOfRange = false;
  for (const col of measures) {
    const n = Number(String(values[col] ?? '').replace(',', '.'));
    if (!values[col] || !Number.isFinite(n) || n <= 0) continue;
    const ranges = rows.map((r) => parseRange(r[col]));
    let index = ranges.findIndex(([, max]) => n <= max);
    if (index === -1) {
      index = rows.length - 1;
      outOfRange = true;
    }
    if (n < ranges[0][0] - 4) outOfRange = true;
    picks.push(index);
  }
  if (!picks.length) return null;
  return { index: Math.max(...picks), mixed: new Set(picks).size > 1, outOfRange };
}

export function SizeGuide({ only, productSizes, onSelectSize, narrow = false }: SizeGuideProps) {
  const ids = only ? [only] : (Object.keys(sizeGuides) as SizeGuideId[]);
  const [guideId, setGuideId] = useState<SizeGuideId>(ids[0]);
  const uid = useId();

  return (
    <div>
      {ids.length > 1 && (
        <div role="tablist" aria-label="Tipo de guía" className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-1.5">
          {ids.map((id) => {
            const selected = id === guideId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`${uid}-tab-${id}`}
                aria-selected={selected}
                aria-controls={`${uid}-panel`}
                onClick={() => setGuideId(id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition sm:flex-row sm:justify-center sm:gap-2 ${
                  selected ? 'bg-ink text-canvas shadow-sm' : 'text-muted hover:bg-line/50 hover:text-ink'
                }`}
              >
                <FigureIcon id={id} className="h-7 w-7 sm:h-6 sm:w-6" />
                {figureConfig[id].label}
              </button>
            );
          })}
        </div>
      )}
      <div id={`${uid}-panel`} role={ids.length > 1 ? 'tabpanel' : undefined} aria-labelledby={ids.length > 1 ? `${uid}-tab-${guideId}` : undefined}>
        {/* La clave reinicia medidas y selección al cambiar de guía. */}
        <GuidePanel key={guideId} id={guideId} productSizes={productSizes} onSelectSize={onSelectSize} narrow={narrow} />
      </div>
    </div>
  );
}

function GuidePanel({ id, productSizes, onSelectSize, narrow }: { id: SizeGuideId } & Omit<SizeGuideProps, 'only'>) {
  const guide = sizeGuides[id];
  const { measures } = figureConfig[id];
  const [values, setValues] = useState<Record<number, string>>({});
  const [active, setActive] = useState<number>(measures[0]);
  const [picked, setPicked] = useState<string | null>(null);
  const uid = useId();

  const rec = useMemo(() => recommend(guide.rows, measures, values), [guide.rows, measures, values]);
  const recommended = rec ? guide.rows[rec.index][0] : null;
  const highlighted = picked ?? recommended;
  const available = (size: string) => !productSizes || productSizes.includes(size);
  const unit = (col: number) => (guide.columns[col] === 'EU' ? '' : ' cm');

  return (
    <div className="space-y-6">
      {/* Figura + calculadora */}
      <div
        className={`grid items-start gap-4 rounded-2xl border border-line bg-canvas p-4 ${
          narrow ? 'grid-cols-[7.5rem_1fr]' : 'grid-cols-[6.5rem_1fr] sm:grid-cols-[11rem_1fr] sm:gap-6 sm:p-6'
        }`}
      >
        <Figure id={id} active={active} />

        <div>
          <h3 className="flex items-center gap-2 font-bold">
            <Ruler className="h-4 w-4" aria-hidden="true" />
            Encuentra tu talla
          </h3>
          <p className="mt-1 text-sm text-muted">Escribe tus medidas en centímetros.</p>

          <div className={`mt-4 grid gap-3 ${narrow ? '' : measures.length > 1 ? 'sm:grid-cols-3' : 'sm:max-w-[12rem]'}`}>
            {measures.map((col) => {
              const inputId = `${uid}-m-${col}`;
              const isActive = active === col;
              return (
                <div key={col}>
                  <label htmlFor={inputId} className={`mb-1 block text-xs font-bold uppercase tracking-wider ${isActive ? 'text-accent-strong' : 'text-muted'}`}>
                    {guide.columns[col]}
                  </label>
                  <div className="relative">
                    <input
                      id={inputId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      placeholder={parseRange(guide.rows[Math.floor(guide.rows.length / 2)][col])[0].toString()}
                      value={values[col] ?? ''}
                      onFocus={() => setActive(col)}
                      onMouseEnter={() => setActive(col)}
                      onChange={(e) => {
                        setValues((v) => ({ ...v, [col]: e.target.value }));
                        setPicked(null);
                      }}
                      className={`h-11 w-full rounded-xl border bg-surface pl-3 pr-10 text-base tabular-nums transition focus:outline-none focus:ring-1 ${
                        isActive ? 'border-accent-strong focus:ring-accent-strong' : 'border-line'
                      }`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">cm</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cómo medir la medida activa */}
          {howTo[guide.columns[active]] && (
            <p className="mt-3 flex gap-2 text-sm leading-relaxed text-muted" aria-live="polite">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-strong" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">{guide.columns[active]}:</span> {howTo[guide.columns[active]]}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Resultado */}
      <div aria-live="polite">
        {rec && recommended && (
          <div
            className={`flex flex-col gap-3 rounded-2xl bg-ink p-4 text-canvas motion-safe:animate-fade-in ${
              narrow ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:p-5'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="display flex h-14 min-w-14 items-center justify-center rounded-xl bg-accent px-3 text-2xl text-accent-ink">
                {recommended}
              </span>
              <div className="text-sm">
                <p className="font-bold">Te recomendamos la talla {recommended}</p>
                {rec.outOfRange ? (
                  <p className="mt-0.5 text-canvas/75">Tus medidas están fuera de la tabla. Escríbenos por WhatsApp y te asesoramos.</p>
                ) : rec.mixed ? (
                  <p className="mt-0.5 text-canvas/75">Tus medidas caen en tallas distintas: elegimos la mayor para mayor comodidad.</p>
                ) : (
                  !available(recommended) && <p className="mt-0.5 text-canvas/75">Este producto no tiene esa talla.</p>
                )}
              </div>
            </div>
            {onSelectSize && available(recommended) && (
              <button type="button" onClick={() => onSelectSize(recommended)} className="btn bg-canvas px-5 text-ink hover:bg-canvas/90">
                <Check className="h-4 w-4" aria-hidden="true" />
                Elegir talla {recommended}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-left text-sm">
          <caption className="border-b border-line bg-canvas px-4 py-3 text-left font-bold">
            {guide.title} <span className="font-normal text-muted">· medidas en cm{onSelectSize ? ' · toca una talla para elegirla' : ''}</span>
          </caption>
          <thead>
            <tr className="border-b border-line">
              {guide.columns.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  onMouseEnter={() => measures.includes(i) && setActive(i)}
                  className={`whitespace-nowrap px-3 py-3 font-semibold sm:px-4 ${measures.includes(i) && active === i ? 'text-accent-strong' : ''}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {guide.rows.map(([size, ...cells]) => {
              const isOn = highlighted === size;
              const hasSize = available(size);
              return (
                <tr
                  key={size}
                  onClick={onSelectSize && hasSize ? () => setPicked(size) : undefined}
                  className={`transition-colors ${isOn ? 'bg-accent/25' : ''} ${hasSize ? '' : 'opacity-45'} ${
                    onSelectSize && hasSize ? 'cursor-pointer hover:bg-line/40' : ''
                  }`}
                >
                  <th scope="row" className="whitespace-nowrap px-3 py-3 font-bold sm:px-4">
                    <span className="flex items-center gap-2">
                      {onSelectSize && hasSize ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPicked(size);
                          }}
                          aria-pressed={isOn}
                          aria-label={`Ver talla ${size}`}
                          className="rounded font-bold underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                        >
                          {size}
                        </button>
                      ) : (
                        size
                      )}
                      {isOn && size === recommended && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-canvas">Tu talla</span>}
                      {!hasSize && <span className="text-[11px] font-normal text-muted">No disponible</span>}
                    </span>
                  </th>
                  {cells.map((v, i) => (
                    <td
                      key={i}
                      className={`whitespace-nowrap px-3 py-3 tabular-nums sm:px-4 ${measures.includes(i + 1) && active === i + 1 ? 'font-semibold text-ink' : 'text-muted'}`}
                    >
                      {v}
                      {unit(i + 1) && <span className="sr-only">{unit(i + 1)}</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {onSelectSize && picked && picked !== recommended && (
        <button type="button" onClick={() => onSelectSize(picked)} className="btn w-full bg-ink text-canvas hover:bg-ink/85 sm:w-auto">
          <Check className="h-4 w-4" aria-hidden="true" />
          Elegir talla {picked}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Ilustraciones (SVG). Cada línea de medida se resalta cuando su campo está activo.
 * ---------------------------------------------------------------------------------------------- */

const SILHOUETTE = {
  mujer:
    'M90 22h20v18c16 4 36 8 40 20 3 10-4 20-8 32 6 16 2 32-10 48-6 10-6 20-2 28 16 16 22 32 20 46-2 12-10 22-22 28H72c-12-6-20-16-22-28-2-14 4-30 20-46 4-8 4-18-2-28-12-16-16-32-10-48-4-12-11-22-8-32 4-12 24-16 40-20z',
  hombre:
    'M90 22h20v16c20 4 46 8 52 22 4 12-4 24-10 36-2 20-8 38-14 54 2 18 6 40 8 62 0 14-6 24-16 30H70c-10-6-16-16-16-30 2-22 6-44 8-62-6-16-12-34-14-54-6-12-14-24-10-36 6-14 32-18 52-22z',
};

/** Líneas de medida: [columna, y, medio ancho] para maniquíes. */
const LINES: Record<'mujer' | 'hombre', [number, number, number][]> = {
  mujer: [
    [1, 100, 47],
    [2, 150, 33],
    [3, 212, 51],
  ],
  hombre: [
    [1, 100, 52],
    [2, 150, 38],
    [3, 212, 46],
  ],
};

function Figure({ id, active }: { id: SizeGuideId; active: number }) {
  return (
    <svg viewBox="0 0 200 300" className="w-full" role="img" aria-label={`Ilustración de cómo medir (${figureConfig[id].label})`}>
      {id === 'calzado' ? <Foot active={active === 2} /> : <Mannequin id={id} active={active} />}
    </svg>
  );
}

function Mannequin({ id, active }: { id: 'mujer' | 'hombre'; active: number }) {
  return (
    <g>
      <path d={SILHOUETTE[id]} className="fill-surface stroke-ink/35" strokeWidth={2} strokeLinejoin="round" />
      {/* Soporte */}
      <rect x={97} y={242} width={6} height={40} rx={2} className="fill-ink/35" />
      <ellipse cx={100} cy={286} rx={34} ry={6} className="fill-ink/20" />
      {LINES[id].map(([col, y, rx]) => {
        const on = col === active;
        return (
          <g key={col} className={`transition-colors duration-300 ${on ? 'text-accent-strong' : 'text-ink/30'}`}>
            <ellipse cx={100} cy={y} rx={rx} ry={7} fill="none" stroke="currentColor" strokeWidth={on ? 3.5 : 2} strokeDasharray={on ? undefined : '5 4'} />
            {on && <circle cx={100 + rx} cy={y} r={4.5} fill="currentColor" className="motion-safe:animate-pulse" />}
          </g>
        );
      })}
    </g>
  );
}

function Foot({ active }: { active: boolean }) {
  return (
    <g>
      {/* Pared detrás del talón */}
      <rect x={40} y={274} width={120} height={8} rx={2} className="fill-ink/20" />
      <path
        d="M98 272c-20 0-30-16-30-36 0-26 2-46-2-71-4-25-6-53 0-75 6-20 22-28 38-26 18 2 32 14 34 36 2 24-4 50-6 75-2 25 0 47-2 65-2 18-14 32-32 32z"
        className="fill-surface stroke-ink/35"
        strokeWidth={2}
      />
      {[
        [118, 48, 13],
        [97, 42, 9],
        [82, 48, 8],
        [70, 58, 7],
        [62, 72, 6],
      ].map(([cx, cy, r]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} className="fill-surface stroke-ink/35" strokeWidth={2} />
      ))}
      <g className={`transition-colors duration-300 ${active ? 'text-accent-strong' : 'text-ink/30'}`}>
        <line x1={165} y1={270} x2={165} y2={38} stroke="currentColor" strokeWidth={active ? 3.5 : 2} strokeDasharray={active ? undefined : '5 4'} />
        <path d="M157 48l8-12 8 12M157 260l8 12 8-12" fill="none" stroke="currentColor" strokeWidth={active ? 3.5 : 2} strokeLinecap="round" strokeLinejoin="round" />
        <line x1={130} y1={35} x2={175} y2={35} stroke="currentColor" strokeWidth={1.5} />
      </g>
    </g>
  );
}

/** Ícono pequeño para las pestañas. */
function FigureIcon({ id, className }: { id: SizeGuideId; className?: string }) {
  return (
    <svg viewBox={id === 'calzado' ? '50 25 100 255' : '30 15 140 280'} className={className} aria-hidden="true">
      {id === 'calzado' ? (
        <path
          d="M98 272c-20 0-30-16-30-36 0-26 2-46-2-71-4-25-6-53 0-75 6-20 22-28 38-26 18 2 32 14 34 36 2 24-4 50-6 75-2 25 0 47-2 65-2 18-14 32-32 32z"
          fill="currentColor"
        />
      ) : (
        <path d={SILHOUETTE[id]} fill="currentColor" />
      )}
    </svg>
  );
}

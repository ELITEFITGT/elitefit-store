import { sizeGuides, sizeGuideTips } from '../data/info';
import type { SizeGuideId } from '../data/info';

/** Tabla(s) de medidas. Si se indica `only`, muestra solo esa guía. */
export function SizeGuide({ only }: { only?: SizeGuideId }) {
  const ids = only ? [only] : (Object.keys(sizeGuides) as SizeGuideId[]);
  return (
    <div className="space-y-8">
      {ids.map((id) => {
        const guide = sizeGuides[id];
        return (
          <div key={id}>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <caption className="border-b border-line bg-canvas px-4 py-3 text-left font-bold">
                  {guide.title} <span className="font-normal text-muted">· medidas en cm</span>
                </caption>
                <thead>
                  <tr className="border-b border-line">
                    {guide.columns.map((c) => (
                      <th key={c} scope="col" className="px-4 py-3 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {guide.rows.map(([size, ...values]) => (
                    <tr key={size}>
                      <th scope="row" className="px-4 py-3 font-bold">
                        {size}
                      </th>
                      {values.map((v, i) => (
                        <td key={i} className="px-4 py-3 tabular-nums text-muted">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <div>
        <h3 className="mb-2 font-bold">Cómo medir</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
          {sizeGuideTips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

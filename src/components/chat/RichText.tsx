import { Fragment } from 'react';
import type { ReactNode } from 'react';

/**
 * Muestra el texto del asistente de forma segura: nunca interpreta HTML.
 * Solo reconoce párrafos, listas con "-", "•" o "1." y **negritas**; todo se crea como nodos de texto de React.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function RichText({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul' | 'ol'; lines: string[] }[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) {
      blocks.push({ type: 'p', lines: [] });
      continue;
    }
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const type = bullet ? 'ul' : numbered ? 'ol' : 'p';
    const content = bullet?.[1] ?? numbered?.[1] ?? line;
    const last = blocks[blocks.length - 1];
    if (last && last.type === type && (type !== 'p' || last.lines.length)) last.lines.push(content);
    else blocks.push({ type, lines: [content] });
  }

  return (
    <div className="space-y-2">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) => {
          if (b.type === 'p')
            return (
              <p key={i}>
                {b.lines.map((l, j) => (
                  <Fragment key={j}>
                    {j > 0 && <br />}
                    {inline(l)}
                  </Fragment>
                ))}
              </p>
            );
          const List = b.type;
          return (
            <List key={i} className={`space-y-1 pl-5 ${b.type === 'ul' ? 'list-disc' : 'list-decimal'}`}>
              {b.lines.map((l, j) => (
                <li key={j}>{inline(l)}</li>
              ))}
            </List>
          );
        })}
    </div>
  );
}

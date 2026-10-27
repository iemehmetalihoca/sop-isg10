import type { Lang } from './types';
import en from './translations-en.json';
import fr from './translations-fr.json';

const enMap = en as Record<string, string>;
const frMap = fr as Record<string, string>;

function buildUniqueReverse(map: Record<string, string>) {
  const candidates = new Map<string, string[]>();
  Object.entries(map).forEach(([source, translated]) => {
    const list = candidates.get(translated) ?? [];
    list.push(source);
    candidates.set(translated, list);
  });
  return new Map(
    [...candidates.entries()]
      .filter(([, sources]) => sources.length === 1)
      .map(([translated, sources]) => [translated, sources[0]]),
  );
}

const enReverse = buildUniqueReverse(enMap);
const frReverse = buildUniqueReverse(frMap);

function canonicalSource(value: string) {
  if (value in enMap || value in frMap) return value;
  // Normalize only unambiguous exact translations.
  return enReverse.get(value) ?? frReverse.get(value) ?? value;
}

/**
 * Translate fixed UI/document text while keeping Turkish as the canonical source.
 * Exact, unambiguous English/French translations are also recognized so previously
 * saved default content can move between TR/EN/FR without corrupting custom text.
 */
export function tr(value: string, lang: Lang) {
  const source = canonicalSource(value);
  if (lang === 'en') return enMap[source] ?? value;
  if (lang === 'fr') return frMap[source] ?? value;
  return source;
}

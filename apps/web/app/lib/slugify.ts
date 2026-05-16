// Minimal Cyrillic (Bulgarian) -> Latin transliteration + slug normalization.
// Used so users can type slugs in Cyrillic by mistake and still pass the
// `^[a-z0-9]+(?:-[a-z0-9]+)*$` validation on the API.
const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sht', ъ: 'a', ь: 'y', ю: 'yu', я: 'ya',
};

export function slugify(input: string): string {
  const lower = input.toLowerCase().trim();
  let out = '';
  for (const ch of lower) {
    out += CYRILLIC_MAP[ch] ?? ch;
  }
  return out
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

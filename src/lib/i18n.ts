import en from '../i18n/en.json';
import es from '../i18n/es.json';

type Dict = Record<string, any>;
const dicts: Record<string, Dict> = { en, es };
let current = 'en';

export function setLocale(locale: 'en' | 'es') {
  current = locale in dicts ? locale : 'en';
}

export function t(path: string): string {
  const parts = path.split('.');
  let node: any = dicts[current];
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) node = node[p];
    else return path;
  }
  return typeof node === 'string' ? node : path;
}

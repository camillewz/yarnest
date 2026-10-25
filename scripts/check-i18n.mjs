// CA7.4 : fr.json et en.json ont exactement les mêmes clés, et chaque clé statique
// utilisée dans le code (t('…')) existe. Usage : npm run check:i18n
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const load = async (lang) =>
  JSON.parse(await readFile(join(root, `src/i18n/locales/${lang}.json`), 'utf8'));

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

const fr = new Set(flatten(await load('fr')));
const en = new Set(flatten(await load('en')));
const errors = [];
for (const key of fr) if (!en.has(key)) errors.push(`absente de en.json : ${key}`);
for (const key of en) if (!fr.has(key)) errors.push(`absente de fr.json : ${key}`);

// Clés pluralisées : t('x', { count }) résout x_one / x_other.
const known = (key) => fr.has(key) || fr.has(`${key}_one`) || fr.has(`${key}_other`);

async function* sources(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) yield path;
  }
}

for await (const file of sources(join(root, 'src'))) {
  const code = await readFile(file, 'utf8');
  for (const [, key] of code.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    if (!known(key)) errors.push(`clé inconnue ${key} dans ${file.replace(root, '')}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`i18n : ${fr.size} clés, fr et en alignés, aucune clé inconnue dans le code.`);

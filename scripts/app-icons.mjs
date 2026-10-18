import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Keep the wing inside the maskable safe circle; no OS-specific rounded corners.
const source = await readFile(new URL('../public/app/werigo-mark.svg', import.meta.url));
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable-512.png', 512]]) {
  await writeFile(new URL(`../public/app/${name}`, import.meta.url), await sharp(source).resize(size, size).png().toBuffer());
}
console.log('WERIGO app icons rendered from the shared wing vector.');

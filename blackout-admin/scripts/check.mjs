import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'src');
const entries = await readdir(sourceDir, {withFileTypes:true});
const scripts = entries.filter(item => item.isFile() && item.name.endsWith('.js')).map(item => item.name);

for (const name of scripts) {
  const source = await readFile(path.join(sourceDir, name), 'utf8');
  new vm.Script(source, {filename:name});
}

const html = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
for (const required of ['admin.js','admin.css','supabase-config.js']) {
  if (!html.includes(required)) throw new Error(`Referência obrigatória ausente: ${required}`);
}
console.log(`${scripts.length} scripts validados; estrutura do painel íntegra.`);

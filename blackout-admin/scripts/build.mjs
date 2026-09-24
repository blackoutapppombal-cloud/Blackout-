import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(projectRoot, 'src');
const outputDir = path.join(projectRoot, 'dist');

async function loadLocalEnv() {
  try {
    const text = await readFile(path.join(projectRoot, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

await loadLocalEnv();

const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
const publicSiteUrl = String(process.env.PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');

if (!/^https:\/\/.+\.supabase\.co$/i.test(supabaseUrl)) {
  throw new Error('SUPABASE_URL ausente ou inválida. Configure-a no Vercel ou em blackout-admin/.env.');
}
if (!supabaseAnonKey) {
  throw new Error('SUPABASE_ANON_KEY ausente. Use somente a chave pública anon/publishable.');
}
if (/(service_role|secret)/i.test(supabaseAnonKey)) {
  throw new Error('Chave privilegiada recusada: o painel aceita somente SUPABASE_ANON_KEY pública.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });

const runtimeConfig = `window.BLACKOUT_SUPABASE = Object.freeze({\n  url: ${JSON.stringify(supabaseUrl)},\n  publishableKey: ${JSON.stringify(supabaseAnonKey)}\n});\nwindow.BLACKOUT_PUBLIC_SITE_URL = ${JSON.stringify(publicSiteUrl)};\n`;
await writeFile(path.join(outputDir, 'supabase-config.js'), runtimeConfig, 'utf8');
console.log(`BLACKOUT Admin pronto em ${outputDir}`);

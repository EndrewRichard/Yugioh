const fs = require('node:fs/promises');
const path = require('node:path');

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de migrar.');
  process.exit(1);
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  for (const collection of ['users', 'decks', 'duels', 'cards']) {
    const file = path.join(dataDir, `${collection}.json`);
    let payload;
    try { payload = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') { console.log(`${collection}: arquivo ausente, ignorado.`); continue; }
      throw error;
    }
    const response = await fetch(`${url}/rest/v1/app_state?on_conflict=collection`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ collection, payload }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Falha ao importar ${collection} (${response.status}): ${(await response.text()).slice(0, 300)}`);
    console.log(`${collection}: importado.`);
  }
  console.log('Migração concluída. Guarde uma cópia dos arquivos JSON locais.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

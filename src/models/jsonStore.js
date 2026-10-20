const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', '..', 'data');
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (Boolean(supabaseUrl) !== Boolean(supabaseKey)) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SECRET_KEY juntos, ou remova ambos para usar JSON local.');
}

function filename(name) { return path.join(dir, `${name}.json`); }

async function readLocal(name, fallback) {
  try { return JSON.parse(await fs.promises.readFile(filename(name), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Supabase respondeu ${response.status}: ${detail.slice(0, 300)}`);
    error.code = 'SUPABASE_ERROR';
    throw error;
  }
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

async function read(name, fallback = []) {
  if (!supabaseUrl) return readLocal(name, fallback);
  const query = new URLSearchParams({ select: 'payload', collection: `eq.${name}`, limit: '1' });
  const rows = await request(`app_state?${query}`);
  return rows.length ? rows[0].payload : fallback;
}

async function write(name, value) {
  if (!supabaseUrl) {
    await fs.promises.mkdir(dir, { recursive: true });
    const target = filename(name), temp = `${target}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(value, null, 2), 'utf8');
    await fs.promises.rename(temp, target);
    return;
  }
  await request('app_state?on_conflict=collection', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ collection: name, payload: value })
  });
}

module.exports = { read, write, isRemote: () => Boolean(supabaseUrl) };

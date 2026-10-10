import fs from 'fs';
const DIR = new URL('./data/', import.meta.url), FILE = new URL('./data/saves.json', import.meta.url);
let db = {}; try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
export const get = t => { const s = db[t] || (db[t] = { credits: 0, xp: 0, missions: 0, wins: 0 }); s.owned ??= []; s.gear ??= ''; s.hat ??= ''; return s; };
export const rank = s => 1 + Math.floor(Math.sqrt(s.xp / 150));
export function flush() { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db)); }

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Saves live in server/data by default. On a host with a persistent disk, set SAVE_DIR to a folder on that disk.
const DIR = process.env.SAVE_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data'), FILE = path.join(DIR, 'saves.json');
let db = {}; try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
export const get = t => { const s = db[t] || (db[t] = { credits: 0, xp: 0, missions: 0, wins: 0 }); s.owned ??= []; s.gear ??= ''; s.hat ??= ''; s.col ??= ''; return s; };
export const rank = s => 1 + Math.floor(Math.sqrt(s.xp / 150));
export function flush() { try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db)); } catch (e) { console.error('could not save progress:', e.message); } }

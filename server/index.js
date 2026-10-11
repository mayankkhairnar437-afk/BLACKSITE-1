import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import * as C from '../shared/constants.js';
import { MISSIONS } from '../shared/missions.js';
import { ITEMS, PALETTE } from '../shared/items.js';
import { MAPS, BONUS } from '../shared/maps.js';
import { get as getSave, rank, flush } from './save.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const allowed = ['client', 'shared', 'node_modules/three'].map(d => path.join(root, d) + path.sep);

const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/client/index.html';
  const f = u.startsWith('/vendor/three/') ? path.join(root, 'node_modules/three', u.slice(14)) : path.join(root, u);
  if (!allowed.some(d => f.startsWith(d)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const wss = new WebSocketServer({ server, maxPayload: 2048 });
const rooms = new Map();
const COLORS = ['#ff5252', '#40c4ff', '#ffd740', '#69f0ae', '#e040fb', '#ff9100', '#b2ff59', '#ffffff'];
const num = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? +v : 0));

function makeCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.random() * 24 | 0]).join(''); } while (rooms.has(c));
  return c;
}
function resetRoom(r) {
  r.phase = 'lobby'; r.map = MAPS[1]; r.haz = []; r.hzOut = []; r.doorOpen = false;
  r.grace = 0; r.decoys = []; r.inv = null; r.invS = 0; r.invertOn = 0;
  r.cells = []; r.cellsNeed = 0; r.cellsDone = 0; r.waterZ = 99; r.windOn = 0; r.windV = [0, 0]; r.windS = 0; r.wind = null; r.end = null; r.endAt = 0; r.res = null;
  r.enemies = []; r.blackout = 0; r.ev = []; r.plates = []; r.cores = []; r.caches = [];
  r.need = 0; r.got = 0; r.cacheGot = 0; r.openAt = 0; r.platesDone = false;
  let i = 0;
  for (const p of r.players.values()) { spawn(p, i++); p.ready = false; p.st = { rev: 0, taken: 0, downs: 0, picks: 0 }; }
}
function spawn(p, i) {
  Object.assign(p, { x: (i - 3.5) * 2, y: 0, z: 16, vy: 0, hp: C.MAX_HP, down: false, rp: 0, cd: 0 });
}
function send(ws, o) { if (ws.readyState === 1) ws.send(JSON.stringify(o)); }

wss.on('connection', ws => {
  let room = null, me = null, win = 0, cnt = 0;
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const nw = Date.now(); if (nw - win > 1000) { win = nw; cnt = 0; } if (++cnt > 80 || !m || typeof m !== 'object') return;   // flood protection
    if (!me && (m.t === 'create' || m.t === 'join')) {
      const name = String(m.name || 'Operative').replace(/[^\w \-]/g, '').slice(0, 14) || 'Operative';
      const token = String(m.token || '').replace(/[^\w-]/g, '').slice(0, 40) || Math.random().toString(36).slice(2);
      if (m.t === 'create') {
        room = { code: makeCode(), players: new Map(), nextId: 1, doorOpen: false, end: null, endAt: 0, enemies: [], nextE: 1, dirAt: 0, blackout: 0, ev: [], mi: 0 };
        resetRoom(room);
        rooms.set(room.code, room);
      } else {
        room = rooms.get(String(m.code || '').toUpperCase());
        if (!room) return send(ws, { t: 'err', msg: 'Room not found' });
        if (room.players.size >= C.MAX_PLAYERS) { room = null; return send(ws, { t: 'err', msg: 'Room is full (8/8)' }); }
      }
      const id = room.nextId++;
      me = { id, ws, name, color: COLORS[(id - 1) % 8], yaw: 0, in: { mx: 0, mz: 0, sprint: 0, crouch: 0, jump: 0 }, revive: 0, token, ready: false, st: { rev: 0, taken: 0, downs: 0, picks: 0 } };
      spawn(me, room.players.size);
      room.players.set(id, me);
      send(ws, { t: 'welcome', id, code: room.code });
      applyLoadout(me);
      return sendSave(me);
    }
    if (!me) return;
    if (m.t === 'in') {
      me.yaw = num(m.yaw, -1e4, 1e4);
      me.in = { mx: num(m.mx, -1, 1), mz: num(m.mz, -1, 1), sprint: m.sprint ? 1 : 0, crouch: m.crouch ? 1 : 0, jump: m.jump ? 1 : 0, pulse: m.pulse ? 1 : 0 };
      me.revive = m.revive ? 1 : 0;
    }
    if (m.t === 'ready' && room.phase === 'lobby') me.ready = !me.ready;
    if (m.t === 'pick' && room.phase === 'lobby' && me.id === hostId(room)) room.mi = num(m.i, 0, MISSIONS.length - 1) | 0;
    if ((m.t === 'buy' || m.t === 'equip') && room.phase === 'lobby') shop(me, m);
    if (m.t === 'color' && room.phase === 'lobby') { const s = getSave(me.token); if (m.id === '' || PALETTE.includes(m.id)) s.col = m.id; flush(); applyLoadout(me); sendSave(me); }
    if (m.t === 'grab' && room.phase === 'mission' && !room.end && !me.down) grab(room, me);
    if (m.t === 'use' && room.phase === 'mission' && !room.end && !me.down) useTool(room, me);
    if (m.t === 'emote' && !me.down && Date.now() - (me.emAt || 0) > 1000) { me.em = num(m.i, 1, 4) | 0; me.emAt = Date.now(); }
  });
  ws.on('close', () => {
    if (!room || !me) return;
    room.players.delete(me.id);
    if (!room.players.size) rooms.delete(room.code);
  });
});

function solid(r, x, z) {
  for (const b of r.map.solids) if (C.hitsBox(x, z, b)) return true;
  return (!r.doorOpen || Date.now() < r.lockUntil) && C.hitsBox(x, z, r.map.door);
}
const inRect = (p, h) => Math.abs(p.x - h[0]) < h[2] / 2 && Math.abs(p.z - h[1]) < h[3] / 2;
const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);

function step(r, dt) {
  const list = [...r.players.values()];
  for (const p of list) {
    if (!p.down) {
      const s = (p.in.crouch ? C.SPEED.crouch : p.in.sprint ? C.SPEED.sprint : C.SPEED.walk) * (p.gear === 'boots' ? 1.2 : 1) * (r.cells.some(c => c.by === p.id) ? 0.85 : 1) * (p.z > r.waterZ ? 0.55 : 1);
      let { mx, mz } = p.in; if (r.invertOn) { mx = -mx; mz = -mz; } const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
      let dx = (Math.cos(p.yaw) * mx - Math.sin(p.yaw) * mz) * s * dt;
      let dz = (-Math.sin(p.yaw) * mx - Math.cos(p.yaw) * mz) * s * dt;
      if (r.windOn) { dx += r.windV[0] * dt; dz += r.windV[1] * dt; }   // Skyreach gusts
      if (!solid(r, p.x + dx, p.z)) p.x += dx;
      if (!solid(r, p.x, p.z + dz)) p.z += dz;
      if (p.in.jump && p.y <= 0) p.vy = C.JUMP_V * (r.map.jv ?? 1);
      if (r.phase === 'mission' && r.map.floorHaz && inRect(p, r.map.floorHaz) && p.y < 0.3) {
        hurt(p, C.HAZARD_DPS * dt);
      }
    }
    p.vy -= C.GRAVITY * (r.map.g ?? 1) * dt; p.y = Math.min(1.5, Math.max(0, p.y + p.vy * dt)); if (p.y === 0 || p.y === 1.5) p.vy = 0;
    p.x = num(p.x, -19.5, 19.5); p.z = num(p.z, -19.5, 19.5);
  }
  if (r.phase !== 'mission') return lobbyTick(r);
  if (!r.end) { stepEnemies(r, dt, list); director(r, Date.now(), list); hazards(r, dt, list); stepCells(r, dt); }
  // Revive: a conscious teammate holding the revive key within range
  for (const d of list) {
    if (!d.down) continue;
    const helper = list.find(h => !h.down && h.revive && h !== d && dist(h, d.x, d.z) < C.REVIVE_RANGE);
    d.rp = helper ? d.rp + dt : Math.max(0, d.rp - dt);
    if (d.rp >= C.REVIVE_TIME) { d.down = false; d.hp = C.REVIVE_HP; d.rp = 0; helper.st.rev++; }
  }
  const now = Date.now();
  for (const p of list) if (!p.down && p.revive) {   // hold E near a core or secret cache to pick it up
    for (const arr of [r.cores, r.caches]) for (let i = arr.length - 1; i >= 0; i--) if (dist(p, arr[i][0], arr[i][1]) < 1.6) {
      arr.splice(i, 1); p.st.picks++; if (arr === r.cores) r.got++; else r.cacheGot++;
    }
  }
  if (!r.platesDone) {   // plates must be held at the same time (for r.hold seconds on 'sync' missions)
    const both = r.plates.every(pl => list.some(p => !p.down && dist(p, pl[0], pl[1]) < C.PLATE_R));
    r.platesT = both ? (r.platesT || 0) + dt : 0; r.platesDone = both && r.platesT >= r.hold;
  }
  if (!r.doorOpen && r.platesDone && r.got >= r.need && r.cellsDone >= r.cellsNeed && now >= r.holdUntil) { r.doorOpen = true; r.openAt = now; r.lockAt = now + 15000; ev(r, 'sting'); }
  if (!r.end && list.length) {
    const inZone = p => dist(p, r.map.extract[0], r.map.extract[1]) < r.map.extract[2];
    if (list.every(p => p.down)) finish(r, false, now);
    else if (r.doorOpen && now >= r.lockUntil && list.every(p => p.down || inZone(p))) finish(r, true, now);
  }
  if (r.end && now - r.endAt > 12000) resetRoom(r);
}

// ---------- Facility hazards: crusher press (Ironworks), rockfall (Deepwell), toxic gas (Helix Lab) ----------
const ZONES = {
  strike: { rad: 2.2, warn: 2000, life: 2600, dps: 90, gap: [3500, 3000] },
  arc: { rad: 1.8, warn: 1200, life: 1800, dps: 110, gap: [2500, 2000] },
  gas: { rad: 3, warn: 800, life: 12000, dps: 14, gap: [7000, 4000] },
  debris: { rad: 1.5, warn: 1500, life: 2100, dps: 60, gap: [2500, 2000] },
  spore: { rad: 2.5, warn: 800, life: 15000, dps: 10, gap: [4500, 3000] },
  fire: { rad: 2.5, warn: 1000, life: 20000, dps: 25, gap: [3500, 2500] },
  collapse: { rad: 3, warn: 3000, life: 11000, dps: 0, gap: [9000, 5000] }
};
function spawnZone(r, type, live, now) {
  const z = ZONES[type], v = live[Math.random() * live.length | 0];
  r.haz.push({ k: type, x: num(v.x + (Math.random() - 0.5) * 12, -18, 18), z: num(v.z + (Math.random() - 0.5) * 12, -18, 18), rad: z.rad, born: now, warn: z.warn, life: z.life, dps: z.dps });
  return z.gap[0] + Math.random() * z.gap[1];
}
function hazards(r, dt, list) {
  const now = Date.now(), kind = r.map.dyn, live = list.filter(p => !p.down);
  const zk = kind === 'mix' ? ['strike', 'arc', 'gas', 'debris'][Math.random() * 4 | 0] : kind;
  if (ZONES[zk] && live.length && now > r.hzAt) r.hzAt = now + spawnZone(r, zk, live, now);   // telegraphed danger zones near a random player
  if (r.map.dyn2 && live.length && now > r.hzAt2) r.hzAt2 = now + spawnZone(r, r.map.dyn2, live, now);
  for (const h of r.haz) if (h.k === 'fire' && !h.sp && now - h.born > 4000 && r.haz.length < 10) {   // fire spreads
    h.sp = 1; r.haz.push({ k: 'fire', x: num(h.x + (Math.random() - 0.5) * 7, -18, 18), z: num(h.z + (Math.random() - 0.5) * 7, -18, 18), rad: 2.5, born: now, warn: 600, life: 14000, dps: 25, sp: 1 });
  }
  if (r.map.lockdown && r.doorOpen && now > r.lockAt) {   // lockdown: the door slams shut for 8s
    r.lockUntil = now + 8000; r.lockAt = now + 25000 + Math.random() * 10000; ev(r, 'blackout');
    for (const p of list) if (Math.abs(p.x - r.map.door[0]) < 3 && Math.abs(p.z - r.map.door[1]) < 2) p.z = 3;
  }
  r.haz = r.haz.filter(h => now - h.born < h.life);
  const out = r.haz.map(h => ({ ...h, on: now - h.born >= h.warn }));
  if (kind === 'crusher') out.push({ k: kind, x: 6 * Math.sin(now / 1300), z: -8, w: 2.5, d: 8, on: true, dps: 80 });
  if ((kind === 'arc' || kind === 'mix') && now > r.gridAt) { r.blackout = now + 8000; ev(r, 'blackout'); r.gridAt = now + 30000; }
  if (kind === 'spore' && now > r.nestAt) {   // BioVault: a new swarm nest hatches
    if (r.enemies.filter(e => e.k === 'swarm').length < 8) { for (let i = 0; i < 3; i++) addEnemy(r, 'swarm', i % 2 ? 15 : -15, -12 - Math.random() * 5, null, 40); ev(r, 'sting'); }
    r.nestAt = now + 25000;
  }
  r.waterZ = 99;
  if (kind === 'flood') {   // Floodgate: rising water slows you; waves sweep north (jump over them)
    const t = (now - r.hzStart) / 1000, front = Math.max(4, 20 - 0.1 * t), c = (now - r.hzStart) % 20000;
    r.waterZ = front; out.push({ k: 'water', x: 0, z: (front + 20) / 2, w: 40, d: 20 - front, on: true, dps: 0 });
    if (c > 8000 && c < 12000) out.push({ k: 'wave', x: 0, z: 19 - (c - 8000) / 4000 * 17, w: 40, d: 1.2, on: true, dps: 70 });
    else if (c >= 5500 && c <= 8000) out.push({ k: 'wave', x: 0, z: 19, w: 40, d: 1.2, on: false, dps: 70 });
  }
  r.windS = 0; r.windOn = 0;
  if (kind === 'wind') {   // Skyreach: telegraphed gusts push everyone
    if (!r.wind && now > r.windAt) { r.wind = { v: [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.random() * 4 | 0], on: now + 1500, end: now + 4000 }; ev(r, 'gust'); r.windAt = now + 9000 + Math.random() * 5000; }
    if (r.wind) { if (now >= r.wind.end) r.wind = null; else if (now >= r.wind.on) { r.windOn = 1; r.windV = [r.wind.v[0] * 5, r.wind.v[1] * 5]; r.windS = 2; } else r.windS = 1; }
  }
  r.invS = 0; r.invertOn = 0;
  if (kind === 'null' || kind === 'mix') {   // Null Sector: reality shifts invert your controls
    if (!r.inv && now > r.nullAt) {
      r.inv = { on: now + 2000, end: now + 8000 }; r.nullAt = now + 25000 + Math.random() * 10000;
      if (live.length) { const v = live[Math.random() * live.length | 0], f = fwd(v), x = v.x + f[0] * 7, z = v.z + f[1] * 7; if (!solid(r, x, z)) { addEnemy(r, 'unknown', x, z, null, 6); ev(r, 'unknown', v.id); } }
    }
    if (r.inv) { if (now >= r.inv.end) r.inv = null; else if (now >= r.inv.on) { r.invertOn = 1; r.invS = 2; } else r.invS = 1; }
  }
  r.hzOut = out;
  for (const h of out) if (h.on) for (const p of live) {
    const hit = h.w ? Math.abs(p.x - h.x) < h.w / 2 + 0.3 && Math.abs(p.z - h.z) < h.d / 2 + 0.3 && p.y < 0.5 : dist(p, h.x, h.z) < h.rad;
    if (hit && h.k === 'collapse') { if (!p.fallAt || now - p.fallAt > 1500) { hurt(p, 35); p.x = Math.random() * 10 - 5; p.z = 15; p.y = 0; p.fallAt = now; } continue; }   // floor gives way
    if (hit && h.dps) hurt(p, h.dps * dt);
  }
}

// ---------- Carry / throw power cells ----------
const graceText = r => r.phase === 'mission' && Date.now() < r.grace ? `[Systems booting: enemies wake in ${Math.ceil((r.grace - Date.now()) / 1000)}s] ` : '';
const lockText = r => r.phase === 'mission' && Date.now() < r.lockUntil ? `[LOCKDOWN: door sealed for ${Math.ceil((r.lockUntil - Date.now()) / 1000)}s] ` : '';
const windText = r => r.invS ? `  !! REALITY SHIFT ${r.invS === 1 ? 'INCOMING' : 'CONTROLS INVERTED'}` : r.windS ? `  !! GUST ${r.windS === 1 ? 'INCOMING' : 'NOW'} toward ${r.wind.v[0] > 0 ? 'EAST' : r.wind.v[0] < 0 ? 'WEST' : r.wind.v[1] > 0 ? 'SOUTH' : 'NORTH (extraction side)'}` : '';
function grab(r, p) {
  const mine = r.cells.find(c => c.by === p.id);
  if (mine) { const f = fwd(p); mine.by = 0; mine.vx = f[0] * 9; mine.vz = f[1] * 9; mine.vy = 4; return; }   // throw
  let best = null, bd = 2.2;
  for (const c of r.cells) if (!c.by && c.y < 1 && dist(p, c.x, c.z) < bd) { best = c; bd = dist(p, c.x, c.z); }
  if (best) { best.by = p.id; best.moved = true; best.last = p.id; }
}
function stepCells(r, dt) {
  for (let i = r.cells.length - 1; i >= 0; i--) {
    const c = r.cells[i], h = c.by && r.players.get(c.by);
    if (c.by && (!h || h.down)) { c.by = 0; c.vx = c.vz = 0; c.vy = 0; }
    if (c.by) { const f = fwd(h); c.x = h.x + f[0] * 0.9; c.z = h.z + f[1] * 0.9; c.y = h.y + 1.1; }
    else if (c.y > 0.5 || c.vx || c.vz) {
      const nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
      if (solid(r, nx, c.z)) c.vx = -c.vx * 0.3; else c.x = nx;
      if (solid(r, c.x, nz)) c.vz = -c.vz * 0.3; else c.z = nz;
      c.vy -= C.GRAVITY * (r.map.g ?? 1) * dt; c.y += c.vy * dt;
      if (c.y <= 0.5) { c.y = 0.5; c.vy = Math.abs(c.vy) > 3 ? -c.vy * 0.3 : 0; c.vx *= 0.8; c.vz *= 0.8; if (Math.hypot(c.vx, c.vz) < 0.3) c.vx = c.vz = 0; }
    }
    if (c.moved && dist(c, r.map.socket[0], r.map.socket[1]) < 1.8) {   // delivered (carried or thrown in)
      const who = r.players.get(c.last); if (who) who.st.picks++;
      r.cells.splice(i, 1); r.cellsDone++;
    }
  }
}

// ---------- Tools (Q): Medkit and Noise Decoy ----------
function useTool(r, p) {
  if (!(p.charges > 0)) return;
  if (p.gear === 'medkit') {
    const t = [...r.players.values()].filter(q => dist(q, p.x, p.z) < 2.5 && (q.down || q.hp < C.MAX_HP)).sort((a, b) => (b.down - a.down) || (a.hp - b.hp))[0];
    if (!t) return;
    if (t.down) { t.down = false; t.hp = 30; t.rp = 0; if (t !== p) p.st.rev++; } else t.hp = Math.min(C.MAX_HP, t.hp + 45);
    p.charges--; ev(r, 'pulse', 0, { x: p.x, z: p.z });
  } else if (p.gear === 'decoy') {
    r.decoys.push({ x: p.x, z: p.z, until: Date.now() + 7000 }); if (r.decoys.length > 3) r.decoys.shift();
    p.charges--; ev(r, 'pulse', 0, { x: p.x, z: p.z });
  }
}

// ---------- Shop / loadout ----------
function applyLoadout(p) { const s = getSave(p.token); p.gear = s.gear; p.hat = s.hat; p.color = PALETTE.includes(s.col) ? s.col : COLORS[(p.id - 1) % 8]; p.charges = 2; }
function shop(p, m) {
  const s = getSave(p.token), it = Object.hasOwn(ITEMS, m.id) ? ITEMS[m.id] : null;
  if (m.t === 'buy') { if (it && !s.owned.includes(m.id) && s.credits >= it.cost) { s.credits -= it.cost; s.owned.push(m.id); } }
  else { const k = m.kind === 'hat' ? 'hat' : 'gear', id = String(m.id || ''); if (id === '' || (it && it.kind === k && s.owned.includes(id))) s[k] = id; }
  flush(); applyLoadout(p); sendSave(p);
}

// ---------- Room routing: enemies walk through doorways instead of into walls ----------
const roomOf = (x, z) => (z > 0 ? 0 : 3) + (x < -9 ? 0 : x > 9 ? 2 : 1);   // 0 SW, 1 Entry Hall, 2 SE, 3 NW, 4 Core Chamber, 5 NE
const LINKS = [[1, 0, -9, 11, -1, 0], [1, 2, 9, 11, 1, 0], [4, 3, -9, -11, -1, 0], [4, 5, 9, -11, 1, 0], [1, 4, 0, 0, 0, -1]];   // roomA, roomB, doorway x, z, direction A->B
function route(r, e, tx, tz) {
  const a = roomOf(e.x, e.z), b = roomOf(tx, tz); if (a === b) return [tx, tz];
  const prev = { [a]: null }, q = [a], open = r.doorOpen && Date.now() >= r.lockUntil;
  while (q.length) {
    const c = q.shift(); if (c === b) break;
    for (let i = 0; i < LINKS.length; i++) {
      const [A, B, gx, gz, dx, dz] = LINKS[i]; if (i === 4 && !open) continue;
      const n = c === A ? B : c === B ? A : -1; if (n < 0 || n in prev) continue;
      prev[n] = { from: c, gx, gz, dx: c === A ? dx : -dx, dz: c === A ? dz : -dz }; q.push(n);
    }
  }
  if (!(b in prev)) return null;
  let s = b; while (prev[s].from !== a) s = prev[s].from;
  const h = prev[s]; return Math.hypot(e.x - h.gx, e.z - h.gz) < 1.2 ? [h.gx + h.dx * 2, h.gz + h.dz * 2] : [h.gx, h.gz];
}

// ---------- Missions, objectives, rewards, saving ----------
const hostId = r => r.players.size ? Math.min(...r.players.keys()) : 0;
const multOf = r => r.openAt ? 1 + Math.min(1, (Date.now() - r.openAt) / 120000) : 1;   // staying longer = bigger bonus (and faster scares)
function sendSave(p) { const s = getSave(p.token); send(p.ws, { t: 'save', credits: s.credits, xp: s.xp, rank: rank(s), wins: s.wins, missions: s.missions, owned: s.owned, gear: s.gear, hat: s.hat, col: s.col }); }
function objText(r) {
  if (r.phase !== 'mission') return 'Lobby';
  if (!r.doorOpen) {
    const t = [];
    if (r.plates.length && !r.platesDone) t.push('Two players hold both green plates at once' + (r.hold ? ` for ${r.hold}s (${Math.floor(r.platesT || 0)}s held)` : ''));
    if (r.got < r.need) t.push(`Collect data cores (hold E): ${r.got}/${r.need}`);
    if (r.cellsDone < r.cellsNeed) t.push(`Carry power cells to the yellow ring (G grab/throw): ${r.cellsDone}/${r.cellsNeed}`);
    if (Date.now() < r.holdUntil) t.push(`Survive until the vault unlocks: ${Math.ceil((r.holdUntil - Date.now()) / 1000)}s`);
    return t.join(' · ');
  }
  return `Door open! Everyone into the cyan ring to extract, or stay for bonus (secret caches ${r.cacheGot}/2)`;
}
function startMission(r) {
  const M = MISSIONS[r.mi]; r.phase = 'mission'; r.dirAt = Date.now() + 24000;
  r.map = MAPS[M.fac]; r.haz = []; r.hzOut = []; r.grace = Date.now() + 12000; r.hzAt = Date.now() + 18000; r.hzAt2 = Date.now() + 25000;   // 12s grace: enemies and hazards are asleep
  r.hzStart = Date.now() + 12000; r.gridAt = Date.now() + 27000; r.windAt = Date.now() + 20000; r.nullAt = Date.now() + 25000; r.nestAt = Date.now() + 30000; r.inv = null; r.wind = null; r.windOn = 0; r.windS = 0; r.waterZ = 99; r.cellsNeed = M.cells || 0; r.cellsDone = 0;
  r.need = M.cores; r.hold = M.hold || 0; r.platesT = 0; r.holdUntil = M.timer ? r.grace + M.timer * 1000 : 0; r.lockUntil = 0; r.lockAt = 0; r.got = 0; r.cacheGot = 0; r.openAt = 0; r.platesDone = false; r.blackout = 0; r.ev = [];
  const rp = (zl, zh, sg) => { for (let k = 0; k < 200; k++) { const x = sg ? sg * (5 + Math.random() * 8) : Math.random() * 34 - 17, z = zl + Math.random() * (zh - zl);
    if (!solid(r, x, z) && !(r.map.floorHaz && inRect({ x, z }, r.map.floorHaz)) && !r.map.solids.some(b => C.hitsBox(x, z, b, 1.2))) return [+x.toFixed(1), +z.toFixed(1)]; } return [0, zl]; };
  const f = v => +v.toFixed(1);
  r.plates = M.plates ? [rp(5, 17, -1), rp(5, 17, 1)] : [];
  r.cores = Array.from({ length: M.cores }, () => rp(3, 18));   // south side (reachable before the door opens)
  r.caches = [rp(-18, -3), rp(-18, -3)];
  r.cells = Array.from({ length: r.cellsNeed }, (_, i) => { const [x, z] = rp(3, 18); return { id: i + 1, x, z, y: 0.5, vx: 0, vz: 0, vy: 0, by: 0, moved: false, last: 0 }; });   // carryable power cells                        // north side: optional risk/reward secrets
  r.enemies = [];
  addEnemy(r, 'drone', -6, 5, [[-6, 5], [6, 5]]);   // Entry Hall patrol (far from the spawn)
  addEnemy(r, 'drone', 15, 8, [[15, 8], [15, 3]]);   // East Wing patrol   // patrols the door side, far from the spawn   // routes kept clear of every facility's walls
  addEnemy(r, 'drone', 6, -16, [[6, -16], [-6, -16], [-6, -4], [6, -4]]);   // Core Chamber loop
  for (const [k, x, z, path] of [...r.map.extra, ...(BONUS[r.map.id] || [])]) addEnemy(r, k, x, z, path || null);
  r.decoys = []; let i = 0; for (const p of r.players.values()) { spawn(p, i++); p.charges = 2; p.st = { rev: 0, taken: 0, downs: 0, picks: 0 }; }
}
function lobbyTick(r) { if (r.phase === 'lobby' && r.players.size && [...r.players.values()].every(p => p.ready)) startMission(r); }
function finish(r, win, now) {
  r.end = win ? 'win' : 'fail'; r.endAt = now;
  const M = MISSIONS[r.mi], mult = multOf(r), credits = {};
  for (const p of r.players.values()) {
    const c = win ? Math.round(M.reward * mult) + r.cacheGot * 60 + p.st.rev * 15 : Math.round(M.reward * 0.25);
    credits[p.id] = c; const s = getSave(p.token); s.credits += c; s.xp += c; s.missions++; if (win) s.wins++;
    sendSave(p);
  }
  flush(); r.res = { win, credits, awards: awards(r), story: win ? (M.story || '') : '' };
}
function awards(r) {
  const L = [...r.players.values()], out = [];
  const pick = (key, title) => { const b = L.filter(p => !p.aw).sort((a, c) => c.st[key] - a.st[key])[0]; if (b && b.st[key] >= 1) { b.aw = 1; out.push(`${b.name}: ${title}`); } };
  pick('rev', 'Florence Nightingale (most revives)'); pick('taken', 'Human Punching Bag (most damage taken)');
  pick('downs', 'Professional Napper (most naps)'); pick('picks', 'Hoarder (most pickups)');
  L.forEach(p => delete p.aw);
  return out.length ? out : ['Nobody did anything notable. Suspicious.'];
}

// ---------- Enemies, pulse tool, Jumpscare Director ----------
function addEnemy(r, k, x, z, path, ttl = 0) { r.enemies.push({ id: r.nextE++, k, x, z, path, wp: 0, stun: 0, ttl, age: 0 }); }
const ev = (r, e, to = 0, extra = {}) => r.ev.push({ e, to, ...extra });
function hurt(p, amt) { if (p.down) return; if (p.gear === 'vest') amt *= 0.7; p.hp -= amt; p.st.taken += amt; if (p.hp <= 0) { p.hp = 0; p.down = true; p.rp = 0; p.st.downs++; } }
const fwd = p => [-Math.sin(p.yaw), -Math.cos(p.yaw)];
const watching = (p, e) => { const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1, f = fwd(p); return d < 30 && (dx * f[0] + dz * f[1]) / d > 0.5; };
const DMG = { drone: 30, stalker: 45, swarm: 14, spitter: 20, phantom: 35, charger: 8, sentry: 0 };
// extra facility-specific enemies: charger (windup then dash), spitter (lobs spore clouds), phantom (blinks behind you), sentry (stationary arc turret)
function spawnNear(r, k, x, z, ttl, ang) {
  for (let i = 0; i < 12; i++) {
    const a = ang ?? Math.random() * 6.28, d = 9 + Math.random() * 4;
    const px = num(x + Math.cos(a) * d, -19, 19), pz = num(z + Math.sin(a) * d, -19, 19);
    if (!solid(r, px, pz)) return addEnemy(r, k, px, pz, null, ttl);
    ang = undefined;
  }
}
function stepEnemies(r, dt, list) {
  for (const p of list) {
    p.cd = Math.max(0, p.cd - dt);
    if (p.in.pulse && p.cd <= 0 && !p.down) {   // Pulse tool: stuns enemies in front for 4s
      p.cd = p.gear === 'pulse2' ? 5 : 8; ev(r, 'pulse', 0, { x: p.x, z: p.z });
      const f = fwd(p);
      for (const e of r.enemies) if (e.k !== 'unknown' && dist(p, e.x, e.z) < (p.gear === 'pulse2' ? 9 : 7) && (e.x - p.x) * f[0] + (e.z - p.z) * f[1] > 0) e.stun = 4;
    }
  }
  for (let i = r.enemies.length - 1; i >= 0; i--) {
    const e = r.enemies[i]; e.age += dt;
    if (e.ttl && e.age > e.ttl) { r.enemies.splice(i, 1); continue; }
    if (Date.now() < r.grace) continue;
    if (e.stun > 0) { e.stun -= dt; continue; }
    if (e.k === 'unknown') continue;
    let tgt = null, bd = 1e9;
    for (const p of list) if (!p.down) { const d = dist(p, e.x, e.z); if (d < bd) { bd = d; tgt = p; } }
    const tnow = Date.now();   // noise decoys lure enemies that are within 16m
    for (const dc of r.decoys) if (tnow < dc.until) { const d = dist(dc, e.x, e.z); if (d < 16 && d < bd + 6) { bd = d; tgt = { x: dc.x, z: dc.z, y: 0, yaw: 0, id: -1, down: false }; } }
    let tx, tz, sp;
    if (e.k === 'drone') {
      if (tgt && bd < 9) { tx = tgt.x; tz = tgt.z; sp = 3.4; }
      else { const w = e.path[e.wp]; tx = w[0]; tz = w[1]; sp = 2; if (Math.hypot(tx - e.x, tz - e.z) < 0.7) e.wp = (e.wp + 1) % e.path.length; }
    } else if (e.k === 'stalker') {   // only moves while nobody is looking at it
      if (!tgt || list.some(p => !p.down && watching(p, e))) continue;
      tx = tgt.x; tz = tgt.z; sp = 5.5;
    } else if (e.k === 'swarm') { if (!tgt || bd > 14) continue; tx = tgt.x; tz = tgt.z; sp = 4.2;
    } else if (e.k === 'charger') {   // slow walker: winds up for 0.9s, then dashes in a straight line
      if (!tgt || bd > 16) continue;
      if (e.dash > 0) { e.dash -= dt; tx = e.x + e.dx; tz = e.z + e.dz; sp = 11; }
      else if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { const d = Math.hypot(tgt.x - e.x, tgt.z - e.z) || 1; e.dx = (tgt.x - e.x) / d; e.dz = (tgt.z - e.z) / d; e.dash = 0.6; } continue; }
      else if (bd < 7 && (e.cool = (e.cool || 0) - dt) <= 0) { e.wind = 0.9; e.cool = 3; continue; }
      else { tx = tgt.x; tz = tgt.z; sp = 2.6; }
    } else if (e.k === 'spitter') {   // keeps its distance and lobs spore clouds onto you
      if (!tgt) continue;
      e.cool = (e.cool || 3) - dt;
      if (e.cool <= 0 && bd < 14) { e.cool = 5; r.haz.push({ k: 'spore', x: tgt.x, z: tgt.z, rad: 2.5, born: Date.now(), warn: 800, life: 9000, dps: 10 }); ev(r, 'sting', tgt.id); }
      sp = bd > 9 ? 3 : bd < 6 ? -3 : 0; if (!sp) continue; tx = tgt.x; tz = tgt.z;
    } else if (e.k === 'phantom') {   // blinks to just behind you every ~7s
      if (!tgt) continue;
      e.cool = (e.cool || 4) - dt;
      if (e.cool <= 0 && bd > 3) { e.cool = 7; const f = fwd(tgt), px = tgt.x - f[0] * 4, pz = tgt.z - f[1] * 4; if (!solid(r, px, pz)) { e.x = px; e.z = pz; ev(r, 'fake', tgt.id); } continue; }
      tx = tgt.x; tz = tgt.z; sp = 3.2;
    } else {   // sentry: stationary turret that drops arc strikes on nearby players (stun it with the pulse)
      e.cool = (e.cool || 3) - dt;
      if (tgt && bd < 16 && e.cool <= 0) { e.cool = 4; r.haz.push({ k: 'arc', x: tgt.x + (Math.random() - 0.5) * 2, z: tgt.z + (Math.random() - 0.5) * 2, rad: 1.8, born: Date.now(), warn: 1200, life: 1800, dps: 110 }); }
      continue;
    }
    if (sp > 0 && !(e.dash > 0)) { const rt = route(r, e, tx, tz); if (!rt) continue; tx = rt[0]; tz = rt[1]; }
    const d = Math.hypot(tx - e.x, tz - e.z) || 1, mx = (tx - e.x) / d * sp * dt, mz = (tz - e.z) / d * sp * dt;
    if (!solid(r, e.x + mx, e.z)) e.x += mx;
    if (!solid(r, e.x, e.z + mz)) e.z += mz;
    for (const p of list) if (!p.down && p.y < 1 && dist(p, e.x, e.z) < 1.1) hurt(p, (e.k === 'charger' ? (e.dash > 0 ? 150 : 8) : DMG[e.k]) * dt);
  }
}
function director(r, now, list) {
  if (now < r.dirAt || r.end) return;
  const live = list.filter(p => !p.down); if (!live.length) return;
  r.dirAt = now + (9 + Math.random() * 16) * 1000 / multOf(r);   // unpredictable gaps
  const v = live[Math.random() * live.length | 0], roll = Math.random();
  const count = k => r.enemies.filter(e => e.k === k).length;
  if (roll < 0.22) { r.blackout = now + 7000 + Math.random() * 5000; ev(r, 'blackout'); }
  else if (roll < 0.45) ev(r, 'fake', v.id);                         // fake-out: scare with nothing there
  else if (roll < 0.65 && count('stalker') < 2) { spawnNear(r, 'stalker', v.x, v.z, 0, Math.atan2(Math.cos(v.yaw), Math.sin(v.yaw))); ev(r, 'sting', v.id); }
  else if (roll < 0.8 && count('swarm') < 6) { ev(r, 'sting'); for (let i = 0; i < 5; i++) spawnNear(r, 'swarm', v.x, v.z, 35); }
  else if (roll < 0.94) ev(r, 'whisper', v.id);
  else {                                                             // rare: the Unknown stands in front of you, then vanishes
    const f = fwd(v), x = v.x + f[0] * 7, z = v.z + f[1] * 7;
    if (!solid(r, x, z)) { addEnemy(r, 'unknown', x, z, null, 6); ev(r, 'unknown', v.id); } else ev(r, 'fake', v.id);
  }
}

let last = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  for (const r of rooms.values()) try {
    step(r, dt);
    const snap = JSON.stringify({
      t: 's', door: r.doorOpen && !(Date.now() < r.lockUntil), end: r.end, bo: Date.now() < r.blackout ? 1 : 0, ev: r.ev,
      ph: r.phase, mi: r.mi, fac: r.map.id, hz: r.hzOut.map(h => ({ k: h.k, x: +h.x.toFixed(1), z: +h.z.toFixed(1), r: h.rad || 0, w: h.w || 0, d: h.d || 0, on: h.on ? 1 : 0 })), host: hostId(r), mult: +multOf(r).toFixed(2), obj: graceText(r) + lockText(r) + objText(r) + windText(r), ce: r.cells.map(c => [+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1), c.by]), cn: r.cellsNeed, dc: r.decoys.filter(d => Date.now() < d.until).map(d => [+d.x.toFixed(1), +d.z.toFixed(1)]), res: r.res, cfg: { pl: r.plates, co: r.cores, ca: r.caches },
      en: r.enemies.map(e => ({ id: e.id, k: e.k, x: +e.x.toFixed(2), z: +e.z.toFixed(2), s: e.stun > 0 ? 1 : 0, a: e.wind > 0 ? 1 : e.dash > 0 ? 2 : ((e.k === 'spitter' || e.k === 'sentry' || e.k === 'phantom') && e.cool > 0 && e.cool < 1) ? 1 : 0 })),
      p: [...r.players.values()].map(p => ({ id: p.id, n: p.name, c: p.color, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(2), hp: Math.round(p.hp), d: p.down ? 1 : 0, rp: +(p.rp / C.REVIVE_TIME).toFixed(2), cd: +p.cd.toFixed(1), rd: p.ready ? 1 : 0, ch: p.charges || 0, ge: p.gear || '', h: p.hat || '', em: p.em && Date.now() - p.emAt < 3000 ? p.em : 0 }))
    });
    for (const p of r.players.values()) if (p.ws.readyState === 1) p.ws.send(snap);
    r.ev = [];
  } catch (e) { console.error('room error', e); }
}, 1000 / C.TICK_HZ);

process.on('uncaughtException', e => console.error('uncaught', e));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`BLACKSITE-17 running: http://localhost:${PORT}`));

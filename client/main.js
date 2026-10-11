import * as THREE from 'three';
import * as C from '/shared/constants.js';
import { MISSIONS, FACILITIES } from '/shared/missions.js';
import { ITEMS, PALETTE } from '/shared/items.js';
import { makeEnemy, animEnemy, makeOperative } from './models.js';
import { MAPS, BONUS, ROOMS } from '/shared/maps.js';
let token; try { token = localStorage.bs17 || (localStorage.bs17 = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()); } catch { token = Math.random().toString(36).slice(2); }
let save = { rank: 1, credits: 0, wins: 0, missions: 0 };

const $ = id => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches;
let ws, myId = 0, code = '', snap = null, started = false;

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: !touch });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
let composer = null; let quality = touch ? 'low' : 'high'; try { quality = localStorage.bs17q || quality; } catch {}
renderer.shadowMap.enabled = quality === 'high'; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020405);
scene.fog = new THREE.FogExp2(0x020405, 0.07);
(async () => {   // image-based reflections (optional: silently skipped if the add-on cannot load)
  try { const { RoomEnvironment } = await import('/vendor/three/examples/jsm/environments/RoomEnvironment.js'); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = quality === 'high' ? 0.3 : 0.12; } catch {}
})();
const cam = new THREE.PerspectiveCamera(75, 1, 0.1, 80);
const amb = new THREE.AmbientLight(0x1a2a28, 1.2);
scene.add(cam, amb);
const torch = new THREE.SpotLight(0xcfffe8, 60, 28, 0.5, 0.5, 1.5);
torch.position.set(0, 0, 0); torch.target.position.set(0, 0, -1);
torch.castShadow = quality === 'high'; torch.shadow.mapSize.set(512, 512); torch.shadow.camera.near = 0.3; torch.shadow.camera.far = 28;
cam.add(torch, torch.target);

const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), mat(0x1b2220));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
// ---- procedural textures, glow sprites, particles, first-person flashlight ----
function tex(draw, rx, ry) { const S = quality === 'high' ? 512 : 256, c = document.createElement('canvas'); c.width = c.height = S; const g0 = c.getContext('2d'); g0.scale(S / 256, S / 256); draw(g0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
const dots = (g, n, a) => { for (let i = 0; i < n; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } };
const floorTex = tex(g => {
  g.fillStyle = '#9c9c9c'; g.fillRect(0, 0, 256, 256); dots(g, 4000, 0.3);
  for (let i = 0; i < 7; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 20 + Math.random() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(20,20,20,0.35)'); gr.addColorStop(1, 'rgba(20,20,20,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  g.strokeStyle = '#3a3a3a'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256); g.lineWidth = 1; g.strokeStyle = '#666'; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += Math.random() * 40 - 20; y += Math.random() * 40 - 20; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = '#444'; for (const [x, y] of [[8, 8], [248, 8], [8, 248], [248, 248]]) { g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); } }, 21, 21);
const wallTex = tex(g => {
  g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, 256, 256); dots(g, 3000, 0.22); g.fillStyle = '#555'; g.fillRect(0, 60, 256, 4); g.fillRect(0, 190, 256, 4); g.fillStyle = '#777'; g.fillRect(0, 64, 256, 2);
  for (let x = 16; x < 256; x += 48) for (const y of [30, 100, 160, 225]) { g.fillStyle = '#4a4a4a'; g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x - 1, y - 1, 1.2, 0, 6.3); g.fill(); }
  for (let i = 0; i < 9; i++) { const x = Math.random() * 256, w = 3 + Math.random() * 10, gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(60,35,20,0)'); gr.addColorStop(0.5, `rgba(60,35,20,${0.15 + Math.random() * 0.25})`); gr.addColorStop(1, 'rgba(30,20,10,0.45)'); g.fillStyle = gr; g.fillRect(x, 0, w, 256); }
  const g2 = g.createLinearGradient(0, 180, 0, 256); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = g2; g.fillRect(0, 180, 256, 76); }, 1, 1);
const bloodTex = tex(g => { for (let i = 0; i < 14; i++) { const x = 128 + (Math.random() - 0.5) * 120, y = 128 + (Math.random() - 0.5) * 120, r = 6 + Math.random() * 34, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(70,5,5,0.85)'); gr.addColorStop(1, 'rgba(70,5,5,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }, 1, 1);
const oilTex = tex(g => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 120); gr.addColorStop(0, 'rgba(5,5,8,0.8)'); gr.addColorStop(0.7, 'rgba(5,5,8,0.45)'); gr.addColorStop(1, 'rgba(5,5,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }, 1, 1);
const glowTex = tex(g => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); }, 1, 1);
floor.material.map = floorTex; floor.material.bumpMap = floorTex; floor.material.bumpScale = 1.2; floor.material.metalness = 0.1; floor.receiveShadow = true;
// ---- props (crates, barrels, machines), ceiling lamps and a room light that follows you ----
const crateTex = tex(g => { g.fillStyle = '#b09060'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#5a4020'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 250); g.lineWidth = 3; for (let y = 40; y < 256; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); } g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 256); g.moveTo(256, 0); g.lineTo(0, 256); g.stroke(); dots(g, 1500, 0.2); }, 1, 1);
const machTex = tex(g => { g.fillStyle = '#8a929c'; g.fillRect(0, 0, 256, 256); dots(g, 1800, 0.2); g.fillStyle = '#2a2f36'; g.fillRect(20, 20, 216, 90); g.fillStyle = '#4af'; for (let i = 0; i < 5; i++) g.fillRect(34 + i * 40, 36, 26, 10); g.fillStyle = '#e84'; g.fillRect(34, 70, 30, 10); g.fillStyle = '#333'; for (let y = 140; y < 240; y += 14) g.fillRect(24, y, 208, 6); }, 1, 1);
const barrelTex = tex(g => { g.fillStyle = '#999'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#555'; for (const y of [30, 120, 210]) g.fillRect(0, y, 256, 12); dots(g, 1500, 0.25); }, 2, 1);
const screens = []; let screenTex = null;
function place(geo, mat, x, y, z) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; statics.add(o); return o; }
function wallMat(b, t) { const m = wallMap(b); return new THREE.MeshStandardMaterial({ color: t.wall, roughness: 0.8, metalness: 0.15, map: m, bumpMap: m, bumpScale: 1.5 }); }
function addProp(p, t) {
  const [x, z, w, d, h, kind] = p, band = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.7, metalness: 0.4 }); let o;
  if (kind === 'barrel') {
    o = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 16), new THREE.MeshStandardMaterial({ color: t.wall, roughness: 0.5, metalness: 0.5, map: barrelTex, bumpMap: barrelTex, bumpScale: 1 }));
    for (const f of [0.2, 0.8]) place(new THREE.TorusGeometry(w / 2 + 0.005, 0.03, 6, 20), band, x, h * f, z).rotation.x = Math.PI / 2;
    place(new THREE.CylinderGeometry(w / 2 - 0.03, w / 2 - 0.03, 0.04, 16), band, x, h + 0.01, z);
  } else if (kind === 'crate') {
    o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0xb8a080, roughness: 0.85, map: crateTex, bumpMap: crateTex, bumpScale: 2 }));
    for (const f of [0.18, 0.82]) place(new THREE.BoxGeometry(w + 0.04, 0.07, d + 0.04), band, x, h * f, z);
  } else {
    o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: t.wall, roughness: 0.45, metalness: 0.55, map: machTex, bumpMap: machTex, bumpScale: 1.2 }));
    const sg = z > 0 ? -1 : 1, zz = z + sg * (d / 2 + 0.012);   // the screen faces the middle of the facility
    if (!screenTex) screenTex = tex(g => { g.fillStyle = '#021a0a'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#5f8'; g.font = '16px monospace'; for (let i = 0; i < 12; i++) g.fillText((Math.random() > 0.5 ? 'SYS ' : 'ERR ') + Math.random().toString(16).slice(2, 10) + ' ' + (Math.random() * 99 | 0), 8, 20 + i * 20); }, 1, 1);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.35), new THREE.MeshBasicMaterial({ map: screenTex, transparent: true, opacity: 0.9, color: 0x88ffbb }));
    sp.position.set(x, h * 0.7, zz + sg * 0.004); sp.rotation.y = sg < 0 ? Math.PI : 0; statics.add(sp); screens.push(sp);
    for (let i = 0; i < 3; i++) place(new THREE.BoxGeometry(w * 0.6, 0.03, 0.03), band, x, h * (0.18 + i * 0.07), zz);
    statics.add(glow(t.door, 1.4, x, h + 0.1, z));
  }
  o.position.set(x, h / 2, z); o.castShadow = o.receiveShadow = true; statics.add(o);
}
function buildDetail(map, t) {   // baseboards, trim strips, ceiling pipes and floor stains
  const dark = new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.8 }), trim = new THREE.MeshStandardMaterial({ color: t.door, emissive: t.door, emissiveIntensity: 0.25, roughness: 0.6 });
  for (const b of map.walls) { place(new THREE.BoxGeometry(b[2] + 0.08, 0.28, b[3] + 0.08), dark, b[0], 0.14, b[1]); place(new THREE.BoxGeometry(b[2] + 0.06, 0.12, b[3] + 0.06), trim, b[0], C.WALL_H - 0.12, b[1]); }
  const pipe = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.45, metalness: 0.7 });
  for (const s of [-1, 1]) { place(new THREE.CylinderGeometry(0.09, 0.09, 40, 10), pipe, 0, 2.85, s * 19.6).rotation.z = Math.PI / 2; place(new THREE.CylinderGeometry(0.09, 0.09, 40, 10), pipe, s * 19.6, 2.85, 0).rotation.x = Math.PI / 2; }
  let s = map.id * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 12; i++) {
    const sz = 1.5 + rnd() * 2, o = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), new THREE.MeshStandardMaterial({ map: rnd() > 0.5 ? bloodTex : oilTex, transparent: true, depthWrite: false, roughness: 0.4 }));
    o.position.set(rnd() * 36 - 18, 0.015, rnd() * 36 - 18); o.rotation.x = -Math.PI / 2; o.rotation.z = rnd() * 6.28; statics.add(o);
  }
}
const lamps = [], roomLight = new THREE.PointLight(0xffffff, 16, 20); roomLight.position.set(0, 2.8, 10); scene.add(roomLight);
function buildLamps(t) {
  lamps.length = 0; roomLight.color.setHex(t.door);
  ROOMS.forEach(([x, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.6), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.position.set(x, C.WALL_H - 0.05, z);
    const s = glow(t.door, 6, x, C.WALL_H - 0.6, z); s.material.opacity = 0.35; statics.add(m, s); lamps.push({ m, s }); });
}
const roomIdx = (x, z) => (z > 0 ? 0 : 3) + (x < -9 ? 0 : x > 9 ? 2 : 1);
const wallMap = b => { const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(b[2], b[3]) / 4, 1); return t; };
const glow = (c, size, x, y, z) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 })); s.scale.set(size, size, 1); s.position.set(x, y, z); return s; };
const hand = new THREE.Group(); hand.position.set(0.3, -0.27, -0.55); cam.add(hand);
const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.28, 10), mat(0x2b3038)); tb.rotation.x = Math.PI / 2; hand.add(tb);
const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({ color: 0xcffff0 })); lens.position.z = -0.141; hand.add(lens);
const PART = { 1: [0x99bbff, -0.05, 0], 2: [0xff8844, 0.6, 0.2], 3: [0xaa9977, -0.25, 0], 4: [0x66ffaa, 0.1, 0], 5: [0x88ccff, -1.2, 0], 6: [0x88aaff, 0.25, 0], 7: [0xffffff, -0.3, 1.6], 8: [0xccccff, 0.05, 0], 9: [0x99ff44, 0.15, 0], 10: [0xff5522, 0.9, 0], 11: [0xff66ff, 0.3, 0], 12: [0xff3333, 0.4, 0] };
const PN = 260, ppos = new Float32Array(PN * 3), pgeo = new THREE.BufferGeometry(), pattr = new THREE.BufferAttribute(ppos, 3);
for (let i = 0; i < PN; i++) { ppos[i * 3] = Math.random() * 40 - 20; ppos[i * 3 + 1] = Math.random() * 3.2; ppos[i * 3 + 2] = Math.random() * 40 - 20; }
pgeo.setAttribute('position', pattr);
const pmat = new THREE.PointsMaterial({ size: 0.08, color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false });
const pts = new THREE.Points(pgeo, pmat); pts.frustumCulled = false; scene.add(pts);
let pv = [-0.05, 0];
function stepParticles(dt) {
  const t = performance.now() * 0.0005;
  for (let i = 0; i < PN; i++) {
    const j = i * 3; ppos[j] += (pv[1] + Math.sin(i + t) * 0.15) * dt; ppos[j + 1] += pv[0] * dt;
    if (ppos[j + 1] > 3.2) ppos[j + 1] = 0; else if (ppos[j + 1] < 0) ppos[j + 1] = 3.2;
    if (ppos[j] > 20) ppos[j] = -20; else if (ppos[j] < -20) ppos[j] = 20;
  }
  pattr.needsUpdate = true;
}
function applyQuality() {
  const hi = quality === 'high'; renderer.shadowMap.enabled = hi; torch.castShadow = hi; renderer.setPixelRatio(hi ? Math.min(devicePixelRatio, 1.5) : 1);
  if (hi && !composer) initPost();
  pgeo.setDrawRange(0, hi ? PN : 80); scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize();
}
applyQuality();
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), mat(0x0c1110));
ceil.rotation.x = Math.PI / 2; ceil.position.y = C.WALL_H; scene.add(ceil);
const statics = new THREE.Group(); scene.add(statics);
const box = (b, m) => { const o = new THREE.Mesh(new THREE.BoxGeometry(b[2], C.WALL_H, b[3]), m); o.position.set(b[0], C.WALL_H / 2, b[1]); o.castShadow = o.receiveShadow = true; statics.add(o); return o; };
let door = null, facShown = 0, baseFog = 0.07;
const dyn = new THREE.Group(); scene.add(dyn); let dynKey = '';
const gPlate = new THREE.CylinderGeometry(C.PLATE_R, C.PLATE_R, 0.08, 24), gCore = new THREE.OctahedronGeometry(0.3), gCache = new THREE.BoxGeometry(0.6, 0.6, 0.6);
const hazMat = new THREE.MeshBasicMaterial({ color: 0xff2222, transparent: true, opacity: 0.5 });
const ext = new THREE.Mesh(new THREE.RingGeometry(C.EXTRACT[2] - 0.3, C.EXTRACT[2], 32), new THREE.MeshBasicMaterial({ color: 0x33ddff, side: THREE.DoubleSide }));
ext.rotation.x = -Math.PI / 2; ext.position.set(C.EXTRACT[0], 0.04, C.EXTRACT[1]); scene.add(ext);
const extLight = new THREE.PointLight(0x33ddff, 25, 14); extLight.position.set(C.EXTRACT[0], 2, C.EXTRACT[1]); scene.add(extLight); scene.add(glow(0x33ddff, 9, C.EXTRACT[0], 1.0, C.EXTRACT[1]));

const avatars = new Map();
function avatar(c) { const g = makeOperative(c); scene.add(g); return g; }

// ---------- Input ----------
const keys = {}; let yaw = 0, pitch = 0, stick = { x: 0, y: 0 }, tJump = 0, tE = 0, tCrouch = 0, tSprint = 0, tF = 0;
addEventListener('keydown', e => {
  keys[e.code] = 1; if (e.code === 'Space' && started) e.preventDefault();
  if (started && !e.repeat && e.code === 'KeyG') ws.send(JSON.stringify({ t: 'grab' }));
  if (started && !e.repeat && e.code === 'KeyQ') ws.send(JSON.stringify({ t: 'use' }));
  if (e.code === 'KeyM' && master) { muted = !muted; master.gain.value = muted ? 0 : 0.9; }   // M mutes
  if (started && /^Digit[1-4]$/.test(e.code)) ws.send(JSON.stringify({ t: 'emote', i: +e.code.slice(5) }));
});
addEventListener('keyup', e => { keys[e.code] = 0; });
renderer.domElement.addEventListener('click', () => { if (!touch && started) renderer.domElement.requestPointerLock(); });
addEventListener('mousemove', e => {
  if (document.pointerLockElement) { yaw -= e.movementX * 0.0022; pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * 0.0022)); }
});
if (touch) {
  const held = (id, set) => { const b = $(id); b.ontouchstart = e => { e.stopPropagation(); set(1); }; b.ontouchend = () => set(0); };
  held('bJ', v => tJump = v); held('bE', v => tE = v); held('bC', v => tCrouch = v); held('bS', v => tSprint = v); held('bF', v => tF = v);
  $('bG').ontouchstart = e => { e.stopPropagation(); ws.send(JSON.stringify({ t: 'grab' })); };
  $('bU').ontouchstart = e => { e.stopPropagation(); ws.send(JSON.stringify({ t: 'use' })); };
  let emN = 0; $('bM').ontouchstart = e => { e.stopPropagation(); emN = emN % 4 + 1; ws.send(JSON.stringify({ t: 'emote', i: emN })); };
  let ls = null, rs = null;
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) { if (t.target.classList.contains('tb')) continue;
      if (t.clientX < innerWidth / 2) ls = { id: t.identifier, x: t.clientX, y: t.clientY }; else rs = { id: t.identifier, x: t.clientX, y: t.clientY }; }
  });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (ls && t.identifier === ls.id) { stick.x = Math.max(-1, Math.min(1, (t.clientX - ls.x) / 50)); stick.y = Math.max(-1, Math.min(1, (t.clientY - ls.y) / 50)); }
      if (rs && t.identifier === rs.id) { yaw -= (t.clientX - rs.x) * 0.006; pitch = Math.max(-1.45, Math.min(1.45, pitch - (t.clientY - rs.y) * 0.006)); rs.x = t.clientX; rs.y = t.clientY; }
    }
  });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (ls && t.identifier === ls.id) { ls = null; stick.x = stick.y = 0; }
      if (rs && t.identifier === rs.id) rs = null;
    }
  });
}

// ---------- Network ----------
function connect(first) {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => ws.send(JSON.stringify(first));
  ws.onclose = () => { if (started) { $('msg').style.display = 'block'; $('msg').textContent = 'Disconnected from server: press F5 to rejoin (use the same room code)'; } };
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === 'err') $('err').textContent = m.msg;
    else if (m.t === 'welcome') { myId = m.id; code = m.code; start(); }
    else if (m.t === 'save') save = m;
    else if (m.t === 's') { snap = m; (m.ev || []).forEach(handleEv); }
  };
}
const nm = () => $('name').value.trim() || 'Operative';
$('create').onclick = () => connect({ t: 'create', name: nm(), token });
$('join').onclick = () => connect({ t: 'join', name: nm(), token, code: $('code').value.trim().toUpperCase() });

let audioCtx, master, muted = false; const droneOsc = [];
function ambience() { // procedural low drone + slow pulse
  audioCtx = new AudioContext(); master = audioCtx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(audioCtx.destination);
  const g = audioCtx.createGain(); g.gain.value = 0.05; g.connect(master);
  [55, 82.4, 110.5].forEach(f => { const o = audioCtx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(); droneOsc.push(o); });
  const l = audioCtx.createOscillator(), lg = audioCtx.createGain(); l.frequency.value = 0.15; lg.gain.value = 0.03; l.connect(lg); lg.connect(g.gain); l.start();
}
function start() {
  started = true; $('menu').style.display = 'none';
  ['hud', 'cross', 'bars'].forEach(i => $(i).style.display = 'block');
  if (touch) document.querySelectorAll('.tb').forEach(b => b.style.display = 'block');
  ambience();
  const nc = document.createElement('canvas'); nc.width = nc.height = 128; const ng = nc.getContext('2d'), idd = ng.createImageData(128, 128);   // film grain
  for (let i = 0; i < idd.data.length; i += 4) { const v = Math.random() * 255; idd.data[i] = idd.data[i + 1] = idd.data[i + 2] = v; idd.data[i + 3] = 255; }
  ng.putImageData(idd, 0, 0); $('grain').style.backgroundImage = `url(${nc.toDataURL()})`; if (touch) $('grain').style.display = 'none';
  setInterval(sendInput, 1000 / C.TICK_HZ);
}
function sendInput() {
  const mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0) + stick.x;
  const mz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0) - stick.y;
  ws.send(JSON.stringify({ t: 'in', mx, mz, yaw, sprint: keys.ShiftLeft || tSprint, crouch: keys.KeyC || tCrouch, jump: keys.Space || tJump, revive: keys.KeyE || tE, pulse: keys.KeyF || tF }));
}

// ---------- Enemies, scares, audio effects ----------
let lastHp = 100, myHp = 100, bobT = 0, lastStep = 0, hudCache = '', audFac = 0, barsCache = '', lastPh = '', promptCache = '';
function out(node, pan) { if (pan !== undefined && audioCtx.createStereoPanner) { const p = audioCtx.createStereoPanner(); p.pan.value = pan; node.connect(p); p.connect(master); } else node.connect(master); }
function noise(dur, vol, f0, f1, pan) {
  if (!audioCtx) return; const t = audioCtx.currentTime, n = audioCtx.sampleRate * dur | 0;
  const b = audioCtx.createBuffer(1, n, audioCtx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); g.gain.value = vol;
  s.connect(f); f.connect(g); out(g, pan); s.start();
}
function tone(freq, dur, vol, type = 'sine', pan) {
  if (!audioCtx) return; const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); out(g, pan); o.start(); o.stop(t + dur);
}
function flash(color, ms, op) {
  const f = $('fx'); f.style.transition = 'none'; f.style.background = color; f.style.opacity = op;
  requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = `opacity ${ms}ms`; f.style.opacity = 0; }));
}
function handleEv(e) {
  if (e.to && e.to !== myId) return;   // some scares are targeted at one player only
  if (e.e === 'blackout') { noise(1.2, 0.4, 2000, 80); tone(50, 1.5, 0.4, 'square'); }
  else if (e.e === 'fake') { flash('#fff', 160, 0.8); noise(0.5, 0.6, 3000, 400); tone(70, 0.8, 0.4, 'sawtooth'); }
  else if (e.e === 'sting') { noise(0.8, 0.5, 1500, 200); tone(110, 1.2, 0.3, 'sawtooth'); }
  else if (e.e === 'whisper') noise(2.5, 0.15, 700, 300);
  else if (e.e === 'unknown') { flash('#a00', 600, 0.6); tone(45, 3, 0.5, 'square'); noise(1.5, 0.4, 400, 60); }
  else if (e.e === 'pulse') tone(600, 0.35, 0.2);
  else if (e.e === 'gust') noise(2.5, 0.35, 250, 900);
}
const emesh = new Map(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
const basic = c => new THREE.MeshBasicMaterial({ color: c });
const KINDS = ['drone', 'stalker', 'swarm', 'charger', 'spitter', 'phantom', 'sentry', 'unknown'], glb = {};
function enemyMesh(k) {
  let g;
  if (glb[k]) {   // a real model dropped into client/assets/models/<kind>.glb replaces the procedural one
    g = new THREE.Group(); const m = glb[k].clone(glb[k].scene); g.add(m); g.userData.glb = true;
    if (glb[k].clips.length) { g.userData.mixer = new THREE.AnimationMixer(m); g.userData.mixer.clipAction(glb[k].clips[0]).play(); }
  } else g = makeEnemy(k);
  g.userData.k = k; scene.add(g); return g;
}
async function loadGlbs() {
  try {
    const { GLTFLoader } = await import('/vendor/three/examples/jsm/loaders/GLTFLoader.js'), { clone } = await import('/vendor/three/examples/jsm/utils/SkeletonUtils.js'), ld = new GLTFLoader();
    for (const k of KINDS) { const url = `/client/assets/models/${k}.glb`; const r = await fetch(url, { method: 'HEAD' }); if (!r.ok) continue; const gl = await ld.loadAsync(url); glb[k] = { scene: gl.scene, clips: gl.animations, clone }; }
  } catch {}
}
loadGlbs();
async function initPost() {   // bloom (desktop, HIGH quality): glow halos and emissive parts bleed light
  if (touch || quality !== 'high') return;
  try {
    const d = '/vendor/three/examples/jsm/postprocessing/', [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([import(d + 'EffectComposer.js'), import(d + 'RenderPass.js'), import(d + 'UnrealBloomPass.js'), import(d + 'OutputPass.js')]);
    const c = new EffectComposer(renderer); c.addPass(new RenderPass(scene, cam)); c.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.6, 0.85)); c.addPass(new OutputPass()); c.setSize(innerWidth, innerHeight); composer = c;
  } catch { composer = null; }
}

// ---------- Audio atmosphere, minimap ----------
const AUD = { 1: [55, 82.4, 110.5], 2: [41, 62, 123], 3: [36, 54, 73], 4: [65, 98, 196], 5: [49, 73.4, 98], 6: [60, 120, 180], 7: [73, 110, 220], 8: [32.7, 49, 98], 9: [46, 69, 92], 10: [38, 57, 86], 11: [58, 61, 87], 12: [30, 45, 90] };
function setFacilityAudio(id) { if (!audioCtx) return; const f = AUD[id] || AUD[1]; droneOsc.forEach((o, i) => o.frequency.setTargetAtTime(f[i], audioCtx.currentTime, 1.5)); }
function makeTag(name) {   // floating name tag above each teammate
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(name, 128, 44); g.fillStyle = '#fff'; g.fillText(name, 128, 44);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true })); s.scale.set(1.6, 0.4, 1); s.position.y = 2.5; return s;
}
const eaT = {}, EA = { drone: [1.4, 'tone', 190, 0.35, 0.05, 'sawtooth'], stalker: [3.5, 'noise', 0.9, 0.12, 600, 200], swarm: [0.35, 'noise', 0.25, 0.1, 3500, 2500], charger: [1.8, 'tone', 70, 0.4, 0.2, 'square'], spitter: [2.5, 'noise', 0.5, 0.1, 300, 120], phantom: [4, 'noise', 1.6, 0.08, 1500, 800], sentry: [2, 'tone', 300, 0.15, 0.04, 'triangle'], unknown: [5, 'tone', 40, 1.5, 0.25, 'sine'] };
function enemyAudio(dt, me) {   // each creature type makes its own sound, louder when near and panned left/right to where it is
  const best = {};
  for (const e of snap.en) { const d = Math.hypot(e.x - me.x, e.z - me.z); if (d < 14 && (!best[e.k] || d < best[e.k].d)) best[e.k] = { d, e }; }
  for (const k in EA) { eaT[k] = (eaT[k] || 0) - dt; const b = best[k]; if (!b || eaT[k] > 0) continue;
    const [iv, kind, a, bb, c, d] = EA[k], vol = 1 - b.d / 14, dx = b.e.x - me.x, dz = b.e.z - me.z, pan = (Math.cos(me.yaw) * dx - Math.sin(me.yaw) * dz) / (b.d || 1);
    eaT[k] = iv * (0.8 + Math.random() * 0.4);
    if (kind === 'tone') tone(a + Math.random() * 20, bb, c * vol, d, pan); else noise(a, bb * vol, c, d, pan); }
}
let audNext = 8, beatT = 0;
function audioTick(dt, me) {
  if (!audioCtx || !snap) return;
  audNext -= dt; enemyAudio(dt, me);
  if (audNext <= 0) { audNext = 6 + Math.random() * 9; const r = Math.random();   // random distant sounds: groan, drip, thump, whisper
    if (r < 0.3) noise(1.8, 0.12, 300, 60); else if (r < 0.55) tone(1100 + Math.random() * 400, 0.08, 0.05); else if (r < 0.8) tone(55, 0.5, 0.25, 'triangle'); else noise(2.2, 0.07, 900, 500); }
  let dmin = 99; for (const e of snap.en) if (e.k !== 'unknown') dmin = Math.min(dmin, Math.hypot(e.x - me.x, e.z - me.z));
  const tension = Math.max(dmin < 12 ? 1 - dmin / 12 : 0, me.hp < 35 ? 0.8 : 0);   // heartbeat when enemies are close or you are hurt
  if (tension > 0.15) { beatT -= dt; if (beatT <= 0) { beatT = 1.1 - tension * 0.6; tone(52, 0.18, 0.35 * tension + 0.1); setTimeout(() => tone(46, 0.16, 0.25 * tension), 140); } }
}
addEventListener('pointerdown', () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); });
addEventListener('keydown', () => { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); });
if (touch) addEventListener('contextmenu', e => e.preventDefault());
const mini = $('mini'), mg = mini.getContext('2d'); let miniT = 0;
function drawMini(s, me) {   // minimap: rooms, door state, objectives and teammates (enemies are NOT shown)
  const map = MAPS[s.fac], S = mini.width, k = S / 42, X = x => (x + 21) * k, Z = z => (z + 21) * k;
  mg.clearRect(0, 0, S, S); mg.fillStyle = 'rgba(0,0,0,0.6)'; mg.fillRect(0, 0, S, S);
  mg.fillStyle = '#7b8aa0'; for (const b of map.walls) mg.fillRect(X(b[0] - b[2] / 2), Z(b[1] - b[3] / 2), b[2] * k, b[3] * k);
  mg.fillStyle = '#445'; for (const p of map.props) mg.fillRect(X(p[0] - p[2] / 2), Z(p[1] - p[3] / 2), p[2] * k, p[3] * k);
  const d = map.door; mg.fillStyle = s.door ? '#2c5' : '#d33'; mg.fillRect(X(d[0] - d[2] / 2), Z(d[1] - d[3] / 2), d[2] * k, d[3] * k);
  mg.strokeStyle = '#3df'; mg.beginPath(); mg.arc(X(map.extract[0]), Z(map.extract[1]), map.extract[2] * k, 0, 6.3); mg.stroke();
  if (s.cn > 0) { mg.strokeStyle = '#fd3'; mg.beginPath(); mg.arc(X(map.socket[0]), Z(map.socket[1]), 1.8 * k, 0, 6.3); mg.stroke(); }
  const dot = (x, z, c, r) => { mg.fillStyle = c; mg.beginPath(); mg.arc(X(x), Z(z), r, 0, 6.3); mg.fill(); };
  for (const p of s.cfg.pl) dot(p[0], p[1], '#2f8', 4); for (const p of s.cfg.co) dot(p[0], p[1], '#fd3', 3); for (const p of s.cfg.ca) dot(p[0], p[1], '#f4c', 3); for (const c of s.ce) dot(c[0], c[2], '#fe6', 2.5);
  for (const p of s.p) dot(p.x, p.z, p.d ? '#888' : p.c, p.id === myId ? 4 : 3);
  mg.strokeStyle = '#fff'; mg.beginPath(); mg.moveTo(X(me.x), Z(me.z)); mg.lineTo(X(me.x - Math.sin(me.yaw) * 3), Z(me.z - Math.cos(me.yaw) * 3)); mg.stroke();
}

// ---------- Lobby, mission cards, results ----------
function syncDyn(cfg) {
  const key = JSON.stringify(cfg); if (key === dynKey) return; dynKey = key; dyn.clear();
  const put = (g, c, p, y) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c })); m.position.set(p[0], y, p[1]); dyn.add(m); dyn.add(glow(c, 2.2, p[0], y + 0.4, p[1])); };
  cfg.pl.forEach(p => put(gPlate, 0x22ff88, p, 0.05)); cfg.co.forEach(p => put(gCore, 0xffdd33, p, 0.8)); cfg.ca.forEach(p => put(gCache, 0xff44cc, p, 0.4));
}
const sockMesh = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 24), new THREE.MeshBasicMaterial({ color: 0xffdd33, side: THREE.DoubleSide }));
sockMesh.rotation.x = -Math.PI / 2; sockMesh.visible = false; scene.add(sockMesh);
const cePool = [], gCell = new THREE.BoxGeometry(0.4, 0.4, 0.4), cellMat = new THREE.MeshBasicMaterial({ color: 0xffee66 });
function syncCells(list) {
  list.forEach((c, i) => { let m = cePool[i]; if (!m) { m = new THREE.Mesh(gCell, cellMat); m.add(glow(0xffee66, 1.4, 0, 0.1, 0)); scene.add(m); cePool[i] = m; } m.visible = true; m.position.set(c[0], c[1], c[2]); });
  for (let i = list.length; i < cePool.length; i++) cePool[i].visible = false;
}
const HZ = { crusher: 'Crusher press', strike: 'Rockfall', gas: 'Toxic gas', flood: 'Rising water + flood waves', arc: 'Lightning arcs + blackouts', wind: 'Wind gusts', debris: 'Flying debris', spore: 'Spores + hatching nests', fire: 'Spreading fire', null: 'Reality shifts (inverted controls)', mix: 'ALL hazards' };
const EN = { drone: ['#9aa4b8', 'D'], stalker: ['#ffffff', 'S'], swarm: ['#cc3333', 'W'], charger: ['#e08030', 'C'], spitter: ['#77dd44', 'P'], phantom: ['#aa88ff', 'H'], sentry: ['#66aaff', 'T'] };
function previewInfo(M) {
  const map = MAPS[M.fac];
  const hz = [HZ[map.dyn], HZ[map.dyn2] || (map.dyn2 === 'collapse' ? 'Collapsing floors' : ''), map.floorHaz ? (M.fac === 10 ? 'Lava band' : 'Electrified floor') : '', map.lockdown ? 'Door lockdowns' : '', map.g ? 'Low gravity' : ''].filter(Boolean).join(' · ') || 'None';
  const ob = [M.plates ? `Both plates${M.hold ? ' held ' + M.hold + 's' : ''}` : '', M.cores ? `${M.cores} data cores` : '', M.cells ? `${M.cells} power cells` : '', M.timer ? `Survive ${M.timer}s` : ''].filter(Boolean).join(' + ');
  const foes = [...new Set([['drone'], ...map.extra, ...(BONUS[map.id] || [])].map(f => f[0]))].map(k => `${EN[k][1]}=${k}`).join(' ');
  return `<b>Hazards:</b> ${hz}<br><b>Objectives:</b> ${ob}<br><b>Enemies:</b> ${foes}`;
}
function drawPreview(cv, M) {   // top-down map: walls, door, extraction ring, hazards and where the enemies start (north is up)
  const map = MAPS[M.fac], t = map.theme, g = cv.getContext('2d'), S = cv.width, k = S / 42, X = x => (x + 21) * k, Z = z => (z + 21) * k, hex = n => '#' + n.toString(16).padStart(6, '0');
  g.fillStyle = hex(t.floor); g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1;
  for (let i = 0; i <= 42; i += 2) { g.beginPath(); g.moveTo(i * k, 0); g.lineTo(i * k, S); g.moveTo(0, i * k); g.lineTo(S, i * k); g.stroke(); }
  if (map.floorHaz) { const h = map.floorHaz; g.fillStyle = 'rgba(255,40,20,0.55)'; g.fillRect(X(h[0] - h[2] / 2), Z(h[1] - h[3] / 2), h[2] * k, h[3] * k); }
  g.fillStyle = 'rgba(51,221,255,0.25)'; g.strokeStyle = '#33ddff'; g.beginPath(); g.arc(X(map.extract[0]), Z(map.extract[1]), map.extract[2] * k, 0, 6.3); g.fill(); g.stroke();
  if (M.cells) { g.strokeStyle = '#ffdd33'; g.beginPath(); g.arc(X(map.socket[0]), Z(map.socket[1]), 1.8 * k, 0, 6.3); g.stroke(); }
  g.fillStyle = hex(t.wall); for (const b of map.walls) g.fillRect(X(b[0] - b[2] / 2), Z(b[1] - b[3] / 2), b[2] * k, b[3] * k);
  g.fillStyle = 'rgba(255,255,255,0.35)'; for (const p of map.props) g.fillRect(X(p[0] - p[2] / 2), Z(p[1] - p[3] / 2), p[2] * k, p[3] * k);
  const d = map.door; g.fillStyle = hex(t.door); g.fillRect(X(d[0] - d[2] / 2), Z(d[1] - d[3] / 2), d[2] * k, d[3] * k);
  g.font = 'bold 10px monospace'; g.textAlign = 'center';
  for (const [kd, x, z] of [['drone', -10, 4], ['drone', 10, -16], ...map.extra, ...(BONUS[map.id] || [])]) { g.fillStyle = EN[kd][0]; g.beginPath(); g.arc(X(x), Z(z), 6, 0, 6.3); g.fill(); g.fillStyle = '#000'; g.fillText(EN[kd][1], X(x), Z(z) + 3); }
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = '9px monospace'; for (const r of ROOMS) g.fillText(r[2], X(r[0]), Z(r[1]) + 3); g.font = 'bold 10px monospace';
  g.fillStyle = '#6f9'; g.fillText('START', X(0), Z(18.5)); g.fillStyle = '#3df'; g.fillText('EXTRACT', X(0), Z(-16) + 3);
  const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, hex(t.fog)); g.globalAlpha = 0.85; g.fillStyle = vg; g.fillRect(0, 0, S, S); g.globalAlpha = 1;
}
function buildFac(map) {
  statics.clear(); screens.length = 0; facShown = map.id; const pp = PART[map.id] || PART[1]; pmat.color.setHex(pp[0]); pv = [pp[1], pp[2]]; sockMesh.position.set(map.socket[0], 0.05, map.socket[1]); const t = map.theme; baseFog = t.fd;
  scene.background.setHex(t.bg); scene.fog.color.setHex(t.fog); floor.material.color.setHex(t.floor);
  map.walls.forEach(b => box(b, wallMat(b, t)));
  door = box(map.door, new THREE.MeshStandardMaterial({ color: t.door, emissive: t.door, emissiveIntensity: 0.4 }));
  map.props.forEach(p => addProp(p, t)); buildLamps(t); buildDetail(map, t);
  if (map.floorHaz) { const h = new THREE.Mesh(new THREE.PlaneGeometry(map.floorHaz[2], map.floorHaz[3]), hazMat); h.rotation.x = -Math.PI / 2; h.position.set(map.floorHaz[0], 0.03, map.floorHaz[1]); statics.add(h); }
}
const hzPool = [], gBox = new THREE.BoxGeometry(1, 1, 1), gDisc = new THREE.CylinderGeometry(1, 1, 0.05, 24);
function syncHz(list) {
  list.forEach((h, i) => {
    let m = hzPool[i]; if (!m) { m = new THREE.Mesh(gBox, new THREE.MeshBasicMaterial({ transparent: true })); scene.add(m); hzPool[i] = m; }
    m.visible = true; const rect = h.w > 0; m.geometry = rect ? gBox : gDisc;
    if (rect) { const hh = h.k === 'water' ? 0.3 : h.k === 'wave' ? 1.2 : 2.8; m.scale.set(h.w, hh, h.d); m.position.set(h.x, hh / 2, h.z); } else { m.scale.set(h.r, 1, h.r); m.position.set(h.x, 0.06, h.z); }
    m.material.color.setHex(h.k === 'gas' ? 0x44ff66 : h.k === 'crusher' ? 0xff7722 : h.k === 'water' ? 0x2266ff : h.k === 'wave' ? 0x66ddff : h.k === 'arc' ? (h.on ? 0x88bbff : 0x3355aa) : h.k === 'fire' ? (h.on ? 0xff5500 : 0x883300) : h.k === 'spore' ? 0x99ff44 : h.k === 'collapse' ? (h.on ? 0x050505 : 0x996633) : h.on ? 0xff2200 : 0xffaa00);
    m.material.opacity = h.k === 'gas' || h.k === 'spore' ? 0.35 : h.k === 'water' ? 0.45 : h.on ? 0.85 : 0.3;
  });
  for (let i = list.length; i < hzPool.length; i++) hzPool[i].visible = false;
}
function promptFor(s, me) {   // context hints: what you can do right now
  if (me.d) return '';
  if (s.ce.some(c => c[3] === myId)) return 'Press <b>G</b> to throw the power cell (or walk it into the yellow ring)';
  for (const p of s.p) if (p.d && p.id !== myId && Math.hypot(p.x - me.x, p.z - me.z) < 2.3) return `Hold <b>E</b> to revive ${p.n}`;
  for (const c of s.ce) if (!c[3] && c[1] < 1 && Math.hypot(c[0] - me.x, c[2] - me.z) < 2.2) return 'Press <b>G</b> to grab the power cell';
  for (const c of s.cfg.co.concat(s.cfg.ca)) if (Math.hypot(c[0] - me.x, c[1] - me.z) < 1.8) return 'Hold <b>E</b> to pick up';
  if (s.door && Math.hypot(me.x, me.z + 16) < 3.5) return 'Stay in the ring: everyone must be inside to extract';
  return '';
}
function setPrompt(h) { if (h !== promptCache) { promptCache = h; $('prompt').innerHTML = h; $('prompt').style.opacity = h ? 1 : 0; } }
function showBrief(s) {
  const m = MISSIONS[s.mi]; $('brief').innerHTML = `<h2>${FACILITIES[m.fac - 1].name.toUpperCase()}</h2><div><b>${m.name}</b></div><div>${m.brief}</div>`; $('brief').style.opacity = 1; setTimeout(() => { $('brief').style.opacity = 0; }, 5500);
}
const RANKS = ['Intern', 'Recruit', 'Operative', 'Specialist', 'Veteran', 'Warden', 'Legend'];
function colorHtml() { return `<div>Suit colour: <button data-col="" style="width:auto">Auto</button>${PALETTE.map(c => `<button data-col="${c}" style="background:${c};width:26px;height:26px;padding:0;${save.col === c ? 'outline:3px solid #fff' : ''}"></button>`).join('')}</div>`; }
const dcPool = [];
function syncDecoys(list) {
  list.forEach((c, i) => { let m = dcPool[i]; if (!m) { m = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0x33ffcc })); m.add(glow(0x33ffcc, 3, 0, 0.2, 0)); scene.add(m); dcPool[i] = m; } m.visible = true; m.position.set(c[0], 0.5, c[1]); });
  for (let i = list.length; i < dcPool.length; i++) dcPool[i].visible = false;
}
function shopHtml(kind) {
  const cur = kind === 'hat' ? save.hat : save.gear, own = save.owned || [];
  const btns = Object.entries(ITEMS).filter(([, it]) => it.kind === kind).map(([id, it]) => {
    const label = it.name + (it.desc ? ` (${it.desc})` : '');
    return own.includes(id) ? `<button data-eq="${id}" data-k="${kind}" class="${cur === id ? 'sel' : ''}">${label}${cur === id ? ' [equipped]' : ''}</button>`
      : `<button data-buy="${id}" ${save.credits < it.cost ? 'disabled' : ''}>Buy ${it.name} ${it.cost}c</button>`;
  }).join('');
  return `<div>${kind === 'hat' ? 'Hat (friends see it)' : 'Gear (one per mission)'}: <button data-eq="" data-k="${kind}" class="${cur ? '' : 'sel'}">None</button>${btns}</div>`;
}
function hatMesh(h) {
  const g = new THREE.Group(), add = (geo, c, y) => { const o = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c })); o.position.y = y; g.add(o); return o; };
  if (h === 'cone') add(new THREE.ConeGeometry(0.22, 0.5, 10), 0xff6600, 1.98);
  else if (h === 'tophat') { add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), 0x111111, 1.9); add(new THREE.CylinderGeometry(0.2, 0.2, 0.35, 12), 0x111111, 2.08); }
  else if (h === 'party') add(new THREE.ConeGeometry(0.18, 0.45, 10), 0xff44cc, 1.98);
  else if (h === 'bucket') add(new THREE.CylinderGeometry(0.28, 0.2, 0.35, 10), 0x999999, 1.95);
  else if (h === 'duck') { add(new THREE.SphereGeometry(0.2, 8, 6), 0xffdd00, 1.95); add(new THREE.BoxGeometry(0.16, 0.06, 0.2), 0xff8800, 1.95).position.z = 0.22; }
  return g;
}
function setHat(g, h) {
  if (g.userData.hat === h) return; g.userData.hat = h;
  if (g.userData.hm) g.remove(g.userData.hm);
  g.userData.hm = h ? hatMesh(h) : null; if (g.userData.hm) g.add(g.userData.hm);
}
const lobby = $('lobby'); let lobbyHtml = '';
lobby.onclick = e => {
  const d = e.target.dataset;
  if (d.pick !== undefined) ws.send(JSON.stringify({ t: 'pick', i: +d.pick }));
  if (d.ready) ws.send(JSON.stringify({ t: 'ready' }));
  if (d.q) { quality = quality === 'high' ? 'low' : 'high'; try { localStorage.bs17q = quality; } catch {} applyQuality(); }
  if (d.buy) ws.send(JSON.stringify({ t: 'buy', id: d.buy }));
  if (d.col !== undefined) ws.send(JSON.stringify({ t: 'color', id: d.col }));
  if (d.eq !== undefined) ws.send(JSON.stringify({ t: 'equip', kind: d.k, id: d.eq }));
};
function updateLobby(s, me) {
  const on = s.ph === 'lobby'; lobby.style.display = on ? 'flex' : 'none'; $('mini').style.display = on ? 'none' : 'block'; $('hud').style.opacity = $('bars').style.opacity = on ? 0 : 1;
  if (!on) { lobbyHtml = ''; return; }
  if (document.pointerLockElement) document.exitPointerLock();
  const host = s.host === myId, M = MISSIONS[s.mi];
  const html = `<h2>ROOM ${code}</h2>
   <div>${s.p.map(p => `<span style="color:${p.c}">${p.n}${p.id === s.host ? ' (host)' : ''} ${p.rd ? '[READY]' : '[...]'}</span>`).join(' &nbsp; ')}</div>
   <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;align-items:flex-start"><div style="max-width:560px">${MISSIONS.map((m, i) => `${i === 0 || MISSIONS[i - 1].fac !== m.fac ? (i ? '<br>' : '') + '<b>' + FACILITIES[m.fac - 1].name + ':</b> ' : ''}<button data-pick="${i}" class="${i === s.mi ? 'sel' : ''}" ${host ? '' : 'disabled'}>${m.name}</button>`).join('')}</div><div><canvas width="240" height="240" style="border:1px solid #3a6;max-width:90vw"></canvas><div style="max-width:240px;font-size:12px;text-align:left;margin-top:4px">${previewInfo(M)}</div></div></div>
   <div><b>${FACILITIES[M.fac - 1].tag}</b><br>${M.brief}<br>Base reward: ${M.reward} credits. Staying after the door opens raises the bonus (up to x2) but the scares speed up.</div>
   ${colorHtml()}${shopHtml('gear')}${shopHtml('hat')}<button data-q="1">Graphics: ${quality.toUpperCase()}</button> <button data-ready="1">${me.rd ? 'Unready' : 'READY'}</button>
   <div>Rank ${save.rank} (${RANKS[Math.min(save.rank - 1, RANKS.length - 1)]}) · ${save.credits} credits · ${save.wins} wins / ${save.missions} missions</div>
   <small>${host ? 'You are the host: pick the mission. ' : 'The host picks the mission. '}It starts when everyone is ready.</small>`;
  if (html !== lobbyHtml) { lobbyHtml = html; lobby.innerHTML = html; const cv = lobby.querySelector('canvas'); if (cv) drawPreview(cv, M); }
}
function resultText(s, p) {
  if (s.end && s.res) { const r = s.res; return `${r.win ? 'EXTRACTION SUCCESSFUL' : 'MISSION FAILED'}\n+${r.credits[myId] || 0} credits\n${r.awards.join('\n')}${r.story ? '\n\n' + r.story : ''}`; }
  return p.d ? `UNCONSCIOUS: a teammate must hold E near you (${Math.round(p.rp * 100)}%)` : '';
}

// ---------- Loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); if (composer) composer.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize); resize();
const camPos = new THREE.Vector3(0, 1.6, 16);
let t0 = performance.now();
const frame = () => {
  const now = performance.now(), dt = Math.min(0.1, (now - t0) / 1000); t0 = now;
  if (snap) {
    if (snap.fac !== facShown) buildFac(MAPS[snap.fac]);
    door.visible = !snap.door; syncDyn(snap.cfg); syncHz(snap.hz); syncCells(snap.ce); syncDecoys(snap.dc); sockMesh.visible = snap.cn > 0;
    const flick = snap.fac === 6 || snap.fac === 11 || snap.fac === 12 || snap.fac === 3;   // unstable power in some facilities
    lamps.forEach(l => { l.m.visible = l.s.visible = !snap.bo && !(flick && Math.random() < 0.04); });
    screens.forEach(s => { s.material.opacity = snap.bo ? 0.15 : 0.7 + Math.random() * 0.3; });
    const rc = ROOMS[roomIdx(camPos.x, camPos.z)]; roomLight.position.lerp(tmp.set(rc[0], 2.8, rc[1]), Math.min(1, dt * 4)); roomLight.intensity = snap.bo ? 0 : 16;
    const seen = new Set();
    for (const p of snap.p) {
      if (p.id === myId) {
        const crouch = keys.KeyC || tCrouch;
        const target = tmp3.set(p.x, p.y + (p.d ? 0.4 : crouch ? 1.0 : 1.6), p.z);
        camPos.lerp(target, Math.min(1, dt * 18));
        if (p.hp < lastHp) flash('#f00', 400, 0.4);
        lastHp = p.hp; myHp = p.hp;
        audioTick(dt, p); if (snap.fac !== audFac) { audFac = snap.fac; setFacilityAudio(audFac); }
        if (now - miniT > 100) { miniT = now; drawMini(snap, p); }
        if (snap.ph !== lastPh) { if (snap.ph === 'mission') showBrief(snap); lastPh = snap.ph; }
        const me = p; updateLobby(snap, p); const room = ROOMS[roomIdx(me.x, me.z)][2];
        const hs = `<div class="hl">ROOM <b>${code}</b> · ${snap.p.length}/8 · ${room}</div><div class="obj"><span>OBJECTIVE</span>${snap.obj}${snap.mult > 1 ? ` <em>bonus x${snap.mult.toFixed(2)}</em>` : ''}</div>`;
        if (hs !== hudCache) { hudCache = hs; $('hud').innerHTML = hs; }
        const tool = me.ge === 'medkit' || me.ge === 'decoy' ? `<div class="tl">${ITEMS[me.ge].name} <b>[Q]</b> x${me.ch}</div>` : '';
        const bs = `<div class="bar hp ${me.hp < 35 ? 'low' : ''}"><i style="width:${Math.max(0, me.hp)}%"></i><b>HEALTH ${me.hp}</b></div><div class="bar"><i style="width:${me.cd > 0 ? Math.round((1 - me.cd / (me.ge === 'pulse2' ? 5 : 8)) * 100) : 100}%"></i><b>PULSE [F] ${me.cd > 0 ? me.cd + 's' : 'READY'}</b></div>${tool}`;
        if (bs !== barsCache) { barsCache = bs; $('bars').innerHTML = bs; }
        setPrompt(promptFor(snap, me));
        $('msg').style.display = p.d || snap.end ? 'block' : 'none';
        $('msg').textContent = resultText(snap, p);
        continue;
      }
      seen.add(p.id);
      let a = avatars.get(p.id); if (!a) { a = avatar(p.c); avatars.set(p.id, a); }
      const ox = a.position.x, oz = a.position.z;
      a.position.lerp(tmp2.set(p.x, p.y, p.z), Math.min(1, dt * 15));
      const spd = Math.hypot(a.position.x - ox, a.position.z - oz) / Math.max(dt, 0.001), u = a.userData;   // walk cycle from actual movement
      if (u.col !== p.c) { u.col = p.c; u.suit.color.set(p.c); }   // suit colour chosen in the lobby
      u.ph = (u.ph || 0) + spd * dt * 2.4; const sw = Math.sin(u.ph) * Math.min(spd / 4, 1) * 0.9;
      u.legL.rotation.x = sw; u.legR.rotation.x = -sw; u.armL.rotation.x = -sw; u.armR.rotation.x = sw;
      setHat(a, p.h); if (!a.userData.tag) { a.userData.tag = makeTag(p.n); a.add(a.userData.tag); } const em = p.em, tm = performance.now();   // emotes: 1 spin, 2 bounce, 3 faint, 4 big head
      a.rotation.y = p.yaw + (em === 1 ? tm * 0.012 : 0); a.rotation.z = p.d || em === 3 ? Math.PI / 2 : 0;
      if (p.d || em === 3) a.position.y = 0.4; else if (em === 2) a.position.y = Math.abs(Math.sin(tm * 0.012)) * 0.8;
      a.userData.head.scale.setScalar(em === 4 ? 2.2 : 1);
    }
    const eseen = new Set();
    for (const e of snap.en) {
      eseen.add(e.id); let m = emesh.get(e.id); if (!m) { m = enemyMesh(e.k); m.position.set(e.x, 0, e.z); m.userData.hd = 0; emesh.set(e.id, m); }
      const u = m.userData, px = m.position.x, pz = m.position.z, f = Math.min(1, dt * 12);
      m.position.x += (e.x - px) * f; m.position.z += (e.z - pz) * f;
      const mvx = m.position.x - px, mvz = m.position.z - pz, spd = Math.hypot(mvx, mvz) / Math.max(dt, 0.001);
      let aim = null; for (const p of snap.p) if (!p.d) { const d = Math.hypot(p.x - m.position.x, p.z - m.position.z); if (!aim || d < aim.d) aim = { d, x: p.x, z: p.z }; }
      const want = spd > 0.4 ? Math.atan2(mvx, mvz) : aim && aim.d < 12 ? Math.atan2(aim.x - m.position.x, aim.z - m.position.z) : u.hd;   // face where it walks, or at you when idle
      let dh = want - u.hd; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); u.hd += dh * Math.min(1, dt * 8); m.rotation.y = u.hd;
      if (!u.glb) animEnemy(m, { t: now * 0.001, dt, spd, st: e.a || 0, stun: e.s, k: e.k });
      if (u.mixer) u.mixer.update(dt);
      m.visible = (e.k === 'phantom' ? Math.random() > 0.15 : true) && (!e.s || Math.random() > 0.4);
    }
    for (const [id, m] of emesh) if (!eseen.has(id)) { scene.remove(m); emesh.delete(id); }
    const bo = snap.bo;   // blackout: lights die, flashlight flickers
    scene.fog.density = bo ? 0.2 : baseFog; amb.intensity = bo ? 0.03 : 1.2;
    torch.intensity = bo ? (Math.random() > 0.6 ? 45 : 8) : 58 + Math.random() * 4;
    for (const [id, a] of avatars) if (!seen.has(id)) { scene.remove(a); avatars.delete(id); }
  }
  hazMat.opacity = 0.35 + Math.random() * 0.3; stepParticles(dt); // electrical flicker
  const mv = started && (keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || Math.hypot(stick.x, stick.y) > 0.3);
  bobT += dt * (mv ? (keys.ShiftLeft || tSprint ? 13 : 8) : 0);
  cam.position.copy(camPos); cam.position.y += mv ? Math.sin(bobT) * 0.035 : 0;
  if (mv && Math.floor(bobT / Math.PI) !== lastStep) { lastStep = Math.floor(bobT / Math.PI); noise(0.05, 0.04, 500, 150); }   // footstep
  hand.position.y = -0.27 + Math.sin(bobT) * 0.012; hand.position.x = 0.3 + Math.cos(bobT * 0.5) * 0.008;
  $('hurt').style.opacity = Math.min(0.9, Math.pow(1 - myHp / 100, 2));
  cam.rotation.set(pitch, yaw, 0, 'YXZ');
  try { if (composer && quality === 'high') composer.render(dt); else renderer.render(scene, cam); } catch (e) { composer = null; renderer.render(scene, cam); }
};
let errShown = false;
renderer.setAnimationLoop(() => {
  try { frame(); } catch (e) {
    if (!errShown) { errShown = true; console.error(e); $('msg').style.display = 'block'; $('msg').textContent = 'Game error: ' + e.message + ' (press F12, copy the red text and send it to your developer)'; }
    try { renderer.render(scene, cam); } catch {}
  }
});

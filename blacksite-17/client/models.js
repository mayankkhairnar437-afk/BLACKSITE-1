// Detailed procedural creatures and operatives (no external art needed). Everything is built from many parts with
// metal/skin materials, bump maps, emissive details and hierarchical joints that animEnemy() animates.
import * as THREE from 'three';
const cv = (draw, rx = 1, ry = 1) => { const c = document.createElement('canvas'); c.width = c.height = 256; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
const speck = (g, n, a, s = 2) => { for (let i = 0; i < n; i++) { const v = Math.random() * 255 | 0; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(Math.random() * 256, Math.random() * 256, s, s); } };
let TX = null;
const tx = () => TX || (TX = {
  skin: cv(g => { g.fillStyle = '#888'; g.fillRect(0, 0, 256, 256); speck(g, 5000, 0.35, 3); g.strokeStyle = 'rgba(40,40,40,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { g.beginPath(); let x = Math.random() * 256, y = Math.random() * 256; g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += Math.random() * 30 - 15; y += Math.random() * 30 - 15; g.lineTo(x, y); } g.stroke(); } }, 2, 2),
  metal: cv(g => { g.fillStyle = '#aaa'; g.fillRect(0, 0, 256, 256); speck(g, 3500, 0.25); g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 5; i++) g.fillRect(0, i * 52 + 8, 256, 3);
    for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 2.5, 0, 6.3); g.fill(); } }, 1, 1)
});
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.15, ...o });
const E = (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x050505, emissive: c, emissiveIntensity: i, roughness: 0.4 });
const G = (x = 0, y = 0, z = 0, p) => { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; };
const S = (geo, mat, x = 0, y = 0, z = 0, p) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; if (p) p.add(o); return o; };
const hang = (p, x, y, z, len, r0, r1, mat) => { const g = G(x, y, z, p); S(new THREE.CylinderGeometry(r0, r1, len, 8), mat, 0, -len / 2, 0, g); return g; };   // pivots at the top, hangs down
const sph = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h), box = (x, y, z) => new THREE.BoxGeometry(x, y, z), cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);

function drone() {   // hovering maintenance drone: armoured hull, four rotors, camera eye, welding arms
  const g = G(), T = tx(), steel = M(0x8a93a3, { metalness: 0.7, roughness: 0.35, map: T.metal, bumpMap: T.metal, bumpScale: 1 }), dark = M(0x1d2128, { metalness: 0.5, roughness: 0.5 }), warn = M(0xe0a020, { roughness: 0.5 });
  const body = G(0, 1.25, 0, g);
  S(sph(0.42, 20, 14), steel, 0, 0, 0, body).scale.set(1, 0.7, 1.1);
  S(new THREE.TorusGeometry(0.43, 0.04, 8, 28), warn, 0, 0, 0, body).rotation.x = Math.PI / 2;
  S(new THREE.CylinderGeometry(0.3, 0.38, 0.14, 16), dark, 0, -0.27, 0, body);
  const eyeMat = E(0xff2020, 2.5); S(sph(0.15, 14, 10), eyeMat, 0, 0.02, 0.44, body); S(new THREE.TorusGeometry(0.17, 0.03, 8, 16), dark, 0, 0.02, 0.41, body);
  const rotors = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4; S(box(0.6, 0.04, 0.06), dark, Math.cos(a) * 0.4, 0.2, Math.sin(a) * 0.4, body).rotation.y = -a;
    const r = G(Math.cos(a) * 0.68, 0.25, Math.sin(a) * 0.68, body);
    S(new THREE.CylinderGeometry(0.22, 0.22, 0.01, 18), new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.3 }), 0, 0, 0, r); S(box(0.44, 0.012, 0.04), dark, 0, 0.01, 0, r); rotors.push(r);
  }
  const mkArm = sx => { const a = hang(body, sx * 0.4, -0.12, 0.12, 0.5, 0.045, 0.03, dark), f = hang(a, 0, -0.5, 0, 0.3, 0.03, 0.02, steel); S(sph(0.045, 8, 6), E(0x66ccff, 3), 0, -0.3, 0, f); return a; };
  const led = S(sph(0.04, 6, 5), E(0x00ff66, 3), 0, 0.3, -0.1, body); S(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 4), dark, -0.15, 0.45, -0.2, body);
  g.userData = { body, rotors, eyeMat, armL: mkArm(-1), armR: mkArm(1), led }; return g;
}
function stalker() {   // emaciated hunched humanoid with spine ridges, long clawed arms and a blank face
  const g = G(), T = tx(), skin = M(0x25262a, { roughness: 0.9, metalness: 0, map: T.skin, bumpMap: T.skin, bumpScale: 2 }), bone = M(0xcfc9b8, { roughness: 0.7 });
  const hip = G(0, 1.05, 0, g), torso = G(0, 0.05, 0, hip); torso.rotation.x = 0.35;
  S(new THREE.CylinderGeometry(0.17, 0.12, 0.7, 10), skin, 0, 0.38, 0, torso); S(sph(0.16, 10, 8), skin, 0, 0.75, 0, torso).scale.set(1.3, 0.7, 0.9);
  for (let i = 0; i < 7; i++) S(cone(0.03, 0.11, 5), bone, 0, 0.1 + i * 0.1, -0.14, torso).rotation.x = -Math.PI / 2.4;
  for (let i = 0; i < 4; i++) { S(box(0.28, 0.015, 0.02), bone, 0, 0.3 + i * 0.1, 0.12, torso); }   // ribs
  const neck = G(0, 0.8, 0.05, torso); neck.rotation.x = -0.5; S(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 6), skin, 0, 0.1, 0, neck);
  const head = G(0, 0.22, 0.08, neck); S(sph(0.13, 12, 10), skin, 0, 0, 0, head).scale.set(0.8, 1.25, 1); S(sph(0.028, 6, 5), E(0xffffff, 4), -0.05, 0.03, 0.11, head); S(sph(0.028, 6, 5), E(0xffffff, 4), 0.05, 0.03, 0.11, head);
  const arm = sx => { const up = hang(torso, sx * 0.27, 0.72, 0, 0.7, 0.05, 0.04, skin), fo = hang(up, 0, -0.7, 0, 0.78, 0.04, 0.025, skin); for (let i = -1; i <= 1; i++) { const c = S(cone(0.012, 0.2, 4), bone, i * 0.025, -0.86, 0.01, fo); c.rotation.z = Math.PI; } return [up, fo]; };
  const leg = sx => { const th = hang(hip, sx * 0.1, 0, 0, 0.55, 0.07, 0.05, skin), sh = hang(th, 0, -0.55, 0, 0.55, 0.05, 0.035, skin); S(box(0.1, 0.05, 0.22), skin, 0, -0.57, 0.06, sh); return [th, sh]; };
  g.userData = { hip, torso, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) }; return g;
}
function swarm() {   // seven skittering beetles
  const g = G(), shell = M(0x3a0d0d, { metalness: 0.3, roughness: 0.35 }), eyes = E(0xff2020, 2), bugs = [], ph = [], sp = [], rad = [];
  for (let i = 0; i < 7; i++) {
    const b = G(0, 0.1, 0, g); S(sph(0.1, 8, 6), shell, 0, 0, 0, b).scale.set(0.8, 0.6, 1.3); S(sph(0.05, 6, 5), shell, 0, 0, 0.13, b); S(sph(0.018, 4, 3), eyes, 0.025, 0.02, 0.17, b); S(sph(0.018, 4, 3), eyes, -0.025, 0.02, 0.17, b);
    for (const [z, r] of [[0.06, 0.5], [0, 0], [-0.06, -0.5]]) { S(box(0.36, 0.012, 0.012), shell, 0, -0.04, z, b).rotation.y = r; }
    bugs.push(b); ph.push(Math.random() * 6.28); sp.push(2 + Math.random() * 3); rad.push(0.12 + Math.random() * 0.5);
  }
  bugs.forEach(b => b.children.forEach(m => { m.castShadow = false; }));   // keep shadow cost low: many beetles
  g.userData = { bugs, ph, sp, rad }; return g;
}
function charger() {   // armoured furnace brute: horns, plated back, glowing vents, massive fists
  const g = G(), T = tx(), hide = M(0x5a3a2a, { roughness: 0.9, map: T.skin, bumpMap: T.skin, bumpScale: 3 }), plate = M(0x2a2a30, { metalness: 0.8, roughness: 0.4, map: T.metal }), vent = E(0xff6a10, 2);
  const body = G(0, 0.95, 0, g); S(sph(0.62, 16, 12), hide, 0, 0, 0, body).scale.set(1, 0.9, 1.2);
  for (let i = 0; i < 3; i++) { const p = S(box(0.95 - i * 0.12, 0.12, 0.45), plate, 0, 0.5 - i * 0.05, -0.2 + i * 0.28, body); p.rotation.x = -0.25 + i * 0.1; }
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) S(box(0.05, 0.3, 0.02), vent, sx * 0.6, -0.05 + i * 0.05, 0.1 + i * 0.22, body).rotation.y = sx * 0.9;
  const head = G(0, -0.02, 0.78, body); S(sph(0.28, 12, 10), hide, 0, 0, 0, head).scale.set(1.1, 0.9, 1); S(box(0.3, 0.1, 0.25), plate, 0, -0.18, 0.1, head);
  for (const sx of [-1, 1]) { const h = S(cone(0.07, 0.4, 6), plate, sx * 0.25, 0.22, 0.05, head); h.rotation.z = -sx * 0.7; S(sph(0.04, 6, 5), E(0xffaa30, 4), sx * 0.12, 0.05, 0.25, head); }
  const arm = sx => { const a = hang(body, sx * 0.72, 0.2, 0.15, 0.9, 0.17, 0.12, hide); S(sph(0.21, 10, 8), plate, 0, -0.95, 0, a); return a; };
  const leg = sx => { const l = hang(body, sx * 0.35, -0.45, -0.1, 0.55, 0.17, 0.12, hide); S(box(0.28, 0.12, 0.4), plate, 0, -0.58, 0.08, l); return l; };
  g.userData = { body, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1), vent }; return g;
}
function spitter() {   // bloated bio-organism with glowing sacs, toothed maw and tentacle legs
  const g = G(), T = tx(), flesh = M(0x4a8a3a, { roughness: 0.5, map: T.skin, bumpMap: T.skin, bumpScale: 2 }), sacM = new THREE.MeshStandardMaterial({ color: 0x9aff55, emissive: 0x3a8a10, emissiveIntensity: 0.9, transparent: true, opacity: 0.78, roughness: 0.2 });
  const body = G(0, 0.7, 0, g); S(sph(0.38, 14, 10), flesh, 0, 0, 0, body).scale.set(1, 0.9, 1.2);
  const sacs = [[0, 0.32, -0.1, 0.2], [0.22, 0.25, 0.05, 0.15], [-0.22, 0.25, 0.05, 0.15], [0, 0.2, -0.3, 0.17]].map(([x, y, z, r]) => S(sph(r, 10, 8), sacM, x, y, z, body));
  const mouthMat = E(0xaaff44, 0.8); const mouth = S(cone(0.18, 0.3, 10), mouthMat, 0, -0.02, 0.5, body); mouth.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 6; i++) { const a = i * 1.05, t = S(cone(0.018, 0.09, 4), M(0xe8e0c0), Math.cos(a) * 0.12, -0.02 + Math.sin(a) * 0.12, 0.62, body); t.rotation.x = Math.PI / 2; }
  for (const [x, y] of [[-0.12, 0.12], [0.12, 0.12], [0, 0.2]]) S(sph(0.04, 6, 5), E(0xddff66, 3), x, y, 0.4, body);
  const legs = [[-0.25, 0.2], [0.25, 0.2], [-0.25, -0.2], [0.25, -0.2]].map(([x, z]) => { const a = hang(body, x, -0.25, z, 0.55, 0.06, 0.03, flesh); return [a, hang(a, 0, -0.55, 0, 0.45, 0.03, 0.012, flesh)]; });
  g.userData = { body, sacs, legs, mouth: { material: mouthMat } }; return g;
}
function phantom() {   // translucent wraith with trailing wisps
  const g = G(), ghost = new THREE.MeshBasicMaterial({ color: 0x9a77ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const body = G(0, 1.1, 0, g); S(cone(0.32, 1.5, 14), ghost, 0, -0.2, 0, body).rotation.x = Math.PI; S(sph(0.17, 12, 10), ghost, 0, 0.62, 0, body); S(cone(0.2, 0.3, 10), ghost, 0, 0.78, -0.03, body);
  S(sph(0.03, 6, 5), E(0xffffff, 5), -0.06, 0.64, 0.14, body); S(sph(0.03, 6, 5), E(0xffffff, 5), 0.06, 0.64, 0.14, body);
  const arm = sx => hang(body, sx * 0.3, 0.45, 0, 0.9, 0.04, 0.012, ghost);
  const wisps = []; for (let i = 0; i < 5; i++) { const w = G((i - 2) * 0.12, -0.5, -0.1, body); S(cone(0.05, 0.9 + i * 0.1, 6), ghost, 0, 0, -0.45, w).rotation.x = Math.PI / 2; wisps.push(w); }
  g.userData = { body, wisps, armL: arm(-1), armR: arm(1), mat: ghost }; return g;
}
function sentry() {   // tripod arc turret with a rotating emitter
  const g = G(), T = tx(), metal = M(0x444a55, { metalness: 0.75, roughness: 0.35, map: T.metal, bumpMap: T.metal }), dark = M(0x1a1d22, { metalness: 0.5 });
  S(new THREE.CylinderGeometry(0.35, 0.42, 0.12, 14), dark, 0, 0.06, 0, g); for (let i = 0; i < 3; i++) { const a = i * 2.09; const l = S(box(0.06, 0.8, 0.06), metal, Math.cos(a) * 0.22, 0.45, Math.sin(a) * 0.22, g); l.rotation.z = Math.cos(a) * 0.35; l.rotation.x = Math.sin(a) * 0.35; }
  S(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 10), metal, 0, 0.7, 0, g);
  const head = G(0, 1.3, 0, g); S(box(0.5, 0.34, 0.5), metal, 0, 0, 0, head); S(new THREE.CylinderGeometry(0.07, 0.09, 0.45, 10), dark, 0, 0, 0.4, head).rotation.x = Math.PI / 2;
  const coilMat = E(0x66aaff, 1.2), coil = S(new THREE.TorusGeometry(0.12, 0.03, 8, 16), coilMat, 0, 0, 0.5, head); S(sph(0.06, 8, 6), E(0x99ccff, 3), 0, 0, 0.66, head);
  const ring = G(0, 0.9, 0, g); S(new THREE.TorusGeometry(0.24, 0.02, 6, 20), coilMat, 0, 0, 0, ring).rotation.x = Math.PI / 2;
  g.userData = { head, ring, coil: { material: coilMat } }; return g;
}
function unknown() {   // tall featureless silhouette with limbs that are too long
  const g = G(), blk = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.25, metalness: 0.6 });
  const torso = G(0, 1.7, 0, g); S(new THREE.CylinderGeometry(0.12, 0.2, 1.3, 10), blk, 0, 0.1, 0, torso);
  const head = G(0, 0.95, 0, torso); S(sph(0.14, 12, 10), blk, 0, 0.05, 0, head).scale.set(0.8, 1.7, 0.8); S(sph(0.03, 6, 5), E(0xffffff, 6), -0.05, 0.06, 0.1, head); S(sph(0.03, 6, 5), E(0xffffff, 6), 0.05, 0.06, 0.1, head);
  const arm = sx => hang(torso, sx * 0.28, 0.65, 0, 1.4, 0.04, 0.025, blk), leg = sx => hang(g, sx * 0.12, 1.1, 0, 1.1, 0.05, 0.03, blk);
  g.userData = { torso, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) }; return g;
}
const BUILD = { drone, stalker, swarm, charger, spitter, phantom, sentry, unknown };
export const makeEnemy = k => (BUILD[k] || swarm)();

// c = { t: seconds, dt, spd: movement speed m/s, st: 0 idle | 1 windup/charging | 2 dash, stun, k }
export function animEnemy(g, c) {
  const u = g.userData, t = c.t, moving = c.spd > 0.4;
  g.rotation.z = c.stun ? Math.sin(t * 50) * 0.05 : 0;
  switch (c.k) {
    case 'drone':
      u.rotors.forEach(r => { r.rotation.y += c.dt * 40; });
      g.position.y = 0.3 + Math.sin(t * 3) * 0.12; u.body.rotation.x = Math.min(0.35, c.spd * 0.07); u.body.rotation.z = Math.sin(t * 2) * 0.05;
      u.armL.rotation.x = Math.sin(t * 5) * 0.3 - 0.2; u.armR.rotation.x = Math.sin(t * 5 + 1.5) * 0.3 - 0.2;
      u.eyeMat.emissiveIntensity = 2 + Math.sin(t * 8) * 0.6 + (c.spd > 2.5 ? 1.5 : 0); u.led.visible = Math.sin(t * 6) > 0; break;
    case 'stalker': {
      const sw = moving ? Math.sin(t * 7) : 0;
      u.legL[0].rotation.x = sw * 0.7; u.legL[1].rotation.x = Math.max(0, sw) * 0.8; u.legR[0].rotation.x = -sw * 0.7; u.legR[1].rotation.x = Math.max(0, -sw) * 0.8;
      u.armL[0].rotation.x = -0.4 - sw * 0.5 + (moving ? 0.3 : 0); u.armL[1].rotation.x = -0.4; u.armR[0].rotation.x = -0.4 + sw * 0.5 + (moving ? 0.3 : 0); u.armR[1].rotation.x = -0.4;
      u.torso.rotation.x = 0.35 + (moving ? 0.4 : 0) + Math.sin(t * 1.3) * 0.03; u.hip.position.y = 1.05 + Math.abs(sw) * 0.04;
      u.head.rotation.y = moving ? 0 : Math.sin(t * 9) * 0.08 * (Math.sin(t * 0.7) > 0.8 ? 1 : 0.15); u.head.rotation.z = Math.sin(t * 0.9) * 0.15; break; }
    case 'swarm':
      u.bugs.forEach((b, i) => { const a = u.ph[i] + t * u.sp[i], r = u.rad[i] * (moving ? 1.4 : 1); b.position.x = Math.cos(a) * r; b.position.z = Math.sin(a) * r; b.rotation.y = -a + Math.PI; b.position.y = 0.1 + Math.abs(Math.sin(t * 12 + i)) * 0.04; }); break;
    case 'charger': {
      const sw = moving ? Math.sin(t * (c.st === 2 ? 14 : 4)) : 0;
      u.body.scale.y = 1 + Math.sin(t * 2) * 0.02; u.body.rotation.x = c.st === 1 ? -0.5 + Math.sin(t * 40) * 0.04 : c.st === 2 ? 0.55 : 0.15;
      const raise = c.st === 1 ? -2.2 : c.st === 2 ? 0.9 : null; u.armL.rotation.x = raise ?? -sw * 0.5; u.armR.rotation.x = raise ?? sw * 0.5;
      u.legL.rotation.x = sw * 0.6; u.legR.rotation.x = -sw * 0.6; u.vent.emissiveIntensity = c.st === 1 ? 6 : 2 + Math.sin(t * 3) * 0.5; u.head.rotation.x = c.st === 1 ? -0.4 : 0.1; g.position.y = Math.abs(sw) * 0.05; break; }
    case 'spitter': {
      const pulse = 1 + Math.sin(t * 3) * 0.08, swell = c.st === 1 ? 1.5 : 1;
      u.sacs.forEach((s, i) => s.scale.setScalar(pulse * swell * (1 + Math.sin(t * 3 + i) * 0.05)));
      u.body.position.y = 0.7 + Math.sin(t * 2) * 0.03; u.mouth.material.emissiveIntensity = c.st === 1 ? 5 : 0.8;
      u.legs.forEach((l, i) => { const s = moving ? Math.sin(t * 9 + i * 1.6) : Math.sin(t * 1.2 + i) * 0.08; l[0].rotation.x = s * 0.6; l[0].rotation.z = (i % 2 ? 1 : -1) * 0.5; l[1].rotation.x = Math.max(0, s) * 0.5; }); break; }
    case 'phantom':
      g.position.y = 0.25 + Math.sin(t * 1.8) * 0.12;
      u.wisps.forEach((w, i) => { w.rotation.x = Math.sin(t * 3 + i) * 0.25; w.rotation.z = Math.sin(t * 2 + i * 1.3) * 0.3; });
      u.armL.rotation.x = -0.9 + Math.sin(t * 2) * 0.2; u.armR.rotation.x = -0.9 + Math.sin(t * 2 + 2) * 0.2; u.mat.opacity = 0.35 + Math.sin(t * 5) * 0.12 + (c.st === 1 ? 0.3 : 0); break;
    case 'sentry':
      u.coil.material.emissiveIntensity = c.st === 1 ? 6 + Math.sin(t * 30) * 2 : 1.2 + Math.sin(t * 2) * 0.4; u.head.rotation.x = Math.sin(t * 0.8) * 0.12 - 0.05; u.ring.rotation.y += c.dt * (c.st === 1 ? 12 : 1.5); break;
    default:   // unknown
      g.scale.set(1 + (Math.random() > 0.9 ? 0.15 : 0), 1 + Math.sin(t * 0.7) * 0.02, 1);
      u.armL.rotation.x = -0.1 + Math.sin(t) * 0.05; u.armR.rotation.x = -0.1 + Math.sin(t + 1) * 0.05; u.head.rotation.z = Math.sin(t * 0.5) * 0.2 + (Math.random() > 0.95 ? 0.4 : 0);
  }
}

export function makeOperative(c) {   // astronaut operative: chest rig, shoulder pads, backpack with antenna, helmet with lamp and reflective visor
  const g = G(), T = tx(), suit = M(c, { roughness: 0.65 }), dark = M(0x1c2128, { roughness: 0.8 }), armor = M(0x4a5260, { metalness: 0.6, roughness: 0.4, map: T.metal, bumpMap: T.metal });
  const visor = new THREE.MeshStandardMaterial({ color: 0x0a1a24, metalness: 0.9, roughness: 0.08, emissive: 0x1a6a8a, emissiveIntensity: 0.7 });
  S(box(0.56, 0.66, 0.3), suit, 0, 1.15, 0, g); S(box(0.5, 0.3, 0.08), armor, 0, 1.25, -0.18, g); S(box(0.12, 0.14, 0.08), dark, -0.16, 1.0, -0.19, g); S(box(0.12, 0.14, 0.08), dark, 0.16, 1.0, -0.19, g);
  S(box(0.58, 0.12, 0.32), dark, 0, 0.84, 0, g); for (const sx of [-1, 1]) S(sph(0.17, 10, 8), armor, sx * 0.34, 1.46, 0, g).scale.set(1, 0.7, 1);
  S(box(0.4, 0.5, 0.16), dark, 0, 1.2, 0.23, g); S(box(0.3, 0.04, 0.02), E(0x33ddff, 2.5), 0, 1.3, 0.32, g); S(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 4), dark, 0.14, 1.65, 0.25, g);
  const head = G(0, 1.68, 0, g); S(sph(0.24, 14, 10), armor, 0, 0, 0, head); S(box(0.3, 0.13, 0.12), visor, 0, 0.02, -0.18, head); S(box(0.07, 0.07, 0.1), E(0xfff2cc, 3), -0.2, 0.1, -0.12, head);
  const arm = sx => { const a = hang(g, sx * 0.36, 1.42, 0, 0.62, 0.09, 0.08, suit); S(sph(0.09, 8, 6), dark, 0, -0.64, 0, a); return a; };
  const leg = sx => { const l = hang(g, sx * 0.15, 0.82, 0, 0.82, 0.11, 0.09, dark); S(box(0.2, 0.14, 0.32), dark, 0, -0.84, -0.04, l); S(box(0.16, 0.12, 0.06), armor, 0, -0.4, -0.1, l); return l; };
  g.userData = { suit, head, armL: arm(-1), armR: arm(1), legL: leg(-1), legR: leg(1) }; return g;
}

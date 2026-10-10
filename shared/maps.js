// Every facility has SIX rooms: a centre column (Entry Hall in the south where you spawn, Core Chamber in the north with the extraction ring)
// plus four side rooms, joined by doorways. One locked main door at (0,0) separates the south rooms from the north rooms.
const vw = (x, z1, z2, gc, gw = 3.2) => [[x, (z1 + gc - gw / 2) / 2, 1, gc - gw / 2 - z1], [x, (gc + gw / 2 + z2) / 2, 1, z2 - gc - gw / 2]];   // vertical wall with a doorway
const SHELL = [[0, 20.5, 42, 1], [0, -20.5, 42, 1], [20.5, 0, 1, 42], [-20.5, 0, 1, 42], [-11, 0, 18, 1], [11, 0, 18, 1],
  ...vw(-9, 0.5, 20, 11), ...vw(9, 0.5, 20, 11), ...vw(-9, -20, -0.5, -11), ...vw(9, -20, -0.5, -11)];
const EX = [0, -16, 3.5], DOOR = [0, 0, 4, 1];
export const ROOMS = [[-15, 10, 'West Wing'], [0, 10, 'Entry Hall'], [15, 10, 'East Wing'], [-15, -10, 'Vault West'], [0, -10, 'Core Chamber'], [15, -10, 'Vault East']];
// prop spots (collide like walls): kept clear of doorways, spawn, socket and every patrol line
const SPOTS = [[-12, 5, 2, 2], [-12, 17, 2, 2], [-18, 10, 1.5, 3], [12, 5, 2, 2], [12, 17, 2, 2], [18, 10, 1.5, 3], [-4.5, 9, 2, 1.5], [4.5, 9, 2, 1.5],
  [-12, -6, 2, 2], [-12, -16, 2, 2], [-18, -10, 1.5, 3], [12, -6, 2, 2], [12, -16, 2, 2], [18, -10, 1.5, 3], [-3, -10, 2, 1.5], [3, -10, 2, 1.5]];
const mk = (kinds, hs) => SPOTS.map(([x, z, w, d], i) => { const k = kinds[i % kinds.length], s = Math.min(w, d); return k === 'barrel' ? [x, z, s, s, hs[i % hs.length], k] : [x, z, w, d, hs[i % hs.length], k]; });
const base = { walls: SHELL, door: DOOR, socket: [0, 5], extract: EX, floorHaz: null, dyn: '', extra: [] };
export const MAPS = {
  1: { ...base, id: 1, lockdown: true, floorHaz: [0, -7, 15, 3], props: mk(['machine', 'crate'], [1.2, 1.0, 1.6]),
       theme: { bg: 0x020405, fog: 0x020405, fd: 0.07, floor: 0x1b2220, wall: 0x38423f, door: 0x883322 } },
  2: { ...base, id: 2, dyn: 'crusher', props: mk(['machine', 'crate'], [2.4, 1.2, 2.0]), extra: [['drone', -15, -17, [[-15, -17], [-15, -4]]]],
       theme: { bg: 0x0a0503, fog: 0x150a05, fd: 0.06, floor: 0x2a1e16, wall: 0x5a3a28, door: 0xffaa22 } },
  3: { ...base, id: 3, dyn: 'strike', dyn2: 'collapse', props: mk(['crate'], [2.8, 1.6, 3.0]), extra: [['stalker', 0, -18]],
       theme: { bg: 0x050403, fog: 0x0a0806, fd: 0.1, floor: 0x2b2620, wall: 0x4a4036, door: 0xbb8844 } },
  4: { ...base, id: 4, dyn: 'gas', props: mk(['machine'], [1.1, 1.3]), extra: [['swarm', -15, -6], ['swarm', 15, -6], ['swarm', -15, -17], ['swarm', 15, -17]],
       theme: { bg: 0x020608, fog: 0x041014, fd: 0.05, floor: 0x2a3a3c, wall: 0x7fa0a0, door: 0x22ffcc } },
  5: { ...base, id: 5, dyn: 'flood', props: mk(['barrel', 'crate'], [1.4, 1.0]), extra: [['swarm', -15, -6], ['swarm', 15, -6]],
       theme: { bg: 0x020a10, fog: 0x04141f, fd: 0.06, floor: 0x1a2c36, wall: 0x3d5a6b, door: 0x33aaff } },
  6: { ...base, id: 6, dyn: 'arc', lockdown: true, props: mk(['machine'], [2.4, 1.8]), extra: [['stalker', -15, -17], ['swarm', 15, -17]],
       theme: { bg: 0x000208, fog: 0x00040d, fd: 0.08, floor: 0x14181f, wall: 0x2a3550, door: 0x6688ff } },
  7: { ...base, id: 7, dyn: 'wind', props: mk(['crate', 'machine'], [1.4, 1.1]), extra: [['drone', -15, -17, [[-15, -17], [-15, -4]]], ['swarm', 15, -14]],
       theme: { bg: 0x0b1626, fog: 0x14243a, fd: 0.035, floor: 0x394250, wall: 0x6a7a90, door: 0xff5533 } },
  8: { ...base, id: 8, dyn: 'debris', g: 0.3, jv: 0.9, props: mk(['machine', 'crate'], [1.6, 1.0, 2.0]), extra: [['stalker', 15, -17], ['drone', -15, -17, [[-15, -17], [-15, -4]]]],
       theme: { bg: 0x03030a, fog: 0x080814, fd: 0.045, floor: 0x1c1e2a, wall: 0x4a4f6a, door: 0xaaccff } },
  9: { ...base, id: 9, dyn: 'spore', props: mk(['barrel'], [2.2, 1.8, 2.6]), extra: [['swarm', -15, -6], ['swarm', 15, -6], ['drone', -15, -17, [[-15, -17], [-15, -4]]]],
       theme: { bg: 0x040a04, fog: 0x081408, fd: 0.07, floor: 0x1c2a1a, wall: 0x3f5a3a, door: 0xaaff44 } },
  10: { ...base, id: 10, dyn: 'fire', floorHaz: [0, -10, 17, 3], props: mk(['machine', 'barrel'], [2.0, 1.4]), extra: [['drone', 15, -17, [[15, -17], [15, -4]]]],
       theme: { bg: 0x0f0300, fog: 0x1f0800, fd: 0.06, floor: 0x2a1208, wall: 0x6a3018, door: 0xff7700 } },
  11: { ...base, id: 11, dyn: 'null', props: mk(['crate', 'machine'], [2.0, 1.2, 2.6]), extra: [['stalker', -15, -17], ['stalker', 15, -17]],
       theme: { bg: 0x080010, fog: 0x12001f, fd: 0.06, floor: 0x201030, wall: 0x6a2f9a, door: 0xff44ff } },
  12: { ...base, id: 12, dyn: 'mix', dyn2: 'collapse', lockdown: true, props: mk(['machine', 'barrel', 'crate'], [2.2, 1.6, 1.2]), extra: [['stalker', -15, -17], ['drone', 15, -17, [[15, -17], [15, -4]]], ['swarm', 15, -6]],
       theme: { bg: 0x0a0000, fog: 0x180404, fd: 0.07, floor: 0x1a1010, wall: 0x5a2a2a, door: 0xffffff } }
};
for (const m of Object.values(MAPS)) m.solids = [...m.walls, ...m.props.map(p => p.slice(0, 4))];   // everything that blocks movement
// extra facility-specific enemies added at mission start
export const BONUS = { 2: [['charger', 15, -6]], 5: [['charger', -15, -14]], 6: [['sentry', -16, 3], ['sentry', 16, 3]], 7: [['sentry', -16, 3], ['sentry', 16, -3]], 8: [['phantom', 15, -6]],
  9: [['spitter', 15, -14]], 10: [['charger', -15, -14]], 11: [['phantom', 15, -6]], 12: [['charger', -15, -6], ['spitter', 15, -14], ['phantom', -15, -14], ['sentry', -16, 3], ['sentry', 16, 3]] };

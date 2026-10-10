# BLACKSITE-17 (Stage 1)

2-8 player online co-op first-person game. Node.js + WebSockets server, three.js client.

## Run
1. Install Node.js 18+ from https://nodejs.org
2. In this folder: `npm install`
3. `npm start` (or double-click `start.bat` on Windows)
4. Open http://localhost:3000, click **Create room**, share the 4-letter code.

## Playing with friends
- Same Wi-Fi: friends open `http://YOUR-PC-LOCAL-IP:3000` (find it with `ipconfig`).
- Over the internet: use a tunnel such as `npx localtunnel --port 3000` or `ngrok http 3000` and share that URL.

## Controls
WASD move, mouse look (click the screen), Shift sprint, C crouch, Space jump, hold E to revive a teammate.
Mobile: left half of screen = move, right half = look, on-screen buttons for jump/E/crouch/run.

## Stage 1 contents
Rooms + codes (2-8 players), server-authoritative movement/collision, sprint/crouch/jump, unconscious + revive,
a co-op plate puzzle, an electrified-floor hazard, extraction win/fail with auto-reset, ambient audio.

## Structure
client/ (rendering, input, UI) · server/ (rooms, simulation) · shared/ (map + constants used by both)

## Stage 2 additions
Enemies: Maintenance Drones (patrol, chase within 9m), Stalkers (only move while nobody looks at them), Swarms, and the rare Unknown.
Jumpscare Director (server): random gaps; blackouts, fake-outs, stingers, whispers, stalker ambushes, swarm waves, rare Unknown.
Pulse tool (F / PULSE button): stuns enemies in front of you for 4s, 8s cooldown. Enemy damage can knock you unconscious.

## Stage 3 additions
Lobby with ready-up (host picks the mission), 3 Blacksite-17 missions with randomized plate/core/cache positions,
objectives (plates, data cores, secret caches), team extraction choice with a growing bonus (x1 to x2) that also speeds up the scares,
credits + rank saved in server/data/saves.json (per browser), mission results with funny team awards.

## Stage 4 additions
Lobby shop (spend credits): gear (Pulse Mk II, Rocket Boots, Padded Vest; one equipped per mission, effects enforced by the server)
and funny hats (visible to your friends). Emotes: keys 1-4 (Spin, Bounce, Faint, Big Head) or the EMOTE button on mobile.

## Stage 5 additions
Facilities 2-4 playable (12 missions in total): Ironworks (crusher press), Deepwell (rockfalls + waiting Stalker), Helix Lab (toxic gas + swarm nest).
Each facility has its own layout, colours/fog, hazards, starting enemies and missions. Fixed: Blacksite patrol drone could not move.

## Stage 6 additions
Facilities 5-7 (21 missions total): Floodgate (rising water + jump-over flood waves), Dead Grid (lightning arcs + grid blackouts),
Skyreach (telegraphed wind gusts). New mechanic: carry/throw power cells (G key / GRAB button) delivered to the yellow ring to open the door.

## Stage 7 additions
All 12 facilities playable (36 missions): The Ark (low gravity), BioVault (spores + hatching nests), The Furnace (lava + fire),
Null Sector (inverted-control reality shifts), The Origin (all hazards + story ending). 12s start-of-mission grace period before enemies/hazards wake.

## Stage 8 additions
New enemies: Charger (windup + dash), Spitter (lobs spore clouds), Phantom (blinks behind you), Sentry (arc turret). Fire spreads (Furnace),
collapsing floors (Deepwell, Origin), door lockdowns (Blacksite-17, Dead Grid, Origin). New objective styles: survive-the-timer and hold-the-plates-for-N-seconds. 48 missions.

## Stage 9 additions
Graphics: dynamic shadows, procedural floor/wall textures, glow sprites, drifting particles per facility (embers, rain, spores, dust...), flashlight in hand,
head bob, footsteps, vignette + red low-health overlay. Characters: astronaut operatives with helmets, backpacks and walk cycles. Enemy hover/flicker.
Lobby: top-down level preview (map, hazards, enemies, objectives) for the selected mission, and a Graphics HIGH/LOW toggle (LOW is default on phones).

## Stage 10 additions
Every facility now has 6 rooms (Entry Hall, West/East Wing, Core Chamber, Vault West/East) with doorways, props (crates, barrels, machines), ceiling lamps and a
room light. Enemies path through doorways. Minimap (no enemies shown), room name in HUD, tone mapping, film grain, enemy eye glows, better textures (HIGH quality).
Audio: per-facility drone, random distant sounds, heartbeat tension, M = mute, audio now resumes on first click. Performance: HUD caching, vector reuse, input flood protection.

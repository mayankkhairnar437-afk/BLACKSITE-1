# BLACKSITE-17

2-8 player online co-op first-person sci-fi horror / extraction game. Runs in the browser (PC + mobile). Node.js + WebSockets server, three.js client.

## Install and run (Windows)
1. Install Node.js 18+ (LTS) from https://nodejs.org (restart your PC afterwards).
2. Extract the zip. Double-click **start.bat** (first run installs dependencies, needs internet).
3. Your browser opens http://localhost:3000. Click **Create room** and send friends the 4-letter code.
Other systems: `npm install` then `npm start`.

## Friends on other networks (free)
* **From your PC:** run Cloudflare's free quick tunnel in a second window: `cloudflared tunnel --url http://localhost:3000`, send the printed `https://....trycloudflare.com` link plus the room code. Your PC must stay on.
* **Always-on:** put the project on GitHub and deploy it as a free Render "Web Service" (build `npm install`, start `npm start`). Free tiers sleep when idle and their disk is wiped on restart, so
  saved progress is lost unless you attach a persistent disk and set the `SAVE_DIR` environment variable to it.

## Controls
| Action | PC | Mobile |
|---|---|---|
| Move / look | WASD / mouse (click the game once to capture the mouse, Esc to release) | left half = move, right half = look |
| Sprint / crouch / jump | Shift / C / Space | RUN / CRCH / JUMP |
| Interact, pick up, hold to revive | hold E | E |
| Grab / throw power cell | G | GRAB |
| Pulse (stuns enemies in front) | F | PULSE |
| Tool (Medkit / Decoy) | Q | USE |
| Emotes | 1-4 | EMOTE |
| Mute | M | - |

## How a mission works
Lobby (host picks one of 48 missions, everyone readies up) -> enter the facility (12s grace period, enemies asleep) -> explore the 6 rooms -> objectives (plates held together, data cores, power cells,
survive-the-timer) open the main door -> decide: extract now (everyone in the cyan ring) or stay for a bigger bonus (up to x2) and secret caches while the scares speed up.
At 0 HP you become unconscious (never permanently dead); a teammate holds E next to you to revive you. If everyone is unconscious the mission fails.

## The 12 facilities
Blacksite-17, Ironworks (crusher), Deepwell (rockfalls, collapsing floors), Helix Lab (gas), Floodgate (rising water + waves), Dead Grid (lightning, blackouts), Skyreach (gusts),
The Ark (low gravity), BioVault (spores, hatching nests), The Furnace (lava, fire), Null Sector (inverted controls), The Origin (everything + story ending).

## Using real 3D models (optional, biggest visual upgrade)
The enemies are detailed procedural models. To use real art instead, put glTF binary files in `client/assets/models/` named `drone.glb`, `stalker.glb`, `swarm.glb`, `charger.glb`,
`spitter.glb`, `phantom.glb`, `sentry.glb`, `unknown.glb`. Models should face +Z, stand on y=0 and be roughly 1-3 m tall; the first animation clip loops. They are picked up automatically
(refresh the page). Free CC0 sources: Quaternius, Kenney, Poly Haven, Sketchfab (check licences).

## Graphics quality
Lobby button "Graphics HIGH/LOW". HIGH adds shadows, bloom, reflections, 512px textures and more particles; phones default to LOW.

## Troubleshooting
* Black window says `'node' is not recognized`: restart the PC after installing Node.js.
* Slow: switch Graphics to LOW; close other tabs.
* Silent: browsers need one click before sound; press M if muted.
* Red "Game error" text: press F12, copy the red console text and report it.
* Progress is stored per browser in `server/data/saves.json` (or `SAVE_DIR`).

## Project layout
`client/` rendering, input, UI, models | `server/` rooms, simulation, saves | `shared/` maps, missions, items used by both.

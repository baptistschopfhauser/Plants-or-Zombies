# Plants-or-Zombies — Garden Guardians v4

An original lane-based tower defense game for the browser (HTML5 canvas +
vanilla JS, no dependencies, no external assets). All code, runtime-drawn
art, synthesized sound/music, and names are original — this is not a copy of
any commercial game.

## Run

Open `index.html` in any modern browser, or serve the folder:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Alternatively, enable GitHub Pages (Settings → Pages, deploy from branch,
root folder) to get a shareable URL.

## Features

- 5×9 lawn, sun/moonlight economy (click to collect), 18 seed packets with
  cost + recharge cooldowns, hover tooltips and mini plant icons
- **Plant leveling:** shooter plants gain XP per kill (5/15 → Lv2/Lv3) for
  more damage and faster fire (★ icons)
- **Pool biome** (levels 3-1 to 3-3): middle lanes are animated water —
  plant a Lotus Pad first, then anything on top, or Reed Shooter directly;
  Ducky zombies float on inner tubes (+armor, slower in water)
- Plants: Sunbloom, Sun Shroom (grows), Seed Spitter, Puff Spitter (short
  range), Double Spitter, Split Spitter (both ways), Frost Fern (slow),
  Melon Lob (3×3 splash), Reed Shooter (water), Lotus Pad (water),
  Acorn Wall, Thistle Pad, Tuber Trap (mine), Blastcap (3×3), Blaze Reed
  (lane clear), Blover (lane pushback), Diverter Onion (lane swap), Gnasher
  (eats one whole)
- 13 zombie types: Shambler, Pylonhead/Tinhead/Screenback (armor), Dasher,
  Leaper (vaults a plant), Howler (enrages at half HP), Rusher, Goliath,
  Balloon Flyer (flies then lands), Ducky (water), Imp, and the summoning
  **Yard Boss** with HP bar (boss levels + every 10th endless wave)
- 13 adventure levels (day/night/pool) + endless mode, lawnmowers, wave
  banners, FINAL WAVE / BOSS alerts, +50 sun wave-clear bonus, stars
  (2★ = flawless, no mower lost), difficulty modes (easy/normal/hard)
- 12 achievements with toast banners; localStorage progression (unlocks,
  stars, endless best, lifetime stats, settings)
- Presentation: animated menu with marching zombie, level intro cards,
  placement pop-in, hit flashes, particles, floaters, screen shake, sun
  fly-to-counter, vignette, WebAudio SFX + tiny music loop (mutable),
  1×/2× speed, ghost placement with terrain-aware validity, almanac,
  level select, help, pause, win/lose — touch supported

## Controls

| Input | Action |
| --- | --- |
| Click / tap | collect sun, place plant, buttons |
| 1-9, 0, -, = | select seed packet (first 12) |
| S | toggle shovel (remove a plant/pad) |
| Esc / Space | pause / resume |

## Files

- `index.html` — entry point
- `style.css` — page styling
- `data.js` — plant / zombie / level definitions
- `game.js` — engine: simulation, terrain/pool rules, input, progression, achievements, music, main loop
- `render.js` — all drawing and screens

## License

MIT — see [LICENSE](LICENSE).

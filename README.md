# Plants-or-Zombies — Garden Guardians v7

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
- Adventure in **3 chapters** (Front Yard / Night Watch / The Pool) with a
  chapter-select screen and per-chapter level grids — 14 levels total
  (day/night/pool) + endless mode, lawnmowers, wave banners, FINAL WAVE /
  BOSS alerts, +50 sun +10c wave-clear bonus, stars (2★ = flawless),
  difficulty modes (easy/normal/hard)
- **Coins 🪙 economy**: earned per kill / wave / level win / endless wave
- **Store**: 10 permanent upgrades (sun charm, damage polish, faster
  recharge, XP fertilizer, coin magnet, starter sun, early seed unlocks)
- **Greenhouse**: plant a coin crop (50c) that grows in real time (~3 min)
  and harvest it for +40c
- Seed packets are used up after one planting (click again to re-select)
- 15 achievements with toast banners; localStorage progression (chapters,
  unlocks, stars, coins, shop, greenhouse, stats, settings)
- v7: rebalanced numbers (economy, speeds, HP, waves, cooldowns), and every
  plant/zombie has a unique look (mohawk, rosy cheeks, crowns, clubs, horns,
  pitchforks, beaks, sweatbands…)
- v7 UI redesign: Store with large hoverable cards + coin plaque; Greenhouse
  as an animated scene (sky, hills, glass house with shine, 5 growth stages
  with sparkles, progress bar); Almanac with Plants/Zombies tabs, big cards
  and an achievements strip
- Presentation (v5 art pass): cartoon outlines + highlights on every
  plant/zombie, shaded wooden UI with hover states, Fredoka webfont with
  fallback, seed packets with icon badges and cost pills, sun counter plaque,
  top-right progress bar with flag + moving zombie marker, fog on the right
  where zombies emerge, dirt path + picket fence, detailed house (siding,
  shingles, chimney, door, windows), decorated lawn (stripes, grass tufts,
  flowers), animated water, panel-based menu/pause/game-over screens,
  animated menu with marching zombie, level intro banners, placement pop-in,
  hit flash, particles, floaters, screen shake, sun fly-to-counter, vignette,
  WebAudio SFX + tiny music loop (mutable), 1×/2× speed, ghost placement with
  terrain-aware validity, almanac, level select, help — touch supported

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
- `render.js` — drawing: entities, lawn, HUD, game scene
- `screens.js` — menu / level select / almanac / help / overlays

## License

MIT — see [LICENSE](LICENSE).

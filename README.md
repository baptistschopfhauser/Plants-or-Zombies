# Plants-or-Zombies — Garden Guardians

An original lane-based tower defense game for the browser (HTML5 canvas +
vanilla JS, no dependencies, no external assets). All code, runtime-drawn
art, synthesized sound, and names are original — this is not a copy of any
commercial game.

## Run

Open `index.html` in any modern browser, or serve the folder:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Alternatively, enable GitHub Pages (Settings → Pages, deploy from branch,
root folder) to get a shareable URL.

## Features

- 5×9 lawn, sun/moonlight economy (click to collect), 12 seed packets with
  cost + recharge cooldowns and hover tooltips
- Plants: Sunbloom, Seed Spitter, Double Spitter, Frost Fern (slow),
  Melon Lob (lobbed 3×3 splash), Acorn Wall, Thistle Pad (contact damage),
  Tuber Trap (contact mine), Blastcap (3×3 explosion), Blaze Reed (lane
  clear), Diverter Onion (changes the eater's lane), Gnasher (eats one whole)
- 9 zombie types with quirks: armor (Pylonhead/Tinhead/Screenback), Leaper
  (vaults a plant), Howler (enrages at half HP), Dasher/Rusher (fast),
  Goliath (3000 HP brute)
- 6 adventure levels (day/night), endless mode, per-lane lawnmowers,
  wave banners with a FINAL WAVE, stars for flawless wins
- Progression saved in localStorage: unlocked seed packets, level stars,
  endless best wave, sound/speed settings
- Juice: particles, floating text, screen shake, sun fly-to-counter,
  animated plants/zombies, synthesized sound effects (mutable), 1x/2x speed
- Almanac (encyclopedia), level select, help screen, pause, touch support

## Controls

| Input | Action |
| --- | --- |
| Click / tap | collect sun, place plant, buttons |
| 1-9, 0, -, = | select seed packet |
| S | toggle shovel (remove a plant) |
| Esc / Space | pause / resume |

## Files

- `index.html` — entry point
- `style.css` — page styling
- `data.js` — plant / zombie / level definitions
- `game.js` — engine: simulation, input, progression, loop
- `render.js` — all drawing and screens

## License

MIT — see [LICENSE](LICENSE).

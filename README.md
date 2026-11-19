# Plants-or-Zombies — Garden Guardians v3

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

- 5×9 lawn, sun/moonlight economy (click to collect), 16 seed packets with
  cost + recharge cooldowns and hover tooltips
- **Plant leveling:** shooter plants gain XP per kill (5/15 → Lv2/Lv3) for
  more damage and faster fire, shown as ★ above the plant
- Plants: Sunbloom, Sun Shroom (grows after 25s), Seed Spitter, Puff Spitter
  (short range), Double Spitter, Split Spitter (fires both ways), Frost Fern
  (slow), Melon Lob (3×3 splash), Acorn Wall, Thistle Pad, Tuber Trap (mine),
  Blastcap (3×3), Blaze Reed (lane clear), Blover (lane pushback gust),
  Diverter Onion (lane swap), Gnasher (eats one whole)
- 12 zombie types: Shambler, Pylonhead/Tinhead/Screenback (armor), Dasher,
  Leaper (vaults a plant), Howler (enrages at half HP), Rusher, Goliath,
  Balloon Flyer (flies over plants, then lands), Imp, and the summoning
  **Yard Boss** with a top HP bar (levels 1-5 / 2-4 and every 10th endless wave)
- 10 adventure levels (day/night) + endless mode, lawnmowers, wave banners,
  FINAL WAVE / BOSS alerts, +50 sun wave-clear bonus, stars (2★ = flawless)
- Difficulty modes (easy/normal/hard) changing enemy HP, speed and sunfall
- 8 achievements with toast banners; all progress saved in localStorage
  (unlocked packets, stars, endless best, stats, settings)
- Juice: particles, floaters, screen shake, sun fly-to-counter, animated
  entities, WebAudio SFX with mute, 1x/2x speed, ghost placement preview
- Screens: menu, level select (locks/stars), almanac, help, pause, win/lose;
  touch support

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
- `game.js` — engine: simulation, input, progression, achievements, main loop
- `render.js` — all drawing and screens

## License

MIT — see [LICENSE](LICENSE).

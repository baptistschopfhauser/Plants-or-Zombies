# Plants-or-Zombies — Garden Guardians

An original lane-based tower defense game for the browser, inspired by the
genre's classic mechanics (resource economy, seed-packet planting, waves of
enemies, per-lane emergency mowers). All code, art (drawn at runtime on a
canvas), sound (synthesized with WebAudio), and names are original — this is
not a copy of any commercial game.

## Run

Open `index.html` in any modern browser, or serve the folder:

```
python3 -m http.server 8000
# then visit http://localhost:8000
```

Alternatively, enable GitHub Pages (Settings → Pages, deploy from branch,
root folder) to get a shareable URL.

## How to play

- Sun falls from the sky; click it to collect. Sunblooms produce more sun.
- Click a seed packet (or press 1-5), then click a lawn tile to plant it.
- Packets cost sun and need time to recharge before reuse.
- Plants: Sunbloom (sun), Seed Spitter (damage), Acorn Wall (block),
  Frost Fern (slow), Blastcap (3x3 explosion).
- Zombies: Shambler, Conehead, Buckethead, Sprinter, Brute.
- If a zombie reaches the house, that lane's mower fires once. After that,
  the garden falls.
- Modes: 3 adventure levels plus an endless mode. Progress is stored in
  localStorage.

## Controls

| Input | Action |
| --- | --- |
| Click | collect sun / place plant / use buttons |
| 1-5 | select seed packet |
| S | toggle shovel (remove a plant) |
| Esc | pause / resume |

## Files

- `index.html` — entry point
- `style.css` — page styling
- `data.js` — plant / zombie / level definitions
- `game.js` — engine, rendering, input, UI

## License

MIT — see [LICENSE](LICENSE).

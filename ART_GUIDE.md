# Bloomguard art guide (painted sprites)

Bloomguard draws every character in code. To reach a hand-painted look, add image files and the
game uses them automatically. Anything without an image keeps its code-drawn version, so art can
be added one character at a time.

## Rules
- **Original designs only.** Use the in-game character as the brief (name, colours, role,
  silhouette). Do not trace, copy or closely imitate characters, art or UI from any other game,
  including the reference pictures used for inspiration. Commission work with full commercial rights.
- **Format:** transparent PNG, about **512 px tall** (any width), no drop shadow (the game adds one).
- **Anchor:** the character's feet or root must touch the **bottom edge, centred horizontally**.
- **Facing:** guardians face **right** (toward the Rotlings). Rotlings face **left**.
- **Style target:** soft painted shading, no heavy black outlines, big readable faces, chunky
  silhouettes that read at 100 px tall on a phone.

## How to add your own art (the easy way: Art Studio)
1. In the game open **Extras → 🎨 Art Studio** and pick a character (Guardians, Rotlings, Portraits or Lawns).
2. Press **⬇ Download template** to get a 512 px picture with the exact size and anchor. Paint your
   own original version over it (or use it as a size reference).
3. Drop your PNG onto the preview, or use **📁 Idle image(s)**. Pick several files for an animated
   idle loop (they play in name order) and optionally an **⚔ Attack image** (used while shooting or biting).
4. Adjust **Scale**, **Move X / Y**, **Anim fps** and **Flip** until it sits nicely on the tile
   (the red dot is the anchor: feet or root go there).
5. Press **📋 Copy JSON**, paste the line into the matching section of `www/sprites/sprites.json`,
   and copy the image files into `www/sprites/<group>/`. Reload: it is now used everywhere
   (battlefield, cards, Lexicon, Store, menus).

All templates at once: `node scripts/export-templates.mjs` writes them to `art-templates/`.

## sprites.json format
```json
{
  "guardians": {
    "thornling": "thornling.png",
    "frostbell": { "idle": ["frostbell_1.png", "frostbell_2.png"], "fps": 6,
                   "attack": "frostbell_attack.png", "hurt": "frostbell_hurt.png",
                   "scale": 1.1, "offsetX": 0, "offsetY": 0.02, "flip": false }
  },
  "rotlings": { "grub": "grub.png" },
  "portraits": { "wren": "wren.png", "moss": "moss.png" },
  "backgrounds": { "dawn": "dawn-lawn.png" },
  "ui": {}
}
```
- Lawn backgrounds (`backgrounds`, keyed by world id: dawn, marsh, orchard, frost, caverns,
  rotheart) are **1008 × 590 px** (9 × 5 tiles of 112 × 118 px).
- Anything not listed keeps the built-in code art, so you can replace characters one by one.

## Guardians (`www/sprites/guardians/`)
| File | Character |
|---|---|
| `glowcap.png` | Glowcap |
| `sporelamp.png` | Sporelamp |
| `thornling.png` | Thornling |
| `barkwall.png` | Barkwall |
| `puffball.png` | Puffball |
| `frostbell.png` | Frostbell |
| `vinewhip.png` | Vinewhip |
| `mossmender.png` | Mossmender |
| `rootsnare.png` | Rootsnare |
| `lanceleaf.png` | Lanceleaf |
| `stormseed.png` | Stormseed |
| `pollenpuff.png` | Pollenpuff |
| `hivebloom.png` | Hivebloom |
| `emberroot.png` | Emberroot |
| `bramblemat.png` | Bramblemat |
| `twinbud.png` | Twinbud |
| `boulderbud.png` | Boulderbud |
| `prismbud.png` | Prismbud |

## Rotlings and bosses (`www/sprites/rotlings/`)
| File | Character |
|---|---|
| `grub.png` | Grub |
| `swarm.png` | Swarmlings |
| `skitter.png` | Skitter |
| `shellback.png` | Shellback |
| `moth.png` | Blightmoth |
| `shieldbug.png` | Shieldbug |
| `burrower.png` | Burrower |
| `spitter.png` | Spitter |
| `spore.png` | Sporemother |
| `emberbeast.png` | Emberbeast |
| `frostcrawler.png` | Frostcrawler |
| `crystalback.png` | Crystalback |
| `rotpriest.png` | Rot Priest |
| `rotcrab.png` | Rot Crab |
| `brute.png` | Mossbrute |
| `grubmother.png` | Grubmother |
| `bogmaw.png` | Bogmaw |
| `cinderhusk.png` | Cinderhusk |
| `rimefang.png` | Rimefang |
| `gloomwyrm.png` | Gloomwyrm |
| `monarch.png` | The Rot Monarch |

Hats, skins, hit flashes, breathing and walking animation are applied to sprites by the game.

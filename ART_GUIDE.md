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

## How to add a sprite
1. Put the file in `www/sprites/guardians/` or `www/sprites/rotlings/`.
2. List it in `www/sprites/sprites.json`, for example:
   ```json
   { "guardians": { "thornling": "thornling.png" }, "rotlings": { "grub": "grub.png" }, "ui": {} }
   ```
3. Run `npm run serve` and check it in game and in the Lexicon.

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

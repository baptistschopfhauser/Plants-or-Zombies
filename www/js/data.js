// Bloomguard — game data. All names, characters, story and numbers are original to this project.

export const COLS = 9;
export const ROWS = 5;

// Guardians: living garden spirits the player plants on the grid.
// In-field upgrades multiply power by 1.45 and hp by 1.35 per star. Grove ranks add +10% each.
// `over` describes the guardian's unique Overbloom (triggered by feeding it a Wildseed).
export const GUARDIANS = {
  glowcap: {
    name: 'Glowcap', cost: 50, hp: 300, recharge: 7, kind: 'producer', amount: 25, interval: 11, firstDelay: 4,
    color: '#ffd76a', desc: 'Mushroom that pulses out Glow, your planting energy.', over: 'Bursts out 150 Glow at once.',
  },
  sporelamp: {
    name: 'Sporelamp', cost: 25, hp: 200, recharge: 7, kind: 'producer', amount: 15, interval: 10, firstDelay: 3, nightBonus: 2,
    color: '#9be7ff', desc: 'Cheap little lamp. Glows twice as bright at night.', over: 'Flares for 100 Glow.',
  },
  thornling: {
    name: 'Thornling', cost: 100, hp: 300, recharge: 7, kind: 'shooter', damage: 20, interval: 1.4, projectile: 'thorn',
    color: '#6fcf5a', desc: 'Spits sharp thorns down its lane.', over: 'Unleashes a storm of 30 thorns.',
  },
  barkwall: {
    name: 'Barkwall', cost: 50, hp: 4000, recharge: 25, kind: 'wall',
    color: '#a0703f', desc: 'Stubborn old stump. Soaks up bites.', over: 'Grows a mossy armor that doubles its health.',
  },
  puffball: {
    name: 'Puffball', cost: 25, hp: 300, recharge: 25, kind: 'trap', armTime: 9, cloudDps: 120, cloudTime: 4, cloudRadius: 1.2,
    color: '#c58df0', desc: 'Arms slowly, then bursts into a toxic spore cloud.', over: 'Arms instantly and doubles its cloud.',
  },
  frostbell: {
    name: 'Frostbell', cost: 175, hp: 300, recharge: 7, kind: 'shooter', damage: 20, interval: 1.5, projectile: 'frost', slow: 0.5, slowTime: 3,
    color: '#7fd8ff', desc: 'Rings out icy chimes that slow Rotlings.', over: 'Freezes every Rotling in its lane solid.',
  },
  vinewhip: {
    name: 'Vinewhip', cost: 125, hp: 500, recharge: 8, kind: 'melee', damage: 70, interval: 1.2, reach: 1.4,
    color: '#3fae6a', desc: 'Lashes anything that gets close, hitting several foes at once.', over: 'Whirls in a huge circle, crushing everything around it.',
  },
  mossmender: {
    name: 'Mossmender', cost: 125, hp: 400, recharge: 15, kind: 'healer', heal: 25, radius: 1.5,
    color: '#5fd3a3', desc: 'Heals every guardian around it and cleanses blight.', over: 'Fully heals every guardian on the field.',
  },
  rootsnare: {
    name: 'Rootsnare', cost: 75, hp: 300, recharge: 10, kind: 'snare', interval: 6, range: 4, hold: 3, damage: 15,
    color: '#8a6d3b', desc: 'Grabs the nearest Rotling ahead with roots and holds it still.', over: 'Snares every Rotling in its lane.',
  },
  lanceleaf: {
    name: 'Lanceleaf', cost: 150, hp: 300, recharge: 10, kind: 'shooter', damage: 30, interval: 2.2, projectile: 'lance', pierce: true,
    color: '#b5e655', desc: 'Hurls a leaf blade that pierces every foe in the lane.', over: 'Throws giant lances down three lanes.',
  },
  stormseed: {
    name: 'Stormseed', cost: 150, hp: 300, recharge: 35, kind: 'instant', damage: 450, rows: 1,
    color: '#ffe95c', desc: 'Calls lightning on its lane and both neighbours. Single use.', over: null,
  },
  pollenpuff: {
    name: 'Pollenpuff', cost: 100, hp: 300, recharge: 10, kind: 'shooter', damage: 10, interval: 2.4, projectile: 'pollen', confuse: 1.6,
    color: '#ffe27a', desc: 'Sneezes pollen that makes Rotlings dizzy and stumble backwards.', over: 'Sneezes on the whole field, confusing everyone.',
  },
  hivebloom: {
    name: 'Hivebloom', cost: 175, hp: 300, recharge: 9, kind: 'homing', damage: 25, interval: 1.8,
    color: '#ffb84a', desc: 'Sends out bees that hunt the closest Rotling in ANY lane.', over: 'Releases a swarm of 14 bees.',
  },
  emberroot: {
    name: 'Emberroot', cost: 200, hp: 300, recharge: 9, kind: 'lobber', damage: 40, interval: 2.6, splash: 0.9, burnDps: 12, burnTime: 3,
    color: '#ff8a4c', desc: 'Lobs burning seeds that splash and ignite. Arcs over shields.', over: 'Rains fire on eight Rotlings.',
  },
  bramblemat: {
    name: 'Bramblemat', cost: 100, hp: 600, recharge: 10, kind: 'ground', dps: 30,
    color: '#7a9a3a', desc: 'A carpet of thorny roots. Rotlings walk over it and get scratched.', over: 'Erupts in spikes, hitting all nearby Rotlings hard.',
  },
  twinbud: {
    name: 'Twinbud', cost: 225, hp: 300, recharge: 8, kind: 'shooter', damage: 20, interval: 1.4, projectile: 'thorn', spread: true,
    color: '#ff7eb6', desc: 'Fires into its lane and both neighbouring lanes.', over: 'Fires five rapid volleys.',
  },
  boulderbud: {
    name: 'Boulderbud', cost: 150, hp: 2500, recharge: 25, kind: 'wall', roll: 600,
    color: '#9a9488', desc: 'A rocky wall. When it breaks, it rolls down the lane crushing Rotlings.', over: 'Launches its boulder now, then regrows.',
  },
  prismbud: {
    name: 'Prismbud', cost: 125, hp: 300, recharge: 12, kind: 'buff', boost: 0.35,
    color: '#d6a8ff', desc: 'Crystal flower. Guardians next to it hit 35% harder.', over: 'Empowers every guardian on the field for 8 seconds.',
  },
};

// Rotlings: creatures of blight that crawl in from the right.
export const ROTLINGS = {
  grub:      { name: 'Grub', hp: 200, speed: 20, dps: 100, cost: 1, color: '#8a6a9c' },
  swarm:     { name: 'Swarmlings', hp: 60, speed: 46, dps: 40, cost: 1, color: '#b77fc7', small: true, group: 3 },
  skitter:   { name: 'Skitter', hp: 150, speed: 38, dps: 80, cost: 1.5, color: '#b0596a' },
  shellback: { name: 'Shellback', hp: 220, shell: 480, speed: 18, dps: 100, cost: 2.5, color: '#6c7a5a' },
  moth:      { name: 'Blightmoth', hp: 140, speed: 30, dps: 0, cost: 2, color: '#9d8fd1', flying: true },
  shieldbug: { name: 'Shieldbug', hp: 260, shield: 600, speed: 18, dps: 100, cost: 3, color: '#7d6a4a' },
  burrower:  { name: 'Burrower', hp: 260, speed: 30, dps: 80, cost: 2.5, color: '#7d5a3c', burrow: true },
  spitter:   { name: 'Spitter', hp: 300, speed: 20, dps: 80, cost: 3, color: '#7fa04a', ranged: { range: 4, interval: 3, damage: 60 } },
  spore:     { name: 'Sporemother', hp: 650, speed: 15, dps: 100, cost: 4, color: '#a46fb0', spawnOnDeath: 3 },
  emberbeast:{ name: 'Emberbeast', hp: 420, speed: 22, dps: 120, cost: 3.5, color: '#c4552e', fireproof: true, explode: 150 },
  frostcrawler:{ name: 'Frostcrawler', hp: 380, speed: 19, dps: 90, cost: 3, color: '#6f9fc8', freezes: true, frostproof: true },
  crystalback:{ name: 'Crystalback', hp: 700, speed: 15, dps: 110, cost: 4.5, color: '#7a8fd6', armor: 0.5 },
  rotpriest: { name: 'Rot Priest', hp: 420, speed: 16, dps: 60, cost: 4, color: '#6b4a7a', heals: 35 },
  brute:     { name: 'Mossbrute', hp: 1500, speed: 13, dps: 220, cost: 6, color: '#56634a', big: true, crushes: true },
  // Bosses (one per world)
  grubmother:{ name: 'Grubmother', hp: 3200, speed: 8, dps: 400, cost: 0, color: '#8a6a9c', boss: 'summon', summon: 'grub', every: 7, crushes: true },
  bogmaw:    { name: 'Bogmaw', hp: 5000, speed: 7, dps: 500, cost: 0, color: '#4f6a4a', boss: 'mud', summon: 'swarm', every: 8, crushes: true },
  cinderhusk:{ name: 'Cinderhusk', hp: 6500, speed: 7, dps: 500, cost: 0, color: '#8a3a20', boss: 'fire', every: 9, fireproof: true, crushes: true },
  rimefang:  { name: 'Rimefang', hp: 8000, speed: 7, dps: 550, cost: 0, color: '#5f87b0', boss: 'freeze', every: 11, frostproof: true, crushes: true },
  gloomwyrm: { name: 'Gloomwyrm', hp: 9500, speed: 8, dps: 600, cost: 0, color: '#4b4f8a', boss: 'dive', every: 10, crushes: true },
  monarch:   { name: 'The Rot Monarch', hp: 11500, speed: 6, dps: 700, cost: 0, color: '#5b3b6b', boss: 'monarch', summon: 'skitter', every: 8, crushes: true },
};

export const ENEMY_INFO = {
  grub: 'Slow and hungry. The most common Rotling.',
  swarm: 'Tiny, quick and always in a gang of three.',
  skitter: 'Fast little biter. Hit it early.',
  shellback: 'Its shell absorbs damage. Without it, it gets angry and faster.',
  moth: 'Flies over guardians and heads straight for your Lanterns.',
  shieldbug: 'Holds up a big leaf shield that blocks straight shots. Lob, pierce or snare it.',
  burrower: 'Tunnels under the first guardian it meets, then pops up dazed behind it.',
  spitter: 'Stops at range and spits goo at your guardians.',
  spore: 'Bursts into Grubs when defeated.',
  emberbeast: 'Fireproof. Explodes when defeated, scorching guardians next to it.',
  frostcrawler: 'Its frosty bite freezes guardians in place. Immune to slowing.',
  crystalback: 'Crystal armor halves damage from thorns, chimes, pollen and bees.',
  rotpriest: 'Heals the Rotlings around it. Take it out first!',
  brute: 'Huge, tough and hits like a falling tree. Crushes bramble.',
  grubmother: 'A colossal grub that keeps birthing more grubs.',
  bogmaw: 'Swamp horror. Calls swarms from the mud.',
  cinderhusk: 'Hurls fireballs that scorch the garden.',
  rimefang: 'Breathes frost that freezes whole columns of guardians.',
  gloomwyrm: 'Dives underground and resurfaces in another lane.',
  monarch: 'Ruler of the blight. Holder of the stolen Hearthseed.',
};

// Worlds. `mech` drives the special rule of each world (see game.js).
export const WORLDS = [
  { id: 'dawn', name: 'Dawn Greenhouse', mech: 'day', sky: ['#8fd0ff', '#e9f7ff'], ground: ['#7cc65b', '#6db54f'], accent: '#ffd23a',
    blurb: 'Grandma Ada\'s old greenhouse, where it all begins.', rule: 'Glow falls from the sky.' },
  { id: 'marsh', name: 'Moonlit Marsh', mech: 'night', sky: ['#141a40', '#36407a'], ground: ['#3f6f5a', '#386450'], accent: '#9be7ff',
    blurb: 'A misty bog where fireflies dance over the water.', rule: 'No sky Glow at night. Catch fireflies for Glow!' },
  { id: 'orchard', name: 'Ember Orchard', mech: 'ember', sky: ['#ff9f5a', '#ffe0b0'], ground: ['#b8a046', '#a99340'], accent: '#ff8a4c',
    blurb: 'Burning orchards under a smoky sunset.', rule: 'Embers rain down and scorch tiles. Wind gusts push Rotlings back.' },
  { id: 'frost', name: 'Frostpeak Terraces', mech: 'frost', sky: ['#a9c8e8', '#eef6ff'], ground: ['#d7e8f2', '#c6dbe8'], accent: '#7fd8ff',
    blurb: 'Icy mountain gardens high above the clouds.', rule: 'Some tiles are frozen (tap to break the ice). Blizzards slow your guardians.' },
  { id: 'caverns', name: 'Crystal Caverns', mech: 'crystal', sky: ['#120c26', '#2b1f52'], ground: ['#4a3f6b', '#423862'], accent: '#d6a8ff',
    blurb: 'Glittering tunnels deep below the world.', rule: 'No sky Glow. Tap crystals to mine Glow. More crystals keep growing.' },
  { id: 'rotheart', name: 'The Rotheart', mech: 'blight', sky: ['#2a0f2a', '#5a2a4a'], ground: ['#5d5a3e', '#555236'], accent: '#ff6ad5',
    blurb: 'The Monarch\'s lair, where the Hearthseed is kept.', rule: 'Blight spreads over tiles and hurts guardians. Mossmenders cleanse it.' },
];

// Level goals:
//   defend  - keep the lanterns lit
//   sprouts - also protect the seedlings in the first column
//   budget  - no Glow income; win with what you start with
//   given   - a fixed set of guardians
// Star challenges: { maxPlants }, { noLoss }, { spend }
const L = (world, o) => ({ world, goal: 'defend', waves: 6, budget: 6, ...o });
export const LEVELS = [
  // 1 — Dawn Greenhouse
  L(0, { waves: 4, pool: ['grub'], reward: 'barkwall', budget: 3, startGlow: 150, rows: [1, 2, 3], challenge: { maxPlants: 8 } }),
  L(0, { waves: 5, pool: ['grub', 'skitter'], reward: 'puffball', budget: 4, challenge: { noLoss: true } }),
  L(0, { waves: 6, pool: ['grub', 'skitter', 'shellback'], reward: 'frostbell', budget: 5, challenge: { maxPlants: 14 } }),
  L(0, { goal: 'sprouts', waves: 6, pool: ['grub', 'swarm', 'shellback'], reward: null, budget: 5, challenge: { noLoss: true } }),
  L(0, { waves: 6, pool: ['grub', 'skitter', 'shellback', 'moth'], reward: 'vinewhip', budget: 7, challenge: { spend: 2200 } }),
  L(0, { boss: 'grubmother', waves: 6, pool: ['grub', 'skitter', 'swarm', 'shellback'], reward: 'mossmender', budget: 7, challenge: { noLoss: true } }),
  // 2 — Moonlit Marsh
  L(1, { waves: 6, pool: ['grub', 'swarm', 'moth'], reward: 'sporelamp', budget: 6, startGlow: 200, challenge: { maxPlants: 16 } }),
  L(1, { waves: 6, pool: ['grub', 'burrower', 'skitter'], reward: 'rootsnare', budget: 7, challenge: { noLoss: true } }),
  L(1, { waves: 7, pool: ['grub', 'shieldbug', 'swarm'], reward: 'lanceleaf', budget: 8, challenge: { spend: 2600 } }),
  L(1, { goal: 'budget', waves: 5, pool: ['grub', 'skitter', 'burrower'], reward: 'stormseed', budget: 6, startGlow: 1600, challenge: { maxPlants: 14 } }),
  L(1, { waves: 7, pool: ['grub', 'spore', 'moth', 'shieldbug'], reward: 'pollenpuff', budget: 9, challenge: { noLoss: true } }),
  L(1, { boss: 'bogmaw', waves: 7, pool: ['grub', 'swarm', 'burrower', 'shieldbug', 'spore'], reward: 'hivebloom', budget: 9, challenge: { spend: 3500 } }),
  // 3 — Ember Orchard
  L(2, { waves: 7, pool: ['grub', 'skitter', 'emberbeast'], reward: 'emberroot', budget: 8, challenge: { maxPlants: 18 } }),
  L(2, { waves: 7, pool: ['grub', 'shieldbug', 'spitter'], reward: 'bramblemat', budget: 9, challenge: { noLoss: true } }),
  L(2, { goal: 'sprouts', waves: 7, pool: ['swarm', 'skitter', 'emberbeast', 'moth'], reward: null, budget: 9, challenge: { spend: 3000 } }),
  L(2, { waves: 8, pool: ['grub', 'shellback', 'spitter', 'emberbeast'], reward: 'twinbud', budget: 10, challenge: { noLoss: true } }),
  L(2, { goal: 'given', given: ['glowcap', 'thornling', 'emberroot', 'barkwall', 'puffball', 'vinewhip'], waves: 7, pool: ['grub', 'shieldbug', 'emberbeast', 'spore'], reward: null, budget: 10, challenge: { maxPlants: 20 } }),
  L(2, { boss: 'cinderhusk', waves: 8, pool: ['grub', 'skitter', 'emberbeast', 'spitter', 'brute'], reward: 'boulderbud', budget: 11, challenge: { noLoss: true } }),
  // 4 — Frostpeak Terraces
  L(3, { waves: 7, pool: ['grub', 'frostcrawler', 'skitter'], reward: null, budget: 9, challenge: { maxPlants: 18 } }),
  L(3, { waves: 8, pool: ['grub', 'frostcrawler', 'moth', 'shellback'], reward: null, budget: 10, challenge: { noLoss: true } }),
  L(3, { goal: 'budget', waves: 6, pool: ['swarm', 'shieldbug', 'frostcrawler'], reward: null, budget: 8, startGlow: 2000, challenge: { spend: 1600 } }),
  L(3, { waves: 8, pool: ['grub', 'rotpriest', 'frostcrawler', 'burrower'], reward: 'prismbud', budget: 11, challenge: { maxPlants: 22 } }),
  L(3, { goal: 'sprouts', waves: 8, pool: ['skitter', 'spitter', 'frostcrawler', 'brute'], reward: null, budget: 12, challenge: { noLoss: true } }),
  L(3, { boss: 'rimefang', waves: 8, pool: ['grub', 'frostcrawler', 'rotpriest', 'shieldbug', 'brute'], reward: null, budget: 12, challenge: { spend: 4500 } }),
  // 5 — Crystal Caverns
  L(4, { waves: 8, pool: ['grub', 'crystalback', 'swarm'], reward: null, budget: 10, startGlow: 200, challenge: { maxPlants: 20 } }),
  L(4, { waves: 8, pool: ['skitter', 'crystalback', 'moth', 'burrower'], reward: null, budget: 11, challenge: { noLoss: true } }),
  L(4, { goal: 'given', given: ['sporelamp', 'emberroot', 'lanceleaf', 'rootsnare', 'boulderbud', 'mossmender', 'prismbud'], waves: 8, pool: ['grub', 'crystalback', 'shieldbug', 'rotpriest'], reward: null, budget: 11, challenge: { maxPlants: 24 } }),
  L(4, { waves: 9, pool: ['crystalback', 'spitter', 'spore', 'rotpriest'], reward: null, budget: 11, challenge: { spend: 4000 } }),
  L(4, { goal: 'sprouts', waves: 9, pool: ['swarm', 'crystalback', 'burrower', 'brute'], reward: null, budget: 13, challenge: { noLoss: true } }),
  L(4, { boss: 'gloomwyrm', waves: 9, pool: ['grub', 'crystalback', 'moth', 'rotpriest', 'brute'], reward: null, budget: 13, challenge: { maxPlants: 26 } }),
  // 6 — The Rotheart
  L(5, { waves: 9, pool: ['grub', 'skitter', 'shieldbug', 'spore', 'spitter'], reward: null, budget: 12, challenge: { noLoss: true } }),
  L(5, { waves: 9, pool: ['emberbeast', 'frostcrawler', 'crystalback', 'moth'], reward: null, budget: 13, challenge: { spend: 4500 } }),
  L(5, { goal: 'budget', waves: 7, pool: ['swarm', 'skitter', 'shieldbug', 'burrower', 'rotpriest'], reward: null, budget: 10, startGlow: 2400, challenge: { maxPlants: 22 } }),
  L(5, { waves: 10, pool: ['grub', 'shellback', 'spitter', 'rotpriest', 'brute'], reward: null, budget: 15, challenge: { noLoss: true } }),
  L(5, { goal: 'sprouts', waves: 10, pool: ['swarm', 'moth', 'emberbeast', 'frostcrawler', 'crystalback', 'brute'], reward: null, budget: 15, challenge: { spend: 5500 } }),
  L(5, { boss: 'monarch', waves: 10, pool: ['grub', 'skitter', 'shieldbug', 'spitter', 'spore', 'crystalback', 'rotpriest', 'brute'], reward: null, budget: 16, challenge: { noLoss: true } }),
];

export const LEVELS_PER_WORLD = 6;
export const STARTING_GUARDIANS = ['glowcap', 'thornling'];
export const LANTERNS = 3;
export const UPGRADE_MAX = 3;
export const MAX_RANK = 5;
export const RANK_COST = [40, 80, 150, 250, 400];

// Loadout slots grow as you progress.
export function loadoutSlots(unlockedLevel) {
  if (unlockedLevel >= 24) return 8;
  if (unlockedLevel >= 12) return 7;
  return 6;
}

export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Sprout', desc: 'Win your first level.' },
  { id: 'perfect', name: 'Perfect Bloom', desc: 'Earn 3 stars on a level.' },
  { id: 'starry', name: 'Starry Garden', desc: 'Collect 60 stars.' },
  { id: 'boss1', name: 'Grub Buster', desc: 'Defeat the Grubmother.' },
  { id: 'boss2', name: 'Bog Breaker', desc: 'Defeat Bogmaw.' },
  { id: 'boss3', name: 'Fire Fighter', desc: 'Defeat Cinderhusk.' },
  { id: 'boss4', name: 'Thaw', desc: 'Defeat Rimefang.' },
  { id: 'boss5', name: 'Deep Delver', desc: 'Defeat the Gloomwyrm.' },
  { id: 'boss6', name: 'Hearthkeeper', desc: 'Defeat the Rot Monarch and recover the Hearthseed.' },
  { id: 'over', name: 'Wild at Heart', desc: 'Trigger 25 Overblooms.' },
  { id: 'star3', name: 'Shining Star', desc: 'Upgrade a guardian to three stars in battle.' },
  { id: 'rank', name: 'Master Gardener', desc: 'Raise a guardian to max Grove rank.' },
  { id: 'kills', name: 'Blight Be Gone', desc: 'Defeat 2,000 Rotlings.' },
  { id: 'planted', name: 'Green Thumb', desc: 'Plant 500 guardians.' },
  { id: 'endless', name: 'Evergreen', desc: 'Survive 20 waves in Endless Bloom.' },
  { id: 'collector', name: 'Full Bloom', desc: 'Unlock every guardian.' },
];

// ---------- bosses: cinematic title cards ----------
export const BOSS_TITLES = {
  grubmother: 'Nursemaid of the Blight',
  bogmaw: 'Terror of the Moonlit Marsh',
  cinderhusk: 'Scorcher of the Orchards',
  rimefang: 'The Frost That Never Melts',
  gloomwyrm: 'Serpent of the Deep Caverns',
  monarch: 'Thief of the Hearthseed',
};

// ---------- Store: Acorns buy cosmetics and permanent boosts ----------
export const HATS = {
  straw:      { name: 'Sun Hat', price: 80 },
  beanie:     { name: 'Cozy Beanie', price: 100 },
  flowerclip: { name: 'Flower Clip', price: 90 },
  party:      { name: 'Party Cone', price: 120 },
  crown:      { name: 'Leaf Crown', price: 220 },
  tophat:     { name: 'Fancy Top Hat', price: 180 },
  wizard:     { name: 'Starry Wizard Hat', price: 260 },
  headphones: { name: 'Headphones', price: 150 },
  chef:       { name: 'Chef\'s Toque', price: 140 },
  acornhelm:  { name: 'Acorn Helmet', price: 300 },
};
export const SKINS = {
  golden:   { name: 'Golden', price: 400, filter: 'sepia(0.7) saturate(2.4) hue-rotate(-12deg) brightness(1.12)' },
  frost:    { name: 'Frosted', price: 220, filter: 'hue-rotate(165deg) saturate(0.75) brightness(1.15)' },
  midnight: { name: 'Midnight', price: 250, filter: 'hue-rotate(215deg) saturate(1.3) brightness(0.82)' },
  sakura:   { name: 'Sakura', price: 220, filter: 'hue-rotate(290deg) saturate(1.25) brightness(1.08)' },
  ember:    { name: 'Ember', price: 250, filter: 'hue-rotate(-38deg) saturate(1.7)' },
};
export const BOOSTS = {
  headstart:  { name: 'Head Start', desc: 'Start every level with +50 Glow.', price: 250, max: 2 },
  pouch:      { name: 'Seed Pouch', desc: 'Carry one extra Wildseed (max 4, then 5).', price: 400, max: 2 },
  lanternoil: { name: 'Lantern Oil', desc: 'Start every level with a Wildseed ready.', price: 350, max: 1 },
  nurserypot: { name: 'Nursery Pots', desc: 'Two more pots in the Zen Nursery.', price: 200, max: 2 },
  luckyclover:{ name: 'Lucky Clover', desc: '+25% Acorns from everything.', price: 500, max: 1 },
};

// ---------- Daily challenge ----------
export const MODIFIERS = {
  swift:    { name: 'Swift Rotlings', desc: 'Rotlings move 30% faster.' },
  tough:    { name: 'Tough Hides', desc: 'Rotlings have 40% more health.' },
  bounty:   { name: 'Wild Bounty', desc: 'Wildseeds charge twice as fast.' },
  glowrain: { name: 'Glow Shower', desc: 'Glow falls twice as often.' },
  fragile:  { name: 'Fragile Garden', desc: 'Guardians have 30% less health.' },
  frenzy:   { name: 'Frenzy', desc: 'Two extra waves.' },
  thrifty:  { name: 'Thrifty', desc: 'Guardians cost 20% less.' },
  swarming: { name: 'Swarming', desc: 'Every wave brings an extra gang of Swarmlings.' },
};

function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dailyLevel(key = todayKey(), unlockedLevel = 36) {
  const rnd = seeded(hashStr('bloomguard-' + key));
  const maxWorld = Math.max(0, Math.min(WORLDS.length - 1, Math.floor(unlockedLevel / LEVELS_PER_WORLD)));
  const world = Math.floor(rnd() * (maxWorld + 1));
  const foes = ['grub', 'swarm', 'skitter', 'shellback', 'moth', 'shieldbug', 'burrower', 'spitter', 'spore', 'emberbeast', 'frostcrawler', 'crystalback', 'rotpriest', 'brute'];
  const avail = foes.slice(0, 5 + world * 2);
  const pool = [];
  while (pool.length < 4) { const k = avail[Math.floor(rnd() * avail.length)]; if (!pool.includes(k)) pool.push(k); }
  const goals = ['defend', 'defend', 'sprouts', 'budget'];
  const goal = goals[Math.floor(rnd() * goals.length)];
  const modKeys = Object.keys(MODIFIERS);
  const mods = [];
  while (mods.length < 2) { const m = modKeys[Math.floor(rnd() * modKeys.length)]; if (!mods.includes(m) && !(goal === 'budget' && m === 'glowrain')) mods.push(m); }
  return {
    world, goal, pool, mods, waves: 7 + world, budget: 6 + world * 1.4, daily: key,
    startGlow: goal === 'budget' ? 1600 + world * 200 : undefined,
    challenge: [{ noLoss: true }, { maxPlants: 18 + world * 2 }, { spend: 2500 + world * 500 }][Math.floor(rnd() * 3)],
  };
}

// ---------- Mini-games ----------
export const POTLUCK = [
  { name: 'Pot Luck I', world: 0, pots: 18, rotChance: 0.42, pool: ['grub', 'skitter', 'shellback'], guardians: ['thornling', 'frostbell', 'barkwall', 'vinewhip', 'puffball'], reward: 60 },
  { name: 'Pot Luck II', world: 2, pots: 22, rotChance: 0.48, pool: ['grub', 'skitter', 'shieldbug', 'emberbeast', 'spore'], guardians: ['thornling', 'twinbud', 'emberroot', 'barkwall', 'rootsnare', 'hivebloom'], reward: 90 },
  { name: 'Pot Luck III', world: 4, pots: 25, rotChance: 0.45, pool: ['grub', 'shieldbug', 'crystalback', 'rotpriest', 'brute', 'burrower'], guardians: ['lanceleaf', 'emberroot', 'hivebloom', 'boulderbud', 'stormseed', 'mossmender', 'twinbud'], reward: 130 },
];

// Bloomguard — game data. All names, characters and numbers are original to this project.

export const COLS = 9;
export const ROWS = 5;

// Guardians: living garden spirits the player plants on the grid.
// Stats are per level 1; every upgrade level multiplies power by 1.45 and hp by 1.35.
export const GUARDIANS = {
  glowcap: {
    name: 'Glowcap', cost: 50, hp: 300, recharge: 7,
    kind: 'producer', amount: 25, interval: 11, firstDelay: 4,
    color: '#ffd76a', desc: 'Mushroom that pulses out Glow, your planting energy.',
  },
  thornling: {
    name: 'Thornling', cost: 100, hp: 300, recharge: 7,
    kind: 'shooter', damage: 20, interval: 1.4, projectile: 'thorn',
    color: '#6fcf5a', desc: 'Spits sharp thorns down its lane.',
  },
  barkwall: {
    name: 'Barkwall', cost: 50, hp: 4000, recharge: 25,
    kind: 'wall', color: '#a0703f', desc: 'Stubborn old stump. Soaks up bites.',
  },
  puffball: {
    name: 'Puffball', cost: 25, hp: 300, recharge: 25,
    kind: 'trap', armTime: 9, cloudDps: 120, cloudTime: 4, cloudRadius: 1.2,
    color: '#c58df0', desc: 'Arms slowly, then bursts into a toxic spore cloud.',
  },
  frostbell: {
    name: 'Frostbell', cost: 175, hp: 300, recharge: 7,
    kind: 'shooter', damage: 20, interval: 1.5, projectile: 'frost', slow: 0.5, slowTime: 3,
    color: '#7fd8ff', desc: 'Rings out icy chimes that slow Rotlings.',
  },
  mossmender: {
    name: 'Mossmender', cost: 125, hp: 400, recharge: 15,
    kind: 'healer', heal: 25, radius: 1.5,
    color: '#5fd3a3', desc: 'Heals every guardian around it.',
  },
  lanceleaf: {
    name: 'Lanceleaf', cost: 150, hp: 300, recharge: 10,
    kind: 'shooter', damage: 30, interval: 2.2, projectile: 'lance', pierce: true,
    color: '#b5e655', desc: 'Hurls a leaf blade that pierces every foe in the lane.',
  },
  stormseed: {
    name: 'Stormseed', cost: 150, hp: 300, recharge: 35,
    kind: 'instant', damage: 450, rows: 1,
    color: '#ffe95c', desc: 'Calls lightning on its lane and both neighbours. Single use.',
  },
  emberroot: {
    name: 'Emberroot', cost: 200, hp: 300, recharge: 9,
    kind: 'lobber', damage: 40, interval: 2.6, splash: 0.9, burnDps: 12, burnTime: 3,
    color: '#ff8a4c', desc: 'Lobs burning seeds that splash and ignite.',
  },
  twinbud: {
    name: 'Twinbud', cost: 225, hp: 300, recharge: 8,
    kind: 'shooter', damage: 20, interval: 1.4, projectile: 'thorn', spread: true,
    color: '#ff7eb6', desc: 'Fires into its lane and both neighbouring lanes.',
  },
};

// Rotlings: creatures of blight that crawl in from the right.
export const ROTLINGS = {
  grub:     { name: 'Grub',      hp: 200, speed: 20, dps: 100, cost: 1,   color: '#8a6a9c' },
  skitter:  { name: 'Skitter',   hp: 150, speed: 38, dps: 80,  cost: 1.5, color: '#b0596a' },
  shellback:{ name: 'Shellback', hp: 220, shell: 480, speed: 18, dps: 100, cost: 2.5, color: '#6c7a5a' },
  moth:     { name: 'Blightmoth',hp: 140, speed: 30, dps: 0,  cost: 2,   color: '#9d8fd1', flying: true },
  burrower: { name: 'Burrower',  hp: 260, speed: 30, dps: 80, cost: 2.5, color: '#7d5a3c', burrow: true },
  spore:    { name: 'Sporemother', hp: 650, speed: 15, dps: 100, cost: 4, color: '#a46fb0', spawnOnDeath: 3 },
  brute:    { name: 'Mossbrute', hp: 1500, speed: 13, dps: 220, cost: 6,   color: '#56634a', big: true },
  king:     { name: 'The Rot Monarch', hp: 7000, speed: 7, dps: 600, cost: 0, color: '#5b3b6b', boss: true },
};

export const ENEMY_INFO = {
  grub: 'Slow and hungry. The most common Rotling.',
  skitter: 'Fast little biter. Hit it early.',
  shellback: 'Its shell absorbs damage. Without it, it gets angry and faster.',
  moth: 'Flies over guardians and heads straight for your Lanterns.',
  burrower: 'Tunnels under the first guardian it meets, then pops up dazed behind it.',
  spore: 'Bursts into Grubs when defeated.',
  brute: 'Huge, tough and hits like a falling tree.',
  king: 'Ruler of the blight. Summons Skitters.',
};

// Worlds and levels.
export const WORLDS = [
  { name: 'Dawn Greenhouse', sky: ['#9fd8ff', '#e9f7ff'], ground: ['#79c25a', '#6ab24d'], weather: 'day' },
  { name: 'Moonlit Marsh',  sky: ['#1b2048', '#3a3f7a'], ground: ['#3f6f5a', '#386450'], weather: 'night' },
  { name: 'Ember Orchard',  sky: ['#ffb36b', '#ffe0b0'], ground: ['#b8a046', '#a99340'], weather: 'wind' },
];

export const LEVELS = [
  // World 1
  { world: 0, waves: 4, pool: ['grub'], reward: 'barkwall', budget: 3, startGlow: 150, rows: [1, 2, 3] },
  { world: 0, waves: 5, pool: ['grub', 'skitter'], reward: 'puffball', budget: 4 },
  { world: 0, waves: 6, pool: ['grub', 'skitter', 'shellback'], reward: 'frostbell', budget: 5 },
  { world: 0, waves: 6, pool: ['grub', 'shellback', 'moth'], reward: 'mossmender', budget: 6 },
  { world: 0, waves: 6, pool: ['grub', 'skitter', 'shellback', 'moth'], reward: 'lanceleaf', budget: 7, boss: true },
  // World 2
  { world: 1, waves: 6, pool: ['grub', 'burrower'], reward: 'stormseed', budget: 7 },
  { world: 1, waves: 7, pool: ['grub', 'skitter', 'burrower', 'spore'], reward: null, budget: 8 },
  { world: 1, waves: 7, pool: ['shellback', 'moth', 'spore'], reward: 'emberroot', budget: 9 },
  { world: 1, waves: 8, pool: ['grub', 'skitter', 'shellback', 'burrower', 'brute'], reward: null, budget: 10 },
  { world: 1, waves: 8, pool: ['grub', 'shellback', 'moth', 'spore', 'brute'], reward: 'twinbud', budget: 11, boss: true },
  // World 3
  { world: 2, waves: 7, pool: ['grub', 'skitter', 'moth', 'burrower'], reward: null, budget: 10 },
  { world: 2, waves: 8, pool: ['shellback', 'spore', 'brute'], reward: null, budget: 13 },
  { world: 2, waves: 9, pool: ['skitter', 'moth', 'burrower', 'brute'], reward: null, budget: 14 },
  { world: 2, waves: 9, pool: ['grub', 'shellback', 'moth', 'spore', 'brute', 'burrower'], reward: null, budget: 16 },
  { world: 2, waves: 10, pool: ['grub', 'skitter', 'shellback', 'moth', 'burrower', 'spore', 'brute'], reward: null, budget: 18, boss: true },
];

export const STARTING_GUARDIANS = ['glowcap', 'thornling'];
export const MAX_LOADOUT = 6;
export const LANTERNS = 3;
export const UPGRADE_MAX = 3;

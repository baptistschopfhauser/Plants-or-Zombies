'use strict';

const PLANT_TYPES = {
  sunbloom: {
    key: 'sunbloom', name: 'Sunbloom', cost: 50, cd: 7, hp: 300,
    desc: 'Produces 25 sun every 13s',
    sunEvery: 13, sunAmount: 25,
    body: '#ffd23f', dark: '#e0a91e', leaf: '#3fae4a'
  },
  sunshroom: {
    key: 'sunshroom', name: 'Sun Shroom', cost: 50, cd: 7, hp: 300,
    desc: 'Grows after 25s: small sun at first, then full sun',
    sunEvery: 20, sunAmount: 15, growTime: 25, bigEvery: 13, bigAmount: 25,
    body: '#ffd23f', dark: '#e0a91e', leaf: '#3fae4a'
  },
  spitter: {
    key: 'spitter', name: 'Seed Spitter', cost: 100, cd: 7, hp: 300,
    desc: 'Fires seeds down its lane. Levels up with kills.',
    dmg: 20, rate: 1.35, burst: 1, canLevel: true,
    body: '#57c84d', dark: '#2f8f2a', leaf: '#3fae4a'
  },
  puff: {
    key: 'puff', name: 'Puff Spitter', cost: 75, cd: 7, hp: 300,
    desc: 'Cheap short-range spitter (3 tiles). Levels up with kills.',
    dmg: 20, rate: 1.3, burst: 1, canLevel: true, range: 3,
    body: '#9adf6a', dark: '#4a9a3a', leaf: '#3fae4a'
  },
  doublespitter: {
    key: 'doublespitter', name: 'Double Spitter', cost: 175, cd: 10, hp: 300,
    desc: 'Fires two seeds per volley. Levels up with kills.',
    dmg: 20, rate: 1.45, burst: 2, canLevel: true,
    body: '#6fd35f', dark: '#2f8f2a', leaf: '#3fae4a'
  },
  splitspitter: {
    key: 'splitspitter', name: 'Split Spitter', cost: 175, cd: 10, hp: 300,
    desc: 'Fires seeds forward AND backward. Levels up with kills.',
    dmg: 20, rate: 1.35, burst: 1, canLevel: true, split: true,
    body: '#4db8a8', dark: '#2a7a6c', leaf: '#3fae4a'
  },
  fern: {
    key: 'fern', name: 'Frost Fern', cost: 175, cd: 15, hp: 300,
    desc: 'Chilling seeds slow zombies by 50%. Levels up with kills.',
    dmg: 20, rate: 1.35, burst: 1, slow: 5, canLevel: true,
    body: '#7fd4ff', dark: '#3aa3d8', leaf: '#bfeaff'
  },
  melonlob: {
    key: 'melonlob', name: 'Melon Lob', cost: 275, cd: 20, hp: 300,
    desc: 'Lobs melons: 100 dmg + 50 splash in 3x3. Levels up with kills.',
    dmg: 100, splash: 50, rate: 2.8, arc: true, canLevel: true,
    body: '#4da83e', dark: '#2e6b26', leaf: '#3fae4a'
  },
  reed: {
    key: 'reed', name: 'Reed Shooter', cost: 125, cd: 10, hp: 300,
    desc: 'Aquatic shooter — plants directly on water. Levels up with kills.',
    dmg: 20, rate: 1.25, burst: 1, canLevel: true, water: true,
    body: '#3fae6a', dark: '#25704a', leaf: '#7fd4a8'
  },
  lotus: {
    key: 'lotus', name: 'Lotus Pad', cost: 25, cd: 10, hp: 300,
    desc: 'Floats on water — plant anything on top of it',
    water: true, pad: true,
    body: '#5fc46a', dark: '#3a8a44', leaf: '#3fae4a'
  },
  acorn: {
    key: 'acorn', name: 'Acorn Wall', cost: 50, cd: 15, hp: 4000,
    desc: 'A tough wall that blocks zombies',
    body: '#a9713d', dark: '#6e4520', leaf: '#3fae4a'
  },
  thistle: {
    key: 'thistle', name: 'Thistle Pad', cost: 125, cd: 15, hp: 300,
    desc: 'Damages any zombie standing on it (50/s)',
    dps: 50,
    body: '#8a5fc0', dark: '#5b3a8a', leaf: '#6a8a3a'
  },
  tubertrap: {
    key: 'tubertrap', name: 'Tuber Trap', cost: 25, cd: 20, hp: 300,
    desc: 'Buried mine: arms after 14s, explodes on contact',
    armDelay: 14, dmg: 1800, radius: 0,
    body: '#b08a5a', dark: '#7a5a34', leaf: '#3fae4a'
  },
  blastcap: {
    key: 'blastcap', name: 'Blastcap', cost: 150, cd: 20, hp: 300,
    desc: 'Explodes a 3x3 area after a short fuse',
    armDelay: 1.2, dmg: 1800, radius: 1,
    body: '#e0483e', dark: '#8f1f18', leaf: '#3fae4a'
  },
  blazereed: {
    key: 'blazereed', name: 'Blaze Reed', cost: 175, cd: 25, hp: 300,
    desc: 'Clears its entire lane with fire',
    armDelay: 1.5, dmg: 1800, lane: true,
    body: '#e8862e', dark: '#a33b1a', leaf: '#3fae4a'
  },
  blover: {
    key: 'blover', name: 'Blover', cost: 100, cd: 15, hp: 300,
    desc: 'Every 12s gusts its lane, pushing zombies back',
    blowEvery: 12, blowDist: 240, blowSlow: 2,
    body: '#bfe8ff', dark: '#6ab0d8', leaf: '#3fae4a'
  },
  onion: {
    key: 'onion', name: 'Diverter Onion', cost: 100, cd: 20, hp: 300,
    desc: 'When eaten, sends the zombie to another lane',
    diverte: true,
    body: '#d8b8e8', dark: '#9a6ab8', leaf: '#3fae4a'
  },
  gnasher: {
    key: 'gnasher', name: 'Gnasher', cost: 150, cd: 15, hp: 300,
    desc: 'Swallows one zombie whole, then chews for 18s',
    chew: 18,
    body: '#c94f6d', dark: '#8a2a44', leaf: '#3fae4a'
  }
};

const SEED_ORDER = [
  'sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'splitspitter',
  'fern', 'melonlob', 'reed', 'lotus', 'acorn', 'thistle', 'tubertrap',
  'blastcap', 'blazereed', 'blover', 'onion', 'gnasher'
];

const ZOMBIE_TYPES = {
  shambler: {
    key: 'shambler', name: 'Shambler', hp: 200, armor: 0, speed: 12, dmg: 90,
    desc: 'A basic shambling zombie with messy hair.',
    skin: '#b7c39a', shirt: '#5b6470'
  },
  pylonhead: {
    key: 'pylonhead', name: 'Pylonhead', hp: 200, armor: 370, speed: 12, dmg: 90,
    desc: 'Wears a traffic cone: 370 armor before body damage.',
    skin: '#b7c39a', shirt: '#6b4a8a', cone: true
  },
  tinhead: {
    key: 'tinhead', name: 'Tinhead', hp: 200, armor: 1100, speed: 12, dmg: 90,
    desc: 'A metal bucket gives 1100 armor.',
    skin: '#b7c39a', shirt: '#7a4a2a', bucket: true
  },
  dasher: {
    key: 'dasher', name: 'Dasher', hp: 200, armor: 0, speed: 30, dmg: 90, sweatband: true,
    desc: 'Fast but fragile. Wears a sweatband.',
    skin: '#c4d1a4', shirt: '#a33b3b'
  },
  leaper: {
    key: 'leaper', name: 'Leaper', hp: 500, armor: 0, speed: 20, dmg: 90, leap: true, headband: true,
    desc: 'Vaults over the first plant it meets.',
    skin: '#b7c39a', shirt: '#2a6a8a'
  },
  howler: {
    key: 'howler', name: 'Howler', hp: 270, armor: 0, speed: 13, dmg: 90, enrage: 1.8, howl: true,
    desc: 'Gets 1.8x faster when below half health.',
    skin: '#c4d1a4', shirt: '#8a6a3a'
  },
  screenback: {
    key: 'screenback', name: 'Screenback', hp: 200, armor: 440, speed: 12, dmg: 90, shield: true,
    desc: 'A screen door absorbs 440 damage first.',
    skin: '#b7c39a', shirt: '#4a6a5a'
  },
  rusher: {
    key: 'rusher', name: 'Rusher', hp: 1600, armor: 0, speed: 24, dmg: 130, helmet: true, pads: true,
    desc: 'Fast bruiser with helmet and shoulder pads.',
    skin: '#c4d1a4', shirt: '#8a2a2a'
  },
  goliath: {
    key: 'goliath', name: 'Goliath', hp: 3000, armor: 0, speed: 8, dmg: 150, big: true, crown: true, club: true,
    desc: 'Huge, slow, devastating to plants. Carries a club.',
    skin: '#a9b88c', shirt: '#3d3d3d'
  },
  flyer: {
    key: 'flyer', name: 'Balloon Flyer', hp: 270, armor: 0, speed: 16, dmg: 90, flying: true,
    desc: 'Floats over plants on a balloon, then lands mid-lawn.',
    skin: '#c9b8d8', shirt: '#6a4a8a'
  },
  ducky: {
    key: 'ducky', name: 'Ducky', hp: 200, armor: 200, speed: 9, dmg: 90, ring: true, beak: true,
    desc: 'Floats on an inner tube with a duck bill: +200 armor, slow in water.',
    skin: '#c9d8a8', shirt: '#4a7a9a'
  },
  imp: {
    key: 'imp', name: 'Imp', hp: 120, armor: 0, speed: 38, dmg: 90, scale: 0.8, horns: true, fork: true,
    desc: 'Tiny, fast, horned. Bosses throw these.',
    skin: '#d8c49a', shirt: '#8a5a2a'
  },
  boss: {
    key: 'boss', name: 'Yard Boss', hp: 6000, armor: 0, speed: 6, dmg: 250, scale: 2.0, boss: true, crown: true, club: true,
    desc: 'A giant with a crown and spiked club that hurls Imps. Has a boss HP bar.',
    skin: '#9aa88c', shirt: '#2a1a3a'
  }
};

const ZOMBIE_ORDER = [
  'shambler', 'pylonhead', 'tinhead', 'dasher', 'leaper', 'howler',
  'screenback', 'rusher', 'goliath', 'flyer', 'ducky', 'imp', 'boss'
];

const LEVELS = [
  {
    name: '1-1 First Sprouts', day: true, biome: 'lawn',
    seeds: ['sunbloom', 'spitter', 'acorn'],
    waves: 5, waveInterval: 17, waveSize: 0.8, finalCount: 6,
    pool: ['shambler', 'shambler', 'pylonhead'],
    startSun: 175, skyEvery: 8
  },
  {
    name: '1-2 Hungry Horde', day: true, biome: 'lawn',
    seeds: ['sunbloom', 'spitter', 'acorn', 'fern', 'blastcap'],
    waves: 6, waveInterval: 15, waveSize: 1.0, finalCount: 9,
    pool: ['shambler', 'pylonhead', 'dasher', 'pylonhead'],
    startSun: 150, skyEvery: 8
  },
  {
    name: '1-3 Night Shift', day: false, biome: 'lawn',
    seeds: ['sunbloom', 'spitter', 'doublespitter', 'acorn', 'fern', 'thistle', 'blastcap'],
    waves: 7, waveInterval: 14, waveSize: 1.0, finalCount: 11,
    pool: ['shambler', 'pylonhead', 'dasher', 'howler'],
    startSun: 125, skyEvery: 13
  },
  {
    name: '1-4 Minefield', day: false, biome: 'lawn',
    seeds: ['sunbloom', 'spitter', 'doublespitter', 'acorn', 'fern', 'thistle', 'tubertrap', 'onion', 'blastcap'],
    waves: 8, waveInterval: 13, waveSize: 1.1, finalCount: 13,
    pool: ['shambler', 'pylonhead', 'dasher', 'screenback', 'howler'],
    startSun: 125, skyEvery: 13
  },
  {
    name: '1-5 First Boss', day: true, biome: 'lawn', boss: true,
    seeds: ['sunbloom', 'spitter', 'doublespitter', 'fern', 'melonlob', 'acorn', 'thistle', 'tubertrap', 'blastcap', 'blazereed'],
    waves: 9, waveInterval: 12, waveSize: 1.2, finalCount: 13,
    pool: ['shambler', 'pylonhead', 'tinhead', 'leaper', 'dasher'],
    startSun: 150, skyEvery: 8
  },
  {
    name: '1-6 The Big Push', day: false, biome: 'lawn',
    seeds: ['sunbloom', 'spitter', 'doublespitter', 'puff', 'acorn', 'fern', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'onion', 'gnasher'],
    waves: 10, waveInterval: 11, waveSize: 1.3, finalCount: 18,
    pool: ['shambler', 'pylonhead', 'tinhead', 'dasher', 'leaper', 'howler', 'screenback', 'rusher'],
    startSun: 100, skyEvery: 12
  },
  {
    name: '2-1 Puff and Shroom', day: true, biome: 'lawn',
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'acorn', 'fern', 'thistle', 'tubertrap', 'blastcap', 'blazereed'],
    waves: 10, waveInterval: 11, waveSize: 1.3, finalCount: 18,
    pool: ['shambler', 'pylonhead', 'dasher', 'flyer', 'howler'],
    startSun: 125, skyEvery: 8
  },
  {
    name: '2-2 Night Balloons', day: false, biome: 'lawn',
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'acorn', 'fern', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'onion', 'gnasher'],
    waves: 11, waveInterval: 10, waveSize: 1.4, finalCount: 20,
    pool: ['shambler', 'pylonhead', 'screenback', 'flyer', 'leaper', 'howler', 'dasher'],
    startSun: 100, skyEvery: 12
  },
  {
    name: '2-3 Windy Day', day: true, biome: 'lawn',
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'splitspitter', 'acorn', 'fern', 'melonlob', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'blover', 'onion', 'gnasher'],
    waves: 11, waveInterval: 10, waveSize: 1.5, finalCount: 22,
    pool: ['shambler', 'pylonhead', 'tinhead', 'rusher', 'leaper', 'flyer', 'screenback'],
    startSun: 125, skyEvery: 8
  },
  {
    name: '2-4 Final Assault', day: false, biome: 'lawn', boss: true,
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'splitspitter', 'fern', 'melonlob', 'acorn', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'blover', 'onion', 'gnasher'],
    waves: 12, waveInterval: 9, waveSize: 1.6, finalCount: 22,
    pool: ['shambler', 'pylonhead', 'tinhead', 'dasher', 'leaper', 'howler', 'screenback', 'rusher', 'goliath', 'flyer'],
    startSun: 75, skyEvery: 11
  },
  {
    name: '3-1 Splash Zone', day: true, biome: 'pool',
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'fern', 'melonlob', 'lotus', 'reed', 'acorn', 'thistle', 'tubertrap', 'blastcap', 'blazereed'],
    waves: 10, waveInterval: 11, waveSize: 1.5, finalCount: 20,
    pool: ['shambler', 'pylonhead', 'ducky', 'dasher', 'flyer'],
    startSun: 125, skyEvery: 8
  },
  {
    name: '3-2 Deep End', day: false, biome: 'pool',
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'splitspitter', 'fern', 'melonlob', 'lotus', 'reed', 'acorn', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'blover', 'onion', 'gnasher'],
    waves: 11, waveInterval: 10, waveSize: 1.6, finalCount: 22,
    pool: ['shambler', 'pylonhead', 'screenback', 'ducky', 'ducky', 'leaper', 'howler', 'flyer'],
    startSun: 100, skyEvery: 12
  },
  {
    name: '3-3 Boss Tide', day: false, biome: 'pool', boss: true,
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'splitspitter', 'fern', 'melonlob', 'lotus', 'reed', 'acorn', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'blover', 'onion', 'gnasher'],
    waves: 12, waveInterval: 9, waveSize: 1.7, finalCount: 24,
    pool: ['shambler', 'pylonhead', 'tinhead', 'ducky', 'dasher', 'leaper', 'screenback', 'rusher', 'goliath', 'flyer'],
    startSun: 75, skyEvery: 11
  },
  {
    name: '3-4 Final Tide', day: false, biome: 'pool', boss: true,
    seeds: ['sunbloom', 'sunshroom', 'spitter', 'puff', 'doublespitter', 'splitspitter', 'fern', 'melonlob', 'lotus', 'reed', 'acorn', 'thistle', 'tubertrap', 'blastcap', 'blazereed', 'blover', 'onion', 'gnasher'],
    waves: 13, waveInterval: 9, waveSize: 1.8, finalCount: 26,
    pool: ['shambler', 'pylonhead', 'tinhead', 'ducky', 'ducky', 'dasher', 'leaper', 'screenback', 'rusher', 'goliath', 'flyer'],
    startSun: 50, skyEvery: 11
  }
];

const CHAPTERS = [
  { name: 'Chapter 1', title: 'Front Yard', icon: '🏡', levels: [0, 1, 2, 3, 4], day: true },
  { name: 'Chapter 2', title: 'Night Watch', icon: '🌙', levels: [5, 6, 7, 8, 9], day: false },
  { name: 'Chapter 3', title: 'The Pool', icon: '🏊', levels: [10, 11, 12, 13], day: false, pool: true }
];

const STORE_ITEMS = [
  { id: 'sun_charm', icon: '☀️', name: 'Sun Charm', price: 400, desc: '+25% sun from sky and plants, forever' },
  { id: 'dmg_polish', icon: '⚔️', name: 'Damage Polish', price: 600, desc: 'All your plants deal +10% damage, forever' },
  { id: 'cd_redux', icon: '⏱️', name: 'Quick Hands', price: 300, desc: 'Seed packets recharge 15% faster, forever' },
  { id: 'xp_fert', icon: '🌱', name: 'XP Fertilizer', price: 350, desc: 'Plants gain +50% XP and level up sooner, forever' },
  { id: 'coin_magnet', icon: '🧲', name: 'Coin Magnet', price: 250, desc: '+50% coins from kills, forever' },
  { id: 'starter_sun', icon: '🌞', name: 'Starter Sun', price: 150, desc: '+50 sun at the start of every level, forever' },
  { id: 'early_lotus', icon: '🪷', name: 'Early Lotus Pad', price: 200, desc: 'Lotus Pad available in Endless Yard from the start' },
  { id: 'early_reed', icon: '🎋', name: 'Early Reed Shooter', price: 250, desc: 'Reed Shooter available in Endless Yard from the start' },
  { id: 'early_gnasher', icon: '👄', name: 'Early Gnasher', price: 300, desc: 'Gnasher available in Endless Yard from the start' },
  { id: 'early_melon', icon: '🍈', name: 'Early Melon Lob', price: 350, desc: 'Melon Lob available in Endless Yard from the start' }
];

const GREENHOUSE_COST = 50;
const GREENHOUSE_YIELD = 40;
const GREENHOUSE_GROW_MS = 3 * 60 * 1000;

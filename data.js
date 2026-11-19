'use strict';

const PLANT_TYPES = {
  sunbloom: {
    key: 'sunbloom', name: 'Sunbloom', cost: 50, cd: 7, hp: 300,
    desc: 'Produces sun', sunEvery: 14, sunAmount: 25,
    body: '#ffd23f', dark: '#e0a91e', leaf: '#3fae4a'
  },
  spitter: {
    key: 'spitter', name: 'Seed Spitter', cost: 100, cd: 7, hp: 300,
    desc: 'Shoots seeds down the lane', dmg: 20, rate: 1.4,
    body: '#57c84d', dark: '#2f8f2a', leaf: '#3fae4a'
  },
  acorn: {
    key: 'acorn', name: 'Acorn Wall', cost: 50, cd: 20, hp: 4000,
    desc: 'Tough wall that blocks zombies',
    body: '#a9713d', dark: '#6e4520', leaf: '#3fae4a'
  },
  fern: {
    key: 'fern', name: 'Frost Fern', cost: 175, cd: 20, hp: 300,
    desc: 'Fires chilling seeds that slow zombies', dmg: 20, rate: 1.4, slow: true,
    body: '#7fd4ff', dark: '#3aa3d8', leaf: '#bfeaff'
  },
  blastcap: {
    key: 'blastcap', name: 'Blastcap', cost: 150, cd: 25, hp: 300,
    desc: 'Arms briefly, then explodes a 3x3 area', dmg: 1800, arm: 1.2,
    body: '#e0483e', dark: '#8f1f18', leaf: '#3fae4a'
  }
};

const SEED_ORDER = ['sunbloom', 'spitter', 'acorn', 'fern', 'blastcap'];

const ZOMBIE_TYPES = {
  shambler: { key: 'shambler', name: 'Shambler', hp: 200, speed: 14, dmg: 100, skin: '#b7c39a', shirt: '#5b6470' },
  cone:    { key: 'cone', name: 'Conehead', hp: 560, speed: 14, dmg: 100, skin: '#b7c39a', shirt: '#6b4a8a', cone: true },
  bucket:  { key: 'bucket', name: 'Buckethead', hp: 1300, speed: 13, dmg: 100, skin: '#b7c39a', shirt: '#7a4a2a', bucket: true },
  sprinter:{ key: 'sprinter', name: 'Sprinter', hp: 200, speed: 34, dmg: 100, skin: '#c4d1a4', shirt: '#a33b3b' },
  brute:   { key: 'brute', name: 'Brute', hp: 3000, speed: 8, dmg: 200, skin: '#a9b88c', shirt: '#3d3d3d', big: true }
};

const LEVELS = [
  {
    name: 'Level 1: First Sprouts', waves: 6, waveInterval: 14, waveSize: 0.8,
    finalCount: 10, pool: ['shambler', 'shambler', 'cone'],
    startSun: 150, skyEvery: 9
  },
  {
    name: 'Level 2: Hungry Horde', waves: 8, waveInterval: 12, waveSize: 1.0,
    finalCount: 14, pool: ['shambler', 'cone', 'sprinter', 'cone'],
    startSun: 100, skyEvery: 8
  },
  {
    name: 'Level 3: The Big Push', waves: 10, waveInterval: 10, waveSize: 1.2,
    finalCount: 20, pool: ['shambler', 'cone', 'bucket', 'sprinter', 'cone'],
    startSun: 75, skyEvery: 7
  }
];

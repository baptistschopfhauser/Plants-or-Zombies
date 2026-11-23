// Local-only save data. Nothing ever leaves the device.
import { STARTING_GUARDIANS } from './data.js';

const KEY = 'bloomguard.save.v2';

const DEFAULT = () => ({
  unlockedLevel: 0,
  stars: {},          // level index -> best star count
  starGoals: {},      // level index -> [win, lanterns, challenge]
  guardians: [...STARTING_GUARDIANS],
  ranks: {},          // guardian -> Grove rank (0..5)
  petals: 0,
  endlessBest: 0,
  loadout: [...STARTING_GUARDIANS],
  achievements: {},
  totals: { kills: 0, planted: 0, overblooms: 0 },
  seenStory: {},
  seenIntro: false,
  seenEnding: false,
  acorns: 50,
  owned: { hats: [], skins: [] },
  equipped: {},       // guardian -> { hat, skin }
  boosts: {},         // boost -> count
  nursery: { pots: [] },
  daily: { last: '', streak: 0, best: 0 },
  mini: { bonk: 0, potluck: {} },
  settings: { sfx: true, music: true, autoCollect: false, story: true },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const data = JSON.parse(raw);
    const d = DEFAULT();
    return {
      ...d, ...data,
      settings: { ...d.settings, ...(data.settings || {}) },
      totals: { ...d.totals, ...(data.totals || {}) },
      owned: { ...d.owned, ...(data.owned || {}) },
      mini: { ...d.mini, ...(data.mini || {}) },
      daily: { ...d.daily, ...(data.daily || {}) },
      nursery: { ...d.nursery, ...(data.nursery || {}) },
    };
  } catch (e) {
    return DEFAULT();
  }
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  return DEFAULT();
}

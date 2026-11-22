// Local-only save data. Nothing ever leaves the device.
import { STARTING_GUARDIANS } from './data.js';

const KEY = 'bloomguard.save.v1';

const DEFAULT = () => ({
  unlockedLevel: 0,
  stars: {},
  guardians: [...STARTING_GUARDIANS],
  endlessBest: 0,
  loadout: [...STARTING_GUARDIANS],
  settings: { sfx: true, music: true, autoCollect: false },
  seenTutorial: false,
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const data = JSON.parse(raw);
    const d = DEFAULT();
    return { ...d, ...data, settings: { ...d.settings, ...(data.settings || {}) } };
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

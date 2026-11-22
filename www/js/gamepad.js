// Controller support (Steam Deck, Xbox/PlayStation pads): a virtual cursor that works in menus and in game.
// Left stick / D-pad moves the cursor, A = tap, B = back, Start = pause, X = speed toggle, Y = Bloom Burst.
let cursor = null;
let pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let prev = {};
let lastActive = 0;
let hooks = {};

function el() {
  if (cursor) return cursor;
  cursor = document.createElement('div');
  cursor.id = 'pad-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.append(cursor);
  return cursor;
}

function fire(type, target, x, y) {
  const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 99, pointerType: 'mouse', isPrimary: true, button: 0 };
  target.dispatchEvent(type.startsWith('pointer') ? new PointerEvent(type, opts) : new MouseEvent(type, opts));
}

function tap() {
  const c = el();
  c.style.visibility = 'hidden';
  const target = document.elementFromPoint(pos.x, pos.y);
  c.style.visibility = '';
  if (!target) return;
  fire('pointerdown', target, pos.x, pos.y);
  fire('pointerup', target, pos.x, pos.y);
  if (target.tagName !== 'CANVAS') {
    const clickable = target.closest('button, label, input, a') || target;
    clickable.click();
  }
}

function pressed(gp, i) { return gp.buttons[i] && gp.buttons[i].pressed; }

function poll() {
  requestAnimationFrame(poll);
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = Array.from(pads).find((p) => p && p.connected);
  if (!gp) return;
  let dx = Math.abs(gp.axes[0]) > 0.15 ? gp.axes[0] : 0;
  let dy = Math.abs(gp.axes[1]) > 0.15 ? gp.axes[1] : 0;
  if (pressed(gp, 14)) dx = -1;
  if (pressed(gp, 15)) dx = 1;
  if (pressed(gp, 12)) dy = -1;
  if (pressed(gp, 13)) dy = 1;
  const now = performance.now();
  const anyButton = gp.buttons.some((b) => b.pressed);
  if (dx || dy || anyButton) lastActive = now;
  const speed = 14 * (pressed(gp, 4) || pressed(gp, 5) ? 0.4 : 1); // bumpers = precision
  pos.x = Math.max(0, Math.min(window.innerWidth - 1, pos.x + dx * Math.abs(dx) * speed));
  pos.y = Math.max(0, Math.min(window.innerHeight - 1, pos.y + dy * Math.abs(dy) * speed));
  const c = el();
  c.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  c.style.opacity = now - lastActive < 5000 ? '1' : '0';
  if (dx || dy) {
    const target = document.elementFromPoint(pos.x, pos.y);
    if (target && target.tagName === 'CANVAS') fire('pointermove', target, pos.x, pos.y);
  }
  const edge = (i) => pressed(gp, i) && !prev[i];
  if (edge(0)) tap();
  if (edge(1)) hooks.back && hooks.back();
  if (edge(9)) hooks.pause && hooks.pause();
  if (edge(2)) hooks.speed && hooks.speed();
  if (edge(3)) hooks.bloom && hooks.bloom();
  prev = {};
  gp.buttons.forEach((b, i) => { prev[i] = b.pressed; });
}

export function initGamepad(h) {
  hooks = h;
  window.addEventListener('gamepadconnected', () => { lastActive = performance.now(); el(); });
  requestAnimationFrame(poll);
}

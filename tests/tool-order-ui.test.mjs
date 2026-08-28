// Exercise the actual page event handlers with a small DOM double, not a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import * as helpers from '../src/lib/tool-order.mjs';

const source = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/import \{[^}]+\} from '[^']+';/, 'const { mergeOrder, moveItem, getDropIndex, readOrder, saveOrder, clearOrder } = helpers;');
const code = transformSync(script, { loader: 'ts' }).code;

class Element extends EventTarget {
  constructor(classes = '', dataset = {}) {
    super();
    this.classes = new Set(classes.split(' ').filter(Boolean));
    this.classList = { add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x) };
    this.dataset = dataset;
    this.children = [];
    this.style = {};
    this.hidden = true;
    this.value = '';
  }
  append(child) {
    child.remove();
    child.parent = this;
    this.children.push(child);
  }
  remove() {
    if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
  cloneNode(deep) {
    const clone = new Element([...this.classes].join(' '), { ...this.dataset });
    if (deep) this.children.forEach(c => clone.append(c.cloneNode(true)));
    return clone;
  }
  matches(selector) { return selector === '[data-move]' ? 'move' in this.dataset : this.classList.contains(selector.slice(1)); }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector); }
  setAttribute(key, value) { this[key] = value; }
  focus() { this.focused = true; }
  hasPointerCapture(id) { return this.captureId === id; }
  setPointerCapture(id) { this.captureId = id; }
  releasePointerCapture() { this.captureId = undefined; }
  getBoundingClientRect() { return this.rect?.() ?? { left: 0, top: 0, width: 200, height: 180 }; }
}
class Button extends Element { disabled = false; }

function fire(target, type, data = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, data);
  target.dispatchEvent(event);
  return event;
}
function fixture(saved) {
  const elements = Object.fromEntries(['grid', 'reset-order', 'sort-help', 'sort-status', 'empty', 'search', 'sort-toolbar'].map(id => [id, new Element()]));
  const grid = elements.grid, body = new Element();
  const win = new EventTarget();
  Object.assign(win, { scrollX: 0, scrollY: 0, innerHeight: 800 });
  win.scrollBy = (_, dy) => { win.scrollY = Math.max(0, Math.min(1000, win.scrollY + dy)); };
  grid.rect = () => ({ left: 0, right: 420, top: 100 - win.scrollY, bottom: 480 - win.scrollY, width: 420, height: 380 });
  const tabs = ['all', 'learn'].map(cat => new Button('tab', { cat }));
  const items = ['a', 'b', 'c'].map((id, index) => {
    const item = new Element('tool-item', { toolId: id, toolName: id });
    item.append(new Element('card', { name: id, desc: id, category: index ? 'learn' : 'finance' }));
    grid.append(item);
    item.rect = () => {
      const slot = item.style.order ? Number(item.style.order) : grid.children.indexOf(item);
      return { left: (slot % 2) * 220, top: 100 + Math.floor(slot / 2) * 200 - win.scrollY, width: 200, height: 180 };
    };
    return item;
  });
  const values = new Map([['theme', 'mint']]);
  if (saved) values.set(helpers.ORDER_KEY, JSON.stringify(saved));
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  win.localStorage = storage;
  const frames = new Map();
  let frameId = 0;
  runInNewContext(code, {
    document: { body, getElementById: id => elements[id], querySelectorAll: () => tabs },
    window: win, helpers, HTMLButtonElement: Button,
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
  });
  const pointer = (target, type, x, y, extra = {}) => fire(target, type, {
    button: 0, isPrimary: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, ...extra,
  });
  const down = (index = 0, extra = {}) => {
    const rect = items[index].getBoundingClientRect();
    pointer(grid, 'pointerdown', rect.left + 50, rect.top + 50, extra);
    return pointer(items[index].querySelector('.card'), 'pointerdown', rect.left + 50, rect.top + 50, extra);
  };
  return { elements, grid, items, tabs, storage, body, win, frames, pointer, down,
    move: (x, y, extra) => pointer(win, 'pointermove', x, y, extra),
    up: (x, y, extra) => pointer(win, 'pointerup', x, y, extra),
    order: () => grid.children.map(item => item.dataset.toolId),
    layout: () => [...grid.children].sort((a, b) => Number(a.style.order) - Number(b.style.order)).map(item => item.dataset.toolId),
  };
}

test('restore order and show whole-card affordance without a handle', () => {
  const ui = fixture(['c', 'a', 'b']);
  assert.deepEqual(ui.order(), ['c', 'a', 'b']);
  assert.equal(ui.items[0].dataset.sortable, 'true');
  assert.equal(ui.items[0].querySelector('.card').draggable, false);
  assert.equal(ui.items[0].querySelector('.sort-controls'), null);
  assert.doesNotMatch(source, /data-move|sort-controls|点箭头/);
  assert.equal(ui.items[0].querySelector('.drag-handle'), null);
});
test('Alt+arrow keyboard moves still save and preserve focus without visible buttons', () => {
  const ui = fixture();
  const card = ui.items[0].querySelector('.card');
  fire(card, 'keydown', { key: 'ArrowRight', altKey: true });
  assert.deepEqual(ui.order(), ['b', 'a', 'c']);
  assert.equal(card.focused, true);
  fire(card, 'keydown', { key: 'ArrowRight', altKey: true });
  assert.deepEqual(ui.order(), ['b', 'c', 'a']);
  assert.deepEqual(helpers.readOrder(ui.storage), ['b', 'c', 'a']);
});
test('click and sub-threshold jitter keep navigation and order unchanged', () => {
  const ui = fixture();
  ui.down();
  ui.move(53, 152);
  ui.up(53, 152);
  assert.equal(ui.body.children.length, 0);
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  assert.equal(fire(ui.grid, 'click').defaultPrevented, false);
});
test('whole card follows mouse, previews live, and saves ONLY on release', () => {
  const ui = fixture();
  ui.down();
  ui.move(100, 390);
  assert.equal(ui.body.children.length, 1);
  const ghost = ui.body.children[0];
  assert.equal(ghost.inert, true);
  assert.equal(ghost['aria-hidden'], 'true');
  assert.equal(ghost.style.left, '50px');
  assert.equal(ghost.style.top, '340px');
  assert.deepEqual(ui.layout(), ['b', 'c', 'a']);
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  assert.equal(ui.storage.getItem(helpers.ORDER_KEY), null);
  assert.equal(ui.grid.hasPointerCapture(1), true);
  ui.up(100, 390);
  assert.deepEqual(ui.order(), ['b', 'c', 'a']);
  assert.deepEqual(helpers.readOrder(ui.storage), ['b', 'c', 'a']);
  assert.equal(ui.body.children.length, 0);
  assert.equal(ui.frames.size, 0);
  assert.equal(ui.grid.hasPointerCapture(1), false);
  assert.equal(fire(ui.grid, 'click').defaultPrevented, true);
  ui.down();
  ui.up(50, 350);
  assert.equal(fire(ui.grid, 'click').defaultPrevented, false);
});
test('release location, not last hover target, decides final slot', () => {
  const ui = fixture();
  ui.down();
  ui.move(100, 390);
  ui.up(320, 190);
  assert.deepEqual(ui.order(), ['b', 'a', 'c']);
});
test('repeated stationary pointer events never oscillate or reorder the DOM', () => {
  const ui = fixture();
  ui.down();
  for (let i = 0; i < 8; i++) ui.move(320, 190);
  assert.deepEqual(ui.layout(), ['b', 'a', 'c']);
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
});
test('grid gaps and the empty last-row area accept drops', () => {
  const ui = fixture();
  ui.down();
  ui.move(210, 190);
  ui.up(410, 390);
  assert.deepEqual(ui.order(), ['b', 'c', 'a']);
});
test('cancel, Escape, outside release, lost capture, blur and resize restore original layout', () => {
  const cancellations = [
    ui => ui.up(600, 390),
    ui => fire(ui.win, 'keydown', { key: 'Escape' }),
    ui => fire(ui.win, 'pointercancel', { pointerId: 1 }),
    ui => fire(ui.grid, 'lostpointercapture', { pointerId: 1 }),
    ui => fire(ui.win, 'blur'), ui => fire(ui.win, 'resize'),
  ];
  for (const cancel of cancellations) {
    const ui = fixture();
    ui.down();
    ui.move(100, 390);
    cancel(ui);
    assert.deepEqual(ui.order(), ['a', 'b', 'c']);
    assert.ok(ui.items.every(item => item.style.order === ''));
    assert.equal(ui.storage.getItem(helpers.ORDER_KEY), null);
    assert.equal(ui.body.children.length, 0);
    assert.equal(ui.frames.size, 0);
  }
});
test('touch, modified clicks, non-primary buttons and different pointers do not reorder', () => {
  for (const extra of [{ pointerType: 'touch' }, { ctrlKey: true }, { metaKey: true }, { button: 2 }, { isPrimary: false }]) {
    const ui = fixture();
    ui.down(0, extra);
    ui.move(100, 390);
    ui.up(100, 390);
    assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  }
  const ui = fixture();
  ui.down();
  ui.move(100, 390, { pointerId: 2 });
  assert.equal(ui.body.children.length, 0);
});
test('search/category filtering disables dragging and preserves full order', () => {
  const ui = fixture(['c', 'a', 'b']);
  fire(ui.tabs[1], 'click');
  assert.equal(ui.items[0].style.display, 'none');
  assert.equal(ui.items[1].dataset.sortable, 'false');
  ui.down(1);
  ui.move(100, 390);
  ui.up(100, 390);
  assert.deepEqual(ui.order(), ['c', 'a', 'b']);
  fire(ui.tabs[0], 'click');
  ui.elements.search.value = 'not found';
  fire(ui.elements.search, 'input');
  assert.equal(ui.elements.empty.style.display, 'block');
  ui.elements.search.value = '';
  fire(ui.elements.search, 'input');
  assert.equal(ui.items[0].style.display, '');
  assert.equal(ui.items[0].dataset.sortable, 'true');
});
test('scrolling during a drag uses document coordinates, and cleanup stops autoscroll', () => {
  const ui = fixture();
  ui.down();
  ui.move(320, 190);
  ui.win.scrollY = 100;
  fire(ui.win, 'scroll');
  ui.up(100, 290);
  assert.deepEqual(ui.order(), ['b', 'c', 'a']);
  assert.equal(ui.frames.size, 0);
});
test('reset restores default, clears only preference, and announces result', () => {
  const ui = fixture(['c', 'b', 'a']);
  fire(ui.elements['reset-order'], 'click');
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  assert.equal(ui.storage.getItem(helpers.ORDER_KEY), null);
  assert.equal(ui.storage.getItem('theme'), 'mint');
  assert.match(ui.elements['sort-status'].textContent, /已恢复/);
});

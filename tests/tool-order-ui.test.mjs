// Exercise the actual page event handlers with a small DOM double, not a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import * as helpers from '../src/lib/tool-order.mjs';

const source = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/import \{[^}]+\} from '[^']+';/, 'const { mergeOrder, moveItem, readOrder, saveOrder, clearOrder } = helpers;');
const code = transformSync(script, { loader: 'ts' }).code;

class Element extends EventTarget {
  constructor(classes = '', dataset = {}) {
    super();
    const values = new Set(classes.split(' ').filter(Boolean));
    this.classList = { add: (...xs) => xs.forEach(x => values.add(x)), remove: (...xs) => xs.forEach(x => values.delete(x)), contains: x => values.has(x) };
    this.dataset = dataset;
    this.children = [];
    this.style = {};
    this.hidden = true;
    this.value = '';
  }
  append(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this;
    this.children.push(child);
  }
  matches(selector) {
    return selector === '[data-move]' ? 'move' in this.dataset : this.classList.contains(selector.slice(1));
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector); }
  contains(child) { return child === this || this.children.some(c => c.contains(child)); }
  setAttribute(key, value) { this[key] = value; }
  focus() { this.focused = true; }
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
  const grid = elements.grid;
  const tabs = ['all', 'learn'].map(cat => new Button('tab', { cat }));
  const items = ['a', 'b', 'c'].map((id, index) => {
    const item = new Element('tool-item', { toolId: id, toolName: id });
    const controls = new Element('sort-controls');
    controls.append(new Button('drag-handle'));
    controls.append(new Button('', { move: '-1' }));
    controls.append(new Button('', { move: '1' }));
    item.append(controls);
    item.append(new Element('card', { name: id, desc: id, category: index ? 'learn' : 'finance' }));
    grid.append(item);
    return item;
  });
  const values = new Map([['theme', 'mint']]);
  if (saved) values.set(helpers.ORDER_KEY, JSON.stringify(saved));
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  runInNewContext(code, {
    document: { getElementById: id => elements[id], querySelectorAll: () => tabs },
    window: { localStorage: storage }, helpers, Node: Element, HTMLButtonElement: Button,
  });
  return { elements, items, tabs, storage, order: () => grid.children.map(item => item.dataset.toolId) };
}

test('page restores saved order and enables controls without touching links', () => {
  const ui = fixture(['c', 'a', 'b']);
  assert.deepEqual(ui.order(), ['c', 'a', 'b']);
  assert.equal(ui.elements['sort-toolbar'].hidden, false);
  assert.equal(ui.items[0].querySelector('.card').draggable, false);
  assert.equal(ui.items[0].querySelector('.sort-controls').hidden, false);
});
test('buttons and keyboard reorder, save, and preserve focus', () => {
  const ui = fixture();
  const forward = ui.items[0].querySelectorAll('[data-move]')[1];
  fire(forward, 'click');
  assert.deepEqual(ui.order(), ['b', 'a', 'c']);
  assert.equal(forward.focused, true);
  const handle = ui.items[0].querySelector('.drag-handle');
  fire(handle, 'keydown', { key: 'ArrowRight' });
  assert.deepEqual(ui.order(), ['b', 'c', 'a']);
  assert.deepEqual(helpers.readOrder(ui.storage), ['b', 'c', 'a']);
});
test('internal drag shows target, commits on drop, and clears drag state', () => {
  const ui = fixture();
  const transfer = { setData() {}, setDragImage() {} };
  fire(ui.items[0].querySelector('.drag-handle'), 'dragstart', { dataTransfer: transfer });
  const over = fire(ui.items[2], 'dragover', { dataTransfer: transfer });
  assert.equal(over.defaultPrevented, true);
  assert.equal(ui.items[2].classList.contains('drop-target'), true);
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  fire(ui.items[2], 'drop');
  assert.deepEqual(ui.order(), ['b', 'c', 'a']);
  assert.equal(ui.items[0].classList.contains('dragging'), false);
  assert.equal(ui.items[2].classList.contains('drop-target'), false);
  assert.deepEqual(helpers.readOrder(ui.storage), ['b', 'c', 'a']);
});
test('canceled drags and external drops cannot change order', () => {
  const ui = fixture();
  fire(ui.items[2], 'drop');
  const handle = ui.items[0].querySelector('.drag-handle');
  fire(handle, 'dragstart', { dataTransfer: { setData() {}, setDragImage() {} } });
  fire(handle, 'dragend');
  fire(ui.items[2], 'drop');
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  assert.equal(ui.storage.getItem(helpers.ORDER_KEY), null);
});
test('search/category filtering disables reorder and preserves full saved list', () => {
  const ui = fixture(['c', 'a', 'b']);
  fire(ui.tabs[1], 'click');
  assert.equal(ui.items[0].style.display, 'none');
  assert.equal(ui.items[1].querySelector('.drag-handle').disabled, true);
  fire(ui.items[1].querySelector('.drag-handle'), 'keydown', { key: 'ArrowLeft' });
  assert.deepEqual(ui.order(), ['c', 'a', 'b']);
  fire(ui.tabs[0], 'click');
  ui.elements.search.value = 'not found';
  fire(ui.elements.search, 'input');
  assert.equal(ui.elements.empty.style.display, 'block');
  ui.elements.search.value = '';
  fire(ui.elements.search, 'input');
  assert.equal(ui.items[0].style.display, '');
  assert.equal(ui.items[0].querySelector('.drag-handle').disabled, false);
  assert.deepEqual(ui.order(), ['c', 'a', 'b']);
});
test('reset restores default order, clears only preference, and announces result', () => {
  const ui = fixture(['c', 'b', 'a']);
  fire(ui.elements['reset-order'], 'click');
  assert.deepEqual(ui.order(), ['a', 'b', 'c']);
  assert.equal(ui.storage.getItem(helpers.ORDER_KEY), null);
  assert.equal(ui.storage.getItem('theme'), 'mint');
  assert.match(ui.elements['sort-status'].textContent, /已恢复/);
});

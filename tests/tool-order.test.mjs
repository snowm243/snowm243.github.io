import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_KEY, mergeOrder, moveItem, getDropIndex, readOrder, saveOrder, clearOrder } from '../src/lib/tool-order.mjs';

const defaults = ['a', 'b', 'c'];
test('drop slots use nearest row and column, including gaps and a short final row', () => {
  const slots = [
    { left: 0, top: 100, width: 200, height: 180 },
    { left: 220, top: 100, width: 200, height: 180 },
    { left: 0, top: 300, width: 200, height: 180 },
  ];
  assert.equal(getDropIndex(slots, 100, 190), 0);
  assert.equal(getDropIndex(slots, 320, 190), 1);
  assert.equal(getDropIndex(slots, 410, 390), 2);
  assert.equal(getDropIndex(slots, 215, 190), 1);
  assert.equal(getDropIndex(slots, 50, 295), 2);
  assert.equal(getDropIndex([], 0, 0), -1);
});
const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};

test('default order survives malformed or unavailable preferences', () => {
  for (const value of [null, undefined, {}, 1, 'bad', [1, null, {}]]) assert.deepEqual(mergeOrder(defaults, value), defaults);
});
test('saved order retains valid IDs, deduplicates, drops removed tools and appends new tools', () => {
  assert.deepEqual(mergeOrder(['a', 'b', 'c', 'new'], ['c', 'removed', 'c', 'a']), ['c', 'a', 'b', 'new']);
});
test('forward, backward and same-position drops do not mutate input', () => {
  assert.deepEqual(moveItem(defaults, 'a', 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(defaults, 'c', 0), ['c', 'a', 'b']);
  assert.deepEqual(moveItem(defaults, 'b', 1), defaults);
  assert.deepEqual(defaults, ['a', 'b', 'c']);
});
test('boundary moves and unknown IDs are ignored', () => {
  for (const to of [-1, 3, NaN, 1.5]) assert.deepEqual(moveItem(defaults, 'a', to), defaults);
  assert.deepEqual(moveItem(defaults, 'missing', 1), defaults);
});
test('refresh persists order; different visitor storage remains isolated', () => {
  const first = storage(), second = storage();
  const reordered = moveItem(defaults, 'c', 0);
  assert.equal(saveOrder(first, reordered), true);
  assert.deepEqual(mergeOrder(defaults, readOrder(first)), reordered);
  assert.deepEqual(mergeOrder(defaults, readOrder(second)), defaults);
});
test('reset removes only order and preserves other tool and theme data', () => {
  const local = storage();
  local.setItem('theme', 'mint');
  local.setItem('study-progress', '42');
  saveOrder(local, ['c', 'a', 'b']);
  assert.equal(clearOrder(local), true);
  assert.equal(local.getItem(ORDER_KEY), null);
  assert.equal(local.getItem('theme'), 'mint');
  assert.equal(local.getItem('study-progress'), '42');
  assert.deepEqual(mergeOrder(defaults, readOrder(local)), defaults);
});
test('corrupt JSON and blocked/quota-full storage never break the page', () => {
  const corrupt = storage();
  corrupt.setItem(ORDER_KEY, '{not-json');
  assert.equal(readOrder(corrupt), null);
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } };
  for (const local of [undefined, blocked]) {
    assert.equal(readOrder(local), null);
    assert.equal(saveOrder(local, defaults), false);
    assert.equal(clearOrder(local), false);
  }
});

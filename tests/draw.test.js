const test = require('node:test');
const assert = require('node:assert');
const { drawRotation, stats } = require('../src/draw.js');

const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, level: (i % 3) + 1 }));

test('12 joueurs : 3 matchs, tous distincts', () => {
  const r = drawRotation(mk(12), []);
  assert.strictEqual(r.matches.length, 3);
  const ids = r.matches.flatMap(m => [...m.teamA, ...m.teamB]);
  assert.strictEqual(new Set(ids).size, 12);
  assert.strictEqual(r.resting.length, 0);
});

test('aucune paire répétée sur 8 rotations à 12 joueurs', () => {
  const players = mk(12), history = [];
  for (let i = 0; i < 8; i++) history.push(drawRotation(players, history));
  const st = stats(history);
  assert.ok(Math.max(...Object.values(st.partners)) <= 1);
});

test('équilibre : écart de niveau entre équipes faible', () => {
  const players = mk(12), lv = Object.fromEntries(players.map(p => [p.id, p.level]));
  const r = drawRotation(players, []);
  for (const m of r.matches) {
    const d = Math.abs(lv[m.teamA[0]] + lv[m.teamA[1]] - lv[m.teamB[0]] - lv[m.teamB[1]]);
    assert.ok(d <= 1);
  }
});

test('14 joueurs : 2 au repos, rotation équitable', () => {
  const players = mk(14), history = [];
  for (let i = 0; i < 7; i++) {
    const r = drawRotation(players, history);
    assert.strictEqual(r.resting.length, 2);
    history.push(r);
  }
  const played = Object.values(stats(history).played);
  assert.ok(Math.max(...played) - Math.min(...played) <= 1);
});

test('moins de 12 joueurs : moins de terrains', () => {
  assert.strictEqual(drawRotation(mk(9), []).matches.length, 2);
  assert.throws(() => drawRotation(mk(3), []));
});

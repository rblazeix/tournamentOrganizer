const test = require('node:test');
const assert = require('node:assert');
const S = require('../src/score.js');

const mk = (target) => { const m = {}; S.start(m, target); return m; };
const tap = (m, si, side, n) => { for (let i = 0; i < n; i++) S.change(m, si, side, 1); };

test('15 points : le set se termine et le set suivant apparaît', () => {
  const m = mk(15);
  tap(m, 0, 1, 10); tap(m, 0, 0, 15);
  assert.deepStrictEqual(m.sets, [[15, 10], [0, 0]]);
  assert.deepStrictEqual(S.setsWon(m), [1, 0]);
});

test('match en 2 sets : pas de 3e set', () => {
  const m = mk(15);
  tap(m, 0, 0, 15); tap(m, 1, 0, 15);
  assert.ok(S.decided(m));
  assert.strictEqual(m.sets.length, 2);
});

test('1-1 : un 3e set apparaît', () => {
  const m = mk(21);
  tap(m, 0, 0, 21); tap(m, 1, 1, 21);
  assert.strictEqual(m.sets.length, 3);
});

test('correction : retirer un point annule le set suivant vide', () => {
  const m = mk(15);
  tap(m, 0, 0, 15);
  S.change(m, 0, 0, -1);
  assert.strictEqual(m.sets.length, 1);
  assert.deepStrictEqual(m.sets[0], [14, 0]);
});

test('mode libre : sets ajoutés à la main, score jamais négatif', () => {
  const m = mk(0);
  tap(m, 0, 0, 3); S.addSet(m); tap(m, 1, 1, 2);
  S.change(m, 1, 0, -1);
  assert.deepStrictEqual(m.sets, [[3, 0], [0, 2]]);
  assert.deepStrictEqual(S.summary(m), { sets: [1, 1], pts: [3, 2] });
});

test('15 points : écart de 2 requis, plafond à 21', () => {
  const win = (a, b, t = 15) => S.setWinner([a, b], t);
  assert.strictEqual(win(15, 14), 0);
  assert.strictEqual(win(16, 14), 1);
  assert.strictEqual(win(14, 16), 2);
  assert.strictEqual(win(20, 19), 0);
  assert.strictEqual(win(20, 18), 1);
  assert.strictEqual(win(21, 20), 1);
  assert.strictEqual(win(19, 21), 2);
  assert.strictEqual(win(21, 19), 1);
  assert.strictEqual(win(20, 20), 0);
  assert.strictEqual(win(29, 28, 21), 0);
  assert.strictEqual(win(30, 29, 21), 1);
});

test('saisie par taps : 14-14 puis 16-14 ouvre le set suivant, 15-14 non', () => {
  const m = mk(15);
  tap(m, 0, 0, 14); tap(m, 0, 1, 14); tap(m, 0, 0, 1);
  assert.strictEqual(m.sets.length, 1);
  tap(m, 0, 0, 1);
  assert.strictEqual(m.sets.length, 2);
  S.change(m, 0, 1, 1); // correction : 16-15, le set n'est plus gagné
  assert.strictEqual(m.sets.length, 1);
});

test('taps alternés jusqu\'au plafond : 20-20 puis 21-20, plus de point ensuite', () => {
  const m = mk(15);
  for (let i = 0; i < 20; i++) { tap(m, 0, 0, 1); tap(m, 0, 1, 1); }
  assert.strictEqual(S.setWinner(m.sets[0], 15), 0);
  tap(m, 0, 0, 1);
  assert.deepStrictEqual(m.sets[0], [21, 20]);
  assert.strictEqual(m.sets.length, 2);
  tap(m, 0, 0, 3);
  assert.deepStrictEqual(m.sets[0], [21, 20]);
});

test('15 points : le set peut finir à 20-18', () => {
  const m = mk(15);
  for (let i = 0; i < 18; i++) { tap(m, 0, 0, 1); tap(m, 0, 1, 1); }
  tap(m, 0, 0, 2);
  assert.deepStrictEqual(m.sets[0], [20, 18]);
  assert.strictEqual(m.sets.length, 2);
});

test('saisie finale : le score du gagnant est déduit', () => {
  assert.strictEqual(S.winnerScore(9, 15), 15);
  assert.strictEqual(S.winnerScore(13, 15), 15);
  assert.strictEqual(S.winnerScore(14, 15), 16);
  assert.strictEqual(S.winnerScore(19, 15), 21);
  assert.strictEqual(S.winnerScore(20, 15), 21);
  assert.strictEqual(S.winnerScore(19, 21), 21);
  assert.strictEqual(S.winnerScore(28, 21), 30);
  assert.strictEqual(S.winnerScore(29, 21), 30);
  assert.strictEqual(S.loserChoices(15).length, 21);
  assert.strictEqual(S.loserChoices(21).length, 30);
});

test('saisie finale : 3 sets 15-9, 18-20, 15-12', () => {
  const m = mk(15);
  S.setResult(m, 0, 0, 9);
  assert.deepStrictEqual(m.sets, [[15, 9], [0, 0]]);
  S.setResult(m, 1, 1, 18);
  assert.deepStrictEqual(m.sets, [[15, 9], [18, 20], [0, 0]]);
  S.setResult(m, 2, 0, 12);
  assert.deepStrictEqual(m.sets, [[15, 9], [18, 20], [15, 12]]);
  assert.ok(S.decided(m));
});

test('saisie finale : 2-0 ne crée pas de 3e set, correction du 1er set', () => {
  const m = mk(15);
  S.setResult(m, 0, 0, 9); S.setResult(m, 1, 0, 14);
  assert.deepStrictEqual(m.sets, [[15, 9], [16, 14]]);
  S.clearSet(m, 0);
  assert.deepStrictEqual(m.sets, [[0, 0]]);
});

test('set unique : le match est décidé après 1 set, pas de set suivant', () => {
  const m = {}; S.start(m, 15, 1);
  S.setResult(m, 0, 1, 11);
  assert.deepStrictEqual(m.sets, [[11, 15]]);
  assert.ok(S.decided(m));
  assert.strictEqual(S.maxSets(m), 1);
});

test('set unique en mode libre : pas de set supplémentaire', () => {
  const m = {}; S.start(m, 0, 1);
  S.setFree(m, 0, 11, 7);
  S.addSet(m);
  assert.strictEqual(m.sets.length, 1);
});

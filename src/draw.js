// Tirage des rotations de double. Module pur (navigateur + Node).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Draw = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);

  function stats(history) {
    const partners = {}, opponents = {}, played = {}, rested = {};
    for (const rot of history) {
      for (const m of rot.matches) {
        const [a1, a2] = m.teamA, [b1, b2] = m.teamB;
        partners[key(a1, a2)] = (partners[key(a1, a2)] || 0) + 1;
        partners[key(b1, b2)] = (partners[key(b1, b2)] || 0) + 1;
        for (const a of m.teamA) for (const b of m.teamB) opponents[key(a, b)] = (opponents[key(a, b)] || 0) + 1;
        for (const p of [...m.teamA, ...m.teamB]) played[p] = (played[p] || 0) + 1;
      }
      for (const p of rot.resting || []) rested[p] = (rested[p] || 0) + 1;
    }
    return { partners, opponents, played, rested };
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Joue en priorité ceux qui ont le moins joué.
  function selectPlayers(players, st, count, rng) {
    if (players.length <= count) return { playing: players.slice(), resting: [] };
    const ranked = shuffle(players, rng).sort((a, b) => (st.played[a.id] || 0) - (st.played[b.id] || 0));
    return { playing: ranked.slice(0, count), resting: ranked.slice(count) };
  }

  // Un arrangement = tableau de 4*n joueurs ; groupes de 4 = [a1,a2 | b1,b2].
  function cost(arr, st, level) {
    let c = 0;
    const strengths = [];
    for (let i = 0; i < arr.length; i += 4) {
      const [a1, a2, b1, b2] = arr.slice(i, i + 4);
      c += 100 * (st.partners[key(a1.id, a2.id)] || 0) ** 2;
      c += 100 * (st.partners[key(b1.id, b2.id)] || 0) ** 2;
      for (const a of [a1, a2]) for (const b of [b1, b2]) c += 3 * (st.opponents[key(a.id, b.id)] || 0);
      const sa = level(a1) + level(a2), sb = level(b1) + level(b2);
      c += 15 * (sa - sb) ** 2;
      strengths.push(sa + sb);
    }
    if (strengths.length > 1) c += (Math.max(...strengths) - Math.min(...strengths)) ** 2;
    return c;
  }

  /**
   * players: [{id, level}] présents ; history: [{matches:[{teamA:[id,id],teamB:[id,id]}], resting:[id]}]
   * options: { courts=3, iterations=4000, rng=Math.random }
   */
  function drawRotation(players, history, options) {
    const o = Object.assign({ courts: 3, iterations: 4000, rng: Math.random }, options);
    const nCourts = Math.min(o.courts, Math.floor(players.length / 4));
    if (nCourts < 1) throw new Error('Il faut au moins 4 joueurs');
    const st = stats(history);
    const level = p => p.level || 2;
    const { playing, resting } = selectPlayers(players, st, nCourts * 4, o.rng);

    let best = null, bestCost = Infinity;
    for (let restart = 0; restart < 8; restart++) {
      let cur = shuffle(playing, o.rng), curCost = cost(cur, st, level);
      for (let it = 0; it < o.iterations / 8; it++) {
        const i = Math.floor(o.rng() * cur.length), j = Math.floor(o.rng() * cur.length);
        if (i === j) continue;
        [cur[i], cur[j]] = [cur[j], cur[i]];
        const c = cost(cur, st, level) + o.rng() * 0.5; // bruit pour varier les tirages équivalents
        if (c <= curCost) curCost = c;
        else [cur[i], cur[j]] = [cur[j], cur[i]];
      }
      if (curCost < bestCost) { bestCost = curCost; best = cur.slice(); }
    }

    const matches = [];
    for (let i = 0; i < best.length; i += 4) {
      matches.push({ court: i / 4 + 1, teamA: [best[i].id, best[i + 1].id], teamB: [best[i + 2].id, best[i + 3].id] });
    }
    return { matches, resting: resting.map(p => p.id) };
  }

  return { drawRotation, stats };
});

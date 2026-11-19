// Logique de score d'un match : jusqu'à 3 sets, target = points du set (0 = libre).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Score = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Nombre de sets gagnants du match (1 = set unique, 2 = au meilleur des 3), 2 par défaut.
  const toWin = m => m.setsToWin || 2;
  const maxSets = m => 2 * toWin(m) - 1;

  // Badminton : le set est gagné à `target` avec 2 points d'écart, ou au plafond (cap) avec 1 point d'écart.
  const CAPS = { 15: 21, 21: 30 };
  const capOf = target => CAPS[target] || target + 6;
  function reached(a, b, target) {
    return a >= capOf(target) ? a > b : a >= target && a - b >= 2;
  }

  // 1 si A gagne le set, 2 si B, 0 sinon. En mode libre (target 0), le plus haut score mène.
  function setWinner(s, target) {
    if (target) return reached(s[0], s[1], target) ? 1 : reached(s[1], s[0], target) ? 2 : 0;
    return s[0] === s[1] ? 0 : s[0] > s[1] ? 1 : 2;
  }

  function setsWon(m) {
    const w = [0, 0];
    for (const s of m.sets || []) { const x = setWinner(s, m.target); if (x) w[x - 1]++; }
    return w;
  }

  const decided = m => setsWon(m).some(n => n >= toWin(m));
  const started = m => (m.sets || []).some(s => s[0] + s[1] > 0);

  // Retire les sets vides superflus et ajoute le set suivant quand le précédent est gagné (mode points fixes).
  function normalize(m) {
    const sets = m.sets;
    while (sets.length > 1 && sets[sets.length - 1][0] + sets[sets.length - 1][1] === 0 &&
           (m.target ? setWinner(sets[sets.length - 2], m.target) === 0 : false)) sets.pop();
    const last = sets[sets.length - 1];
    if (m.target && setWinner(last, m.target) && !decided(m) && sets.length < maxSets(m)) sets.push([0, 0]);
    while (decided(m) && sets.length > 1 && sets[sets.length - 1][0] + sets[sets.length - 1][1] === 0) sets.pop();
  }

  function start(m, target, setsToWin) { m.target = target; m.setsToWin = setsToWin || 2; m.sets = [[0, 0]]; }

  function change(m, setIndex, side, delta) {
    const s = m.sets[setIndex];
    // Set terminé : l'équipe gagnante ne peut plus marquer (évite 16-0), mais on peut corriger (−) ou rouvrir via l'autre équipe.
    if (delta > 0 && m.target && setWinner(s, m.target) === side + 1) return;
    s[side] = Math.max(0, s[side] + delta);
    normalize(m);
  }

  // Score du gagnant déduit de celui du perdant : objectif, ou perdant + 2 en prolongation, plafonné.
  function winnerScore(loser, target) {
    return Math.min(Math.max(target, loser + 2), capOf(target));
  }

  // Les points du perdant possibles pour un set à `target` : 0 .. plafond-1.
  function loserChoices(target) {
    return Array.from({ length: capOf(target) }, (_, i) => i);
  }

  // Enregistre un set terminé (winnerSide 0 = équipe A) et ajuste les sets suivants.
  function setResult(m, setIndex, winnerSide, loserScore) {
    const w = winnerScore(loserScore, m.target);
    m.sets[setIndex] = winnerSide === 0 ? [w, loserScore] : [loserScore, w];
    m.sets.length = setIndex + 1;
    normalize(m);
  }

  // Efface un set et ceux qui suivent.
  function clearSet(m, setIndex) {
    m.sets.length = setIndex + 1;
    m.sets[setIndex] = [0, 0];
  }

  // Mode libre : fixe directement le score d'un set.
  function setFree(m, setIndex, a, b) { m.sets[setIndex] = [Math.max(0, a), Math.max(0, b)]; }

  function addSet(m) { if (m.sets.length < maxSets(m) && !decided(m)) m.sets.push([0, 0]); }

  // Total de points marqués pour/contre chaque équipe, et sets gagnés.
  function summary(m) {
    const pts = [0, 0];
    for (const s of m.sets || []) { pts[0] += s[0]; pts[1] += s[1]; }
    return { sets: setsWon(m), pts };
  }

  return { setWinner, setsWon, decided, started, normalize, start, change, addSet, winnerScore, loserChoices, setResult, clearSet, setFree, capOf, summary, maxSets };
});

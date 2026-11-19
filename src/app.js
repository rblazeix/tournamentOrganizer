(function () {
  const LEVELS = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Confirmé' };
  const COURTS = 3;
  let state = Store.load();
  state.settings = Object.assign({ target: 15, setsToWin: 2 }, state.settings);
  let tab = 'players';
  const view = document.getElementById('view');

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = id => esc(state.names[id] || '?');
  const persist = () => { Store.save(state); render(); };
  const present = () => state.players.filter(p => p.present);

  function playersView() {
    const rows = state.players.map(p => `
      <div class="row ${p.present ? '' : 'off'}" data-id="${p.id}">
        <input type="checkbox" class="present" ${p.present ? 'checked' : ''} aria-label="Présent">
        <span class="name">${esc(p.name)}</span>
        <select class="level lvl${p.level}">${[1, 2, 3].map(l => `<option value="${l}" ${l === p.level ? 'selected' : ''}>${LEVELS[l]}</option>`).join('')}</select>
        <button class="secondary danger remove" aria-label="Supprimer">✕</button>
      </div>`).join('');
    return `
      <form class="add" id="addForm">
        <input type="text" id="newName" placeholder="Nom du joueur" autocomplete="off" required>
        <button class="primary" style="width:auto;margin:0">Ajouter</button>
      </form>
      <div class="card">${rows || '<p class="muted">Aucun joueur.</p>'}
        <p class="muted">${present().length} présent(s) sur ${state.players.length}. Décocher = absent (ignoré au tirage).</p>
      </div>`;
  }

  function teamHtml(t) { return t.map(name).join(' &amp; '); }

  const pending = {}; // équipe gagnante choisie pour le set en cours de saisie : "rot-match" -> 0|1

  function setHtml(m, s, si, key) {
    const w = Score.setWinner(s, m.target);
    const label = `<span class="setlabel">Set ${si + 1}</span>`;
    if (!m.target) {
      return `<div class="set free">${label}
        <input type="number" min="0" inputmode="numeric" class="free-a" data-s="${si}" value="${s[0] || ''}" placeholder="0">
        <span>–</span>
        <input type="number" min="0" inputmode="numeric" class="free-b" data-s="${si}" value="${s[1] || ''}" placeholder="0"></div>`;
    }
    if (w) {
      return `<div class="set done">${label}<div class="final"><span class="${w === 1 ? 'win' : ''}">${s[0]}</span> – <span class="${w === 2 ? 'win' : ''}">${s[1]}</span></div>
        <button class="secondary" data-act="clear" data-s="${si}">Modifier</button></div>`;
    }
    const side = pending[key];
    let html = `<div class="set entry">${label}<div class="who">Qui a gagné le set ?</div>
      <div class="winbtns">${[0, 1].map(x => `<button class="${side === x ? 'on' : ''}" data-act="winner" data-side="${x}">${teamHtml(x ? m.teamB : m.teamA)}</button>`).join('')}</div>`;
    if (side !== undefined) {
      html += `<div class="who">Points de l'équipe perdante</div><div class="chips">${
        Score.loserChoices(m.target).map(n => `<button data-act="loser" data-s="${si}" data-v="${n}">${n}</button>`).join('')}</div>`;
    }
    return html + '</div>';
  }

  function matchHtml(m, i, k) {
    const key = i + '-' + k;
    const decided = m.sets && Score.decided(m);
    const won = m.sets ? Score.setsWon(m) : [0, 0];
    let body;
    if (!m.sets) {
      body = '<button class="primary startscore" data-act="start">Saisir le score</button>';
    } else {
      body = m.sets.map((s, si) => setHtml(m, s, si, key)).join('');
      if (!m.target && !decided && m.sets.length < Score.maxSets(m)) body += '<button class="secondary" data-act="addset">+ Set suivant</button>';
      if (Score.started(m)) body += `<div class="muted">Sets : ${won[0]} – ${won[1]}${m.target ? ` (${m.target} pts)` : ''}</div>`;
    }
    return `
      <div class="match" data-rot="${i}" data-m="${k}">
        <div class="court">Terrain ${m.court}</div>
        <div class="teams"><div class="team ${decided && won[0] > won[1] ? 'winner' : ''}">${teamHtml(m.teamA)}</div>
        <div class="team ${decided && won[1] > won[0] ? 'winner' : ''}">${teamHtml(m.teamB)}</div></div>
        ${body}
      </div>`;
  }

  function settingsHtml() {
    const t = state.settings.target, n = state.settings.setsToWin;
    const seg = (label, act, cur, opts) => `<div class="seg"><span>${label}</span>
      ${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<div class="card">${seg('Sets par match :', 'setsToWin', n, [[1, '1 set'], [2, '2 gagnants']])}
      ${seg('Points par set :', 'target', t, [[15, '15'], [21, '21'], [0, 'Libre']])}
      <p class="muted">Réglages appliqués aux matchs dont la saisie n'est pas encore commencée.</p></div>`;
  }

  function roundsView() {
    const n = present().length;
    let html = settingsHtml() + `<button class="primary" id="draw" ${n < 4 ? 'disabled' : ''}>🎲 Nouvelle rotation (${Math.min(COURTS, Math.floor(n / 4))} terrain(s))</button>`;
    if (n < 4) html += '<p class="muted">Il faut au moins 4 joueurs présents.</p>';
    html += state.rotations.map((r, i) => ({ r, i })).reverse().map(({ r, i }) => `
      <div class="card" data-rot="${i}">
        <strong>Rotation ${i + 1}</strong>
        ${r.matches.map((m, k) => `
          ${matchHtml(m, i, k)}<hr>`).join('')}
        ${r.resting.length ? `<p class="muted">Au repos : ${r.resting.map(name).join(', ')}</p>` : ''}
        ${i === state.rotations.length - 1 ? '<button class="secondary redraw">↻ Refaire cette rotation</button> <button class="secondary danger delrot">Supprimer</button>' : ''}
      </div>`).join('');
    if (state.rotations.length) html += '<button class="secondary danger" id="reset">Nouveau tournoi (efface les rotations)</button>';
    return html;
  }

  function rankingView() {
    const tbl = {};
    const row = id => (tbl[id] = tbl[id] || { id, played: 0, wins: 0, diff: 0 });
    for (const r of state.rotations) for (const m of r.matches) {
      if (!m.sets || !Score.started(m)) continue;
      const { sets, pts } = Score.summary(m);
      const d = pts[0] - pts[1], lead = sets[0] - sets[1] || d;
      for (const id of m.teamA) { const x = row(id); x.played++; x.diff += d; if (lead > 0) x.wins++; }
      for (const id of m.teamB) { const x = row(id); x.played++; x.diff -= d; if (lead < 0) x.wins++; }
    }
    const list = Object.values(tbl).sort((a, b) => b.wins - a.wins || b.diff - a.diff);
    if (!list.length) return '<p class="muted">Saisis des scores dans les rotations pour voir le classement.</p>';
    // Rang partagé en cas d'égalité parfaite (victoires et différence).
    list.forEach((x, i) => { const p = list[i - 1]; x.rank = p && p.wins === x.wins && p.diff === x.diff ? p.rank : i + 1; });
    const medal = r => ['🥇', '🥈', '🥉'][r - 1] || '';
    const fmt = d => (d > 0 ? '+' : '') + d;
    const maxWins = Math.max(1, ...list.map(x => x.wins));

    const top = list.slice(0, 3), rest = list.slice(3);
    const order = top.length === 3 ? [top[1], top[0], top[2]] : top.length === 2 ? [top[1], top[0]] : top;
    const podium = `<div class="podium">${order.map(x => `
      <div class="step r${Math.min(x.rank, 3)}">
        <div class="medal">${medal(x.rank)}</div>
        <div class="pname">${name(x.id)}</div>
        <div class="pstat">${x.wins} V · ${x.played} J</div>
        <div class="block">${x.rank}</div>
      </div>`).join('')}</div>`;

    const restRows = rest.map(x => `
      <div class="rank-row">
        <span class="pos">${x.rank}</span>
        <div class="who2"><div class="n">${name(x.id)}</div>
          <div class="bar"><span style="width:${Math.round(100 * x.wins / maxWins)}%"></span></div></div>
        <div class="nums"><b>${x.wins} V</b><span class="muted">${x.played} J · ${fmt(x.diff)}</span></div>
      </div>`).join('');
    return `${podium}${rest.length ? `<div class="card">${restRows}</div>` : ''}
      <p class="muted center">V = victoires, J = matchs joués, écart = différence de points. Classement : victoires, puis différence de points.</p>`;
  }

  function doDraw(replaceLast) {
    const history = replaceLast ? state.rotations.slice(0, -1) : state.rotations;
    const res = Draw.drawRotation(present(), history, { courts: COURTS });
    if (replaceLast) state.rotations.pop();
    state.rotations.push(res);
    persist();
  }

  function render() {
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    view.innerHTML = tab === 'players' ? playersView() : tab === 'rounds' ? roundsView() : rankingView();
  }

  document.querySelector('nav').addEventListener('click', e => {
    if (e.target.dataset.tab) { tab = e.target.dataset.tab; render(); }
  });

  view.addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('newName');
    const n = input.value.trim();
    if (!n) return;
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    state.players.push({ id, name: n, level: 2, present: true });
    state.names[id] = n;
    persist();
    document.getElementById('newName').focus();
  });

  view.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const act = btn.dataset.act;
      if (act === 'target') { state.settings.target = +btn.dataset.v; persist(); return; }
      if (act === 'setsToWin') { state.settings.setsToWin = +btn.dataset.v; persist(); return; }
      const el = btn.closest('.match'), key = el.dataset.rot + '-' + el.dataset.m;
      const m = state.rotations[+el.dataset.rot].matches[+el.dataset.m];
      if (act === 'start') Score.start(m, state.settings.target, state.settings.setsToWin);
      else if (act === 'addset') Score.addSet(m);
      else if (act === 'winner') pending[key] = +btn.dataset.side;
      else if (act === 'loser') { Score.setResult(m, +btn.dataset.s, pending[key], +btn.dataset.v); delete pending[key]; }
      else if (act === 'clear') { Score.clearSet(m, +btn.dataset.s); delete pending[key]; }
      Store.save(state);
      el.outerHTML = matchHtml(m, +el.dataset.rot, +el.dataset.m); // maj locale : garde la position de défilement
      return;
    }
    const t = e.target, rowEl = t.closest('.row');
    if (t.classList.contains('remove')) {
      const p = state.players.find(p => p.id === rowEl.dataset.id);
      if (confirm('Supprimer ' + p.name + ' ?')) { state.players = state.players.filter(x => x !== p); persist(); }
    } else if (t.id === 'draw') doDraw(false);
    else if (t.classList.contains('redraw')) doDraw(true);
    else if (t.classList.contains('delrot')) { if (confirm('Supprimer la dernière rotation ?')) { state.rotations.pop(); persist(); } }
    else if (t.id === 'reset') { if (confirm('Effacer toutes les rotations ?')) { state.rotations = []; persist(); } }
  });

  view.addEventListener('change', e => {
    const t = e.target, rowEl = t.closest('.row');
    if (t.classList.contains('free-a') || t.classList.contains('free-b')) {
      const el = t.closest('.match'), si = +t.dataset.s;
      const m = state.rotations[+el.dataset.rot].matches[+el.dataset.m];
      const box = t.closest('.set');
      Score.setFree(m, si, +box.querySelector('.free-a').value, +box.querySelector('.free-b').value);
      Store.save(state);
      el.querySelector('.muted')?.remove();
      const won = Score.setsWon(m);
      el.insertAdjacentHTML('beforeend', `<div class="muted">Sets : ${won[0]} – ${won[1]}</div>`);
    } else if (rowEl) {
      const p = state.players.find(p => p.id === rowEl.dataset.id);
      if (t.classList.contains('present')) p.present = t.checked;
      if (t.classList.contains('level')) p.level = +t.value;
      persist();
    }
  });

  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
})();

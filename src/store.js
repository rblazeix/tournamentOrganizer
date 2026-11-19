// Persistance localStorage.
(function (root) {
  const KEY = 'tournament-organizer-v1';
  const empty = () => ({ players: [], names: {}, rotations: [] });

  function load() {
    try { return Object.assign(empty(), JSON.parse(localStorage.getItem(KEY))); }
    catch (e) { return empty(); }
  }
  function save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }

  root.Store = { load, save, empty };
})(self);

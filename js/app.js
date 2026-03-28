/* ================================================================
   js/app.js — Main controller. Wires Lichess → PGN → Analyser →
   Scoring → Render → Chart. Persists state in localStorage.
   ================================================================ */
const App = (() => {
  const STORAGE_KEY = 'candidates2026_v3';
  const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 min during live rounds

  /* ── Default state ── */
  const defaultGeek = () => Object.fromEntries(Object.keys(DATA.GEEK_META).map(k=>[k,null]));

  function defaultState() {
    return {
      live: {
        open:   {'1st':null,'2nd':null,'3rd':null},
        womens: {'1st':null,'2nd':null,'3rd':null},
        geek:   defaultGeek(),
      },
      openStandings:   [],
      womensStandings: [],
      snapshots:  [], // [{round, jt, bt, ts}]
      lastFetch:  null,
      currentRound: 0,
    };
  }

  let state = defaultState();

  /* ── Storage ── */
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);
      // Merge carefully — new geek keys added to DATA.GEEK_META appear as null
      state = {
        ...defaultState(), ...p,
        live: {
          open:   { ...defaultState().live.open,   ...(p.live?.open   || {}) },
          womens: { ...defaultState().live.womens, ...(p.live?.womens || {}) },
          geek:   { ...defaultGeek(),              ...(p.live?.geek   || {}) },
        }
      };
    } catch(e) { state = defaultState(); }
  }

  /* ── Add/update a score snapshot for a round ── */
  function addSnapshot(round) {
    const s = Scoring.calcAll(state.live);
    const snap = { round, jt: s.jt, bt: s.bt, ts: new Date().toISOString() };
    const idx = state.snapshots.findIndex(x => x.round === round);
    if (idx >= 0) state.snapshots[idx] = snap; else state.snapshots.push(snap);
    state.snapshots.sort((a,b) => a.round-b.round);
  }

  /* ── Map analyser standings to render format ── */
  function mapStandings(standings, playerList) {
    return standings.map(s => {
      const p = playerList.find(pl => pl.name.toLowerCase() === s.name.toLowerCase()
                                   || s.name.toLowerCase().includes(pl.name.toLowerCase()));
      return { ...s, flag: p?.flag || '' };
    });
  }

  /* ── Main fetch ── */
  async function fetchLive() {
    const refreshBtn = document.getElementById('refresh-btn');
    const fetchBtn   = document.getElementById('fetch-btn');
    const fetchIcon  = document.getElementById('fetch-icon');
    const setDisabled = v => { if(refreshBtn) refreshBtn.disabled=v; if(fetchBtn) fetchBtn.disabled=v; };

    setDisabled(true);
    if (fetchIcon) fetchIcon.outerHTML = '<span class="spinner" id="fetch-icon"></span>';
    Render.pill('', 'Fetching…');
    Render.statusBar('Loading PGN from Lichess…');

    try {
      const { open, womens, round, errors } = await Lichess.fetchAll(msg => Render.statusBar(msg));

      const allGames = [...open, ...womens];

      if (allGames.length === 0) {
        Render.pill('warn', 'No games yet');
        Render.statusBar('No games found — tournament may not have started');
        setDisabled(false);
        restoreIcon();
        return;
      }

      // Analyse geek markers from Open games (rules apply to Open section)
      const geekResult = Analyser.analyse(open);

      // Merge into live state — only overwrite non-null values from analysis
      // (keeps any manually-set values intact if analysis returns null)
      for (const k of Object.keys(state.live.geek)) {
        if (geekResult[k] !== null && geekResult[k] !== undefined) {
          state.live.geek[k] = geekResult[k];
        }
      }

      // Standings
      const openStandings   = Analyser.standings(open);
      const womensStandings = Analyser.standings(womens);

      // Update podium from standings if we have data
      if (openStandings.length >= 3) {
        state.live.open['1st'] = openStandings[0].name;
        state.live.open['2nd'] = openStandings[1].name;
        state.live.open['3rd'] = openStandings[2].name;
      }
      if (womensStandings.length >= 3) {
        state.live.womens['1st'] = womensStandings[0].name;
        state.live.womens['2nd'] = womensStandings[1].name;
        state.live.womens['3rd'] = womensStandings[2].name;
      }

      // Store mapped standings for display
      state.openStandings   = mapStandings(openStandings,   DATA.PLAYERS_OPEN);
      state.womensStandings = mapStandings(womensStandings, DATA.PLAYERS_WOMENS);
      state.currentRound    = round;
      state.lastFetch       = new Date().toISOString();

      // Add snapshot for current round
      if (round > 0) addSnapshot(round);

      save();

      // Render everything
      Render.all(state.live, state.snapshots);
      Render.standingsCard('open-standings-body',   state.openStandings);
      Render.standingsCard('womens-standings-body', state.womensStandings);
      Render.lastUpdated(state.lastFetch);
      RaceChart.draw(state.snapshots);

      const errNote = errors.length ? ` (${errors.length} warning${errors.length>1?'s':''})` : '';
      Render.statusBar(`R${round} · ${open.length} open + ${womens.length} women's games${errNote} · ${new Date().toLocaleTimeString()}`);
      Render.pill('live', round > 0 ? `Live · R${round}` : 'Live');

    } catch(e) {
      console.error('Fetch error:', e);
      Render.pill('warn', 'Error');
      Render.statusBar('Fetch failed: ' + e.message);
    }

    setDisabled(false);
    restoreIcon();
  }

  function restoreIcon() {
    const icon = document.getElementById('fetch-icon');
    if (icon) icon.outerHTML = '<span id="fetch-icon">&#8635;</span>';
  }

  /* ── Tab switching ── */
  function switchTab(id, btn) {
    document.querySelectorAll('.tab-panel').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el=>el.classList.remove('active'));
    document.getElementById('tab-'+id).classList.add('active');
    btn.classList.add('active');
    if (id==='chart') RaceChart.draw(state.snapshots);
  }

  /* ── Reset ── */
  function resetHistory() {
    if (!confirm('Clear all stored data and start fresh?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    Render.all(state.live, state.snapshots);
    Render.standingsCard('open-standings-body',   []);
    Render.standingsCard('womens-standings-body', []);
    Render.lastUpdated(null);
    RaceChart.draw(state.snapshots);
    Render.pill('warn', 'Reset');
    Render.statusBar('History cleared. Click Refresh to reload.');
  }

  /* ── Auto-refresh ── */
  function startAutoRefresh() {
    setInterval(() => { if (!document.hidden) fetchLive(); }, AUTO_REFRESH_MS);
  }

  /* ── Init ── */
  function init() {
    load();
    Render.all(state.live, state.snapshots);
    Render.standingsCard('open-standings-body',   state.openStandings   || []);
    Render.standingsCard('womens-standings-body', state.womensStandings || []);
    Render.lastUpdated(state.lastFetch);
    RaceChart.draw(state.snapshots);

    const hasData = state.live.open['1st'] !== null;
    const r = state.currentRound || 0;
    Render.pill(hasData?'live':'warn', hasData?`Live · R${r}`:'R1 starts Mar 29');
    Render.statusBar(hasData ? `Showing R${r} data — click Refresh to update` : 'Click Refresh to load live data');

    startAutoRefresh();
  }

  return { init, fetchLive, switchTab, resetHistory };
})();

document.addEventListener('DOMContentLoaded', App.init);

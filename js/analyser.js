const Analyser = (() => {

  const NAME_MAP = [
    [/pragg|praggnanandhaa/i, 'Praggnanandhaa'],
    [/bluebaum|blübaum/i,    'Bluebaum'],
    [/esipenko/i,            'Esipenko'],
    [/sindarov/i,            'Sindarov'],
    [/nakamura/i,            'Nakamura'],
    [/caruana/i,             'Caruana'],
    [/\bgiri\b/i,            'Giri'],
    [/wei\s*yi/i,            'Wei Yi'],
    [/goryachkina/i,         'Goryachkina'],
    [/zhu\s*jiner/i,         'Zhu Jiner'],
    [/tan\s*zhongyi/i,       'Tan Zhongyi'],
    [/lagno/i,               'Lagno'],
    [/vaishali/i,            'Vaishali'],
    [/deshmukh|divya/i,      'Divya'],
    [/assaubayeva/i,         'Assaubayeva'],
    [/muzychuk/i,            'Muzychuk'],
  ];

  function norm(raw) {
    if (!raw) return '';
    for (const [re, name] of NAME_MAP) if (re.test(raw)) return name;
    return (raw.split(',')[0] || raw.split(' ')[0]).trim();
  }

  function playerResults(games) {
    const byPlayer = {};
    const add = (p, res, round) => {
      if (!byPlayer[p]) byPlayer[p] = [];
      byPlayer[p].push({ round, res });
    };
    for (const g of games) {
      if (!PGN.isFinished(g)) continue;
      const w = norm(g.headers.White), b = norm(g.headers.Black);
      const round = parseInt(g.headers.Round) || 0;
      const r = PGN.result(g);
      if      (r === '1-0') { add(w, 'win',  round); add(b, 'loss', round); }
      else if (r === '0-1') { add(w, 'loss', round); add(b, 'win',  round); }
      else                  { add(w, 'draw', round); add(b, 'draw', round); }
    }
    for (const p of Object.keys(byPlayer))
      byPlayer[p].sort((a, b) => a.round - b.round);
    return byPlayer;
  }

  function maxStreak(results, target) {
    let max = 0, cur = 0;
    for (const r of results) { if (r.res === target) { cur++; max = Math.max(max, cur); } else cur = 0; }
    return max;
  }

  function bestByStreak(byPlayer, target) {
    let best = 0, winner = null;
    for (const [p, results] of Object.entries(byPlayer)) {
      const s = maxStreak(results, target);
      if (s > best) { best = s; winner = p; }
    }
    return winner;
  }

  function mostDraws(byPlayer, excluded = []) {
    let most = 0, winner = null;
    for (const [p, results] of Object.entries(byPlayer)) {
      if (excluded.some(ex => p.toLowerCase().includes(ex.toLowerCase()))) continue;
      const d = results.filter(r => r.res === 'draw').length;
      if (d > most) { most = d; winner = p; }
    }
    return winner;
  }

  function openingContains(game, ...terms) {
    const h = [game.headers.Opening || '', game.headers.ECO || ''].join(' ').toLowerCase();
    return terms.some(t => h.includes(t.toLowerCase()));
  }

  function detectLateShakeup(games) {
    const scores11 = {}, scores12 = {};
    for (const g of games) {
      if (!PGN.isFinished(g)) continue;
      const w = norm(g.headers.White), b = norm(g.headers.Black);
      const round = parseInt(g.headers.Round) || 0;
      if (round > 12) continue;
      const r = PGN.result(g);
      [scores11, scores12].forEach((obj, idx) => {
        if (round > 11 + idx) return;
        if (!obj[w]) obj[w] = 0;
        if (!obj[b]) obj[b] = 0;
        if (r === '1-0')      { obj[w] += 1; }
        else if (r === '0-1') { obj[b] += 1; }
        else                  { obj[w] += 0.5; obj[b] += 0.5; }
      });
    }
    const leader = obj => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const maxRound = Math.max(0, ...games.map(g => parseInt(g.headers.Round) || 0));
    if (maxRound < 12) return null;
    const l11 = leader(scores11), l12 = leader(scores12);
    if (!l11 || !l12) return null;
    return l11 !== l12;
  }

  function analyse(games) {
    const out = {
      hot_hand: null, tilt: null, pacifist: null,
      philidor: null, en_passant_round: null, underpromotion: null,
      kings_hike: null, castling_last: null, double_queen: null,
      checkmate: null, blitz_decisive: null, marathon_decisive: null,
      pawn_race: null, closed_sicilian: null, late_shakeup: null,
    };

    if (!games || games.length === 0) return out;

    const finished = games.filter(g => PGN.isFinished(g));
    const byPlayer = playerResults(games);

    out.hot_hand     = bestByStreak(byPlayer, 'win')  || null;
    out.tilt         = bestByStreak(byPlayer, 'loss') || null;
    out.pacifist     = mostDraws(byPlayer, ['Giri'])  || null;
    out.late_shakeup = detectLateShakeup(games);

    let firstEp = null, underpro = false, kingsHike = false;
    let doubleQueen = false, checkmate = false, blitz = false;
    let marathon = false, pawnRace = false;
    let philidor = false, closedSicilian = false;
    const castlingAt = {};

    for (const g of games) {
      const white = norm(g.headers.White);
      const black = norm(g.headers.Black);
      const round = parseInt(g.headers.Round) || null;
      const mc    = PGN.moveCount(g);
      const fin   = PGN.isFinished(g);
      const dec   = PGN.isDecisive(g);

      // ECO codes: Philidor = C41, Closed Sicilian = B23-B26
      if (openingContains(g, 'philidor', 'C41'))                                          philidor       = true;
      if (openingContains(g, 'closed sicilian', 'B23', 'B24', 'B25', 'B26'))             closedSicilian = true;

      if (fin && dec && mc < 25) blitz    = true;
      if (fin && dec && mc > 90) marathon = true;

      let wPro = false, bPro = false;

      try {
        const events = Chess.replay(g);
        for (const ev of events) {
          if (ev.enPassant && firstEp === null && round !== null) firstEp = round;
          if (ev.underpromotion)                          underpro    = true;
          if (ev.kingCrossed5th && ev.chessMove <= 40)   kingsHike   = true;
          if (ev.doubleQueen)                             doubleQueen = true;
          if (ev.checkmate)                               checkmate   = true;
          if (ev.whitePromotion)                          wPro        = true;
          if (ev.blackPromotion)                          bPro        = true;
          if (ev.castled) {
            const p = ev.castled === 'white' ? white : black;
            if (!(p in castlingAt) || ev.chessMove > castlingAt[p])
              castlingAt[p] = ev.chessMove;
          }
        }
      } catch(e) {
        console.warn('Replay error:', white, 'vs', black, e.message);
      }

      if (wPro && bPro) pawnRace = true;
    }

    const flag = val => val ? true : (finished.length > 0 ? false : null);

    out.en_passant_round  = firstEp;
    out.underpromotion    = flag(underpro);
    out.kings_hike        = flag(kingsHike);
    out.double_queen      = flag(doubleQueen);
    out.checkmate         = flag(checkmate);
    out.blitz_decisive    = flag(blitz);
    out.marathon_decisive = flag(marathon);
    out.pawn_race         = flag(pawnRace);
    out.philidor          = philidor       ? true : null;
    out.closed_sicilian   = closedSicilian ? true : null;

    if (Object.keys(castlingAt).length > 0)
      out.castling_last = Object.entries(castlingAt).sort((a, b) => b[1] - a[1])[0][0];

    return out;
  }

  function standings(games) {
    const pts = {}, gp = {};
    for (const g of games) {
      const w = norm(g.headers.White), b = norm(g.headers.Black);
      if (!pts[w]) { pts[w] = 0; gp[w] = 0; }
      if (!pts[b]) { pts[b] = 0; gp[b] = 0; }
      if (!PGN.isFinished(g)) continue;
      gp[w]++; gp[b]++;
      const r = PGN.result(g);
      if      (r === '1-0') { pts[w] += 1; }
      else if (r === '0-1') { pts[b] += 1; }
      else                  { pts[w] += 0.5; pts[b] += 0.5; }
    }
    return Object.entries(pts)
      .map(([name, p]) => ({ name, pts: p, score: p % 1 === 0.5 ? p.toFixed(1) : p.toString(), gp: gp[name] || 0 }))
      .sort((a, b) => b.pts - a.pts)
      .map((e, i) => ({ ...e, pos: i + 1 }));
  }

  function currentRound(games) {
    return Math.max(0, ...games.map(g => parseInt(g.headers.Round) || 0));
  }

  return { analyse, standings, currentRound, norm };
})();
